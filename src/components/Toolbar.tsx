import { Plus } from 'lucide-react';

export function Toolbar({ onAddNode }: { onAddNode: () => void }) {
  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4">
      <button
        onClick={onAddNode}
        className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-1.5 rounded-md flex items-center gap-1.5"
      >
        <Plus size={16} />
        + Add Node
      </button>
    </div>
  );
}
