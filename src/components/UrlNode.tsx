import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Pencil } from 'lucide-react';
import { EditPopover } from './EditPopover';
import { formatPageCount, type UrlNodeData } from '../lib/graph-utils';

export type { UrlNodeData } from '../lib/graph-utils';

interface UrlNodeExtendedData extends UrlNodeData {
  onUpdate?: (id: string, data: Partial<UrlNodeData>) => void;
}

function UrlNodeComponent({ id, data }: NodeProps<UrlNodeExtendedData>) {
  const [showPopover, setShowPopover] = useState(false);

  const handleSave = (urlTemplate: string, pageCount: number) => {
    if (data.onUpdate) {
      data.onUpdate(id, { urlTemplate, pageCount });
    }
  };

  return (
    <div className="group relative min-w-[200px] max-w-[280px] min-h-[64px] bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md border-l-4 border-l-indigo-500 px-4 py-2">
      <Handle type="target" position={Position.Left} className="!bg-indigo-500 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-2.5 !h-2.5" />

      <p className="text-sm font-semibold text-gray-900 leading-tight truncate pr-6">
        {data.urlTemplate}
      </p>
      <p className="text-xs text-gray-500 leading-snug mt-1">
        {formatPageCount(data.pageCount)}
      </p>

      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-gray-100"
        aria-label="Edit node"
        onClick={(e) => {
          e.stopPropagation();
          setShowPopover((prev) => !prev);
        }}
      >
        <Pencil size={14} className="text-gray-400 hover:text-gray-600" />
      </button>

      {showPopover && (
        <EditPopover
          nodeId={id}
          urlTemplate={data.urlTemplate}
          pageCount={data.pageCount}
          onSave={handleSave}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
}

export const UrlNode = memo(UrlNodeComponent);
