import fitz
import os

def aplicar_margen_seguro(rect, margen, page_width, page_height):
    """
    Expande un rectángulo por un margen dado, asegurándose de no salir
    de los límites de la página.
    """
    nuevo_rect = fitz.Rect(rect)
    nuevo_rect.x0 = max(0, nuevo_rect.x0 - margen)
    nuevo_rect.y0 = max(0, nuevo_rect.y0 - margen)
    nuevo_rect.x1 = min(page_width, nuevo_rect.x1 + margen)
    nuevo_rect.y1 = min(page_height, nuevo_rect.y1 + margen)
    return nuevo_rect

def extraer_secciones_comparativas(path_original, path_modificado, rects, output_folder, zoom=2.0, margen_draft=60):
    """
    Recorta las secciones correspondientes en ambos PDFs.
    
    Args:
        path_original: Ruta del PDF MASTER (con las marcas de revisión en color).
        path_modificado: Ruta del PDF DRAFT (resultado limpio a verificar).
        rects: Lista de objetos fitz.Rect obtenidos en el paso anterior.
        output_folder: Carpeta donde guardar las imágenes recortadas.
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    doc_orig = fitz.open(path_original)
    doc_mod = fitz.open(path_modificado)
    
    # Asumimos que estamos comparando la página 0 con la 0 (ajustar si es multipágina)
    page_orig = doc_orig[0]
    page_mod = doc_mod[0]
    
    matriz = fitz.Matrix(zoom, zoom) # Para alta resolución en el recorte

    pares_rutas = []

    for i, rect in enumerate(rects):
        # --- RECORTE (CLIPPING) ---
        # El método get_pixmap acepta un argumento 'clip' que es el rectángulo en puntos
        pix_orig = page_orig.get_pixmap(matrix=matriz, clip=rect)
        pix_mod = page_mod.get_pixmap(matrix=matriz, clip=aplicar_margen_seguro(rect, margen_draft, page_mod.rect.width, page_mod.rect.height))
        
        # Rutas de salida
        filename_orig = f"{output_folder}/cambio_{i}_original.png"
        filename_mod = f"{output_folder}/cambio_{i}_modificado.png"
        
        # Guardar imágenes
        pix_orig.save(filename_orig)
        pix_mod.save(filename_mod)
        
        pares_rutas.append((filename_orig, filename_mod))

    return pares_rutas