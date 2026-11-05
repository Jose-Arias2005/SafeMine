# ==============================================================================
# SafeMine AI - Backend Dockerfile (Production Ready for AWS EC2)
# ==============================================================================
FROM python:3.11-slim

# Evitar generación de archivos .pyc y habilitar logs en tiempo real sin búfer
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar herramientas básicas del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY . .

# Asegurar existencia del directorio de uploads
RUN mkdir -p uploads

# Exponer el puerto del backend FastAPI
EXPOSE 8000

# Ejecutar Uvicorn en producción
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

