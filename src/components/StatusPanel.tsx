import { AlertTriangle } from "lucide-react";
import { ApiErrorShape } from "../types";

interface StatusPanelProps {
    catalogMessage: string;
    apiError: ApiErrorShape | null;
}

export default function StatusPanel({catalogMessage, apiError}: StatusPanelProps) {
  const details = apiError?.details;

  return (
    <section className={`status-panel ${apiError ? "error" : "notice"}`}>
      <AlertTriangle size={20} />
      <div>
        <strong>{apiError?.message || catalogMessage}</strong>
        {details && (
          <span>
            Linha {details.line || "-"}, coluna {details.column || "-"}
            {details.field ? `, campo ${details.field}` : ""}
            {details.value ? `, valor ${details.value}` : ""}
            {details.reason ? `: ${details.reason}` : ""}
          </span>
        )}
      </div>
    </section>
  );
}
