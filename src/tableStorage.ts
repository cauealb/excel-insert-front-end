import type { ConfiguredTable, TableColumnConfig } from "./types";

const TABLES_KEY = "excel-insert-configured-tables";

export function loadConfiguredTables(): ConfiguredTable[] {
  try {
    const rawTables = localStorage.getItem(TABLES_KEY);
    if (!rawTables) {
      return [];
    }

    const parsedTables = JSON.parse(rawTables);
    if (!Array.isArray(parsedTables)) {
      return [];
    }

    return parsedTables.filter(isConfiguredTable);
  } catch {
    return [];
  }
}

export function saveConfiguredTables(tables: ConfiguredTable[]): void {
  localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
}

function isConfiguredTable(value: unknown): value is ConfiguredTable {
  if (!value || typeof value !== "object") {
    return false;
  }

  const table = value as Partial<ConfiguredTable>;
  return Boolean(
    table.id &&
      typeof table.name === "string" &&
      Array.isArray(table.columns) &&
      table.columns.every(isTableColumnConfig) &&
      (table.templateName === undefined || typeof table.templateName === "string"),
  );
}

function isTableColumnConfig(value: unknown): value is TableColumnConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const column = value as Partial<TableColumnConfig>;
  return Boolean(
    column.id &&
      typeof column.name === "string" &&
      typeof column.label === "string" &&
      typeof column.required === "boolean" &&
      typeof column.unique === "boolean" &&
      typeof column.type === "string" &&
      typeof column.maxLength === "string",
  );
}
