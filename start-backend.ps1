# Script para iniciar el backend
Write-Host "=== Iniciando Backend ===" -ForegroundColor Green

# Verificar si existe el entorno virtual
if (-not (Test-Path "api\api\venv")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    cd api\api
    python -m venv venv
    cd ..\..
}

# Activar entorno virtual e instalar dependencias
Write-Host "Activando entorno virtual e instalando dependencias..." -ForegroundColor Yellow
cd api\api
& .\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "ADVERTENCIA: No existe archivo .env. Copiando desde .env.example..." -ForegroundColor Red
    Copy-Item .env.example .env
    Write-Host "Por favor, edita el archivo .env con tus credenciales de Azure OpenAI" -ForegroundColor Yellow
    pause
}

# Iniciar servidor
Write-Host "Iniciando servidor FastAPI en http://localhost:5000..." -ForegroundColor Green
uvicorn app.app:app --reload --host 0.0.0.0 --port 5000
