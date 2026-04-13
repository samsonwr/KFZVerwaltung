from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    port: int = 5000
    db_path: str = "/var/lib/vehicle-service/db/vehicles.db"
    upload_path: str = "/var/lib/vehicle-service/uploads"
    backup_path: str = "/var/backups/vehicle-service"
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_admin_email: str = "admin@localhost"

    model_config = {"env_file": ".env"}


settings = Settings()
