import {
  Braces,
  Database,
  Loader2,
  MoreVertical,
  RefreshCw,
  Settings2,
  Table2,
} from "lucide-react";
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
import { loadConfiguredTables, saveConfiguredTables } from "./tableStorage";
import type {
  ApiErrorShape,
  CatalogEntity,
  ConfiguredTable,
  FieldType,
  GenerateSqlResult,
  GenerateTableColumn,
  ImportHistoryItem,
  TableColumnConfig,
  TableConfig,
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
import TableConfigPanel from "./components/TableConfigPanel";
import ThemeToggle from "./components/ThemeToggle";

type Theme = "light" | "dark";
type ActiveView = "import" | "tables" | "history";

function App() {
  const [catalog, setCatalog] = useState<CatalogEntity[]>([]);
  const [fieldTypes, setFieldTypes] = useState<FieldType[]>([]);
  const [usingFallbackCatalog, setUsingFallbackCatalog] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [tables, setTables] = useState<ConfiguredTable[]>(() => {
    const savedTables = loadConfiguredTables();
    return savedTables.length
      ? savedTables
      : [createConfiguredTable(createDefaultTableConfig())];
  });
  const [selectedTableId, setSelectedTableId] = useState("");
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
  const [tablesSaved, setTablesSaved] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("excel-insert-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) ||
    tables[0] ||
    createConfiguredTable(createDefaultTableConfig());

  const requiredMissing = useMemo(
    () => getRequiredMissing(selectedTable.columns, mapping),
    [mapping, selectedTable.columns],
  );

  const tableIssue = useMemo(() => getTableConfigIssue(selectedTable), [selectedTable]);
  const mappedFieldsCount = selectedTable.columns.filter(
    (column) => column.name.trim() && mapping[column.name],
  ).length;
  const canGenerate = Boolean(
    uploadResult &&
      selectedSheetName &&
      headers.length &&
      !tableIssue &&
      requiredMissing.length === 0 &&
      mappedFieldsCount > 0,
  );

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (!selectedTableId || !tables.some((table) => table.id === selectedTableId)) {
      setSelectedTableId(tables[0]?.id || "");
    }
  }, [selectedTableId, tables]);

  useEffect(() => {
    saveConfiguredTables(tables);
  }, [tables]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("excel-insert-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle("mobile-sidebar-lock", mobileSidebarOpen);

    return () => {
      document.body.classList.remove("mobile-sidebar-lock");
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileSidebarOpen]);

  async function loadCatalog() {
    setCatalogLoading(true);
    setCatalogError("");

    const result = await getCatalog();
    setCatalog(result.entities);
    setFieldTypes(result.fieldTypes);
    setUsingFallbackCatalog(result.usingFallback);
    setCatalogError(
      result.usingFallback
        ? "Catálogo local em uso. Conecte a API para sincronizar entidades."
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
      setMapping(
        makeUniqueMapping(
          buildAutoMapping(selectedTable.columns, existingHeaders),
          selectedTable.columns,
        ),
      );
      return;
    }

    setIsLoadingSheet(true);

    try {
      const details = await getSheetDetails(workbookId, sheetName);
      setHeaders(details.headers);
      setMapping(
        makeUniqueMapping(
          buildAutoMapping(selectedTable.columns, details.headers),
          selectedTable.columns,
        ),
      );
    } catch (error) {
      setApiError(toApiErrorShape(error, "Nao foi possivel carregar a aba."));
    } finally {
      setIsLoadingSheet(false);
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  function openView(view: ActiveView) {
    setActiveView(view);
    setMobileSidebarOpen(false);
  }

  function updateSelectedTable(
    updater: (current: ConfiguredTable) => ConfiguredTable,
  ) {
    setTables((currentTables) =>
      currentTables.map((table) =>
        table.id === selectedTable.id ? updater(table) : table,
      ),
    );
  }

  function handleSelectTable(tableId: string) {
    const nextTable = tables.find((table) => table.id === tableId);
    if (!nextTable) {
      return;
    }

    setSelectedTableId(tableId);
    setMapping(
      makeUniqueMapping(
        buildAutoMapping(nextTable.columns, headers),
        nextTable.columns,
      ),
    );
    setSqlResult(null);
    setApiError(null);
  }

  function handleAddTable() {
    const nextTable = createConfiguredTable(createBlankTableConfig());
    setTables((currentTables) => [...currentTables, nextTable]);
    setSelectedTableId(nextTable.id);
    setMapping({});
    setSqlResult(null);
    setApiError(null);
  }

  function handleRemoveTable(tableId: string) {
    if (tables.length <= 1) {
      return;
    }

    const nextTables = tables.filter((table) => table.id !== tableId);
    setTables(nextTables);
    if (selectedTableId === tableId) {
      const nextSelectedTable = nextTables[0];
      setSelectedTableId(nextSelectedTable.id);
      setMapping(
        makeUniqueMapping(
          buildAutoMapping(nextSelectedTable.columns, headers),
          nextSelectedTable.columns,
        ),
      );
    }
    setSqlResult(null);
    setApiError(null);
  }

  function handleSaveTables() {
    saveConfiguredTables(tables);
    setTablesSaved(true);
    window.setTimeout(() => setTablesSaved(false), 1600);
  }

  function handleConfiguredTableChange(tableId: string) {
    const nextTable = tables.find((table) => table.id === tableId);
    if (!nextTable) {
      return;
    }

    setSelectedTableId(tableId);
    setMapping(
      makeUniqueMapping(
        buildAutoMapping(nextTable.columns, headers),
        nextTable.columns,
      ),
    );
    setSqlResult(null);
    setApiError(null);
  }

  function handleApplyTemplate(entityName: string) {
    const entity = catalog.find((item) => item.name === entityName);
    if (!entityName) {
      updateSelectedTable((current) => ({ ...current, templateName: undefined }));
      setSqlResult(null);
      setApiError(null);
      return;
    }

    if (!entity) {
      return;
    }

    const nextTableConfig = createTableConfigFromEntity(entity);
    updateSelectedTable((current) => ({
      ...nextTableConfig,
      id: current.id,
      templateName: entity.name,
    }));
    setMapping(
      makeUniqueMapping(
        buildAutoMapping(nextTableConfig.columns, headers),
        nextTableConfig.columns,
      ),
    );
    setSqlResult(null);
    setApiError(null);
  }

  function handleTableNameChange(name: string) {
    updateSelectedTable((current) => ({ ...current, name, templateName: undefined }));
    setSqlResult(null);
    setApiError(null);
  }

  function handleColumnChange(
    columnId: string,
    patch: Partial<TableColumnConfig>,
  ) {
    const previousColumn = selectedTable.columns.find(
      (column) => column.id === columnId,
    );

    updateSelectedTable((current) => ({
      ...current,
      templateName: undefined,
      columns: current.columns.map((column) =>
        column.id === columnId ? { ...column, ...patch } : column,
      ),
    }));

    if (patch.name !== undefined && previousColumn?.name) {
      setMapping((current) => {
        const next = { ...current };
        const previousHeader = next[previousColumn.name];
        delete next[previousColumn.name];
        if (patch.name && previousHeader) {
          next[patch.name] = previousHeader;
        }
        return next;
      });
    }

    setSqlResult(null);
    setApiError(null);
  }

  function handleAddColumn() {
    updateSelectedTable((current) => ({
      ...current,
      templateName: undefined,
      columns: [...current.columns, createTableColumn()],
    }));
    setSqlResult(null);
  }

  function handleRemoveColumn(columnId: string) {
    const column = selectedTable.columns.find((item) => item.id === columnId);
    updateSelectedTable((current) => ({
      ...current,
      templateName: undefined,
      columns: current.columns.filter((item) => item.id !== columnId),
    }));
    if (column?.name) {
      setMapping((current) => {
        const next = { ...current };
        delete next[column.name];
        return next;
      });
    }
    setSqlResult(null);
  }

  function handleMappingChange(fieldName: string, headerName: string) {
    setMapping((current) => {
      const next = { ...current };
      if (headerName) {
        for (const [mappedField, mappedHeader] of Object.entries(next)) {
          if (mappedField !== fieldName && mappedHeader === headerName) {
            delete next[mappedField];
          }
        }
        next[fieldName] = headerName;
      } else {
        delete next[fieldName];
      }

      return next;
    });
    setSqlResult(null);
  }

  function applyAutoMapping() {
    setMapping(
      makeUniqueMapping(
        buildAutoMapping(selectedTable.columns, headers),
        selectedTable.columns,
      ),
    );
    setSqlResult(null);
  }

  async function handleGenerateSql() {
    if (!uploadResult || !canGenerate) {
      return;
    }

    setIsGenerating(true);
    setApiError(null);
    setSqlResult(null);

    try {
      const result = await generateSql({
        workbookId: uploadResult.workbookId,
        sheetName: selectedSheetName,
        table: buildGenerateTable(selectedTable),
        mapping: buildGenerateMapping(selectedTable.columns, mapping),
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
      `${toSafeFilename(selectedTable.name)}-${safeSheet || "script"}.sql`,
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
    const nextItem: ImportHistoryItem = {
      id: createHistoryId(),
      createdAt: new Date().toISOString(),
      fileName: selectedFile?.name || "planilha.xlsx",
      entity: selectedTable.name,
      entityLabel: selectedTable.name,
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

  return (
    <main
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        mobileSidebarOpen ? "mobile-sidebar-open" : ""
      }`}
    >
      <Sidebar
        usingFallbackCatalog={usingFallbackCatalog}
        activeView={activeView}
        historyCount={historyItems.length}
        tablesCount={tables.length}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenImport={() => openView("import")}
        onOpenTables={() => openView("tables")}
        onOpenHistory={() => openView("history")}
      />
      <button
        className="sidebar-backdrop"
        type="button"
        aria-label="Fechar menu lateral"
        onClick={() => setMobileSidebarOpen(false)}
      />

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              {activeView === "history"
                ? "Auditoria local"
                : activeView === "tables"
                  ? "Catálogo do front"
                  : "Gerador revisável"}
            </span>
            <h1>
              {activeView === "history"
                ? "Histórico de importações"
                : activeView === "tables"
                  ? "Tabelas configuradas para importação"
                  : "Excel para SQL com validação de catálogo"}
            </h1>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button mobile-menu-button"
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Abrir menu lateral"
              aria-expanded={mobileSidebarOpen}
              title="Abrir menu"
            >
              <MoreVertical size={18} />
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              className="icon-button"
              type="button"
              onClick={loadCatalog}
              aria-label="Atualizar catálogo"
              title="Atualizar catálogo"
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
                label="Tabela"
                value={selectedTable.name || "Sem nome"}
                meta={`${selectedTable.columns.length} colunas`}
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
                value={`${mappedFieldsCount}/${selectedTable.columns.length}`}
                meta={`${requiredMissing.length} obrigatórios pendentes`}
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
                tables={tables}
                selectedTableId={selectedTable.id}
                selectedTable={selectedTable}
                tableIssue={tableIssue}
                selectedFile={selectedFile}
                uploadResult={uploadResult}
                selectedSheetName={selectedSheetName}
                headers={headers}
                mapping={mapping}
                canGenerate={canGenerate}
                isUploading={isUploading}
                isLoadingSheet={isLoadingSheet}
                isGenerating={isGenerating}
                onConfiguredTableChange={handleConfiguredTableChange}
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
        ) : activeView === "tables" ? (
          <>
            {(catalogError || apiError) && (
              <StatusPanel catalogMessage={catalogError} apiError={apiError} />
            )}

            <TableConfigPanel
              tables={tables}
              selectedTable={selectedTable}
              selectedTableId={selectedTable.id}
              tableIssue={tableIssue}
              catalog={catalog}
              catalogLoading={catalogLoading}
              fieldTypes={fieldTypes}
              onSelectTable={handleSelectTable}
              onAddTable={handleAddTable}
              onSaveTables={handleSaveTables}
              tablesSaved={tablesSaved}
              onRemoveTable={handleRemoveTable}
              onApplyTemplate={handleApplyTemplate}
              onTableNameChange={handleTableNameChange}
              onColumnChange={handleColumnChange}
              onAddColumn={handleAddColumn}
              onRemoveColumn={handleRemoveColumn}
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

function createDefaultTableConfig(): TableConfig {
  return {
    name: "users",
    columns: [
      createTableColumn({
        name: "name",
        label: "Nome",
        required: true,
        type: "string",
        maxLength: "120",
      }),
      createTableColumn({
        name: "email",
        label: "Email",
        required: true,
        unique: true,
        type: "email",
        maxLength: "254",
      }),
      createTableColumn({
        name: "cpf",
        label: "CPF",
        required: true,
        unique: true,
        type: "cpf",
      }),
    ],
  };
}

function createBlankTableConfig(): TableConfig {
  return {
    name: "new_table",
    columns: [
      createTableColumn({
        name: "name",
        label: "Nome",
        required: true,
        type: "string",
      }),
    ],
  };
}

function createConfiguredTable(tableConfig: TableConfig): ConfiguredTable {
  return {
    ...tableConfig,
    id: createHistoryId(),
  };
}

function createTableConfigFromEntity(entity: CatalogEntity): TableConfig {
  return {
    name: entity.table || entity.name,
    columns: entity.fields.map((field) =>
      createTableColumn({
        name: field.sqlColumn || field.name,
        label: field.label,
        required: field.required,
        unique: field.unique,
        type: field.type,
        maxLength: field.maxLength ? String(field.maxLength) : "",
      }),
    ),
  };
}

function createTableColumn(
  overrides: Partial<TableColumnConfig> = {},
): TableColumnConfig {
  return {
    id: createHistoryId(),
    name: "",
    label: "",
    required: false,
    unique: false,
    type: "string",
    maxLength: "",
    ...overrides,
  };
}

function getTableConfigIssue(tableConfig: TableConfig): string {
  const tableName = tableConfig.name.trim();
  if (!tableName) {
    return "Informe o nome da tabela.";
  }

  if (!isSafeTableName(tableName)) {
    return "Use um nome de tabela seguro, como users ou public.users.";
  }

  const columnNames = tableConfig.columns
    .map((column) => column.name.trim())
    .filter(Boolean);

  if (!columnNames.length) {
    return "Adicione ao menos uma coluna.";
  }

  const duplicateColumn = columnNames.find(
    (columnName, index) => columnNames.indexOf(columnName) !== index,
  );
  if (duplicateColumn) {
    return `A coluna ${duplicateColumn} está duplicada.`;
  }

  const invalidColumn = columnNames.find((columnName) => !isSafeIdentifier(columnName));
  if (invalidColumn) {
    return `A coluna ${invalidColumn} precisa usar um identificador seguro.`;
  }

  const invalidMaxLength = tableConfig.columns.find(
    (column) =>
      column.maxLength.trim() &&
      (!Number.isInteger(Number(column.maxLength)) || Number(column.maxLength) < 1),
  );
  if (invalidMaxLength) {
    return `O tamanho máximo de ${invalidMaxLength.name || "uma coluna"} precisa ser positivo.`;
  }

  return "";
}

function buildGenerateTable(tableConfig: TableConfig) {
  return {
    name: tableConfig.name.trim(),
    columns: tableConfig.columns
      .filter((column) => column.name.trim())
      .map<GenerateTableColumn>((column) => {
        const maxLength = Number(column.maxLength);
        return {
          name: column.name.trim(),
          label: column.label.trim() || column.name.trim(),
          required: column.required,
          type: column.type,
          unique: column.unique,
          ...(Number.isInteger(maxLength) && maxLength > 0 ? { maxLength } : {}),
        };
      }),
  };
}

function buildGenerateMapping(
  columns: TableColumnConfig[],
  mapping: Record<string, string>,
): Record<string, string> {
  return columns.reduce<Record<string, string>>((nextMapping, column) => {
    const fieldName = column.name.trim();
    if (fieldName && mapping[fieldName]) {
      nextMapping[fieldName] = mapping[fieldName];
    }
    return nextMapping;
  }, {});
}

function makeUniqueMapping(
  mapping: Record<string, string>,
  columns: TableColumnConfig[],
): Record<string, string> {
  const usedHeaders = new Set<string>();

  return columns.reduce<Record<string, string>>((nextMapping, column) => {
    const fieldName = column.name.trim();
    const headerName = mapping[fieldName];
    if (fieldName && headerName && !usedHeaders.has(headerName)) {
      nextMapping[fieldName] = headerName;
      usedHeaders.add(headerName);
    }
    return nextMapping;
  }, {});
}

function isSafeTableName(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length <= 2 &&
    parts.every((part) => part.length > 0 && isSafeIdentifier(part))
  );
}

function isSafeIdentifier(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function toSafeFilename(value: string): string {
  return (
    value
      .replace(/[^\w-]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "script"
  );
}

export default App;
