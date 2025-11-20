import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { 
  Maximize2, 
  Minimize2, 
  Download,
  FileText,
  Upload,
  Trash2
} from "lucide-react";

interface PDFViewerProps {
  title: string;
  pdfUrl?: string;
  onLoadPdf?: (file: File) => void;
  onClearPdf?: () => void;
  // Props para sincronización
  isLinked?: boolean;
  syncScale?: number;
  onScaleChange?: (scale: number) => void;
  syncScroll?: { x: number; y: number };
  onScrollChange?: (scroll: { x: number; y: number }) => void;
}

export function PDFViewer({ 
  title, 
  pdfUrl, 
  onLoadPdf, 
  onClearPdf,
  isLinked = false,
  syncScale,
  onScaleChange,
  syncScroll,
  onScrollChange
}: PDFViewerProps) {
  const [scale, setScale] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectRef = useRef<HTMLObjectElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInternalScrollRef = useRef<boolean>(false);

  // Sincronizar escala cuando está vinculado
  useEffect(() => {
    if (isLinked && syncScale !== undefined) {
      setScale(syncScale);
    }
  }, [isLinked, syncScale]);

  // Sincronizar scroll cuando está vinculado
  useEffect(() => {
    if (isLinked && syncScroll && scrollContainerRef.current && !isInternalScrollRef.current) {
      const container = scrollContainerRef.current;
      container.scrollLeft = syncScroll.x;
      container.scrollTop = syncScroll.y;
    }
  }, [isLinked, syncScroll]);

  // Resetear scroll cuando la escala es 100%
  useEffect(() => {
    if (scale === 100 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [scale]);

  const handleZoomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = Number(event.target.value);
    setScale(newScale);
    if (isLinked && onScaleChange) {
      onScaleChange(newScale);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (isLinked && onScrollChange && scrollContainerRef.current) {
      isInternalScrollRef.current = true;
      const container = scrollContainerRef.current;
      onScrollChange({
        x: container.scrollLeft,
        y: container.scrollTop
      });
      // Reset flag después de un corto delay
      setTimeout(() => {
        isInternalScrollRef.current = false;
      }, 100);
    }
  };

  const handleClearPdf = () => {
    if (onClearPdf) {
      onClearPdf();
      setScale(100); // Reset zoom al eliminar
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf" && onLoadPdf) {
      onLoadPdf(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only turn off when leaving the container (not children)
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf' && onLoadPdf) {
      onLoadPdf(file);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden border relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Barra de herramientas */}
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-gray-700 font-medium">{title}</h2>
        </div>
        
        <div className="flex items-center gap-1">
          {pdfUrl ? (
            <>
              {/* Control de zoom con slider */}
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-600">100%</span>
                <div className="relative">
                  <input
                    type="range"
                    min="100"
                    max="700"
                    step="50"
                    value={scale}
                    onChange={handleZoomChange}
                    className="w-40 h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, 
                        #4b5563 0%, 
                        #4b5563 ${((scale - 100) / 600) * 100}%, 
                        #e5e7eb ${((scale - 100) / 600) * 100}%, 
                        #e5e7eb 100%)`,
                      outline: 'none'
                    }}
                  />
                  <style>{`
                    input[type="range"]::-webkit-slider-thumb {
                      appearance: none;
                      width: 18px;
                      height: 18px;
                      border-radius: 50%;
                      background: #374151;
                      cursor: pointer;
                      border: 2px solid white;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                      transition: all 0.2s ease;
                    }
                    input[type="range"]::-webkit-slider-thumb:hover {
                      transform: scale(1.2);
                      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                      background: #1f2937;
                    }
                    input[type="range"]::-moz-range-thumb {
                      width: 18px;
                      height: 18px;
                      border-radius: 50%;
                      background: #374151;
                      cursor: pointer;
                      border: 2px solid white;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                      transition: all 0.2s ease;
                    }
                    input[type="range"]::-moz-range-thumb:hover {
                      transform: scale(1.2);
                      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                      background: #1f2937;
                    }
                  `}</style>
                </div>
                <span className="text-xs font-semibold text-gray-600">700%</span>
                <div className="flex items-center justify-center bg-gray-50 rounded-md border border-gray-300 px-3 py-1.5 min-w-[65px]">
                  <span className="text-sm font-semibold text-gray-700">
                    {scale}
                  </span>
                  <span className="text-xs font-medium text-gray-500 ml-0.5">%</span>
                </div>
              </div>
              
              {/* Controles adicionales */}
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleFullscreen}
                className="cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.open(pdfUrl, '_blank')}
                className="cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClearPdf}
                className="cursor-pointer hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 rounded-lg pointer-events-none">
          <div className="text-white text-lg font-semibold">Suelta el PDF aquí</div>
        </div>
      )}

      {/* Área de visualización del PDF */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 bg-gray-100 relative"
        style={{
          overflow: scale > 100 ? 'auto' : 'hidden'
        }}
        onScroll={handleScroll}
      >
        {pdfUrl ? (
          <div 
            className="w-full h-full"
            style={{
              width: scale > 100 ? `${scale}%` : '100%',
              height: scale > 100 ? `${scale}%` : '100%',
              minWidth: scale > 100 ? `${scale}%` : '100%',
              minHeight: scale > 100 ? `${scale}%` : '100%'
            }}
          >
            <embed
              key={scale}
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              type="application/pdf"
              style={{
                width: '100%',
                height: '100%',
                minHeight: '1000px',
                border: 'none',
                backgroundColor: 'white'
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <FileText className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">{title}</p>
                <p className="text-sm mb-4">No hay documento cargado</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Button 
                variant="outline" 
                onClick={handleUploadClick}
                className="gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Subir PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
