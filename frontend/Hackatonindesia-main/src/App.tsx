import { Header } from "./components/Header";
import { PlanoViewer } from "./components/PlanoViewer";
import { ChatBot } from "./components/ChatBot";
import { MetricsGrid } from "./components/MetricsGrid";
import { FileHistory } from "./components/FileHistory";
import { useState } from "react";
import { ReporteValidacion, validarPlanos } from "./services/api";
import { toast } from "sonner";

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [masterPdfUrl, setMasterPdfUrl] = useState<string | undefined>();
  const [correctedPdfUrl, setCorrectedPdfUrl] = useState<string | undefined>();
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [validationData, setValidationData] = useState<ReporteValidacion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleChatBot = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setIsHistoryOpen(false); // Cerrar historial si se abre el chat
    }
  };

  const handleToggleHistory = () => {
    setIsHistoryOpen(!isHistoryOpen);
    if (!isHistoryOpen) {
      setIsChatOpen(false); // Cerrar chat si se abre el historial
    }
  };

  const handleLoadHistoryFiles = (masterUrl: string, correctedUrl: string) => {
    setMasterPdfUrl(masterUrl);
    setCorrectedPdfUrl(correctedUrl);
  };

  const handleAnalyze = async () => {
    if (!masterFile || !draftFile) {
      toast.error("Debes cargar ambos planos antes de analizar");
      return;
    }

    setIsLoading(true);
    setValidationData(null);

    try {
      toast.info("Analizando planos... Esto puede tardar unos minutos");
      const resultado = await validarPlanos(masterFile, draftFile);
      setValidationData(resultado);
      setIsMetricsOpen(true);
      toast.success("Validación completada con éxito");
    } catch (error) {
      console.error("Error al validar planos:", error);
      toast.error(error instanceof Error ? error.message : "Error al validar planos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Barra superior */}
      <Header 
        onOpenChat={handleToggleChatBot} 
        onOpenHistory={handleToggleHistory}
        onAnalyze={handleAnalyze}
        canAnalyze={!!masterPdfUrl && !!correctedPdfUrl}
        isAnalyzing={isLoading}
      />

      {/* Contenido principal con chatbot integrado */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Área principal de contenido */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Área de planos */}
          <div className="flex-1 p-4 overflow-auto">
            <PlanoViewer 
              masterPdfUrl={masterPdfUrl}
              correctedPdfUrl={correctedPdfUrl}
              setMasterPdfUrl={setMasterPdfUrl}
              setCorrectedPdfUrl={setCorrectedPdfUrl}
              setMasterFile={setMasterFile}
              setDraftFile={setDraftFile}
              masterFile={masterFile}
              draftFile={draftFile}
            />
          </div>

          {/* Métricas como ventana corredera desde abajo - cubre toda la pantalla */}
          <MetricsGrid 
            isOpen={isMetricsOpen} 
            setIsOpen={setIsMetricsOpen}
            validationData={validationData}
            isLoading={isLoading}
          />
        </div>

        {/* Chatbot lateral */}
        <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />

        {/* Historial de archivos lateral */}
        <FileHistory 
          isOpen={isHistoryOpen} 
          setIsOpen={setIsHistoryOpen}
          onLoadFiles={handleLoadHistoryFiles}
          currentMasterUrl={masterPdfUrl}
          currentCorrectedUrl={correctedPdfUrl}
        />
      </div>
    </div>
  );
}
