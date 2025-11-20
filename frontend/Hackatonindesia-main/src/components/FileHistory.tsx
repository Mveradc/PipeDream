import { FolderOpen, Trash2, FileText, Calendar, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface HistoryItem {
  id: string;
  masterPdfUrl: string;
  correctedPdfUrl: string;
  masterPdfName: string;
  correctedPdfName: string;
  timestamp: Date;
  accuracyPercentage: number; // Porcentaje de acierto
}

interface FileHistoryProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLoadFiles: (masterUrl: string, correctedUrl: string) => void;
  currentMasterUrl?: string;
  currentCorrectedUrl?: string;
}

export function FileHistory({ 
  isOpen, 
  setIsOpen, 
  onLoadFiles,
  currentMasterUrl,
  currentCorrectedUrl 
}: FileHistoryProps) {
  // Datos estáticos de ejemplo - simulación de historial
  const staticHistory: HistoryItem[] = [
    {
      id: '1',
      masterPdfUrl: '#', // URL simbólica
      correctedPdfUrl: '#', // URL simbólica
      masterPdfName: 'Plano_Arquitectonico_Master_v2.3',
      correctedPdfName: 'Plano_Arquitectonico_Corrected_v2.3',
      timestamp: new Date('2024-11-15T10:30:00'),
      accuracyPercentage: 87, // 87% de acierto
    },
    {
      id: '2',
      masterPdfUrl: '#', // URL simbólica
      correctedPdfUrl: '#', // URL simbólica
      masterPdfName: 'Plano_Estructural_Master_v1.8',
      correctedPdfName: 'Plano_Estructural_Corrected_v1.8',
      timestamp: new Date('2024-11-10T14:45:00'),
      accuracyPercentage: 92, // 92% de acierto
    },
  ];

  const history = staticHistory; // Usar historial estático

  // Función deshabilitada temporalmente
  const saveCurrentFiles = () => {
    alert('Funcionalidad deshabilitada - Historial en modo demo');
  };

  // Función deshabilitada temporalmente
  const deleteHistoryItem = (id: string) => {
    alert('Funcionalidad deshabilitada - Historial en modo demo');
  };

  // Cargar archivos desde el historial (simbólico por ahora)
  const loadHistoryItem = (item: HistoryItem) => {
    alert(`Cargando archivos: ${item.masterPdfName} y ${item.correctedPdfName}\n\nFuncionalidad en desarrollo...`);
    // onLoadFiles(item.masterPdfUrl, item.correctedPdfUrl);
    // setIsOpen(false);
  };

  return (
    <>
      {/* Panel lateral desplegable */}
      <div
        className={`border-l bg-white flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? "w-96" : "w-0"
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b bg-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-gray-700" />
            <h3 className="text-gray-800 font-medium">Historial de Archivos</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Botón para guardar archivos actuales */}
        <div className="p-4 border-b bg-white">
          <Button 
            onClick={saveCurrentFiles}
            className="w-full bg-gray-400 hover:bg-gray-500 text-white"
            disabled={true}
          >
            <FileText className="w-4 h-4 mr-2" />
            Guardar Archivos (Demo)
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Historial en modo demostración
          </p>
        </div>

        {/* Lista de historial */}
        <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay archivos guardados</p>
              <p className="text-xs mt-1">Carga PDFs y guárdalos para acceso rápido</p>
            </div>
          ) : (
            history.map((item) => {
              // Calcular el progreso para el círculo
              const circleProgress = (item.accuracyPercentage / 100) * 360;
              
              return (
              <Card
                key={item.id}
                className="p-3 hover:shadow-md transition-all cursor-pointer"
                onClick={() => loadHistoryItem(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium text-gray-900">
                        {item.masterPdfName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-gray-900">
                        {item.correctedPdfName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {item.timestamp.toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      
                      {/* Rueda de porcentaje a la derecha de la fecha */}
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 100 100">
                          {/* Círculo de fondo */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="10"
                          />
                          {/* Círculo de progreso */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="10"
                            strokeDasharray={`${(circleProgress / 360) * 251.2} 251.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        {/* Texto en el centro */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-green-600">{item.accuracyPercentage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Botón eliminar arriba a la derecha */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      deleteHistoryItem(item.id);
                    }}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
              );
            })
          )}
        </div>

        {/* Info footer */}
        <div className="p-3 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {history.length} archivo{history.length !== 1 ? 's' : ''} guardado{history.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </>
  );
}
