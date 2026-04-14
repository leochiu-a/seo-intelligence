import { Plus, Download } from 'lucide-react';

interface ToolbarProps {
  onAddNode: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  isEmpty: boolean;
}

export function Toolbar({ onAddNode, onExportJson, onExportCsv, isEmpty }: ToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-white px-4 shadow-sm">
      <span className="text-sm font-bold tracking-wide text-pink">SEO INTELLIGENCE</span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onAddNode}
          className="flex items-center gap-1.5 rounded-md bg-dark px-4 py-1.5 text-sm font-semibold text-white hover:bg-ink transition-colors"
        >
          <Plus size={16} />
          Add Node
        </button>
        <button
          onClick={onExportJson}
          disabled={isEmpty}
          className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <Download size={14} />
          Export JSON
        </button>
        <button
          onClick={onExportCsv}
          disabled={isEmpty}
          className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>
    </header>
  );
}
