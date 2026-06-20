import type {
  ApiErrorShape,
  CatalogEntity,
  CatalogField,
  CatalogResult,
  FieldType,
  GenerateSqlPayload,
  GenerateSqlResult,
  SheetDetails,
  UploadResult,
  UploadSheet,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3333";

const fallbackFieldTypes: FieldType[] = [
  "string",
  "email",
  "cpf",
  "boolean",
  "date",
  "number",
];

const fallbackCatalog: CatalogEntity[] = [
  {
    name: "users",
    label: "Usuários",
    table: "users",
    fields: [
      {
        name: "external_id",
        label: "ID externo",
        sqlColumn: "external_id",
        required: false,
        unique: false,
        type: "string",
      },
      {
        name: "name",
        label: "Nome",
        sqlColumn: "name",
        required: true,
        unique: false,
        type: "string",
      },
      {
        name: "email",
        label: "Email",
        sqlColumn: "email",
        required: true,
        unique: true,
        type: "email",
      },
      {
        name: "cpf",
        label: "CPF",
        sqlColumn: "cpf",
        required: true,
        unique: true,
        type: "cpf",
      },
      {
        name: "phone",
        label: "Telefone",
        sqlColumn: "phone",
        required: false,
        unique: false,
        type: "string",
      },
      {
        name: "birth_date",
        label: "Nascimento",
        sqlColumn: "birth_date",
        required: false,
        unique: false,
        type: "date",
      },
      {
        name: "is_active",
        label: "Ativo",
        sqlColumn: "is_active",
        required: false,
        unique: false,
        type: "boolean",
      },
      {
        name: "age",
        label: "Idade",
        sqlColumn: "age",
        required: false,
        unique: false,
        type: "number",
      },
    ],
  },
];

export class ApiError extends Error {
  status?: number;
  payload?: ApiErrorShape;

  constructor(message: string, status?: number, payload?: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const payload = parseErrorPayload(data);
    throw new ApiError(
      payload.message || "Nao foi possivel concluir a requisicao.",
      response.status,
      payload,
    );
  }

  return data as T;
}

function parseErrorPayload(data: unknown): ApiErrorShape {
  if (isRecord(data)) {
    const nestedError = data.error;
    if (isRecord(nestedError)) {
      return {
        code: readString(nestedError.code),
        message:
          readString(nestedError.message) ||
          "Nao foi possivel concluir a requisicao.",
        details: isRecord(nestedError.details)
          ? {
              line: readNumber(nestedError.details.line),
              column: readString(nestedError.details.column),
              field: readString(nestedError.details.field),
              value: readString(nestedError.details.value),
              reason: readString(nestedError.details.reason),
            }
          : undefined,
      };
    }

    return {
      code: readString(data.code),
      message:
        readString(data.message) || "Nao foi possivel concluir a requisicao.",
    };
  }

  return {
    message:
      typeof data === "string" && data.trim()
        ? data
        : "Nao foi possivel concluir a requisicao.",
  };
}

export async function getCatalog(): Promise<CatalogResult> {
  try {
    const data = await request<unknown>("/api/catalog");
    const entities = normalizeCatalog(data);
    const fieldTypes = normalizeFieldTypes(data);

    return {
      entities,
      fieldTypes: fieldTypes.length ? fieldTypes : fallbackFieldTypes,
      usingFallback: false,
    };
  } catch {
    return {
      entities: fallbackCatalog,
      fieldTypes: fallbackFieldTypes,
      usingFallback: true,
    };
  }
}

export async function uploadWorkbook(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const data = await request<unknown>("/api/workbooks/upload", {
    method: "POST",
    body: formData,
  });

  return normalizeUpload(data);
}

export async function getSheetDetails(
  workbookId: string,
  sheetName: string,
): Promise<SheetDetails> {
  const encodedWorkbookId = encodeURIComponent(workbookId);
  const encodedSheetName = encodeURIComponent(sheetName);
  const data = await request<unknown>(
    `/api/workbooks/${encodedWorkbookId}/sheets/${encodedSheetName}`,
  );

  return normalizeSheetDetails(data, workbookId, sheetName);
}

export async function generateSql(
  payload: GenerateSqlPayload,
): Promise<GenerateSqlResult> {
  return request<GenerateSqlResult>("/api/sql/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

function normalizeCatalog(data: unknown): CatalogEntity[] {
  const rawEntities = extractEntities(data);

  return rawEntities
    .map((rawEntity) => normalizeEntity(rawEntity))
    .filter((entity): entity is CatalogEntity => Boolean(entity));
}

function normalizeFieldTypes(data: unknown): FieldType[] {
  if (!isRecord(data) || !Array.isArray(data.fieldTypes)) {
    return [];
  }

  return data.fieldTypes
    .map((fieldType) => readString(fieldType))
    .filter((fieldType) => fieldType.length > 0);
}

function extractEntities(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!isRecord(data)) {
    return [];
  }

  const candidateKeys = ["entities", "catalog", "data", "items"];
  for (const key of candidateKeys) {
    const candidate = data[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (isRecord(candidate)) {
      return Object.entries(candidate).map(([name, value]) =>
        isRecord(value) ? { name, ...value } : { name },
      );
    }
  }

  return Object.entries(data).map(([name, value]) =>
    isRecord(value) ? { name, ...value } : { name },
  );
}

function normalizeEntity(rawEntity: unknown): CatalogEntity | null {
  if (!isRecord(rawEntity)) {
    return null;
  }

  const name = readString(rawEntity.name) || readString(rawEntity.entity);
  if (!name) {
    return null;
  }

  return {
    name,
    label: readString(rawEntity.label) || humanize(name),
    table: readString(rawEntity.table) || readString(rawEntity.tableName) || name,
    fields: normalizeFields(rawEntity.fields),
  };
}

function normalizeFields(fields: unknown): CatalogField[] {
  if (Array.isArray(fields)) {
    return fields
      .map((field) => normalizeField(field))
      .filter((field): field is CatalogField => Boolean(field));
  }

  if (isRecord(fields)) {
    return Object.entries(fields)
      .map(([name, value]) =>
        normalizeField(isRecord(value) ? { name, ...value } : { name }),
      )
      .filter((field): field is CatalogField => Boolean(field));
  }

  return [];
}

function normalizeField(rawField: unknown): CatalogField | null {
  if (!isRecord(rawField)) {
    return null;
  }

  const name =
    readString(rawField.name) ||
    readString(rawField.field) ||
    readString(rawField.apiField);
  if (!name) {
    return null;
  }

  return {
    name,
    label: readString(rawField.label) || humanize(name),
    sqlColumn:
      readString(rawField.sqlColumn) ||
      readString(rawField.column) ||
      readString(rawField.sql_column) ||
      name,
    required: readBoolean(rawField.required) || readBoolean(rawField.mandatory),
    unique: readBoolean(rawField.unique),
    type: readString(rawField.type) || "string",
    maxLength: readNumber(rawField.maxLength),
  };
}

function normalizeUpload(data: unknown): UploadResult {
  if (!isRecord(data)) {
    throw new ApiError("Resposta de upload invalida.");
  }

  const workbookId =
    readString(data.workbookId) ||
    readString(data.id) ||
    readString(data.workbook_id);

  if (!workbookId) {
    throw new ApiError("O upload nao retornou workbookId.");
  }

  return {
    workbookId,
    sheets: normalizeSheets(data.sheets, data.headers),
  };
}

function normalizeSheets(sheets: unknown, rootHeaders: unknown): UploadSheet[] {
  if (Array.isArray(sheets)) {
    return sheets
      .map((sheet) => {
        if (typeof sheet === "string") {
          return {
            name: sheet,
            headers: normalizeHeaders(rootHeaders),
          };
        }

        if (!isRecord(sheet)) {
          return null;
        }

        const name =
          readString(sheet.name) ||
          readString(sheet.sheetName) ||
          readString(sheet.title);

        if (!name) {
          return null;
        }

        return {
          name,
          headers: normalizeHeaders(sheet.headers),
          rowCount: readNumber(sheet.rowCount) || readNumber(sheet.rows),
        };
      })
      .filter((sheet): sheet is UploadSheet => Boolean(sheet));
  }

  if (isRecord(sheets)) {
    return Object.entries(sheets).map(([name, value]) => ({
      name,
      headers: isRecord(value)
        ? normalizeHeaders(value.headers)
        : normalizeHeaders(value),
    }));
  }

  return [];
}

function normalizeSheetDetails(
  data: unknown,
  workbookId: string,
  sheetName: string,
): SheetDetails {
  if (!isRecord(data)) {
    return {
      workbookId,
      sheetName,
      headers: [],
    };
  }

  const rawSheet = isRecord(data.sheet) ? data.sheet : data;

  return {
    workbookId: readString(data.workbookId) || workbookId,
    sheetName:
      readString(rawSheet.sheetName) || readString(rawSheet.name) || sheetName,
    headers: normalizeHeaders(rawSheet.headers),
  };
}

function normalizeHeaders(headers: unknown): string[] {
  if (!Array.isArray(headers)) {
    return [];
  }

  return headers
    .map((header) => normalizeHeaderName(header))
    .filter((header) => header.length > 0);
}

function normalizeHeaderName(header: unknown): string {
  if (typeof header === "string" || typeof header === "number") {
    return String(header).trim();
  }

  if (!isRecord(header)) {
    return "";
  }

  const candidateKeys = [
    "name",
    "header",
    "label",
    "value",
    "title",
    "text",
    "key",
    "columnName",
    "column_name",
  ];

  for (const key of candidateKeys) {
    const value = header[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
