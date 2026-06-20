import { ChangeEvent, DragEvent, useRef, useState } from "react";
import {
  ArrowRight,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { ConfiguredTable, UploadResult } from "../types";
import { formatFileSize } from "../utils";
import ActionButton from "./ActionButton";

interface RequestExcelProps {
  tables: ConfiguredTable[];
  selectedTableId: string;
  selectedTable: ConfiguredTable;
  tableIssue: string;
  selectedFile: File | null;
  uploadResult: UploadResult | null;
  selectedSheetName: string;
  headers: string[];
  mapping: Record<string, string>;
  canGenerate: boolean;
  isUploading: boolean;
  isLoadingSheet: boolean;
  isGenerating: boolean;
  onConfiguredTableChange: (tableId: string) => void;
  onFileSelected: (file: File) => void;
  onSheetSelect: (
    workbookId: string,
    sheetName: string,
    existingHeaders?: string[],
  ) => void;
  onAutoMap: () => void;
  onMappingChange: (fieldName: string, headerName: string) => void;
  onGenerateSql: () => void;
}

export default function RequestExcel({
  tables,
  selectedTableId,
  selectedTable,
  tableIssue,
  selectedFile,
  uploadResult,
  selectedSheetName,
  headers,
  mapping,
  canGenerate,
  isUploading,
  isLoadingSheet,
  isGenerating,
  onConfiguredTableChange,
  onFileSelected,
  onSheetSelect,
  onAutoMap,
  onMappingChange,
  onGenerateSql,
}: RequestExcelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }

  return (
    <>
      <section className="panel control-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Entrada</span>
            <h2>Planilha</h2>
          </div>
        </div>

        <label className="field-label" htmlFor="configured-table">
          Tabela configurada
        </label>
        <select
          id="configured-table"
          className="select"
          value={selectedTableId}
          onChange={(event) => onConfiguredTableChange(event.target.value)}
        >
          {tables.map((table) => (
            <option value={table.id} key={table.id}>
              {table.name || "Sem nome"} ({table.columns.length} colunas)
            </option>
          ))}
        </select>

        {tableIssue ? (
          <div className="inline-error">{tableIssue}</div>
        ) : (
          <div className="selection-summary">
            <strong>{selectedTable.name}</strong>
            <span>{selectedTable.columns.length} colunas prontas</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept=".xlsx"
          onChange={handleInputChange}
        />

        <button
          className={`upload-zone ${isDragging ? "dragging" : ""}`}
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <span className="upload-icon">
            {isUploading ? (
              <Loader2 className="spin" size={24} />
            ) : (
              <UploadCloud size={24} />
            )}
          </span>
          <strong>{selectedFile ? selectedFile.name : "Selecionar .xlsx"}</strong>
          <span>
            {selectedFile
              ? formatFileSize(selectedFile.size)
              : "Arraste o arquivo ou clique para escolher"}
          </span>
        </button>

        {uploadResult && (
          <div className="sheet-list">
            <div className="field-label">Abas</div>
            {uploadResult.sheets.map((sheet) => (
              <button
                className={`sheet-button ${
                  sheet.name === selectedSheetName ? "selected" : ""
                }`}
                type="button"
                key={sheet.name}
                onClick={() =>
                  onSheetSelect(uploadResult.workbookId, sheet.name, sheet.headers)
                }
              >
                <span>{sheet.name}</span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel mapping-panel">
        <div className="panel-heading inline">
          <div>
            <span className="panel-kicker">Mapeamento</span>
            <h2>Colunas do Excel</h2>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={onAutoMap}
            disabled={!headers.length || Boolean(tableIssue)}
          >
            <Sparkles size={16} />
            Auto
          </button>
        </div>

        {isLoadingSheet ? (
          <div className="empty-state">
            <Loader2 className="spin" size={24} />
            <span>Carregando aba</span>
          </div>
        ) : !tableIssue && headers.length ? (
          <div className="mapping-table" role="table" aria-label="Campos e colunas">
            <div className="mapping-row header" role="row">
              <span>Coluna SQL</span>
              <span>Tipo</span>
              <span>Coluna Excel</span>
            </div>
            {selectedTable.columns
              .filter((column) => column.name.trim())
              .map((column) => {
                const usedHeaders = new Set(
                  Object.entries(mapping)
                    .filter(([fieldName]) => fieldName !== column.name)
                    .map(([, header]) => header)
                    .filter(Boolean),
                );

                return (
                  <div className="mapping-row" role="row" key={column.id}>
                    <div className="field-name">
                      <strong>{column.label || column.name}</strong>
                      <span>
                        {column.name}
                        {column.required ? " - obrigatório" : ""}
                        {column.unique ? " - único" : ""}
                      </span>
                    </div>
                    <span className="type-pill">{column.type}</span>
                    <select
                      className="select compact"
                      value={mapping[column.name] || ""}
                      onChange={(event) =>
                        onMappingChange(column.name, event.target.value)
                      }
                    >
                      <option value="">Ignorar</option>
                      {headers.map((header) => (
                        <option
                          value={header}
                          key={header}
                          disabled={usedHeaders.has(header)}
                        >
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="empty-state">
            <FileSpreadsheet size={24} />
            <span>Nenhuma aba carregada</span>
          </div>
        )}

        <div className="action-row">
          <ActionButton
            canGenerate={canGenerate}
            isGenerating={isGenerating}
            onGenerateSql={onGenerateSql}
          />
        </div>
      </section>
    </>
  );
}
