import { Bot, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "../assets/086f644d4368cea47647f090c23f7a9bbe39f835.png";

interface HeaderProps {
  onOpenChat?: () => void;
  onOpenHistory?: () => void;
  onAnalyze?: () => void;
  canAnalyze?: boolean;
  isAnalyzing?: boolean;
}

export function Header({ onOpenChat, onOpenHistory, onAnalyze, canAnalyze, isAnalyzing }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b flex items-center px-6 shadow-sm">
      <div className="flex items-center gap-6">
        <ImageWithFallback 
          src={logo} 
          alt="Técnicas Reunidas" 
          className="h-16 w-auto"
        />
        
        {/* Botón de Análisis */}
        <Button 
          onClick={onAnalyze}
          disabled={!canAnalyze || isAnalyzing}
          size="lg"
          className="bg-green-500 hover:bg-green-600 text-black px-8 py-3 text-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-green-700"
        >
          {isAnalyzing ? "⏳ Analizando..." : "🔍 Analizar Planos"}
        </Button>
      </div>
      
      <div className="ml-auto flex items-center gap-3">
        <Button variant="ghost" onClick={onOpenHistory} className="p-4">
          <FolderOpen className="w-10 h-10" />
        </Button>
        <Button variant="ghost" onClick={onOpenChat} className="p-4">
          <Bot className="w-10 h-10" />
        </Button>
      </div>
    </header>
  );
}