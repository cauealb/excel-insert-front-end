import { Clock3, FileSpreadsheet } from "lucide-react";
import ApiCard from "./ApiCard";

interface StepsSideBarProps {
  label: string;
  status: "ready" | "active" | "done";
}

interface SidebarProps {
  steps: StepsSideBarProps[];
  usingFallbackCatalog: boolean;
  activeView: "import" | "history";
  historyCount: number;
  onOpenImport: () => void;
  onOpenHistory: () => void;
}

export default function Sidebar({
  steps,
  usingFallbackCatalog,
  activeView,
  historyCount,
  onOpenImport,
  onOpenHistory,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <FileSpreadsheet size={22} aria-hidden="true" />
        </div>
        <div>
          <strong>Excel Insert</strong>
          <span>SQL API</span>
        </div>
      </div>

      <nav className="workflow-nav" aria-label="Fluxo">
        {steps.map((step, index) => (
          <button
            className={`workflow-step ${activeView === "import" ? step.status : ""}`}
            type="button"
            key={step.label}
            onClick={onOpenImport}
          >
            <span className="step-index">{index + 1}</span>
            <span>{step.label}</span>
          </button>
        ))}
      </nav>

      <ApiCard usingFallbackCatalog={usingFallbackCatalog} />

      <button
        className={`sidebar-tab ${activeView === "history" ? "active" : ""}`}
        type="button"
        onClick={onOpenHistory}
      >
        <Clock3 size={18} />
        <span>Historico</span>
        <small>{historyCount}</small>
      </button>
    </aside>
  );
}
