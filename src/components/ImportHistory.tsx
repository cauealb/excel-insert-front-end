import {
  Braces,
  CalendarClock,
  Clipboard,
  Download,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ImportHistoryItem } from "../types";

interface ImportHistoryProps {
  items: ImportHistoryItem[];
  onCopySql: (sql: string) => void;
  onDownloadSql: (item: ImportHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export default function ImportHistory({
  items,
  onCopySql,
  onDownloadSql,
  onDeleteItem,
  onClearHistory,
}: ImportHistoryProps) {
  const [selectedId, setSelectedId] = useState(items[0]?.id || "");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0],
    [items, selectedId],
  );

  if (!items.length) {
    return (
      <section className="panel history-empty-panel">
        <div className="empty-state history-empty">
          <FileSpreadsheet size={28} />
          <strong>Nenhuma importacao registrada</strong>
          <span>Os scripts gerados vao aparecer aqui automaticamente.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="history-layout">
      <div className="panel history-list-panel">
        <div className="panel-heading inline">
          <div>
            <span className="panel-kicker">Historico</span>
            <h2>Importacoes</h2>
          </div>
          <button
            className="icon-text-button danger"
            type="button"
            onClick={onClearHistory}
          >
            <Trash2 size={16} />
            Limpar
          </button>
        </div>

        <div className="history-list">
          {items.map((item) => (
            <button
              className={`history-item ${item.id === selectedItem?.id ? "selected" : ""}`}
              type="button"
              key={item.id}
              onClick={() => setSelectedId(item.id)}
            >
              <span className="history-item-icon">
                <FileSpreadsheet size={18} />
              </span>
              <span className="history-item-main">
                <strong>{item.fileName}</strong>
                <span>{item.entityLabel} - {item.sheetName}</span>
              </span>
              <small>{formatDateTime(item.createdAt)}</small>
            </button>
          ))}
        </div>
      </div>

      {selectedItem && (
        <article className="panel history-detail-panel">
          <div className="panel-heading inline">
            <div>
              <span className="panel-kicker">Script gerado</span>
              <h2>{selectedItem.fileName}</h2>
            </div>
            <div className="button-group">
              <button
                className="icon-text-button"
                type="button"
                onClick={() => onCopySql(selectedItem.sql)}
              >
                <Clipboard size={16} />
                Copiar
              </button>
              <button
                className="icon-text-button"
                type="button"
                onClick={() => onDownloadSql(selectedItem)}
              >
                <Download size={16} />
                Baixar
              </button>
              <button
                className="icon-text-button danger"
                type="button"
                onClick={() => onDeleteItem(selectedItem.id)}
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>

          <div className="history-summary-grid">
            <SummaryTile
              icon={<CalendarClock size={18} />}
              label="Quando"
              value={formatDateTime(selectedItem.createdAt)}
            />
            <SummaryTile
              icon={<FileSpreadsheet size={18} />}
              label="Importado"
              value={`${selectedItem.entityLabel} / ${selectedItem.sheetName}`}
            />
            <SummaryTile
              icon={<Braces size={18} />}
              label="Linhas"
              value={`${selectedItem.insertedRows}`}
            />
          </div>

          <div className="summary-strip">
            <span>{selectedItem.table}</span>
            <span>{selectedItem.columns.length} colunas</span>
            <span>{Object.keys(selectedItem.mapping).length} mapeamentos</span>
          </div>

          <pre className="sql-output history-sql-output">{selectedItem.sql}</pre>
        </article>
      )}
    </section>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="history-summary-tile">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
