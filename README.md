# PipeDream

> 🏆 Winning solution of the **Técnicas Reunidas × Bravent** challenge at **IndesIAhack 2025**.

PipeDream is an AI-assisted validator for engineering **P&ID drawings**. It compares two PDF versions of the same drawing:

- **MASTER**: the drawing reviewed by hand, with corrections marked in color (red, yellow, blue).
- **DRAFT**: the "final" version that is supposed to apply those corrections.

It detects every marked change, uses a vision model to check whether each one was applied correctly, and returns a per-change report (**PASS / FAIL**) with annotated PDFs (green boxes for correct changes, red for incorrect ones). A chatbot answers questions about the last report.

## How it works

The `/validar-pdf` endpoint chains three stages:

1. **Visual detection** (`OpenCV` + `PyMuPDF`): renders the MASTER, converts it to HSV and thresholds the **saturation** channel, so color marks stand out from the black-and-white drawing. Morphological dilation merges nearby marks and a bounding box is extracted for each change.
2. **Side-by-side crops**: for each box, crops the same region from the MASTER and the DRAFT as PNG images.
3. **AI audit** (`Azure OpenAI`, vision): sends each image pair with a prompt that encodes the color rules (yellow = delete, red = add, blue = instruction, and their combinations) and gets a verdict back as JSON.

## Stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn, PyMuPDF, OpenCV, Azure OpenAI |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Infra | Docker, docker-compose |

## Run it

Requirements: Python 3.10+, Node.js 18+ and an **Azure OpenAI** deployment of a vision model.

```bash
cd api
cp .env.example .env    # fill in AZURE_ENDPOINT, AZURE_API_KEY, API_VERSION, DEPLOYMENT_NAME
```

**Backend** (port 5000):

```bash
./start-backend.sh          # Linux / macOS (.\start-backend.ps1 on Windows)
# or: cd api && docker compose up --build
```

Interactive API docs at `http://localhost:5000/docs`.

**Frontend** (port 3000):

```bash
cd frontend/Hackatonindesia-main
npm install
npm run dev
```

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/validar-pdf` | Takes `master_file` and `draft_file` (multipart). Returns the validation report and the annotated PDFs in base64. |
| `POST` | `/chat` | Takes `{ "mensajes": ["..."] }`. Answers questions about the last report. |

## Project structure

```
PipeDream/
├── api/                            # FastAPI backend
│   └── app/
│       ├── app.py                  # endpoints and pipeline orchestration
│       └── services/
│           ├── vision.py           # change detection (OpenCV) and box drawing
│           ├── pdf_tools.py        # side-by-side crops
│           └── llm_agent.py        # Azure OpenAI client (audit + chat)
├── frontend/Hackatonindesia-main/  # React + Vite UI
└── PipeDream_DataFlow.ipynb        # prototyping notebook
```

## Known limitations

- Only the **first page** of each PDF is processed.
- The chat context is **global state**: the server handles one report at a time, with no per-user isolation.

## Team

Built at IndesIAhack 2025 by Miguel Vera ([@Mveradc](https://github.com/Mveradc)), Alejandro Cuevas, Pablo Alcolea, Mauro Perez and Diego Besada.
