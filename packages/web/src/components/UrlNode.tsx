import { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, type NodeProps, type Node } from 'reactflow';
import { Pencil, TriangleAlert, Globe, Home, Unplug, Layers } from 'lucide-react';
import { EditPopover } from './EditPopover';
import { formatPageCount, type UrlNodeData, type ScoreTier, type Placement, HANDLE_IDS, collectPlacementSuggestions, collectClusterSuggestions } from '../lib/graph-utils';
import { getClusterColor } from '../lib/cluster-colors';

export type { UrlNodeData } from '../lib/graph-utils';

interface UrlNodeExtendedData extends UrlNodeData {
  onUpdate?: (id: string, data: Partial<UrlNodeData>) => void;
  onRootToggle?: (id: string) => void;
  onZIndexChange?: (id: string, zIndex: number) => void;
  scoreTier?: ScoreTier;
  isWeak?: boolean;
  isOrphan?: boolean;
  isUnreachable?: boolean;
  crawlDepth?: number;
  outboundCount?: number;
  isOverLinked?: boolean;
  tags?: string[];
  isDimmed?: boolean;
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
  const { getNodes } = useReactFlow();

  // Elevate this node's z-index when popover is open so it renders above siblings.
  // Goes through App's setNodes (useNodesState) via data.onZIndexChange to avoid
  // racing with data updates made in the same batch (see App.onNodeZIndexChange).
  const onZIndexChange = data.onZIndexChange;
  useEffect(() => {
    if (onZIndexChange) {
      onZIndexChange(id, showPopover ? 1000 : 0);
    }
  }, [showPopover, id, onZIndexChange]);

  // NOTE: Do NOT wrap in useMemo. `getNodes` from useReactFlow is a stable
  // reference that never changes when node data mutates via setNodes, so a
  // memo keyed on [id, getNodes] becomes permanently stale (UAT gap — Test 5).
  const allNodes = getNodes() as Node<UrlNodeData>[];
  const placementSuggestions = collectPlacementSuggestions(allNodes, id);
  const clusterSuggestions = collectClusterSuggestions(allNodes, id);

  const tier = data.scoreTier ?? 'neutral';
  const tone = TONE_MAP[tier];

  const tags = data.tags ?? [];
  const visibleBandTags = tags.slice(0, 3);
  const overflowCount = Math.max(0, tags.length - 3);

  const handleSave = (
    urlTemplate: string,
    pageCount: number,
    isGlobal: boolean,
    placements: Placement[],
    savedTags: string[],
  ) => {
    if (data.onUpdate) {
      data.onUpdate(id, { urlTemplate, pageCount, isGlobal, placements, tags: savedTags });
    }
  };

  return (
    <div
      className={`relative w-[200px] rounded-xl border-2 p-2.5 shadow-md shadow-black/8 transition ${tone.card} ${selected ? tone.focus : ''}`}
    >
      <Handle
        type="source"
        id={HANDLE_IDS.top}
        position={Position.Top}
        style={{ background: '#ffffff', border: '2px solid var(--color-placeholder)', width: 12, height: 12 }}
      />
      <Handle
        type="source"
        id={HANDLE_IDS.left}
        position={Position.Left}
        style={{ background: '#ffffff', border: '2px solid var(--color-placeholder)', width: 12, height: 12 }}
      />

      {/* Cluster stripe - sibling of content wrapper, stays vivid when dimmed */}
      {visibleBandTags.length > 0 && (
        <div
          data-testid="cluster-stripe"
          className="absolute left-0 top-0 bottom-0 w-1 flex flex-col overflow-hidden rounded-l-xl pointer-events-none"
          aria-hidden
        >
          {visibleBandTags.map((tag) => {
            const color = getClusterColor(tag);
            return <div key={tag} className={`flex-1 ${color.stripe}`} data-cluster-tag={tag} />;
          })}
        </div>
      )}

      {/* Content wrapper - receives dim opacity; stripe above is sibling and stays vivid */}
      <div
        data-testid="card-content"
        data-dimmed={data.isDimmed ?? false}
        style={{ opacity: data.isDimmed ? 0.2 : 1, transition: 'opacity 0.2s' }}
      >
        {/* Edit button — always absolute top-right */}
        <button
          className="nodrag absolute top-2 right-2 p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label="Edit node"
          onClick={(e) => {
            e.stopPropagation();
            setShowPopover((prev) => !prev);
          }}
        >
          <Pencil size={13} className="text-muted-fg hover:text-dark" />
        </button>

        {/* Badges — tier, global, and/or root */}
        {(tier !== 'neutral' || data.isGlobal || data.isRoot) && (
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {tier !== 'neutral' && (
              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.badge}`}>
                {tone.badgeLabel}
              </span>
            )}
            {data.isGlobal && (
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                <Globe size={9} />
                Global
              </span>
            )}
            {data.isRoot && (
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">
                <Home size={9} />
                Root
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <div className="mb-1 break-all pr-6 text-xs font-semibold text-dark">
          {data.urlTemplate || <span className="text-placeholder">No URL template</span>}
        </div>

        {/* Subtitle */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-fg">
          <span>{formatPageCount(data.pageCount)}</span>
          {data.isWeak && !data.isOrphan && !data.isUnreachable && (
            <>
              <span>·</span>
              <TriangleAlert size={11} className="text-amber-500" aria-label="Weak page" />
              <span className="text-amber-500">Weak</span>
            </>
          )}
          {data.isOrphan && (
            <>
              <span>·</span>
              <Unplug size={11} className="text-red-500" aria-label="Orphan page" />
              <span className="text-red-500">Orphan</span>
            </>
          )}
          {data.isUnreachable && !data.isOrphan && (
            <>
              <span>·</span>
              <Unplug size={11} className="text-red-500" aria-label="Unreachable page" />
              <span className="text-red-500">Unreachable</span>
            </>
          )}
          {typeof data.crawlDepth === 'number' && data.crawlDepth !== Infinity && data.crawlDepth > 3 && !data.isOrphan && !data.isUnreachable && (
            <>
              <span>·</span>
              <Layers size={11} className="text-amber-500" aria-label="Deep page" />
              <span className="text-amber-500">Depth {data.crawlDepth}</span>
            </>
          )}
          {data.isOverLinked && typeof data.outboundCount === 'number' && (
            <>
              <span>·</span>
              <TriangleAlert size={11} className="text-red-500" aria-label="Over-linked page" />
              <span className="text-red-500">{data.outboundCount} links</span>
            </>
          )}
          {tags.length > 0 && (
            <>
              <span>·</span>
              {visibleBandTags.map((tag) => {
                const color = getClusterColor(tag);
                return (
                  <span key={tag} className="inline-flex items-center gap-0.5" data-testid="cluster-chip">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${color.dot}`} aria-hidden />
                    <span>{tag}</span>
                  </span>
                );
              })}
              {overflowCount > 0 && (
                <span className="text-muted-fg" data-testid="cluster-overflow">+{overflowCount}</span>
              )}
            </>
          )}
        </div>
      </div>

      <Handle
        type="source"
        id={HANDLE_IDS.right}
        position={Position.Right}
        style={{ background: '#ffffff', border: '2px solid var(--color-placeholder)', width: 12, height: 12 }}
      />
      <Handle
        type="source"
        id={HANDLE_IDS.bottom}
        position={Position.Bottom}
        style={{ background: '#ffffff', border: '2px solid var(--color-placeholder)', width: 12, height: 12 }}
      />

      {showPopover && (
        <EditPopover
          nodeId={id}
          urlTemplate={data.urlTemplate}
          pageCount={data.pageCount}
          isGlobal={data.isGlobal ?? false}
          isRoot={data.isRoot ?? false}
          placements={data.placements ?? []}
          placementSuggestions={placementSuggestions}
          tags={data.tags ?? []}
          clusterSuggestions={clusterSuggestions}
          onSave={handleSave}
          onRootToggle={data.onRootToggle ?? (() => {})}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
}

export const UrlNode = memo(UrlNodeComponent);
