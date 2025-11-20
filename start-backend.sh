#!/bin/bash

# Script para iniciar el backend en Linux/Mac
echo "=== Iniciando Backend - PipeDreams ==="
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

# Verificar que Python está instalado
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: Python3 no está instalado${NC}"
    echo -e "${YELLOW}Por favor, instala Python 3.10 o superior${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}Python encontrado: $PYTHON_VERSION${NC}"

# Navegar a la carpeta api
cd api

# Eliminar entornos virtuales viejos si existen
if [ -d "venv" ]; then
    echo -e "${YELLOW}Eliminando entorno virtual anterior...${NC}"
    rm -rf venv
fi
if [ -d "api/venv" ]; then
    rm -rf api/venv
fi

# Crear entorno virtual
echo -e "${YELLOW}Creando entorno virtual...${NC}"
python3 -m venv venv

if [ ! -f "venv/bin/python" ]; then
    echo -e "${RED}ERROR: No se pudo crear el entorno virtual${NC}"
    exit 1
fi

# Activar entorno virtual
echo -e "${YELLOW}Activando entorno virtual...${NC}"
source venv/bin/activate

# Actualizar pip
echo -e "${YELLOW}Actualizando pip...${NC}"
python -m pip install --upgrade pip --quiet

# Instalar dependencias
echo -e "${YELLOW}Instalando dependencias...${NC}"
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Fallo al instalar dependencias${NC}"
        exit 1
    fi
else
    echo -e "${RED}ERROR: No se encuentra requirements.txt${NC}"
    exit 1
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo ""
    echo -e "${RED}ADVERTENCIA: No existe archivo .env${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}Se ha creado .env desde .env.example${NC}"
        echo ""
        echo -e "${YELLOW}IMPORTANTE: Debes editar api/.env con tus credenciales de Azure OpenAI:${NC}"
        echo -e "${CYAN}  - AZURE_ENDPOINT${NC}"
        echo -e "${CYAN}  - AZURE_API_KEY${NC}"
        echo -e "${CYAN}  - API_VERSION${NC}"
        echo -e "${CYAN}  - DEPLOYMENT_NAME${NC}"
        echo ""
        echo -e "${YELLOW}Presiona Enter después de editar el archivo .env...${NC}"
        read -p ""
    else
        echo -e "${RED}ERROR: No se encuentra .env.example${NC}"
        echo -e "${YELLOW}Crea manualmente el archivo api/.env con las credenciales de Azure OpenAI${NC}"
        exit 1
    fi
fi

# Crear directorio temp si no existe
if [ ! -d "temp" ]; then
    mkdir -p temp
fi

# Iniciar servidor
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Iniciando servidor FastAPI...${NC}"
echo -e "${CYAN}URL: http://localhost:8000${NC}"
echo -e "${CYAN}Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener el servidor${NC}"
echo ""

uvicorn app.app:app --reload --host 127.0.0.1 --port 8000
