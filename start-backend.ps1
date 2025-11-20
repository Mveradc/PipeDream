# Script para iniciar el backend
Write-Host "=== Iniciando Backend - PipeDreams ===" -ForegroundColor Green
Write-Host ""

# Navegar al directorio del script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Verificar que Python está instalado
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Por favor, instala Python 3.10 o superior desde https://www.python.org" -ForegroundColor Yellow
    pause
    exit 1
}

# Navegar a la carpeta api
Set-Location api

# Eliminar entornos virtuales viejos si existen
if (Test-Path "venv") {
    Write-Host "Eliminando entorno virtual anterior..." -ForegroundColor Yellow
    Remove-Item -Path "venv" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "api\venv") {
    Remove-Item -Path "api\venv" -Recurse -Force -ErrorAction SilentlyContinue
}

# Crear entorno virtual
Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
python -m venv venv

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "ERROR: No se pudo crear el entorno virtual" -ForegroundColor Red
    pause
    exit 1
}

# Activar entorno virtual
Write-Host "Activando entorno virtual..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Actualizar pip
Write-Host "Actualizando pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet

# Instalar dependencias
Write-Host "Instalando dependencias..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Fallo al instalar dependencias" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "ERROR: No se encuentra requirements.txt" -ForegroundColor Red
    pause
    exit 1
}

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "ADVERTENCIA: No existe archivo .env" -ForegroundColor Red
    if (Test-Path ".env.example") {
        Copy-Item .env.example .env
        Write-Host "Se ha creado .env desde .env.example" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "IMPORTANTE: Debes editar api/.env con tus credenciales de Azure OpenAI:" -ForegroundColor Yellow
        Write-Host "  - AZURE_ENDPOINT" -ForegroundColor Cyan
        Write-Host "  - AZURE_API_KEY" -ForegroundColor Cyan
        Write-Host "  - API_VERSION" -ForegroundColor Cyan
        Write-Host "  - DEPLOYMENT_NAME" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Presiona Enter después de editar el archivo .env..." -ForegroundColor Yellow
        pause
    } else {
        Write-Host "ERROR: No se encuentra .env.example" -ForegroundColor Red
        Write-Host "Crea manualmente el archivo api/.env con las credenciales de Azure OpenAI" -ForegroundColor Yellow
        pause
        exit 1
    }
}

# Crear directorio temp si no existe
if (-not (Test-Path "temp")) {
    New-Item -ItemType Directory -Path "temp" -Force | Out-Null
}

# Iniciar servidor
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Iniciando servidor FastAPI..." -ForegroundColor Green
Write-Host "URL: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

uvicorn app.app:app --reload --host 127.0.0.1 --port 8000
