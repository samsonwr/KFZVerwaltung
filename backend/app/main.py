from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, SessionLocal
from app.database import Base

# Import all models so they register with Base metadata (needed for create_all)
import app.models.vehicle  # noqa: F401
import app.models.maintenance_plan  # noqa: F401
import app.models.service_record  # noqa: F401
import app.models.planned_service  # noqa: F401
import app.models.push_subscription  # noqa: F401
import app.models.km_history  # noqa: F401

from app.routers import (
    vehicles,
    maintenance_plans,
    services,
    dashboard,
    planning,
    export,
    push,
)
from app.tasks.scheduler import create_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure required directories exist
    Path(settings.upload_path).mkdir(parents=True, exist_ok=True)
    Path(settings.backup_path).mkdir(parents=True, exist_ok=True)
    Path(settings.db_path).parent.mkdir(parents=True, exist_ok=True)

    # Create database tables (if not using Alembic migrations)
    Base.metadata.create_all(bind=engine)

    # Start background scheduler
    scheduler = create_scheduler(settings, SessionLocal)
    scheduler.start()

    yield

    # Shutdown scheduler
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="KFZ Verwaltung",
    description="API fuer die Verwaltung von Kraftfahrzeugen, Wartungsplaenen und Servicebuchungen",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers under /api/v1/
API_PREFIX = "/api/v1"

app.include_router(vehicles.router, prefix=API_PREFIX)
app.include_router(maintenance_plans.router, prefix=API_PREFIX)
app.include_router(services.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(planning.router, prefix=API_PREFIX)
app.include_router(export.router, prefix=API_PREFIX)
app.include_router(push.router, prefix=API_PREFIX)

# Static files for uploaded content
upload_path = Path(settings.upload_path)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

# Static files for frontend (only if the directory exists)
# Im Container: WORKDIR=/app, Frontend liegt in /app/static/frontend
frontend_path = Path(__file__).parent.parent / "static" / "frontend"
if frontend_path.exists() and frontend_path.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
