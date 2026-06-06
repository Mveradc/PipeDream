# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PipeDream is an AI validator for engineering P&ID plans (diagramas P&ID), built for the IndesIAhack 2025 hackathon. It compares two PDF versions of a plan — a hand-annotated **MASTER** (with colored revision marks) and a clean **DRAFT** (the supposed final) — and audits whether each marked change was correctly applied. Output is a per-change PASS/FAIL report plus annotated PDFs. A chatbot answers questions about the last report.

The codebase, comments, prompts, and API field names are in **Spanish**. Match that convention when editing.

## Architecture

Two independent apps:

- **`api/`** — FastAPI backend (Python 3.11). The whole pipeline lives in `api/app/`.
- **`frontend/Hackatonindesia-main/`** — React 18 + Vite + TypeScript + Tailwind UI. Note the build tooling (`package.json`, `vite.config.ts`) is in this nested subfolder, **not** at `frontend/`.

### Backend pipeline (the core logic)

`api/app/app.py` exposes two endpoints and orchestrates everything. The `/validar-pdf` flow chains three services in order:

1. **`services/vision.py` — `detectar_cambios_visuales`**: renders the MASTER PDF to an image (PyMuPDF/`fitz`), converts to HSV, and thresholds on the **saturation** channel — colored revision marks are saturated, the black/white drawing is not. Morphological dilation merges nearby marks into blobs, then `findContours` produces bounding boxes (in PDF points, after dividing out the render `zoom`). Returns a list of `fitz.Rect`.
2. **`services/pdf_tools.py` — `extraer_secciones_comparativas`**: for each bbox, crops the same region from both the MASTER and DRAFT PDFs into PNG pairs. The DRAFT crop is expanded by a safety margin (`margen_draft`) so context isn't lost.
3. **`services/llm_agent.py` — `auditar_cambio_visual`**: sends each MASTER/DRAFT image pair to **Azure OpenAI** (vision) with a detailed QA-auditor prompt encoding the color rules (Yellow = delete, Red = add, Blue = instruction/metadata, and combinations). Returns strict JSON with `veredicto` (`APROBADO`/`FALLIDO`), `colores_detectados`, `caso_identificado`, etc.

After auditing, `vision.dibujar_rectangulos_en_pdf` redraws boxes on the PDFs in green (approved) / red (failed), layering correct then incorrect onto MASTER and DRAFT copies under `temp/<job_id>/bbox/`.

The full report JSON is stashed in the module-global `ULTIMO_REPORTE_CONTEXTO`, which the `/chat` endpoint injects into the chatbot's system prompt (`llm_agent.generar_respuesta_chat`) so questions are grounded in the last validation.

After auditing, the response also carries the annotated MASTER/DRAFT PDFs (`MASTER_tot.pdf`/`DRAFT_tot.pdf`) as base64 data URIs in `master_bbox`/`draft_bbox`, so the frontend can render the visual result.

Key consequences to be aware of:
- State is a **single global**, so the server handles one report at a time — no per-session/per-user isolation.
- Pipeline assumes **page 0 only**; multi-page plans are not handled.
- `job_id` is a random `uuid4().hex` per request; the `temp/<job_id>` folder is deleted in the `finally` block after the annotated PDFs have been read into base64.

### Azure OpenAI config

`llm_agent.py` reads credentials from env vars (loaded from `api/.env`, see `api/.env.example`): `AZURE_ENDPOINT`, `AZURE_API_KEY`, `API_VERSION`, `DEPLOYMENT_NAME`. The endpoint must end in `/`. The client is created lazily. SSL verification defaults to **off** (for corporate proxies) but is controlled by `AZURE_VERIFY_SSL` (set `true` to enable); the httpx client also has a 60s timeout.

### Frontend

`src/App.tsx` is the root; UI is split into `Header`, `PlanoViewer` (PDF upload/view), `MetricsGrid` (report), `ChatBot`, `FileHistory`. `src/services/api.ts` is the only backend touchpoint — `validarPlanos` POSTs both PDFs as multipart form fields named `master_file`/`draft_file`; `enviarMensajeChat` POSTs `{ mensajes: [...] }`. `src/components/ui/` is a large shadcn/Radix component library — generally don't hand-edit these.

## Running

**Backend** (from repo root):
```powershell
.\start-backend.ps1        # creates venv, installs requirements, runs uvicorn on :5000
```
Or via Docker (from `api/`): `docker compose up --build` (also serves on `:5000`).
Or manually (from `api/`): `uvicorn app.app:app --reload --host 0.0.0.0 --port 5000`.

**Frontend** (from repo root):
```powershell
.\start-frontend.ps1       # npm install + npm run dev
```
Or from `frontend/Hackatonindesia-main/`: `npm run dev` (Vite), `npm run build` (production build to `build/`).

There is **no test suite, linter, or formatter** configured in this repo.

## Ports / URLs

- Backend listens on **5000** everywhere now (both start scripts, Docker, manual, `api.ts` default, and `frontend/.env.example`).
- Frontend dev server runs on **3000** (`vite.config.ts`, `open: true`). CORS in `app.py` allows `localhost:3000` and `localhost:5173`, so the legacy 5173 also works.

## Notebook

`PipeDream_DataFlow.ipynb` at the repo root is the exploratory/prototyping notebook the production services were derived from.
