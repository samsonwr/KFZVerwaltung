# ── Stage 1: Frontend bauen ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend + Frontend zusammenführen ───────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# System-Abhängigkeiten für reportlab, pillow und healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python-Abhängigkeiten (gecacht solange requirements.txt unverändert)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend-Code kopieren
COPY backend/ .

# Frontend-Build aus Stage 1 ins Backend einbinden
COPY --from=frontend-builder /frontend/dist ./static/frontend

# Runtime-Verzeichnisse anlegen
RUN mkdir -p /var/lib/vehicle-service/db \
             /var/lib/vehicle-service/uploads \
             /var/backups/vehicle-service

EXPOSE 5000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
