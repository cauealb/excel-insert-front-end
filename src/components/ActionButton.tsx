import { Database, Loader2 } from "lucide-react";

interface ActionButtonProps {
  canGenerate: boolean;
  isGenerating: boolean;
  handleGenerateSql: () => void
} 

export default function ActionButton({ canGenerate, isGenerating, handleGenerateSql }: ActionButtonProps) {
    console.log(isGenerating, 'componente')
  return (
    <button
      className="primary-button"
      type="button"
      onClick={handleGenerateSql}
      disabled={!canGenerate || isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="spin" size={18} />
      ) : (
        <Database size={18} />
      )}
      Gerar SQL
    </button>
  );
}
