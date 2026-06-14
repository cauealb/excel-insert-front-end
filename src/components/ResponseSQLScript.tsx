import { Braces, CheckCircle2, Clipboard, Download } from "lucide-react";
import type { GenerateSqlResult } from "../types";

interface ResponseSQLScriptProps {
  handleCopySql: () => void;
  handleDownloadSql: () => void;
  sqlResult: GenerateSqlResult | null;
  copied: boolean;
}

export default function ResponseSQLScript({
  handleCopySql,
  copied,
  sqlResult,
  handleDownloadSql,
}: ResponseSQLScriptProps) {
  return (
    <section className="panel sql-panel">
      <div className="panel-heading inline">
        <div>
          <span className="panel-kicker">Saida</span>
          <h2>Script SQL</h2>
        </div>
        <div className="button-group">
          <button
            className="icon-text-button"
            type="button"
            onClick={handleCopySql}
            disabled={!sqlResult?.sql}
          >
            {copied ? <CheckCircle2 size={16} /> : <Clipboard size={16} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            className="icon-text-button"
            type="button"
            onClick={handleDownloadSql}
            disabled={!sqlResult?.sql}
          >
            <Download size={16} />
            Baixar
          </button>
        </div>
      </div>

      {sqlResult ? (
        <>
          <div className="summary-strip">
            <span>{sqlResult.summary.table}</span>
            <span>{sqlResult.summary.sheetName}</span>
            <span>{sqlResult.summary.insertedRows} linhas</span>
            <span>{sqlResult.summary.columns.length} colunas</span>
          </div>
          <pre className="sql-output">{sqlResult.sql}</pre>
        </>
      ) : (
        <div className="empty-state horizontal">
          <Braces size={24} />
          <span>SQL aguardando geracao</span>
        </div>
      )}
    </section>
  );
}
