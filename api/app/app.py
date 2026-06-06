from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import base64
import logging
import uuid
from dotenv import load_dotenv
load_dotenv()
from .services.vision import detectar_cambios_visuales, dibujar_rectangulos_en_pdf
from .services.pdf_tools import extraer_secciones_comparativas
from .services.llm_agent import auditar_cambio_visual, generar_respuesta_chat

logger = logging.getLogger("pipedreams")

app = FastAPI(title="PipeDreams - API Validador de Planos IA")


def _pdf_a_base64(ruta_pdf: str) -> Optional[str]:
    """Lee un PDF y lo devuelve como data URI base64 (o None si no existe)."""
    if not os.path.exists(ruta_pdf):
        return None
    with open(ruta_pdf, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    return f"data:application/pdf;base64,{b64}"

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ULTIMO_REPORTE_CONTEXTO = None

# --- MODELOS DE RESPUESTA (Pydantic) ---
class ChatRequest(BaseModel):
    mensajes: List[str]

class DetalleCambio(BaseModel):
    id_cambio: int
    tipo_accion: str | list[str] # ADD, DELETE, MODIFY
    veredicto: str    # PASS, FAIL
    razonamiento: str

class ReporteValidacion(BaseModel):
    filename: str
    total_cambios_detectados: int
    cambios_aprobados: int
    cambios_fallidos: int
    detalles: List[DetalleCambio]
    master_bbox: Optional[str] = None
    draft_bbox: Optional[str] = None

def _validar_es_pdf(archivo: UploadFile):
    """Comprueba que el fichero subido sea un PDF; lanza 400 si no lo es."""
    nombre = (archivo.filename or "").lower()
    es_pdf = nombre.endswith(".pdf") or archivo.content_type == "application/pdf"
    if not es_pdf:
        raise HTTPException(
            status_code=400,
            detail=f"El fichero '{archivo.filename}' no es un PDF válido.",
        )


@app.post("/validar-pdf", response_model=ReporteValidacion)
def validar_planos(
    master_file: UploadFile = File(...),
    draft_file: UploadFile = File(...)
):
    global ULTIMO_REPORTE_CONTEXTO
    # 0. Validar que ambos ficheros son PDFs antes de tocar disco
    _validar_es_pdf(master_file)
    _validar_es_pdf(draft_file)

    # 1. ID único e impredecible por ejecución (evita colisiones y path traversal
    #    derivados del nombre de fichero que controla el cliente)
    job_id = uuid.uuid4().hex
    temp_dir = f"temp/{job_id}"
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # 2. Guardar ficheros en disco (mejor que en RAM para PDFs grandes)
        path_master = f"{temp_dir}/master.pdf"
        path_draft = f"{temp_dir}/draft.pdf"
        
        with open(path_master, "wb") as buffer:
            shutil.copyfileobj(master_file.file, buffer)
        with open(path_draft, "wb") as buffer:
            shutil.copyfileobj(draft_file.file, buffer)

        # 3. LLAMADA A TUS SCRIPTS DE PROCESAMIENTO
        
        # Paso A: Detectar (OpenCV)
        rects = detectar_cambios_visuales(path_master, temp_dir + "/bboxes.pdf")
        
        # Paso B: Recortar y Analizar con IA (Iteración)
        pares_rutas = extraer_secciones_comparativas(
            path_master,
            path_draft,
            rects,
            temp_dir + "/secciones"
            )
        
        # Bucle de auditoría: una llamada a la IA por cada zona de cambio
        detalles_respuesta = []
        lista_incorrectas = []
        lista_correctas = []
        for i, par in enumerate(pares_rutas):
            analisis = auditar_cambio_visual(par[0], par[1])
            veredicto = analisis.get("veredicto", "ERROR")
            if veredicto == "APROBADO":
                lista_correctas.append(rects[i])
            elif veredicto == "FALLIDO":
                lista_incorrectas.append(rects[i])
            # veredicto == "ERROR" -> ni aprobado ni fallido, pero se reporta

            detalles_respuesta.append(DetalleCambio(
                id_cambio=i,
                tipo_accion=analisis.get("Tipo de instrucción", "UNKNOWN"),
                veredicto=veredicto,
                razonamiento=analisis.get("explicacion", "Sin razonamiento."),
            ))

        os.makedirs(temp_dir + "/bbox/", exist_ok=True)
        master_tot = temp_dir + "/bbox/MASTER_tot.pdf"
        draft_tot = temp_dir + "/bbox/DRAFT_tot.pdf"
        dibujar_rectangulos_en_pdf(path_master, lista_correctas, temp_dir + "/bbox/MASTER_corr.pdf", correct=True)
        dibujar_rectangulos_en_pdf(path_draft, lista_correctas, temp_dir + "/bbox/DRAFT_corr.pdf", correct=True)
        dibujar_rectangulos_en_pdf(temp_dir + "/bbox/MASTER_corr.pdf", lista_incorrectas, master_tot, correct=False)
        dibujar_rectangulos_en_pdf(temp_dir + "/bbox/DRAFT_corr.pdf", lista_incorrectas, draft_tot, correct=False)

        # 4. Construir respuesta final (incluye los PDFs anotados en base64
        #    para que el frontend pueda mostrar el resultado visual)
        reporte = ReporteValidacion(
            filename=draft_file.filename,
            total_cambios_detectados=len(detalles_respuesta),
            cambios_aprobados=len([d for d in detalles_respuesta if d.veredicto == "APROBADO"]),
            cambios_fallidos=len([d for d in detalles_respuesta if d.veredicto == "FALLIDO"]),
            detalles=detalles_respuesta,
            master_bbox=_pdf_a_base64(master_tot),
            draft_bbox=_pdf_a_base64(draft_tot),
        )

        # Para el chat solo guardamos los datos textuales (sin los PDFs base64,
        # que inflarían el contexto del LLM sin aportar nada)
        ULTIMO_REPORTE_CONTEXTO = reporte.model_dump_json(
            indent=2, exclude={"master_bbox", "draft_bbox"}
        )

        return reporte

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error procesando PDFs (job_id=%s)", job_id)
        raise HTTPException(
            status_code=500,
            detail="Error interno procesando los PDFs. Revisa los logs del servidor.",
        )

    finally:
        # 5. LIMPIEZA: borrar la carpeta temporal pase lo que pase. Los PDFs ya
        #    se han leído a base64 en el reporte, así que es seguro eliminarlos.
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/chat", response_model=str)
def chat_endpoint(body: ChatRequest):
    """
    Endpoint de Chatbot con capacidad de Streaming.
    Recibe el historial de mensajes y devuelve la respuesta del LLM token a token.
    """
    print(f"--> Chat endpoint llamado. Mensajes: {len(body.mensajes)}")
    global ULTIMO_REPORTE_CONTEXTO
    # Preparamos los mensajes en formato dict para la librería de OpenAI
    formatted_messages = [{"role": "user", "content": msg} for msg in body.mensajes]

    contexto_actual = ULTIMO_REPORTE_CONTEXTO
    # Llamamos a la función corregida pasando la LISTA, no solo el texto
    respuesta_texto = generar_respuesta_chat(
        formatted_messages,
        datos_pdf_str=contexto_actual
        )
    
    return respuesta_texto
