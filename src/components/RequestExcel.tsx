import { ChangeEvent, DragEvent, useRef, useState } from "react";
import {
  ArrowRight,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { CatalogEntity, UploadResult } from "../types";
import { formatFileSize } from "../utils";
import ActionButton from "./ActionButton";

interface RequestExcelProps {
  selectedEntityName: string;
  selectedEntity: CatalogEntity | undefined;
  selectedFile: File | null;
  catalogLoading: boolean;
  catalog: CatalogEntity[];
  uploadResult: UploadResult | null;
  selectedSheetName: string;
  headers: string[];
  mapping: Record<string, string>;
  canGenerate: boolean;
  isUploading: boolean;
  isLoadingSheet: boolean;
  isGenerating: boolean;
  onEntityChange: (entityName: string) => void;
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
  selectedEntityName,
  selectedEntity,
  selectedFile,
  catalog,
  catalogLoading,
  uploadResult,
  selectedSheetName,
  headers,
  mapping,
  canGenerate,
  isUploading,
  isLoadingSheet,
  isGenerating,
  onEntityChange,
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
            <h2>Planilha e entidade</h2>
          </div>
        </div>

        <label className="field-label" htmlFor="entity">
          Entidade
        </label>
        <select
          id="entity"
          className="select"
          value={selectedEntityName}
          onChange={(event) => onEntityChange(event.target.value)}
          disabled={catalogLoading || catalog.length === 0}
        >
          {catalog.map((entity) => (
            <option value={entity.name} key={entity.name}>
              {entity.label} ({entity.name})
            </option>
          ))}
        </select>

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
            <h2>Campos permitidos</h2>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={onAutoMap}
            disabled={!headers.length || !selectedEntity}
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
        ) : selectedEntity && headers.length ? (
          <div className="mapping-table" role="table" aria-label="Campos e colunas">
            <div className="mapping-row header" role="row">
              <span>Campo API</span>
              <span>Tipo</span>
              <span>Coluna Excel</span>
            </div>
            {selectedEntity.fields.map((field) => (
              <div className="mapping-row" role="row" key={field.name}>
                <div className="field-name">
                  <strong>{field.label}</strong>
                  <span>
                    {field.name}
                    {field.required ? " - obrigatorio" : ""}
                    {field.unique ? " - unico" : ""}
                  </span>
                </div>
                <span className="type-pill">{field.type}</span>
                <select
                  className="select compact"
                  value={mapping[field.name] || ""}
                  onChange={(event) =>
                    onMappingChange(field.name, event.target.value)
                  }
                >
                  <option value="">Ignorar</option>
                  {headers.map((header) => (
                    <option value={header} key={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
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
