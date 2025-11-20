#!/bin/bash

echo "=== Iniciando Frontend ==="

cd frontend/Hackatonindesia-main || exit 1

# Verificar si existen node_modules
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias de Node.js..."
    npm install
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "ADVERTENCIA: No existe archivo .env. Copiando desde .env.example..."
    cp .env.example .env
fi

# Iniciar servidor de desarrollo
echo "Iniciando servidor Vite en http://localhost:5173..."
npm run dev
