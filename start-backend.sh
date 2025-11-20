#!/bin/bash

echo "=== Iniciando Backend ==="

# Verificar si existe el entorno virtual
if [ ! -d "api/api/venv" ]; then
    echo "Creando entorno virtual..."
    cd api/api
    python3 -m venv venv
    cd ../..
fi

echo "Activando entorno virtual e instalando dependencias..."
cd api/api

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "ADVERTENCIA: No existe archivo .env. Copiando desde .env.example..."
    cp .env.example .env
    echo "Por favor edita el archivo .env con tus credenciales."
fi

# Iniciar servidor
echo "Iniciando servidor FastAPI en http://localhost:8000..."
uvicorn app.app:app --reload --host 0.0.0.0 --port 8000
