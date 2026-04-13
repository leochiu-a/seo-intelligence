import { Plus, Download } from 'lucide-react';

interface ToolbarProps {
  onAddNode: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  isEmpty: boolean;
}

export function Toolbar({ onAddNode, onExportJson, onExportCsv, isEmpty }: ToolbarProps) {
  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4">
      <button
        onClick={onAddNode}
        className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-1.5 rounded-md flex items-center gap-1.5"
      >
        <Plus size={16} />
        + Add Node
      </button>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onExportJson}
          disabled={isEmpty}
          className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5"
        >
          <Download size={14} />
          Export JSON
        </button>
        <button
          onClick={onExportCsv}
          disabled={isEmpty}
          className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>
    </div>
  );
}
