import type { CatalogField, TableColumnConfig } from "./types";

type MappingField = Pick<CatalogField, "name" | "label" | "required"> &
  Partial<Pick<CatalogField, "sqlColumn">> &
  Partial<Pick<TableColumnConfig, "maxLength">>;

const aliases: Record<string, string[]> = {
  external_id: ["id externo", "external id", "codigo", "codigo externo"],
  name: ["nome", "name", "usuario", "cliente"],
  email: ["email", "e-mail", "mail"],
  cpf: ["cpf", "documento"],
  phone: ["telefone", "phone", "celular", "whatsapp"],
  birth_date: ["nascimento", "data nascimento", "birth date", "dt nascimento"],
  is_active: ["ativo", "active", "status", "is active"],
};

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildAutoMapping(
  fields: MappingField[],
  headers: string[],
): Record<string, string> {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeText(header),
  }));

  return fields.reduce<Record<string, string>>((mapping, field) => {
    const candidates = [
      field.name,
      field.label,
      field.sqlColumn || field.name,
      ...(aliases[field.name] || []),
    ].map(normalizeText);

    const exactMatch = normalizedHeaders.find((header) =>
      candidates.includes(header.normalized),
    );

    const partialMatch =
      exactMatch ||
      normalizedHeaders.find((header) =>
        candidates.some(
          (candidate) =>
            candidate.length > 2 &&
            (header.normalized.includes(candidate) ||
              candidate.includes(header.normalized)),
        ),
      );

    if (partialMatch) {
      mapping[field.name] = partialMatch.original;
    }

    return mapping;
  }, {});
}

export function getRequiredMissing(
  fields: MappingField[],
  mapping: Record<string, string>,
): MappingField[] {
  return fields.filter((field) => field.required && !mapping[field.name]);
}

export function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
