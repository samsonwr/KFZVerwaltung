# KFZ Verwaltung

Self-hosted Progressive Web App zur Verwaltung von Fahrzeugen, Servicehistorie und Wartungsplanung.

## Features

- **Fahrzeugverwaltung** – Mehrere Fahrzeuge anlegen, bearbeiten und mit Foto versehen
- **Servicehistorie** – Vollständige Aufzeichnung aller Wartungen mit Teilekosten und Kilometern
- **Wartungsplanung** – Wiederkehrende Wartungsintervalle (km-basiert, zeitbasiert oder beides)
- **Push-Benachrichtigungen** – Erinnerungen bei fälligen Wartungen via Web Push (VAPID)
- **PDF-Export** – Servicehistorie und Wartungspläne als PDF exportieren
- **Dashboard** – Übersicht über alle Fahrzeuge und anstehende Wartungen
- **PWA** – Installierbar auf Desktop und Mobilgeräten, offline-fähig

## Tech Stack

| Bereich    | Technologie                                      |
|------------|--------------------------------------------------|
| Backend    | Python 3.12, FastAPI, SQLAlchemy 2, Alembic      |
| Datenbank  | SQLite                                           |
| Frontend   | TypeScript, Vite, Tailwind CSS                   |
| Push       | pywebpush (VAPID)                                |
| PDF        | ReportLab                                        |
| Deployment | Docker / systemd                                 |

## Schnellstart (Development)

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 5000

# Frontend (neues Terminal)
cd frontend
npm install
npm run dev

# Seed-Daten laden (optional)
cd backend && python scripts/seed.py
```

Die API ist dann erreichbar unter `http://localhost:5000`, das Frontend unter `http://localhost:5173`.

## Docker-Deployment

```bash
# Frontend bauen
cd frontend && npm run build

# Docker starten
docker compose up -d
```

Der Container startet auf Port 5000. Daten werden in benannten Volumes persistiert:
- `vehicle-data` – Datenbank und Uploads
- `vehicle-backups` – Backup-Dateien

## systemd-Installation

```bash
# Systembenutzer anlegen
sudo useradd -r -s /bin/false vehicle-service

# Anwendung installieren
sudo mkdir -p /opt/vehicle-service
sudo cp -r . /opt/vehicle-service/

# Python-Umgebung einrichten
sudo python -m venv /opt/vehicle-service/venv
sudo /opt/vehicle-service/venv/bin/pip install -r /opt/vehicle-service/backend/requirements.txt

# Umgebungsdatei anlegen
sudo cp /opt/vehicle-service/backend/.env.example /opt/vehicle-service/backend/.env
# .env nach Bedarf anpassen (DB_PATH, VAPID-Schlüssel, ...)

# Datenverzeichnisse anlegen
sudo mkdir -p /var/lib/vehicle-service/db /var/lib/vehicle-service/uploads
sudo mkdir -p /var/backups/vehicle-service
sudo chown -R vehicle-service:vehicle-service /var/lib/vehicle-service /var/backups/vehicle-service

# Datenbank initialisieren
sudo -u vehicle-service /opt/vehicle-service/venv/bin/python -m alembic \
  --config /opt/vehicle-service/backend/alembic.ini upgrade head

# Service aktivieren
sudo cp systemd/vehicle-service.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vehicle-service

# Status prüfen
sudo systemctl status vehicle-service
sudo journalctl -u vehicle-service -f
```

## VAPID-Schlüssel generieren

Für Push-Benachrichtigungen werden VAPID-Schlüssel benötigt:

```bash
python -c "from pywebpush import Vapid; v = Vapid(); v.generate_keys(); print('Private:', v.private_pem().decode()); print('Public:', v.public_key.public_bytes_raw().hex())"
```

Die generierten Schlüssel in die `.env`-Datei eintragen (siehe unten).

## Umgebungsvariablen

Datei: `backend/.env`

| Variable            | Standard                                   | Beschreibung                              |
|---------------------|--------------------------------------------|-------------------------------------------|
| `PORT`              | `5000`                                     | Listening-Port des API-Servers            |
| `DB_PATH`           | `/var/lib/vehicle-service/db/vehicles.db`  | Pfad zur SQLite-Datenbank                 |
| `UPLOAD_PATH`       | `/var/lib/vehicle-service/uploads`         | Verzeichnis für Fahrzeugfotos             |
| `BACKUP_PATH`       | `/var/backups/vehicle-service`             | Verzeichnis für Backups                   |
| `VAPID_PRIVATE_KEY` | *(leer)*                                   | VAPID Private Key (PEM) für Web Push      |
| `VAPID_PUBLIC_KEY`  | *(leer)*                                   | VAPID Public Key (Hex) für Web Push       |
| `VAPID_ADMIN_EMAIL` | `admin@localhost`                          | Kontaktadresse für VAPID                  |

Beispiel `.env.example`:

```dotenv
PORT=5000
DB_PATH=/var/lib/vehicle-service/db/vehicles.db
UPLOAD_PATH=/var/lib/vehicle-service/uploads
BACKUP_PATH=/var/backups/vehicle-service
VAPID_PRIVATE_KEY=
VAPID_PUBLIC_KEY=
VAPID_ADMIN_EMAIL=admin@example.com
```

## API-Endpunkte

| Methode | Endpunkt                                          | Beschreibung                              |
|---------|---------------------------------------------------|-------------------------------------------|
| GET     | `/api/v1/dashboard/summary`                       | Dashboard-Zusammenfassung                 |
| GET     | `/api/v1/vehicles`                                | Alle Fahrzeuge auflisten                  |
| POST    | `/api/v1/vehicles`                                | Fahrzeug anlegen                          |
| GET     | `/api/v1/vehicles/{id}`                           | Fahrzeug-Details                          |
| PUT     | `/api/v1/vehicles/{id}`                           | Fahrzeug aktualisieren                    |
| DELETE  | `/api/v1/vehicles/{id}`                           | Fahrzeug löschen                          |
| GET     | `/api/v1/vehicles/{id}/service-records`           | Servicehistorie eines Fahrzeugs           |
| POST    | `/api/v1/vehicles/{id}/service-records`           | Service-Eintrag anlegen                   |
| GET     | `/api/v1/vehicles/{id}/maintenance-plans`         | Wartungspläne eines Fahrzeugs             |
| POST    | `/api/v1/vehicles/{id}/maintenance-plans`         | Wartungsplan anlegen                      |
| GET     | `/api/v1/vehicles/{id}/planned-services`          | Geplante Wartungen eines Fahrzeugs        |
| POST    | `/api/v1/push/subscribe`                          | Push-Subscription registrieren           |
| DELETE  | `/api/v1/push/subscribe`                          | Push-Subscription entfernen              |
| GET     | `/api/v1/vehicles/{id}/export/pdf`                | Servicehistorie als PDF exportieren       |

## Verzeichnisstruktur

```
KFZVerwaltung/
├── backend/
│   ├── app/
│   │   ├── config.py             # Pydantic-Settings (Umgebungsvariablen)
│   │   ├── database.py           # SQLAlchemy Engine, SessionLocal
│   │   ├── main.py               # FastAPI-App, Router-Registrierung
│   │   ├── models/
│   │   │   ├── vehicle.py
│   │   │   ├── maintenance_plan.py
│   │   │   ├── service_record.py
│   │   │   ├── planned_service.py
│   │   │   └── push_subscription.py
│   │   ├── routers/              # API-Endpunkte
│   │   ├── schemas/              # Pydantic Request/Response-Schemas
│   │   ├── services/
│   │   │   ├── planning_engine.py  # Berechnung fälliger Wartungen
│   │   │   └── push_service.py     # Web Push Benachrichtigungen
│   │   └── tasks/                # APScheduler Hintergrundaufgaben
│   ├── alembic/                  # Datenbankmigrationen
│   ├── scripts/
│   │   └── seed.py               # Beispieldaten laden
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/                      # TypeScript/Vue/React-Quellcode
│   ├── public/                   # Statische Assets, manifest.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── systemd/
│   └── vehicle-service.service   # systemd Unit-Datei
├── docker-compose.yml
└── README.md
```
