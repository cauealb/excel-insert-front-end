import { FileSpreadsheet } from "lucide-react";
import { getApiBaseUrl } from "../api";

interface StepsSideBarProps {
    label: string
    status: "ready" | "active" | "done"
}

interface SidebarProps {
    steps: StepsSideBarProps[]
    usingFallbackCatalog: boolean
}

export default function Sidebar({ steps, usingFallbackCatalog }: SidebarProps) {
  return (
    <>
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
            <div className={`workflow-step ${step.status}`} key={step.label}>
              <span className="step-index">{index + 1}</span>
              <span>{step.label}</span>
            </div>
          ))}
        </nav>

        <div className="api-card">
          <span className="api-label">API</span>
          <strong>{getApiBaseUrl()}</strong>
          <span
            className={
              usingFallbackCatalog ? "status-dot warning" : "status-dot ok"
            }
          >
            {usingFallbackCatalog ? "Catalogo local" : "Conectada"}
          </span>
        </div>
      </aside>
    </>
  );
}
