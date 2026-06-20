export type FieldType =
  | "string"
  | "email"
  | "cpf"
  | "date"
  | "boolean"
  | "number"
  | string;

export interface CatalogField {
  name: string;
  label: string;
  sqlColumn: string;
  required: boolean;
  unique: boolean;
  type: FieldType;
  maxLength?: number;
}

export interface CatalogEntity {
  name: string;
  label: string;
  table: string;
  fields: CatalogField[];
}

export interface CatalogResult {
  entities: CatalogEntity[];
  fieldTypes: FieldType[];
  usingFallback: boolean;
}

export interface TableColumnConfig {
  id: string;
  name: string;
  label: string;
  required: boolean;
  unique: boolean;
  type: FieldType;
  maxLength: string;
}

export interface TableConfig {
  name: string;
  columns: TableColumnConfig[];
}

export interface ConfiguredTable extends TableConfig {
  id: string;
  templateName?: string;
}

export interface GenerateTableColumn {
  name: string;
  label?: string;
  required?: boolean;
  type?: FieldType;
  unique?: boolean;
  maxLength?: number;
}

export interface GenerateTable {
  name: string;
  columns: GenerateTableColumn[];
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
  table: GenerateTable;
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

export interface ImportHistoryItem {
  id: string;
  createdAt: string;
  fileName: string;
  entity: string;
  entityLabel: string;
  table: string;
  sheetName: string;
  insertedRows: number;
  columns: string[];
  mapping: Record<string, string>;
  sql: string;
}
