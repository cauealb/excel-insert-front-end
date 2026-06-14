export type FieldType = "string" | "email" | "cpf" | "date" | "boolean" | string;

export interface CatalogField {
  name: string;
  label: string;
  sqlColumn: string;
  required: boolean;
  unique: boolean;
  type: FieldType;
}

export interface CatalogEntity {
  name: string;
  label: string;
  table: string;
  fields: CatalogField[];
}

export interface UploadSheet {
  name: string;
  headers: string[];
  rowCount?: number;
}

export interface UploadResult {
  workbookId: string;
  sheets: UploadSheet[];
}

export interface SheetDetails {
  workbookId: string;
  sheetName: string;
  headers: string[];
}

export interface GenerateSqlPayload {
  workbookId: string;
  sheetName: string;
  entity: string;
  mapping: Record<string, string>;
}

export interface GenerateSummary {
  entity: string;
  table: string;
  sheetName: string;
  insertedRows: number;
  columns: string[];
}

export interface GenerateSqlResult {
  sql: string;
  summary: GenerateSummary;
}

export interface ApiErrorDetails {
  line?: number;
  column?: string;
  field?: string;
  value?: string;
  reason?: string;
}

export interface ApiErrorShape {
  code?: string;
  message: string;
  details?: ApiErrorDetails;
}
