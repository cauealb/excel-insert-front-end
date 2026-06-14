import { Database, Loader2 } from "lucide-react";

interface ActionButtonProps {
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerateSql: () => void;
}

export default function ActionButton({
  canGenerate,
  isGenerating,
  onGenerateSql,
}: ActionButtonProps) {
  return (
    <button
      className="primary-button"
      type="button"
      onClick={onGenerateSql}
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
