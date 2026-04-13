FROM python:3.12-slim

WORKDIR /app

# System dependencies für reportlab und pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Verzeichnisse anlegen
RUN mkdir -p /var/lib/vehicle-service/db \
             /var/lib/vehicle-service/uploads \
             /var/backups/vehicle-service

# Frontend build kopieren (falls vorhanden)
RUN mkdir -p static/frontend

EXPOSE 5000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
