import shutil
import os
from datetime import date
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler


def create_scheduler(settings, SessionLocal):
    scheduler = BackgroundScheduler()

    def daily_backup():
        src = Path(settings.db_path)
        if not src.exists():
            print(f"Backup skipped: database file not found at {src}")
            return
        dst_dir = Path(settings.backup_path)
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / f"{date.today().isoformat()}.db"
        shutil.copy2(src, dst)
        print(f"Backup created: {dst}")

        # Keep only the last 7 backups
        backups = sorted(dst_dir.glob("*.db"))
        for old in backups[:-7]:
            old.unlink()
            print(f"Old backup removed: {old}")

    def check_push_notifications():
        from app.services.push_service import send_push_to_all
        from app.models.planned_service import PlannedService
        from app.models.maintenance_plan import MaintenancePlan
        from app.models.vehicle import Vehicle

        today = date.today()
        with SessionLocal() as db:
            overdue_services = (
                db.query(PlannedService)
                .filter(
                    PlannedService.status == "pending",
                    PlannedService.due_date <= today,
                )
                .all()
            )

            if not overdue_services:
                return

            messages = []
            for ps in overdue_services:
                vehicle = db.get(Vehicle, ps.vehicle_id)
                vehicle_name = vehicle.name if vehicle else f"Fahrzeug {ps.vehicle_id}"

                task_name = "Wartung"
                if ps.maintenance_plan_id:
                    plan = db.get(MaintenancePlan, ps.maintenance_plan_id)
                    if plan:
                        task_name = plan.task_name

                if ps.due_date:
                    messages.append(
                        f"{vehicle_name}: {task_name} faellig seit {ps.due_date.strftime('%d.%m.%Y')}"
                    )

            if messages:
                message = f"{len(messages)} Wartung(en) faellig: " + "; ".join(messages[:3])
                if len(messages) > 3:
                    message += f" ... (+{len(messages) - 3} weitere)"
                send_push_to_all(db, message, settings)

    scheduler.add_job(daily_backup, "cron", hour=3, id="daily_backup")
    scheduler.add_job(check_push_notifications, "cron", hour=8, id="check_push_notifications")
    return scheduler
