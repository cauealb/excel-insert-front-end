import {
  AlertTriangle,
  ArrowRight,
  Braces,
  CheckCircle2,
  Clipboard,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Settings2,
  Sparkles,
  Table2,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  generateSql,
  getApiBaseUrl,
  getCatalog,
  getSheetDetails,
  uploadWorkbook,
} from "./api";
import type {
  ApiErrorShape,
  CatalogEntity,
  GenerateSqlResult,
  UploadResult,
} from "./types";
import {
  buildAutoMapping,
  copyToClipboard,
  downloadTextFile,
  formatFileSize,
  getRequiredMissing,
} from "./utils";
import Sidebar from "./components/Sidebar";

type StepStatus = "ready" | "active" | "done";

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntity[]>([]);
  const [usingFallbackCatalog, setUsingFallbackCatalog] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [selectedEntityName, setSelectedEntityName] = useState("users");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sqlResult, setSqlResult] = useState<GenerateSqlResult | null>(null);
  const [apiError, setApiError] = useState<ApiErrorShape | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedEntity =
    catalog.find((entity) => entity.name === selectedEntityName) || catalog[0];

  const requiredMissing = useMemo(
    () => getRequiredMissing(selectedEntity?.fields || [], mapping),
    [mapping, selectedEntity],
  );

  const mappedFieldsCount = Object.values(mapping).filter(Boolean).length;
  const canGenerate = Boolean(
    uploadResult &&
      selectedSheetName &&
      selectedEntity &&
      headers.length &&
      requiredMissing.length === 0 &&
      mappedFieldsCount > 0,
  );

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (!selectedEntity && catalog[0]) {
      setSelectedEntityName(catalog[0].name);
    }
  }, [catalog, selectedEntity]);

  async function loadCatalog() {
    setCatalogLoading(true);
    setCatalogError("");

    const result = await getCatalog();
    setCatalog(result.entities);
    setUsingFallbackCatalog(result.usingFallback);
    setCatalogError(
      result.usingFallback
        ? "Catalogo local em uso. Conecte a API para sincronizar entidades."
        : "",
    );
    setCatalogLoading(false);
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setApiError({
        code: "INVALID_FILE",
        message: "Selecione uma planilha no formato .xlsx.",
      });
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setSelectedSheetName("");
    setHeaders([]);
    setMapping({});
    setSqlResult(null);
    setApiError(null);
    setIsUploading(true);

    try {
      const result = await uploadWorkbook(file);
      setUploadResult(result);
      const firstSheet = result.sheets[0];
      if (firstSheet) {
        await selectSheet(result.workbookId, firstSheet.name, firstSheet.headers);
      }
    } catch (error) {
      setApiError(toApiErrorShape(error, "Nao foi possivel enviar a planilha."));
    } finally {
      setIsUploading(false);
    }
  }

  async function selectSheet(
    workbookId: string,
    sheetName: string,
    existingHeaders?: string[],
  ) {
    setSelectedSheetName(sheetName);
    setSqlResult(null);
    setApiError(null);

    if (existingHeaders?.length) {
      setHeaders(existingHeaders);
      setMapping(buildAutoMapping(selectedEntity?.fields || [], existingHeaders));
      return;
    }

    setIsLoadingSheet(true);

    try {
      const details = await getSheetDetails(workbookId, sheetName);
      setHeaders(details.headers);
      setMapping(buildAutoMapping(selectedEntity?.fields || [], details.headers));
    } catch (error) {
      setApiError(toApiErrorShape(error, "Nao foi possivel carregar a aba."));
    } finally {
      setIsLoadingSheet(false);
    }
  }

  function handleEntityChange(entityName: string) {
    const entity = catalog.find((item) => item.name === entityName);
    setSelectedEntityName(entityName);
    setMapping(buildAutoMapping(entity?.fields || [], headers));
    setSqlResult(null);
    setApiError(null);
  }

  function handleMappingChange(fieldName: string, headerName: string) {
    setMapping((current) => {
      const next = { ...current };
      if (headerName) {
        next[fieldName] = headerName;
      } else {
        delete next[fieldName];
      }

      return next;
    });
    setSqlResult(null);
  }

  function applyAutoMapping() {
    setMapping(buildAutoMapping(selectedEntity?.fields || [], headers));
    setSqlResult(null);
  }

  async function handleGenerateSql() {
    if (!uploadResult || !selectedEntity || !canGenerate) {
      return;
    }

    setIsGenerating(true);
    setApiError(null);
    setSqlResult(null);

    try {
      const result = await generateSql({
        workbookId: uploadResult.workbookId,
        sheetName: selectedSheetName,
        entity: selectedEntity.name,
        mapping,
      });
      setSqlResult(result);
    } catch (error) {
      setApiError(toApiErrorShape(error, "Nao foi possivel gerar o SQL."));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopySql() {
    if (!sqlResult?.sql) {
      return;
    }

    await copyToClipboard(sqlResult.sql);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleDownloadSql() {
    if (!sqlResult?.sql) {
      return;
    }

    const safeSheet = selectedSheetName
      .replace(/[^\w-]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    downloadTextFile(`${selectedEntityName}-${safeSheet || "script"}.sql`, sqlResult.sql);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  const steps: Array<{ label: string; status: StepStatus }> = [
    {
      label: "Catalogo",
      status: selectedEntity ? "done" : "active",
    },
    {
      label: "Upload",
      status: uploadResult ? "done" : selectedEntity ? "active" : "ready",
    },
    {
      label: "Mapeamento",
      status:
        uploadResult && requiredMissing.length === 0 && mappedFieldsCount > 0
          ? "done"
          : uploadResult
            ? "active"
            : "ready",
    },
    {
      label: "SQL",
      status: sqlResult ? "done" : canGenerate ? "active" : "ready",
    },
  ];

  return (
    <main className="app-shell">
      <Sidebar steps={steps} usingFallbackCatalog />

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Gerador revisavel</span>
            <h1>Excel para SQL com validação de catálogo</h1>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={loadCatalog}
            aria-label="Atualizar catalogo"
            title="Atualizar catalogo"
          >
            {catalogLoading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          </button>
        </header>

        <section className="metrics-grid" aria-label="Resumo">
          <MetricCard
            icon={<Database size={20} />}
            label="Entidade"
            value={selectedEntity?.label || "Catalogo"}
            meta={selectedEntity?.table || "Aguardando"}
          />
          <MetricCard
            icon={<Table2 size={20} />}
            label="Aba"
            value={selectedSheetName || "Nenhuma"}
            meta={`${headers.length} colunas`}
          />
          <MetricCard
            icon={<Settings2 size={20} />}
            label="Mapeados"
            value={`${mappedFieldsCount}/${selectedEntity?.fields.length || 0}`}
            meta={`${requiredMissing.length} obrigatorios pendentes`}
          />
          <MetricCard
            icon={<Braces size={20} />}
            label="SQL"
            value={sqlResult ? `${sqlResult.summary.insertedRows}` : "0"}
            meta="linhas prontas"
          />
        </section>

        {(catalogError || apiError) && (
          <StatusPanel catalogMessage={catalogError} apiError={apiError} />
        )}

        <div className="main-grid">
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
              onChange={(event) => handleEntityChange(event.target.value)}
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
              onChange={onInputChange}
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
              onDrop={onDrop}
            >
              <span className="upload-icon">
                {isUploading ? <Loader2 className="spin" size={24} /> : <UploadCloud size={24} />}
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
                    onClick={() => selectSheet(uploadResult.workbookId, sheet.name, sheet.headers)}
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
                onClick={applyAutoMapping}
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
                        {field.required ? " · obrigatório" : ""}
                        {field.unique ? " · único" : ""}
                      </span>
                    </div>
                    <span className="type-pill">{field.type}</span>
                    <select
                      className="select compact"
                      value={mapping[field.name] || ""}
                      onChange={(event) =>
                        handleMappingChange(field.name, event.target.value)
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
              <button
                className="primary-button"
                type="button"
                onClick={handleGenerateSql}
                disabled={!canGenerate || isGenerating}
              >
                {isGenerating ? <Loader2 className="spin" size={18} /> : <Database size={18} />}
                Gerar SQL
              </button>
            </div>
          </section>
        </div>

        <section className="panel sql-panel">
          <div className="panel-heading inline">
            <div>
              <span className="panel-kicker">Saída</span>
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
              <span>SQL aguardando geração</span>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  meta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
  );
}

function StatusPanel({
  catalogMessage,
  apiError,
}: {
  catalogMessage: string;
  apiError: ApiErrorShape | null;
}) {
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
            {details.reason ? `: ${details.reason}` : ""}
          </span>
        )}
      </div>
    </section>
  );
}

function toApiErrorShape(error: unknown, fallback: string): ApiErrorShape {
  if (error instanceof ApiError) {
    return error.payload || { message: error.message };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallback,
    };
  }

  return {
    message: fallback,
  };
}

export default App;
