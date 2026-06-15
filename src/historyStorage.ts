import type { ImportHistoryItem } from "./types";

const HISTORY_KEY = "excel-insert-import-history";
const MAX_HISTORY_ITEMS = 50;

export function loadImportHistory(): ImportHistoryItem[] {
  try {
    const rawHistory = localStorage.getItem(HISTORY_KEY);
    if (!rawHistory) {
      return [];
    }

    const parsedHistory = JSON.parse(rawHistory);
    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return parsedHistory.filter(isImportHistoryItem);
  } catch {
    return [];
  }
}

export function saveImportHistory(items: ImportHistoryItem[]): void {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)),
  );
}

export function createHistoryId(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isImportHistoryItem(value: unknown): value is ImportHistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<ImportHistoryItem>;
  return Boolean(
    item.id &&
      item.createdAt &&
      item.fileName &&
      item.entity &&
      item.sheetName &&
      typeof item.sql === "string",
  );
}
