# Script para iniciar el frontend
Write-Host "=== Iniciando Frontend ===" -ForegroundColor Green

cd frontend\Hackatonindesia-main

# Verificar si existen node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias de Node.js..." -ForegroundColor Yellow
    npm install
}

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "ADVERTENCIA: No existe archivo .env. Copiando desde .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

# Iniciar servidor de desarrollo
Write-Host "Iniciando servidor Vite en http://localhost:3000..." -ForegroundColor Green
npm run dev
