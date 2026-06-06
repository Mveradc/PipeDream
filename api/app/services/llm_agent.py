import base64
import json
import os
import httpx
from openai import AzureOpenAI

# --- TUS DATOS DE AZURE ---
# Asegúrate de que el ENDPOINT termine en / (barra)
AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT")
AZURE_API_KEY = os.getenv("AZURE_API_KEY")
API_VERSION = os.getenv("API_VERSION")
DEPLOYMENT_NAME = os.getenv("DEPLOYMENT_NAME")

# verify se controla por entorno: por defecto se desactiva la verificación SSL
# (necesario tras proxies corporativos), pero se puede activar con AZURE_VERIFY_SSL=true.
VERIFY_SSL = os.getenv("AZURE_VERIFY_SSL", "false").lower() == "true"
# timeout para que una llamada colgada al LLM no bloquee la petición indefinidamente
cliente_inseguro = httpx.Client(verify=VERIFY_SSL, timeout=60.0)

# Cliente global (se inicializa de forma lazy)
_client = None

def get_client():
    """Obtiene o crea el cliente de Azure OpenAI"""
    global _client
    if _client is None:
        if not AZURE_API_KEY:
            raise ValueError(
                "No se encontraron las credenciales de Azure OpenAI. "
                "Asegúrate de tener un archivo .env con AZURE_ENDPOINT, AZURE_API_KEY, API_VERSION y DEPLOYMENT_NAME"
            )
        _client = AzureOpenAI(
            azure_endpoint=AZURE_ENDPOINT,
            api_key=AZURE_API_KEY,
            api_version=API_VERSION,
            http_client=cliente_inseguro
        )
    return _client

def codificar_imagen(ruta_imagen):
    """Codifica imagen a Base64."""
    with open(ruta_imagen, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def auditar_cambio_visual(ruta_master, ruta_draft):
    print(f"Comparando:\n   A: {ruta_master}\n   B: {ruta_draft} ...")
    
    try:
        img_master_b64 = codificar_imagen(ruta_master)
        img_draft_b64 = codificar_imagen(ruta_draft)
    except FileNotFoundError as e:
        return {"veredicto": "ERROR", "explicacion": f"No encuentro el archivo: {e}"}

    # --- EL PROMPT DEL AUDITOR ---
    prompt_auditor = """
    Actúa como un Ingeniero Senior de Control de Calidad (QA) especializado en planos de ingeniería (P&ID). 
    Tu tarea es auditar rigurosamente si las correcciones marcadas en el plano "MASTER" se han ejecutado correctamente en el plano "DRAFT".

    INPUT:
    Recibirás dos imágenes recortadas de la misma zona del plano:
    1. IMAGEN MASTER: Contiene las marcas de revisión en colores (Rojo, Amarillo, Azul).
    2. IMAGEN DRAFT: Contiene el resultado limpio (en blanco y negro).

    Ten en cuenta que las elipses en azul con un texto dentro como: C0... o GEN... son instrucciones técnicas por lo que no las tengas en cuenta, por lo que no incluyas el color azul si la elipse es la única azul que hay.

    REGLAS DE LÓGICA Y COLORES (Prioridad Absoluta):

    Debes identificar qué combinación de colores aparece en el MASTER y aplicar SU regla específica:

    CASO 1: SOLO AMARILLO (Eliminación Simple)
    - Intención: Borrar el objeto existente.
    - Verificación: Comprueba que el objeto resaltado/tachado en amarillo en el MASTER ha desaparecido completamente en el FINAL.

    CASO 2: SOLO ROJO (Adición Simple)
    - Intención: Añadir un nuevo objeto.
    - Verificación: Comprueba que lo dibujado en rojo en el MASTER aparece dibujado en tinta NEGRA en el DRAFT.

    CASO 3: SOLO AZUL (Instrucción/Metadatos)
    - Intención: Ejecutar una orden técnica (ej: "Delete Tracing", "Ver Detalle").
    - Verificación: Lee la instrucción azul y verifica visualmente si el DRAFT cumple esa condición lógica.

    CASO 4: ROJO + AMARILLO (Sustitución)
    - Intención: Reemplazar lo viejo por lo nuevo.
    - Verificación: Debes cumplir DOS condiciones:
      1. El objeto amarillo debe haber desaparecido.
      2. El objeto rojo debe aparecer (en negro) en el DRAFT, reemplazando lo amarillo.

    CASO 5: ROJO + AZUL (Adición Guiada)
    - Intención: Añadir un objeto siguiendo una directriz espacial o lógica específica.
    - Verificación: Comprueba que el objeto rojo aparece en el DRAFT (en negro) Y que su posición coincide con la indicación azul.

    CASO 6: ROJO + AMARILLO + AZUL (Sustitución Compleja Guiada)
    - Intención: Borrar lo viejo y colocar lo nuevo siguiendo instrucciones precisas.
    - Verificación: Debes cumplir TRES condiciones:
      1. El objeto amarillo ha sido eliminado.
      2. El objeto rojo aparece en el DRAFT (en negro).
      3. La colocación cumple la instrucción azul.

    SALIDA REQUERIDA (Formato JSON Estricto):
    Devuelve SOLO este JSON:
    {
      "colores_detectados": ["Rojo", "Amarillo", "Azul"], 
      "Tipo de instrucción": ["TEXT_MOD", "SYMBOL_ADD", "SYMBOL_DEL", "INSTR_TRACING", "COMPLEX_REPLACE"],
      "caso_identificado": "CASO X (Nombre del caso)",
      "veredicto": "APROBADO" o "FALLIDO",
      "confianza": 0-100,
      "explicacion": "Breve justificación técnica."
    }
    """

    try:
        client = get_client()
        response = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "Eres un auditor de planos estricto. Responde solo en JSON."},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt_auditor},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_master_b64}"}},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_draft_b64}"}}
                ]}
            ],
            temperature=0.0,
            max_completion_tokens=800,
            response_format={"type": "json_object"}
        )
        
        # Limpieza y parseo del JSON
        texto = response.choices[0].message.content
        texto_limpio = texto.replace("```json", "").replace("```", "").strip()
        return json.loads(texto_limpio)

    except Exception as e:
        print(f"Error en la auditoría: {e}")
        return {"veredicto": "ERROR", "explicacion": str(e)}
    
def generar_respuesta_chat(messages_history, datos_pdf_str=None, temperature=0.7):
    """
    Genera una respuesta síncrona.
    Args:
        messages_history: Lista de dicts [{'role': 'user', 'content': '...'}, ...]
        datos_pdf_str: String con el resumen de los cambios (JSON o texto)
    """
    
    # 1. Construimos el System Prompt Dinámico
    prompt_base = """
    ### ROL
    Eres un Asistente Técnico de Ingeniería especializado en Control de Calidad (QA) de diagramas P&ID (Piping and Instrumentation Diagrams) y planos industriales. Tu objetivo es asistir al ingeniero responsable en la revisión de las modificaciones realizadas entre un plano "Borrador" (con anotaciones manuales) y un plano "Master" (versión final).

    ### CONTEXTO
    Dispones de información sobre una serie de cambios detectados automáticamente por un sistema de visión artificial. Cada cambio tiene un estado de validación (PASS/FAIL) basado en si la modificación solicitada se implementó correctamente.

    ### INSTRUCCIONES PRINCIPALES
    1. **Estilo de Comunicación:** Sé técnico, preciso, conciso y profesional. Usa terminología de ingeniería adecuada (válvulas, líneas, tags, bridas, isométricos).
    2. **Análisis de Errores (FAIL):** Si el usuario pregunta por un cambio marcado como "FAIL", explica la discrepancia. Por ejemplo: "La anotación pedía una válvula de bola, pero en el plano final aparece una de compuerta".
    3. **Validación de Aprobados (PASS):** Confirma que la acción (ADD, DELETE, MODIFY) coincide con la intención visual detectada.
    4. **Seguridad:** Nunca inventes información técnica crítica que no esté en el contexto. Si no tienes datos sobre una presión o diámetro específico, indícalo claramente.
    5. **Navegación:** Guía al usuario a través de los cambios. Si hay muchos errores, sugiere empezar por los más críticos.

    ### FORMATO DE RESPUESTA
    - Usa listas (bullets) para enumerar cambios.
    - Usa **negritas** para resaltar IDs de cambios, Tags de equipos y veredictos (PASS/FAIL).

    ### OBJETIVO FINAL
    Ayudar al ingeniero a cerrar la revisión del plano lo más rápido posible, asegurando que ninguna modificación incorrecta pase a producción.
    """

    # Si tenemos datos del PDF, los pegamos al prompt
    if datos_pdf_str:
        prompt_completo = prompt_base + f"\n\n### DATOS TÉCNICOS DEL REPORTE:\n{datos_pdf_str}"
    else:
        prompt_completo = prompt_base + "\n\n### AVISO: El usuario aún no ha proporcionado el reporte de cambios."

    # 2. Construimos la estructura correcta de mensajes para OpenAI
    # Primero el sistema, luego toda la conversación previa
    mensajes_para_api = [
        {"role": "system", "content": prompt_completo}
    ] + messages_history 

    try:
        client = get_client()
        response = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=mensajes_para_api, # <--- Pasamos la lista limpia
            temperature=temperature, 
            max_completion_tokens=300,
        )

        texto = response.choices[0].message.content
        return texto

    except Exception as e:
        return f"Error generando respuesta: {str(e)}"