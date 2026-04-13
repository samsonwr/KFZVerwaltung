from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.services.pdf_export import generate_vehicle_pdf, generate_dashboard_pdf

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/vehicle/{vehicle_id}/pdf")
def export_vehicle_pdf(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")

    try:
        pdf_bytes = generate_vehicle_pdf(vehicle_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    safe_name = vehicle.name.replace(" ", "_").replace("/", "_")
    filename = f"vehicle_{vehicle_id}_{safe_name}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/dashboard/pdf")
def export_dashboard_pdf(db: Session = Depends(get_db)):
    try:
        pdf_bytes = generate_dashboard_pdf(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="dashboard.pdf"'},
    )
