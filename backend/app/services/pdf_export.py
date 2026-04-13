import io
import os
from datetime import date
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    HRFlowable,
)
from reportlab.platypus.flowables import KeepTogether
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.models.service_record import ServiceRecord
from app.config import settings as app_settings


PAGE_WIDTH, PAGE_HEIGHT = A4
STYLES = getSampleStyleSheet()

HEADER_STYLE = ParagraphStyle(
    "CustomHeader",
    parent=STYLES["Heading1"],
    fontSize=18,
    spaceAfter=6,
    textColor=colors.HexColor("#1a1a2e"),
)
SUBHEADER_STYLE = ParagraphStyle(
    "CustomSubHeader",
    parent=STYLES["Heading2"],
    fontSize=13,
    spaceAfter=4,
    textColor=colors.HexColor("#16213e"),
)
NORMAL_STYLE = STYLES["Normal"]
SMALL_STYLE = ParagraphStyle(
    "Small",
    parent=STYLES["Normal"],
    fontSize=8,
)

TABLE_HEADER_STYLE = TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 9),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f0f0")]),
    ("FONTSIZE", (0, 1), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
])


def _safe_image(path: str, width: float, height: float) -> Optional[Image]:
    """Load an image safely, returning None if not found or invalid."""
    if not path:
        return None
    full_path = path if os.path.isabs(path) else os.path.join(app_settings.upload_path, path)
    if not os.path.exists(full_path):
        return None
    try:
        img = Image(full_path)
        img.drawWidth = width
        img.drawHeight = height
        return img
    except Exception:
        return None


def _format_tasks(tasks: list) -> str:
    if not tasks:
        return "-"
    return ", ".join(str(t) for t in tasks)


def _format_parts(parts: list) -> str:
    if not parts:
        return "-"
    lines = []
    for p in parts:
        if isinstance(p, dict):
            name = p.get("name", "?")
            cost = p.get("cost", 0)
            lines.append(f"{name} ({cost:.2f} EUR)")
        else:
            lines.append(str(p))
    return "\n".join(lines)


def generate_vehicle_pdf(vehicle_id: int, db: Session) -> bytes:
    """Generate a PDF for a single vehicle with all its service records."""
    vehicle: Optional[Vehicle] = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise ValueError(f"Vehicle {vehicle_id} not found")

    service_records: list[ServiceRecord] = (
        db.query(ServiceRecord)
        .filter(ServiceRecord.vehicle_id == vehicle_id)
        .order_by(ServiceRecord.date.desc())
        .all()
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    story = []

    # ---- Header ----
    story.append(Paragraph(vehicle.name, HEADER_STYLE))
    story.append(Paragraph(
        f"{vehicle.make} {vehicle.model} &bull; Baujahr {vehicle.year} &bull; {vehicle.current_km:,} km",
        SUBHEADER_STYLE,
    ))
    if vehicle.vin:
        story.append(Paragraph(f"FIN: {vehicle.vin}", NORMAL_STYLE))
    if vehicle.license_plate:
        story.append(Paragraph(f"Kennzeichen: {vehicle.license_plate}", NORMAL_STYLE))

    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1a1a2e")))
    story.append(Spacer(1, 0.3 * cm))

    # ---- Vehicle photo ----
    if vehicle.photo_path:
        img = _safe_image(vehicle.photo_path, 8 * cm, 6 * cm)
        if img:
            story.append(img)
            story.append(Spacer(1, 0.4 * cm))

    # ---- Service records table ----
    story.append(Paragraph("Serviceverlauf", SUBHEADER_STYLE))
    story.append(Spacer(1, 0.2 * cm))

    if not service_records:
        story.append(Paragraph("Keine Serviceeintraege vorhanden.", NORMAL_STYLE))
    else:
        table_data = [["Datum", "km", "Aufgaben", "Teile", "Kosten (EUR)", "Notizen"]]
        for rec in service_records:
            table_data.append([
                rec.date.strftime("%d.%m.%Y"),
                f"{rec.km_at_service:,}",
                Paragraph(_format_tasks(rec.tasks), SMALL_STYLE),
                Paragraph(_format_parts(rec.parts_used), SMALL_STYLE),
                f"{rec.total_cost:.2f}",
                Paragraph(rec.notes or "-", SMALL_STYLE),
            ])

        col_widths = [2.2 * cm, 1.8 * cm, 4.5 * cm, 4.0 * cm, 2.2 * cm, 2.3 * cm]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TABLE_HEADER_STYLE)
        story.append(table)

    # ---- Photo gallery ----
    all_photos = []
    for rec in service_records:
        for photo_rel in (rec.photos or []):
            all_photos.append((rec.date, photo_rel))

    if all_photos:
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph("Foto-Galerie", SUBHEADER_STYLE))
        story.append(Spacer(1, 0.2 * cm))

        MAX_PER_ROW = 3
        IMG_HEIGHT = 5 * cm
        IMG_WIDTH = (PAGE_WIDTH - 4 * cm) / MAX_PER_ROW - 0.3 * cm

        row_images = []
        for _, photo_rel in all_photos:
            img = _safe_image(photo_rel, IMG_WIDTH, IMG_HEIGHT)
            if img:
                row_images.append(img)
            if len(row_images) == MAX_PER_ROW:
                photo_table = Table([row_images], colWidths=[IMG_WIDTH] * MAX_PER_ROW)
                photo_table.setStyle(TableStyle([
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ]))
                story.append(photo_table)
                story.append(Spacer(1, 0.2 * cm))
                row_images = []

        if row_images:
            # Pad remaining row
            while len(row_images) < MAX_PER_ROW:
                row_images.append(Spacer(IMG_WIDTH, IMG_HEIGHT))
            photo_table = Table([row_images], colWidths=[IMG_WIDTH] * MAX_PER_ROW)
            photo_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(photo_table)

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def generate_dashboard_pdf(db: Session) -> bytes:
    """Generate a dashboard overview PDF for all vehicles."""
    from app.services.planning_engine import calculate_urgency, get_task_name_for_planned
    from app.models.planned_service import PlannedService

    vehicles: list[Vehicle] = db.query(Vehicle).all()
    current_year = date.today().year

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    story = []
    story.append(Paragraph("KFZ Verwaltung – Dashboard", HEADER_STYLE))
    story.append(Paragraph(
        f"Erstellt am {date.today().strftime('%d.%m.%Y')}",
        NORMAL_STYLE,
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1a1a2e")))
    story.append(Spacer(1, 0.4 * cm))

    if not vehicles:
        story.append(Paragraph("Keine Fahrzeuge vorhanden.", NORMAL_STYLE))
    else:
        for vehicle in vehicles:
            # Cost YTD
            records_ytd: list[ServiceRecord] = (
                db.query(ServiceRecord)
                .filter(
                    ServiceRecord.vehicle_id == vehicle.id,
                    ServiceRecord.date >= date(current_year, 1, 1),
                )
                .all()
            )
            cost_ytd = sum(r.total_cost for r in records_ytd)

            # Next pending planned service
            pending = (
                db.query(PlannedService)
                .filter(
                    PlannedService.vehicle_id == vehicle.id,
                    PlannedService.status == "pending",
                )
                .all()
            )
            next_service_text = "Keine geplanten Wartungen"
            if pending:
                def sort_key(ps):
                    urg = calculate_urgency(ps, vehicle)
                    days = urg["urgency_days"] if urg["urgency_days"] is not None else -999999
                    km = urg["urgency_km"] if urg["urgency_km"] is not None else -999999
                    return (-days, -km)
                pending.sort(key=sort_key)
                first = pending[0]
                urg = calculate_urgency(first, vehicle)
                task = get_task_name_for_planned(first, db)
                parts = [task]
                if first.due_date:
                    parts.append(f"am {first.due_date.strftime('%d.%m.%Y')}")
                if first.due_km:
                    parts.append(f"bei {first.due_km:,} km")
                if urg["is_overdue"]:
                    parts.append("(UEBERFAELLIG)")
                next_service_text = " ".join(parts)

            # Vehicle block
            block_elements = []

            # Header row with optional photo
            header_data = []
            img = _safe_image(vehicle.photo_path, 3.5 * cm, 2.5 * cm) if vehicle.photo_path else None

            info_lines = [
                Paragraph(f"<b>{vehicle.name}</b>", SUBHEADER_STYLE),
                Paragraph(f"{vehicle.make} {vehicle.model}, {vehicle.year}", NORMAL_STYLE),
                Paragraph(f"Aktueller km-Stand: <b>{vehicle.current_km:,} km</b>", NORMAL_STYLE),
                Paragraph(f"Naechste Faelligkeit: {next_service_text}", NORMAL_STYLE),
                Paragraph(f"Kosten {current_year}: <b>{cost_ytd:.2f} EUR</b>", NORMAL_STYLE),
            ]

            if vehicle.license_plate:
                info_lines.insert(2, Paragraph(f"Kennzeichen: {vehicle.license_plate}", NORMAL_STYLE))

            info_col = info_lines

            if img:
                header_data = [[img, info_col]]
                header_table = Table(
                    header_data,
                    colWidths=[4 * cm, PAGE_WIDTH - 4 * cm - 4 * cm],
                )
                header_table.setStyle(TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ]))
                block_elements.append(header_table)
            else:
                for line in info_col:
                    block_elements.append(line)

            block_elements.append(Spacer(1, 0.2 * cm))
            block_elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#aaaaaa")))
            block_elements.append(Spacer(1, 0.3 * cm))

            story.append(KeepTogether(block_elements))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
