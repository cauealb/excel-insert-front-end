import { Check, Database, Plus, Save, Table2, Trash2 } from "lucide-react";
import type {
  CatalogEntity,
  ConfiguredTable,
  FieldType,
  TableColumnConfig,
} from "../types";

const defaultFieldTypes: FieldType[] = [
  "string",
  "email",
  "cpf",
  "boolean",
  "date",
  "number",
];

interface TableConfigPanelProps {
  tables: ConfiguredTable[];
  selectedTable: ConfiguredTable;
  selectedTableId: string;
  tableIssue: string;
  catalog: CatalogEntity[];
  catalogLoading: boolean;
  fieldTypes: FieldType[];
  onSelectTable: (tableId: string) => void;
  onAddTable: () => void;
  onSaveTables: () => void;
  tablesSaved: boolean;
  onRemoveTable: (tableId: string) => void;
  onApplyTemplate: (entityName: string) => void;
  onTableNameChange: (name: string) => void;
  onColumnChange: (
    columnId: string,
    patch: Partial<TableColumnConfig>,
  ) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnId: string) => void;
}

export default function TableConfigPanel({
  tables,
  selectedTable,
  selectedTableId,
  tableIssue,
  catalog,
  catalogLoading,
  fieldTypes,
  onSelectTable,
  onAddTable,
  onSaveTables,
  tablesSaved,
  onRemoveTable,
  onApplyTemplate,
  onTableNameChange,
  onColumnChange,
  onAddColumn,
  onRemoveColumn,
}: TableConfigPanelProps) {
  const typeOptions = fieldTypes.length ? fieldTypes : defaultFieldTypes;

  return (
    <section className="table-layout">
      <aside className="panel table-list-panel">
        <div className="panel-heading inline">
          <div>
            <span className="panel-kicker">Tabelas</span>
            <h2>Configuradas</h2>
          </div>
          <button className="icon-button" type="button" onClick={onAddTable}>
            <Plus size={16} />
          </button>
        </div>

        <div className="table-list">
          {tables.map((table) => (
            <button
              className={`table-list-item ${
                table.id === selectedTableId ? "selected" : ""
              }`}
              type="button"
              key={table.id}
              onClick={() => onSelectTable(table.id)}
            >
              <span className="table-list-icon">
                <Table2 size={18} />
              </span>
              <span className="table-list-main">
                <strong>{table.name || "Sem nome"}</strong>
                <span>{table.columns.length} colunas</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <article className="panel table-config-panel">
        <div className="panel-heading inline">
          <div>
            <span className="panel-kicker">Definição</span>
            <h2>Tabela SQL</h2>
          </div>
          <div className="button-group">
            <button
              className="primary-button"
              type="button"
              onClick={onSaveTables}
            >
              {tablesSaved ? <Check size={16} /> : <Save size={16} />}
              {tablesSaved ? "Salvo" : "Salvar"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onAddColumn}
            >
              <Plus size={16} />
              Coluna
            </button>
            <button
              className="icon-text-button danger"
              type="button"
              onClick={() => onRemoveTable(selectedTable.id)}
              disabled={tables.length <= 1}
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>

        <div className="table-form-grid">
          <div>
            <label className="field-label" htmlFor="table-name">
              Nome da tabela
            </label>
            <input
              id="table-name"
              className="text-input"
              value={selectedTable.name}
              onChange={(event) => onTableNameChange(event.target.value)}
              placeholder="public.customers"
            />
          </div>

          {catalog.length > 0 && (
            <div>
              <label className="field-label" htmlFor="template">
                Modelo do catálogo
              </label>
              <select
                id="template"
                className="select"
                value={selectedTable.templateName || ""}
                onChange={(event) => onApplyTemplate(event.target.value)}
                disabled={catalogLoading}
              >
                <option value="">Personalizado</option>
                {catalog.map((entity) => (
                  <option value={entity.name} key={entity.name}>
                    {entity.label} ({entity.name})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {tableIssue && <div className="inline-error">{tableIssue}</div>}

        <div className="column-config-table" role="table" aria-label="Colunas">
          <div className="column-config-row header" role="row">
            <span>Nome</span>
            <span>Rótulo</span>
            <span>Tipo</span>
            <span>Regras</span>
            <span>Tamanho</span>
            <span></span>
          </div>

          {selectedTable.columns.map((column) => (
            <div className="column-config-row" role="row" key={column.id}>
              <input
                className="text-input compact"
                value={column.name}
                onChange={(event) =>
                  onColumnChange(column.id, { name: event.target.value })
                }
                placeholder="email"
              />
              <input
                className="text-input compact"
                value={column.label}
                onChange={(event) =>
                  onColumnChange(column.id, { label: event.target.value })
                }
                placeholder="E-mail"
              />
              <select
                className="select compact"
                value={column.type}
                onChange={(event) =>
                  onColumnChange(column.id, { type: event.target.value })
                }
              >
                {typeOptions.map((fieldType) => (
                  <option value={fieldType} key={fieldType}>
                    {fieldType}
                  </option>
                ))}
              </select>
              <div className="checkbox-pair">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={column.required}
                    onChange={(event) =>
                      onColumnChange(column.id, {
                        required: event.target.checked,
                      })
                    }
                  />
                  Obrig.
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={column.unique}
                    onChange={(event) =>
                      onColumnChange(column.id, { unique: event.target.checked })
                    }
                  />
                  Único
                </label>
              </div>
              <input
                className="text-input compact"
                inputMode="numeric"
                value={column.maxLength}
                onChange={(event) =>
                  onColumnChange(column.id, { maxLength: event.target.value })
                }
                placeholder="254"
              />
              <button
                className="icon-button row-action"
                type="button"
                onClick={() => onRemoveColumn(column.id)}
                aria-label={`Remover ${column.name || "coluna"}`}
                title="Remover coluna"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="summary-strip table-summary">
          <span>
            <Database size={14} />
            {selectedTable.name || "sem nome"}
          </span>
          <span>{selectedTable.columns.length} colunas</span>
        </div>
      </article>
    </section>
  );
}
