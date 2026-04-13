"""
Seed-Skript: Legt 3 Beispiel-Fahrzeuge mit Wartungsplänen,
Service-Einträgen und geplanten Wartungen an.
"""
import os
import sys
from datetime import date, timedelta

# Sicherstellen, dass das backend-Verzeichnis im Python-Pfad ist
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.vehicle import Vehicle
from app.models.maintenance_plan import MaintenancePlan
from app.models.service_record import ServiceRecord
from app.models.planned_service import PlannedService

# Tabellen anlegen falls noch nicht vorhanden
Base.metadata.create_all(engine)

TODAY = date.today()


def run_seed():
    db = SessionLocal()
    try:
        # Vorhandene Seed-Daten entfernen (idempotent)
        db.query(PlannedService).delete()
        db.query(ServiceRecord).delete()
        db.query(MaintenancePlan).delete()
        db.query(Vehicle).delete()
        db.commit()

        # ------------------------------------------------------------------ #
        # Fahrzeuge
        # ------------------------------------------------------------------ #
        golf = Vehicle(
            name="Mein Golf",
            make="Volkswagen",
            model="Golf VII",
            year=2018,
            license_plate="B-VW-1234",
            current_km=87000,
        )
        bmw = Vehicle(
            name="BMW 3er",
            make="BMW",
            model="320d",
            year=2015,
            license_plate="M-BM-5678",
            current_km=142000,
        )
        yaris = Vehicle(
            name="Yaris Alltagsauto",
            make="Toyota",
            model="Yaris",
            year=2020,
            license_plate="HH-TO-9999",
            current_km=34000,
        )
        db.add_all([golf, bmw, yaris])
        db.flush()  # IDs vergeben

        # ------------------------------------------------------------------ #
        # Wartungspläne
        # ------------------------------------------------------------------ #

        # VW Golf
        golf_oelwechsel = MaintenancePlan(
            vehicle_id=golf.id,
            task_name="Ölwechsel",
            interval_km=5000,
            interval_days=365,
        )
        golf_reifen = MaintenancePlan(
            vehicle_id=golf.id,
            task_name="Reifenwechsel",
            interval_km=None,
            interval_days=180,
        )
        golf_tuev = MaintenancePlan(
            vehicle_id=golf.id,
            task_name="TÜV",
            interval_km=None,
            interval_days=730,
        )

        # BMW 3er
        bmw_oelwechsel = MaintenancePlan(
            vehicle_id=bmw.id,
            task_name="Ölwechsel",
            interval_km=10000,
            interval_days=365,
        )
        bmw_bremsen = MaintenancePlan(
            vehicle_id=bmw.id,
            task_name="Bremsbeläge",
            interval_km=30000,
            interval_days=None,
        )
        bmw_zahnriemen = MaintenancePlan(
            vehicle_id=bmw.id,
            task_name="Zahnriemen",
            interval_km=60000,
            interval_days=None,
        )
        bmw_inspektion = MaintenancePlan(
            vehicle_id=bmw.id,
            task_name="Inspektion",
            interval_km=20000,
            interval_days=365,
        )

        # Toyota Yaris
        yaris_oelwechsel = MaintenancePlan(
            vehicle_id=yaris.id,
            task_name="Ölwechsel",
            interval_km=10000,
            interval_days=365,
        )
        yaris_inspektion = MaintenancePlan(
            vehicle_id=yaris.id,
            task_name="Inspektion",
            interval_km=15000,
            interval_days=365,
        )

        all_plans = [
            golf_oelwechsel, golf_reifen, golf_tuev,
            bmw_oelwechsel, bmw_bremsen, bmw_zahnriemen, bmw_inspektion,
            yaris_oelwechsel, yaris_inspektion,
        ]
        db.add_all(all_plans)
        db.flush()

        # ------------------------------------------------------------------ #
        # Service-Einträge
        # ------------------------------------------------------------------ #

        # VW Golf – Ölwechsel vor 3 Monaten @ 84.000 km
        golf_sr_oel = ServiceRecord(
            vehicle_id=golf.id,
            date=TODAY - timedelta(days=90),
            km_at_service=84000,
            tasks=["Ölwechsel"],
            parts_used=[
                {"name": "Motoröl 5W-30", "price": 35.00},
                {"name": "Ölfilter", "price": 8.00},
            ],
            total_cost=43.00,
            notes="Öl und Filter gewechselt, nächster Termin bei 89.000 km",
        )

        # VW Golf – Reifenwechsel vor 6 Monaten @ 81.000 km
        golf_sr_reifen = ServiceRecord(
            vehicle_id=golf.id,
            date=TODAY - timedelta(days=180),
            km_at_service=81000,
            tasks=["Reifenwechsel"],
            parts_used=[
                {"name": "Satz Winterreifen 205/55 R16", "price": 280.00},
            ],
            total_cost=280.00,
            notes="Winterreifen montiert, Reifendruck kontrolliert",
        )

        # BMW 3er – Ölwechsel vor 5 Monaten @ 138.000 km
        bmw_sr_oel = ServiceRecord(
            vehicle_id=bmw.id,
            date=TODAY - timedelta(days=150),
            km_at_service=138000,
            tasks=["Ölwechsel"],
            parts_used=[
                {"name": "Motoröl BMW Longlife 0W-30 6L", "price": 45.00},
            ],
            total_cost=45.00,
            notes="Longlife-Öl nach Herstellervorgabe verwendet",
        )

        # BMW 3er – Bremsbeläge vorne vor 1 Jahr @ 130.000 km
        bmw_sr_bremsen = ServiceRecord(
            vehicle_id=bmw.id,
            date=TODAY - timedelta(days=365),
            km_at_service=130000,
            tasks=["Bremsbeläge vorne erneuert"],
            parts_used=[
                {"name": "Bremsbeläge Satz vorne", "price": 65.00},
                {"name": "Arbeitszeit", "price": 80.00},
            ],
            total_cost=145.00,
            notes="Bremsscheiben noch in Ordnung, nur Beläge getauscht",
        )

        # BMW 3er – Inspektion vor 2 Jahren @ 120.000 km
        bmw_sr_inspektion = ServiceRecord(
            vehicle_id=bmw.id,
            date=TODAY - timedelta(days=730),
            km_at_service=120000,
            tasks=["Große Inspektion", "Luftfilter", "Innenraumfilter", "Zündkerzen"],
            parts_used=[
                {"name": "Luftfilter", "price": 18.00},
                {"name": "Innenraumfilter", "price": 12.00},
                {"name": "Zündkerzen Satz", "price": 40.00},
                {"name": "Arbeitszeit Inspektion", "price": 150.00},
            ],
            total_cost=220.00,
            notes="Große Inspektion inkl. aller Verschleißteile",
        )

        # Toyota Yaris – Ölwechsel vor 2 Monaten @ 32.000 km
        yaris_sr_oel = ServiceRecord(
            vehicle_id=yaris.id,
            date=TODAY - timedelta(days=60),
            km_at_service=32000,
            tasks=["Ölwechsel"],
            parts_used=[
                {"name": "Motoröl 5W-40 vollsynthetisch 4L", "price": 28.00},
            ],
            total_cost=28.00,
            notes="Ölstand und alle Flüssigkeiten kontrolliert",
        )

        all_records = [
            golf_sr_oel, golf_sr_reifen,
            bmw_sr_oel, bmw_sr_bremsen, bmw_sr_inspektion,
            yaris_sr_oel,
        ]
        db.add_all(all_records)
        db.flush()

        # ------------------------------------------------------------------ #
        # MaintenancePlan.last_done_* aus den ServiceRecords ableiten
        # ------------------------------------------------------------------ #

        golf_oelwechsel.last_done_km = golf_sr_oel.km_at_service
        golf_oelwechsel.last_done_date = golf_sr_oel.date

        golf_reifen.last_done_km = golf_sr_reifen.km_at_service
        golf_reifen.last_done_date = golf_sr_reifen.date

        bmw_oelwechsel.last_done_km = bmw_sr_oel.km_at_service
        bmw_oelwechsel.last_done_date = bmw_sr_oel.date

        bmw_bremsen.last_done_km = bmw_sr_bremsen.km_at_service
        bmw_bremsen.last_done_date = bmw_sr_bremsen.date

        bmw_inspektion.last_done_km = bmw_sr_inspektion.km_at_service
        bmw_inspektion.last_done_date = bmw_sr_inspektion.date

        yaris_oelwechsel.last_done_km = yaris_sr_oel.km_at_service
        yaris_oelwechsel.last_done_date = yaris_sr_oel.date

        db.flush()

        # ------------------------------------------------------------------ #
        # PlannedServices aus den MaintenancePlänen berechnen
        # ------------------------------------------------------------------ #

        def make_planned(plan: MaintenancePlan, vehicle_id: int) -> PlannedService:
            due_km = None
            due_date = None
            if plan.last_done_km is not None and plan.interval_km is not None:
                due_km = plan.last_done_km + plan.interval_km
            if plan.last_done_date is not None and plan.interval_days is not None:
                due_date = plan.last_done_date + timedelta(days=plan.interval_days)
            # Falls kein last_done gesetzt, konservativ aus heutigem Tag schätzen
            if due_km is None and plan.interval_km is not None:
                due_km = plan.interval_km  # Basiswert als Startwert
            if due_date is None and plan.interval_days is not None:
                due_date = TODAY + timedelta(days=plan.interval_days)
            return PlannedService(
                vehicle_id=vehicle_id,
                maintenance_plan_id=plan.id,
                due_km=due_km,
                due_date=due_date,
                status="pending",
            )

        planned = [
            make_planned(golf_oelwechsel, golf.id),
            make_planned(golf_reifen, golf.id),
            make_planned(golf_tuev, golf.id),
            make_planned(bmw_oelwechsel, bmw.id),
            make_planned(bmw_bremsen, bmw.id),
            make_planned(bmw_zahnriemen, bmw.id),
            make_planned(bmw_inspektion, bmw.id),
            make_planned(yaris_oelwechsel, yaris.id),
            make_planned(yaris_inspektion, yaris.id),
        ]
        db.add_all(planned)
        db.commit()

        print(
            f"Seed erfolgreich: 3 Fahrzeuge, "
            f"{len(all_plans)} Wartungspläne, "
            f"{len(all_records)} Service-Einträge angelegt"
        )
        print(f"  Fahrzeuge: {golf.name}, {bmw.name}, {yaris.name}")
        print(f"  PlannedServices: {len(planned)} angelegt")

    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
