import fitz
import cv2
import numpy as np

# --- Parámetros de detección (los que más afectan al resultado) ---
SATURACION_MINIMA = 20   # umbral HSV: por debajo se considera gris/negro (sin marca)
DILATACION_ITERS = 2     # nº de pasadas de dilatación para fusionar marcas cercanas
AREA_MINIMA = 500        # área (px²) mínima de un contorno para no descartarlo como ruido

def detectar_cambios_visuales(pdf_path, output_path, zoom=2.0, kernel_size=15):
    """
    Parametros:
    pdf_path: Ruta del PDF a procesar.
    output_path: Ruta del PDF de salida con las marcas de cambio.
    zoom: Factor de zoom para mejorar la calidad de la imagen.
    kernel_size: Tamaño del kernel para la dilatación (fusionar elementos cercanos
    Returns:
    None

    Detecta cambios basándose en visión artificial (saturación de color) y fusión morfológica.
    """
    print(f"1. Procesando '{pdf_path}'...")
    doc = fitz.open(pdf_path)
    pagina = doc[0] # Primera página
    bboxes_finales = []

    # --- RENDERIZADO A IMAGEN ---
    # Renderizamos con zoom para tener buena calidad
    matriz = fitz.Matrix(zoom, zoom)
    pix = pagina.get_pixmap(matrix=matriz)
    
    # Convertimos de formato PyMuPDF a formato OpenCV (numpy array)
    img_data = np.frombuffer(pix.samples, dtype=np.uint8)
    img = img_data.reshape(pix.h, pix.w, pix.n)
    
    # Si tiene canal alfa (transparencia), lo quitamos, si no, convertimos RGB a BGR
    if pix.n >= 4:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
    else:
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # --- DETECCIÓN DE COLOR (Saturación) ---
    # Convertimos a espacio HSV (Matiz, Saturación, Valor)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Extraemos el canal de Saturación (S)
    # Los grises/negros/blancos tienen S muy baja (cerca de 0).
    # Los colores vivos tienen S alta.
    saturacion = hsv[:, :, 1]
    
    # Filtramos: Nos quedamos con todo lo que tenga saturación > umbral (ajustable)
    _, mask = cv2.threshold(saturacion, SATURACION_MINIMA, 255, cv2.THRESH_BINARY)

    # --- FUSIÓN (Dilatación) ---
    # Aquí ocurre la magia: Expandimos lo blanco para unir islas cercanas
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    mask_dilatada = cv2.dilate(mask, kernel, iterations=DILATACION_ITERS)

    # --- ENCONTRAR CONTORNOS ---
    contornos, _ = cv2.findContours(mask_dilatada, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"   -> Se han detectado {len(contornos)} áreas de cambio potenciales.")

    # --- DIBUJAR EN EL PDF ORIGINAL ---
    shape = pagina.new_shape()
    contador_cambios = 0

    for cnt in contornos:
        # Obtenemos el rectángulo en píxeles de la imagen
        x, y, w, h = cv2.boundingRect(cnt)
        
        # Filtro de ruido: Si el área es muy pequeña, la ignoramos
        if w * h < AREA_MINIMA:
            continue

        # Convertimos coordenadas de Píxeles (Imagen) a Puntos (PDF)
        # Dividimos por el zoom que aplicamos al principio
        rect_pdf = fitz.Rect(x / zoom, y / zoom, (x + w) / zoom, (y + h) / zoom)
        bboxes_finales.append(rect_pdf)

        # Dibujamos
        shape.draw_rect(rect_pdf)
        shape.insert_text((rect_pdf.x0, rect_pdf.y0 - 5), f"Mod {contador_cambios+1}", color=(0, 1, 0))
        contador_cambios += 1

    shape.finish(color=(0, 1, 0), width=1.5)
    shape.commit()
    
    doc.save(output_path)
    print(f"¡HECHO! Se han marcado {contador_cambios} grupos finales en '{output_path}'")

    return bboxes_finales

def dibujar_rectangulos_en_pdf(pdf_path: str, rects: list, output_path: str, correct: bool = True):
    """
    Dibuja rectángulos en un PDF y los colorea según el parámetro 'correct':
      - correct=True  -> verde
      - correct=False -> rojo

    rects = [(x1, y1, x2, y2), ...]
    """

    # Colores RGB
    verde = (0, 1, 0)
    rojo = (1, 0, 0)

    color = verde if correct else rojo

    doc = fitz.open(pdf_path)
    page = doc[0]
    shape = page.new_shape()
    for r in rects:
        x1, y1, x2, y2 = r
        rect = fitz.Rect(x1, y1, x2, y2)
        shape.draw_rect(rect)

    shape.finish(color=color, width=2)
    shape.commit()

    doc.save(output_path)
    
    return output_path
