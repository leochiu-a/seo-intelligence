import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Pencil, TriangleAlert } from 'lucide-react';
import { EditPopover } from './EditPopover';
import { formatPageCount, type UrlNodeData, type ScoreTier } from '../lib/graph-utils';

export type { UrlNodeData } from '../lib/graph-utils';

interface UrlNodeExtendedData extends UrlNodeData {
  onUpdate?: (id: string, data: Partial<UrlNodeData>) => void;
  scoreTier?: ScoreTier;
  isWeak?: boolean;
}

const TONE_MAP: Record<ScoreTier, { card: string; focus: string; badge: string; badgeLabel: string }> = {
  high: {
    card: 'bg-white border-tier-high/40',
    focus: 'border-tier-high shadow-[0_0_0_1px_var(--color-tier-high-glow),0_0_24px_var(--color-tier-high-ambient)]',
    badge: 'bg-green-100 text-green-700',
    badgeLabel: 'High',
  },
  mid: {
    card: 'bg-white border-tier-mid/40',
    focus: 'border-tier-mid shadow-[0_0_0_1px_var(--color-tier-mid-glow),0_0_24px_var(--color-tier-mid-ambient)]',
    badge: 'bg-amber-100 text-amber-700',
    badgeLabel: 'Mid',
  },
  low: {
    card: 'bg-white border-tier-low/40',
    focus: 'border-tier-low shadow-[0_0_0_1px_var(--color-tier-low-glow),0_0_24px_var(--color-tier-low-ambient)]',
    badge: 'bg-red-100 text-red-700',
    badgeLabel: 'Low',
  },
  neutral: {
    card: 'bg-white border-tier-neutral/40',
    focus: 'border-tier-neutral shadow-[0_0_0_1px_var(--color-tier-neutral-glow),0_0_24px_var(--color-tier-neutral-ambient)]',
    badge: 'bg-indigo-100 text-indigo-700',
    badgeLabel: 'Neutral',
  },
};

function UrlNodeComponent({ id, data, selected }: NodeProps<UrlNodeExtendedData>) {
  const [showPopover, setShowPopover] = useState(false);

  const tier = data.scoreTier ?? 'neutral';
  const tone = TONE_MAP[tier];

  const handleSave = (urlTemplate: string, pageCount: number) => {
    if (data.onUpdate) {
      data.onUpdate(id, { urlTemplate, pageCount });
    }
  };

  return (
    <div
      className={`w-[200px] rounded-xl border-2 p-2.5 shadow-md shadow-black/8 transition ${tone.card} ${selected ? tone.focus : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#ffffff', border: '2px solid var(--color-placeholder)', width: 12, height: 12 }}
      />

      {/* Header: badge + edit button */}
      <div className="mb-2 flex items-center gap-2">
        {tier !== 'neutral' && (
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.badge}`}>
            {tone.badgeLabel}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            className="nodrag p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Edit node"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover((prev) => !prev);
            }}
          >
            <Pencil size={14} className="text-muted-fg hover:text-dark" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-1 truncate text-xs font-semibold text-dark">
        {data.urlTemplate || <span className="text-placeholder">No URL template</span>}
      </div>

      {/* Subtitle */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-fg">
        <span>{formatPageCount(data.pageCount)}</span>
        {data.isWeak && (
          <>
            <span>·</span>
            <TriangleAlert size={11} className="text-amber-500" aria-label="Weak page" />
            <span className="text-amber-500">Weak</span>
          </>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#ffffff', border: '2px solid var(--color-placeholder)', width: 12, height: 12 }}
      />

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
