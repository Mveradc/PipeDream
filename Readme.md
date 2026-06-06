# PipeDream

> 🏆 Solución ganadora del reto propuesto por **Técnicas Reunidas – Bravent** en la **IndesIAhack 2025**.

PipeDream es un **validador de planos de ingeniería P&ID** asistido por IA. Compara dos versiones en PDF de un mismo plano:

- **MASTER**: el plano revisado a mano, con las correcciones marcadas en colores (rojo, amarillo, azul).
- **DRAFT**: la versión "final" que supuestamente aplica esas correcciones.

El sistema detecta automáticamente cada zona modificada, audita con un modelo de visión si el cambio se aplicó correctamente, y devuelve un informe por cambio (**APROBADO / FALLIDO**) junto con los PDFs anotados (recuadros verdes = correctos, rojos = incorrectos). Incluye además un chatbot que responde preguntas sobre el último informe generado.

## Cómo funciona

El endpoint `/validar-pdf` encadena tres etapas:

1. **Detección visual** (`OpenCV` + `PyMuPDF`): renderiza el MASTER, lo pasa a HSV y umbraliza el canal de **saturación** — las marcas de color destacan sobre el dibujo en blanco y negro. Una dilatación morfológica fusiona marcas cercanas y se extraen las cajas de cada cambio.
2. **Recorte comparativo**: por cada caja, recorta la misma región en el MASTER y en el DRAFT a imágenes PNG.
3. **Auditoría con IA** (`Azure OpenAI`, visión): envía cada par de imágenes con un prompt que codifica las reglas de color (amarillo = borrar, rojo = añadir, azul = instrucción, y combinaciones) y devuelve un veredicto en JSON.

## Stack

| Capa     | Tecnologías |
|----------|-------------|
| Backend  | Python 3.11, FastAPI, Uvicorn, PyMuPDF (`fitz`), OpenCV, Azure OpenAI |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI / shadcn |
| Infra    | Docker / docker-compose |

## Requisitos

- Python 3.10+ (el contenedor usa 3.11)
- Node.js 18+ y npm
- Una cuenta de **Azure OpenAI** con un *deployment* de un modelo con visión
- Docker (opcional, para levantar el backend en contenedor)

## Configuración

El backend necesita credenciales de Azure OpenAI. Copia el ejemplo y rellena tus valores:

```bash
cd api
cp .env.example .env
```

Variables (en `api/.env`):

| Variable           | Descripción |
|--------------------|-------------|
| `AZURE_ENDPOINT`   | Endpoint del recurso, **debe terminar en `/`** |
| `AZURE_API_KEY`    | Clave de la API |
| `API_VERSION`      | Versión de la API (p. ej. `2024-02-15-preview`) |
| `DEPLOYMENT_NAME`  | Nombre del *deployment* del modelo |
| `AZURE_VERIFY_SSL` | `false` por defecto (útil tras proxies corporativos); `true` para verificar TLS |

El frontend usa `VITE_API_URL` (por defecto `http://localhost:5000`); copia `frontend/Hackatonindesia-main/.env.example` a `.env` si necesitas cambiarlo.

## Ejecución

### Backend (puerto 5000)

Con los scripts de arranque (crean el venv, instalan dependencias y levantan Uvicorn):

```powershell
.\start-backend.ps1      # Windows
```
```bash
./start-backend.sh       # Linux / macOS
```

Con Docker:

```bash
cd api
docker compose up --build
```

Manualmente:

```bash
cd api
uvicorn app.app:app --reload --host 0.0.0.0 --port 5000
```

Documentación interactiva de la API en `http://localhost:5000/docs`.

### Frontend (puerto 3000)

```powershell
.\start-frontend.ps1
```
```bash
cd frontend/Hackatonindesia-main
npm install
npm run dev
```

## Endpoints

| Método | Ruta           | Descripción |
|--------|----------------|-------------|
| `POST` | `/validar-pdf` | Recibe `master_file` y `draft_file` (multipart). Devuelve el informe de validación y los PDFs anotados en base64. |
| `POST` | `/chat`        | Recibe `{ "mensajes": ["..."] }`. Responde sobre el último informe validado. |

## Estructura

```
PipeDream/
├── api/                     # Backend FastAPI
│   ├── app/
│   │   ├── app.py           # Endpoints y orquestación del pipeline
│   │   └── services/
│   │       ├── vision.py    # Detección de cambios (OpenCV) y dibujo de cajas
│   │       ├── pdf_tools.py # Recorte de secciones comparativas
│   │       └── llm_agent.py # Cliente Azure OpenAI (auditoría + chat)
│   ├── Dockerfile
│   └── docker-compose.yaml
├── frontend/Hackatonindesia-main/   # UI React + Vite
└── PipeDream_DataFlow.ipynb         # Notebook de prototipado
```

## Limitaciones conocidas

- Solo se procesa la **primera página** de cada PDF.
- El contexto del chat es un **estado global**: el servidor atiende un informe a la vez (sin aislamiento por usuario).
