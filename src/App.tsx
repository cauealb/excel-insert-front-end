import { Braces, Database, Loader2, RefreshCw, Settings2, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  generateSql,
  getCatalog,
  getSheetDetails,
  uploadWorkbook,
} from "./api";
import {
  createHistoryId,
  loadImportHistory,
  saveImportHistory,
} from "./historyStorage";
import type {
  ApiErrorShape,
  CatalogEntity,
  GenerateSqlResult,
  ImportHistoryItem,
  UploadResult,
} from "./types";
import {
  buildAutoMapping,
  copyToClipboard,
  downloadTextFile,
  getRequiredMissing,
} from "./utils";
import ImportHistory from "./components/ImportHistory";
import MetricCard from "./components/MetricCard";
import RequestExcel from "./components/RequestExcel";
import ResponseSQLScript from "./components/ResponseSQLScript";
import Sidebar from "./components/Sidebar";
import StatusPanel from "./components/StatusPanel";
import ThemeToggle from "./components/ThemeToggle";

type StepStatus = "ready" | "active" | "done";
type Theme = "light" | "dark";
type ActiveView = "import" | "history";

function App() {
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
  const [historyItems, setHistoryItems] = useState<ImportHistoryItem[]>(() =>
    loadImportHistory(),
  );
  const [activeView, setActiveView] = useState<ActiveView>("import");
  const [apiError, setApiError] = useState<ApiErrorShape | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("excel-insert-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("excel-insert-theme", theme);
  }, [theme]);

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

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
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
      addHistoryItem(result);
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
    downloadTextFile(
      `${selectedEntityName}-${safeSheet || "script"}.sql`,
      sqlResult.sql,
    );
  }

  async function handleCopyHistorySql(sql: string) {
    await copyToClipboard(sql);
  }

  function handleDownloadHistorySql(item: ImportHistoryItem) {
    const safeSheet = item.sheetName
      .replace(/[^\w-]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    downloadTextFile(`${item.entity}-${safeSheet || "script"}.sql`, item.sql);
  }

  function handleDeleteHistoryItem(id: string) {
    setHistoryItems((currentItems) => {
      const nextItems = currentItems.filter((item) => item.id !== id);
      saveImportHistory(nextItems);
      return nextItems;
    });
  }

  function handleClearHistory() {
    setHistoryItems([]);
    saveImportHistory([]);
  }

  function addHistoryItem(result: GenerateSqlResult) {
    if (!selectedEntity) {
      return;
    }

    const nextItem: ImportHistoryItem = {
      id: createHistoryId(),
      createdAt: new Date().toISOString(),
      fileName: selectedFile?.name || "planilha.xlsx",
      entity: selectedEntity.name,
      entityLabel: selectedEntity.label,
      table: result.summary.table,
      sheetName: result.summary.sheetName,
      insertedRows: result.summary.insertedRows,
      columns: result.summary.columns,
      mapping,
      sql: result.sql,
    };

    setHistoryItems((currentItems) => {
      const nextItems = [nextItem, ...currentItems].slice(0, 50);
      saveImportHistory(nextItems);
      return nextItems;
    });
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
      <Sidebar
        steps={steps}
        usingFallbackCatalog={usingFallbackCatalog}
        activeView={activeView}
        historyCount={historyItems.length}
        onOpenImport={() => setActiveView("import")}
        onOpenHistory={() => setActiveView("history")}
      />

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              {activeView === "history" ? "Auditoria local" : "Gerador revisavel"}
            </span>
            <h1>
              {activeView === "history"
                ? "Historico de importacoes"
                : "Excel para SQL com validacao de catalogo"}
            </h1>
          </div>
          <div className="topbar-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              className="icon-button"
              type="button"
              onClick={loadCatalog}
              aria-label="Atualizar catalogo"
              title="Atualizar catalogo"
            >
              {catalogLoading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <RefreshCw size={18} />
              )}
            </button>
          </div>
        </header>

        {activeView === "import" ? (
          <>
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
              <RequestExcel
                selectedEntityName={selectedEntityName}
                selectedEntity={selectedEntity}
                selectedFile={selectedFile}
                catalog={catalog}
                catalogLoading={catalogLoading}
                uploadResult={uploadResult}
                selectedSheetName={selectedSheetName}
                headers={headers}
                mapping={mapping}
                canGenerate={canGenerate}
                isUploading={isUploading}
                isLoadingSheet={isLoadingSheet}
                isGenerating={isGenerating}
                onEntityChange={handleEntityChange}
                onFileSelected={handleFile}
                onSheetSelect={selectSheet}
                onAutoMap={applyAutoMapping}
                onMappingChange={handleMappingChange}
                onGenerateSql={handleGenerateSql}
              />
            </div>

            <ResponseSQLScript
              handleCopySql={handleCopySql}
              handleDownloadSql={handleDownloadSql}
              sqlResult={sqlResult}
              copied={copied}
            />
          </>
        ) : (
          <ImportHistory
            items={historyItems}
            onCopySql={handleCopyHistorySql}
            onDownloadSql={handleDownloadHistorySql}
            onDeleteItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
          />
        )}
      </section>
    </main>
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
