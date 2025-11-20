from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
from .services.vision import detectar_cambios_visuales
from .services.pdf_tools import extraer_secciones_comparativas
from .services.llm_agent import auditar_cambio_visual, generar_respuesta_chat

app = FastAPI(title="PipeDreams - API Validador de Planos IA")

ULTIMO_REPORTE_CONTEXTO = None

# --- MODELOS DE RESPUESTA (Pydantic) ---
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

@app.post("/validar-pdf", response_model=ReporteValidacion)
async def validar_planos(
    master_file: UploadFile = File(...), 
    draft_file: UploadFile = File(...)
):
    global ULTIMO_REPORTE_CONTEXTO
    # 1. Generar un ID único para esta ejecución (para carpetas temporales)
    job_id = master_file.filename.split(".")[0].split("-")[-1]
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
        
        # Simulamos el bucle de procesamiento
        resultados_ia = []
        detalles_respuesta = []
        for i, par in enumerate(pares_rutas):
            analisis = auditar_cambio_visual(par[0], par[1])
            resultados_ia.append(analisis)

            result = DetalleCambio(
                id_cambio=i, 
                tipo_accion=analisis.get("Tipo de instrucción", "UNKNOWN"), 
                veredicto=analisis.get("veredicto", "FAIL"), 
                razonamiento=analisis.get("explicacion", "Sin razonamiento.")
                )

            detalles_respuesta.append(result)

        # 4. Construir respuesta final
        reporte = ReporteValidacion(
            filename=draft_file.filename,
            total_cambios_detectados=len(detalles_respuesta),
            cambios_aprobados=len([d for d in detalles_respuesta if d.veredicto == "APROBADO"]),
            cambios_fallidos=len([d for d in detalles_respuesta if d.veredicto == "FALLIDO"]),
            detalles=detalles_respuesta
        )
        
        ULTIMO_REPORTE_CONTEXTO = reporte.model_dump_json(indent=2)
        
        return reporte

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando PDFs: {str(e)}")
    
    finally:
        # 5. LIMPIEZA
        # Borrar carpeta temporal pase lo que pase
        # shutil.rmtree(temp_dir, ignore_errors=True)
        pass

@app.post("/chat", response_model=str)
async def chat_endpoint(request: list[str]):
    """
    Endpoint de Chatbot con capacidad de Streaming.
    Recibe el historial de mensajes y devuelve la respuesta del LLM token a token.
    """
    global ULTIMO_REPORTE_CONTEXTO
    # Preparamos los mensajes en formato dict para la librería de OpenAI
    formatted_messages = [{"role": "user", "content": msg} for msg in request]

    contexto_actual = ULTIMO_REPORTE_CONTEXTO
    # Llamamos a la función corregida pasando la LISTA, no solo el texto
    respuesta_texto = generar_respuesta_chat(
        formatted_messages,
        datos_pdf_str=contexto_actual
        )
    
    return respuesta_texto
