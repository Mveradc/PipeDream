import { PDFViewer } from "./PDFViewer";

interface PlanoViewerProps {
  masterPdfUrl?: string;
  correctedPdfUrl?: string;
  setMasterPdfUrl: (url: string | undefined) => void;
  setCorrectedPdfUrl: (url: string | undefined) => void;
  setMasterFile: (file: File | null) => void;
  setDraftFile: (file: File | null) => void;
}

export function PlanoViewer({ 
  masterPdfUrl, 
  correctedPdfUrl,
  setMasterPdfUrl,
  setCorrectedPdfUrl,
  setMasterFile,
  setDraftFile
}: PlanoViewerProps) {
  
  const handleMasterPdfLoad = (file: File) => {
    const url = URL.createObjectURL(file);
    setMasterPdfUrl(url);
    setMasterFile(file);
  };

  const handleCorrectedPdfLoad = (file: File) => {
    const url = URL.createObjectURL(file);
    setCorrectedPdfUrl(url);
    setDraftFile(file);
  };

  const handleClearMasterPdf = () => {
    if (masterPdfUrl) {
      URL.revokeObjectURL(masterPdfUrl);
    }
    setMasterPdfUrl(undefined);
    setMasterFile(null);
  };

  const handleClearCorrectedPdf = () => {
    if (correctedPdfUrl) {
      URL.revokeObjectURL(correctedPdfUrl);
    }
    setCorrectedPdfUrl(undefined);
    setDraftFile(null);
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Plano Master */}
      <PDFViewer 
        title="Plano Master"
        pdfUrl={masterPdfUrl}
        onLoadPdf={handleMasterPdfLoad}
        onClearPdf={handleClearMasterPdf}
      />

      {/* Plano Corregido */}
      <PDFViewer 
        title="Plano Corregido"
        pdfUrl={correctedPdfUrl}
        onLoadPdf={handleCorrectedPdfLoad}
        onClearPdf={handleClearCorrectedPdf}
      />
    </div>
  );
}