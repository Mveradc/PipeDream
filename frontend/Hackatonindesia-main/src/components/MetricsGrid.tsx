import { useState } from "react";
import { ChevronUp, ChevronDown, MessageSquare, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ReporteValidacion } from "../services/api";

interface MetricsGridProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  validationData: ReporteValidacion | null;
  isLoading: boolean;
}

export function MetricsGrid({ isOpen, setIsOpen, validationData, isLoading }: MetricsGridProps) {
  // Usar datos del backend o valores por defecto
  const totalComentarios = validationData?.total_cambios_detectados || 0;
  const modificacionesIncorrectas = validationData?.cambios_fallidos || 0;
  const porcentajeCorrectas = totalComentarios > 0 
    ? Math.round(((totalComentarios - modificacionesIncorrectas) / totalComentarios) * 100)
    : 0;

  // Calcular el ángulo para el gráfico circular (360 grados * porcentaje / 100)
  const circleProgress = (porcentajeCorrectas / 100) * 360;

  const metrics = [
    {
      id: 1,
      label: "Comentarios Encontrados",
      value: totalComentarios,
      icon: <MessageSquare className="w-6 h-6" />,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: 2,
      label: "Modificaciones Incorrectas",
      value: modificacionesIncorrectas,
      icon: <AlertCircle className="w-6 h-6" />,
      color: "bg-red-100 text-red-600",
    },
    {
      id: 3,
      label: "% Modificaciones Correctas",
      value: `${porcentajeCorrectas}%`,
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: "bg-green-100 text-green-600",
    },
  ];

  return (
    <div
      className={`bg-white border-t shadow-lg transition-all duration-300 ease-in-out ${
        isOpen ? "h-auto" : "h-12"
      } overflow-hidden`}
    >
      {/* Botón toggle */}
      <div
        className="h-12 p-2 bg-gray-100 border-b flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Button variant="ghost" size="sm" className="gap-2">
          {isOpen ? (
            <>
              <ChevronDown className="w-4 h-4" />
              Ocultar Métricas
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              Mostrar Métricas
            </>
          )}
        </Button>
      </div>

      {/* Contenido de métricas */}
      {isOpen && (
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Analizando planos...</span>
            </div>
          ) : validationData ? (
            <>
              <div className="flex items-stretch gap-6 max-w-7xl mx-auto mb-6">
                {metrics.map((metric, index) => (
              <Card
                key={metric.id}
                className="flex-1 p-6 transition-all hover:shadow-md"
              >
                {index === 2 ? (
                  // Tarjeta especial con gráfico circular para el porcentaje
                  <div className="flex items-center gap-4">
                    {/* Gráfico circular */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Círculo de fondo */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                        />
                        {/* Círculo de progreso */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="8"
                          strokeDasharray={`${(circleProgress / 360) * 251.2} 251.2`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      {/* Texto en el centro */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-green-600">{porcentajeCorrectas}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{totalComentarios - modificacionesIncorrectas}/{totalComentarios}</p>
                      <p className="text-xs text-gray-500 mt-1">Modificaciones correctas</p>
                    </div>
                  </div>
                ) : (
                  // Tarjetas normales
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-lg ${metric.color}`}>
                      {metric.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                    </div>
                  </div>
                )}
              </Card>
            ))}
              </div>
              
              {/* Detalles de cambios */}
              <div className="max-w-7xl mx-auto">
                <h3 className="text-lg font-semibold mb-4">Detalles de Cambios</h3>
                <div className="space-y-2">
                  {validationData.detalles.map((detalle) => (
                    <Card 
                      key={detalle.id_cambio}
                      className={`p-4 ${
                        detalle.veredicto === "APROBADO" 
                          ? "border-l-4 border-green-500" 
                          : "border-l-4 border-red-500"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {detalle.veredicto === "APROBADO" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold">Cambio #{detalle.id_cambio + 1}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              detalle.veredicto === "APROBADO"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {detalle.veredicto}
                            </span>
                            {Array.isArray(detalle.tipo_accion) ? (
                              detalle.tipo_accion.map((tipo, idx) => (
                                <span key={idx} className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                                  {tipo}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                                {detalle.tipo_accion}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{detalle.razonamiento}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Carga dos planos y haz clic en "Validar Planos" para ver los resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
