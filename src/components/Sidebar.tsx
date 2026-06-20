import {
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  FileSpreadsheet,
  Table2,
  X,
} from "lucide-react";
import ApiCard from "./ApiCard";

interface SidebarProps {
  usingFallbackCatalog: boolean;
  activeView: "import" | "tables" | "history";
  historyCount: number;
  tablesCount: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  onOpenImport: () => void;
  onOpenTables: () => void;
  onOpenHistory: () => void;
}

export default function Sidebar({
  usingFallbackCatalog,
  activeView,
  historyCount,
  tablesCount,
  collapsed,
  onToggleCollapsed,
  onCloseMobile,
  onOpenImport,
  onOpenTables,
  onOpenHistory,
}: SidebarProps) {
  const navItems = [
    {
      key: "import",
      label: "Insert",
      count: null,
      icon: <FileSpreadsheet size={18} />,
      onClick: onOpenImport,
    },
    {
      key: "tables",
      label: "Tabelas",
      count: tablesCount,
      icon: <Table2 size={18} />,
      onClick: onOpenTables,
    },
    {
      key: "history",
      label: "Historicos",
      count: historyCount,
      icon: <Clock3 size={18} />,
      onClick: onOpenHistory,
    },
  ] as const;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-mark">
            <FileSpreadsheet size={22} aria-hidden="true" />
          </div>
          <div className="brand-copy">
            <strong>Excel Insert</strong>
            <span>SQL API</span>
          </div>
        </div>
        <button
          className="sidebar-toggle sidebar-toggle-desktop"
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Abrir menu lateral" : "Fechar menu lateral"}
          title={collapsed ? "Abrir menu" : "Fechar menu"}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
        <button
          className="sidebar-toggle sidebar-close-button"
          type="button"
          onClick={onCloseMobile}
          aria-label="Fechar menu lateral"
          title="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Menu principal">
        <span className="sidebar-nav-label">Menu</span>
        {navItems.map((item) => (
          <button
            className={`sidebar-tab ${activeView === item.key ? "active" : ""}`}
            type="button"
            key={item.key}
            onClick={item.onClick}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-tab-icon">{item.icon}</span>
            <span className="sidebar-tab-label">{item.label}</span>
            {item.count !== null && <small>{item.count}</small>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <ApiCard usingFallbackCatalog={usingFallbackCatalog} />
        <div
          className={`sidebar-status-compact ${
            usingFallbackCatalog ? "warning" : "ok"
          }`}
          title={usingFallbackCatalog ? "Catalogo local em uso" : "API conectada"}
        />
      </div>
    </aside>
  );
}
