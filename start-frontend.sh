#!/bin/bash

# Script para iniciar el frontend en Linux/Mac
echo "=== Iniciando Frontend - PipeDreams ==="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Obtener el directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js no está instalado${NC}"
    echo -e "${YELLOW}Por favor, instala Node.js 18 o superior desde https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}Node.js encontrado: $NODE_VERSION${NC}"

# Navegar a la carpeta frontend
cd frontend/Hackatonindesia-main

# Verificar si existen node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias de Node.js...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Fallo al instalar dependencias${NC}"
        exit 1
    fi
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}ADVERTENCIA: No existe archivo .env${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}Se ha creado .env desde .env.example${NC}"
    fi
fi

# Iniciar servidor de desarrollo
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Iniciando servidor Vite...${NC}"
echo -e "${CYAN}URL: http://localhost:5173${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener el servidor${NC}"
echo ""

npm run dev
