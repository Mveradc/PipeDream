// Configuración de la API
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

// Tipos de respuesta
export interface DetalleCambio {
  id_cambio: number;
  tipo_accion: string | string[];
  veredicto: string;
  razonamiento: string;
}

export interface ReporteValidacion {
  filename: string;
  total_cambios_detectados: number;
  cambios_aprobados: number;
  cambios_fallidos: number;
  detalles: DetalleCambio[];
}

/**
 * Envía dos PDFs al backend para validación y comparación
 */
export async function validarPlanos(
  masterFile: File,
  draftFile: File
): Promise<ReporteValidacion> {
  const formData = new FormData();
  formData.append('master_file', masterFile);
  formData.append('draft_file', draftFile);

  const response = await fetch(`${API_BASE_URL}/validar-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || 'Error al validar planos');
  }

  return response.json();
}

/**
 * Envía un mensaje al chatbot
 */
export async function enviarMensajeChat(mensaje: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mensajes: [mensaje] }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || 'Error al enviar mensaje');
  }

  const data = await response.json();
  return data.respuesta;
}

/**
 * Verifica el estado del servidor
 */
export async function verificarConexion(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Error al verificar conexión:', error);
    return false;
  }
}
