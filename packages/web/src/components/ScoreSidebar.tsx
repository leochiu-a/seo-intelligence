import { useState, useEffect, useRef, useMemo } from 'react';
import { TriangleAlert, Unplug } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { UrlNodeData, UrlTreeNode } from '../lib/graph-utils';
import { buildUrlTree, OUTBOUND_WARNING_THRESHOLD } from '../lib/graph-utils';
import { getClusterColor } from '../lib/cluster-colors';
import { HealthPanel } from './HealthPanel';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ScoreSidebarProps {
  nodes: Node<UrlNodeData>[];
  scores: Map<string, number>;
  weakNodes: Set<string>;
  orphanNodes: Set<string>;
  unreachableNodes: Set<string>;
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
  rootId: string | null;
}

/** Renders up to 3 small colored dots for a node's cluster tags. Returns null if no tags. */
function renderClusterDots(tags: string[] | undefined) {
  if (!tags || tags.length === 0) return null;
  const visible = tags.slice(0, 3);
  return (
    <span className="inline-flex items-center gap-0.5 mr-1 flex-shrink-0" data-testid="cluster-dots">
      {visible.map((tag) => {
        const color = getClusterColor(tag);
        return (
          <span
            key={tag}
            className={`inline-block w-1.5 h-1.5 rounded-full ${color.dot}`}
            aria-hidden
          />
        );
      })}
    </span>
  );
}

/** Depth-first flatten of a URL tree into an ordered list for rendering. */
function flattenTree(treeNodes: UrlTreeNode[]): UrlTreeNode[] {
  const result: UrlTreeNode[] = [];
  for (const node of treeNodes) {
    result.push(node);
    result.push(...flattenTree(node.children));
  }
  return result;
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

export function ScoreSidebar({ nodes, scores, weakNodes, orphanNodes, unreachableNodes, depthMap, outboundMap, rootId }: ScoreSidebarProps) {
  const { fitView, setNodes } = useReactFlow();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [activeTab, setActiveTab] = useState<'score' | 'health'>('score');
  // Refs hold drag state so mousemove handlers never go stale
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef<number | null>(null);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const tree = buildUrlTree(nodes, scores);
  const ranked = flattenTree(tree);

  // Orphan nodes section
  const orphanList = nodes.filter((n) => orphanNodes.has(n.id));

  // Unreachable but NOT orphan section
  const unreachableOnlyList = nodes.filter(
    (n) => unreachableNodes.has(n.id) && !orphanNodes.has(n.id)
  );

  // Filter orphan and unreachable nodes out of main ranked list
  const mainRanked = ranked.filter(
    (item) => !orphanNodes.has(item.id) && !unreachableNodes.has(item.id)
  );

  const handleClick = (nodeId: string) => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    setTimeout(() => {
      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
    }, 50);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragStartX.current === null || dragStartWidth.current === null) return;
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      setWidth(next);
    };
    const onMouseUp = () => {
      dragStartX.current = null;
      dragStartWidth.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <aside
      style={{ width }}
      className="shrink-0 relative border-l border-border bg-white overflow-y-auto"
    >
      {/* Drag handle on left edge — mousedown begins resize */}
      <div
        data-testid="resize-handle"
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/40 z-10"
      />

      {/* Phase 11.1 D-01: [Score | Health] tab toggle */}
      <div className="flex border-b border-border" data-testid="sidebar-tabs">
        <button
          type="button"
          data-testid="tab-score"
          onClick={() => setActiveTab('score')}
          className={`flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
            activeTab === 'score'
              ? 'text-dark border-b-2 border-blue-500 -mb-px'
              : 'text-muted-fg hover:text-dark'
          }`}
        >
          Score
        </button>
        <button
          type="button"
          data-testid="tab-health"
          onClick={() => setActiveTab('health')}
          className={`flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
            activeTab === 'health'
              ? 'text-dark border-b-2 border-blue-500 -mb-px'
              : 'text-muted-fg hover:text-dark'
          }`}
        >
          Health
        </button>
      </div>

      {activeTab === 'score' && (
        <>
          {/* Root prompt — shown when no root set and nodes exist */}
          {!rootId && nodes.length > 0 && (
            <div className="px-3 py-3 bg-amber-50 border-b border-border">
              <p className="text-[11px] text-amber-700">
                Set a root node to see crawl depth. Click a node's edit button and enable "Root (Homepage)".
              </p>
            </div>
          )}

          {/* Orphan section */}
          {orphanList.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-red-50 border-b border-border">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600 flex items-center gap-1.5">
                  <Unplug size={12} />
                  Orphan Pages ({orphanList.length})
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {orphanList.map((node) => (
                  <li key={node.id}>
                    <button
                      className="w-full text-left px-3 py-2.5 hover:bg-surface transition-colors flex items-start gap-2"
                      onClick={() => handleClick(node.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark truncate flex items-center">
                          {renderClusterDots(node.data.tags)}
                          <span className="truncate">{node.data.urlTemplate}</span>
                        </p>
                        <p className="text-[11px] text-muted-fg font-mono">
                          {(scores.get(node.id) ?? 0).toFixed(4)} · <span className="text-red-500">No inbound links</span>
                        </p>
                      </div>
                      <Unplug size={14} className="text-red-500 mt-0.5 flex-shrink-0" aria-label="Orphan page" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unreachable section */}
          {unreachableOnlyList.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-red-50 border-b border-border">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600 flex items-center gap-1.5">
                  <Unplug size={12} />
                  Unreachable ({unreachableOnlyList.length})
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {unreachableOnlyList.map((node) => (
                  <li key={node.id}>
                    <button
                      className="w-full text-left px-3 py-2.5 hover:bg-surface transition-colors flex items-start gap-2"
                      onClick={() => handleClick(node.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark truncate flex items-center">
                          {renderClusterDots(node.data.tags)}
                          <span className="truncate">{node.data.urlTemplate}</span>
                        </p>
                        <p className="text-[11px] text-muted-fg font-mono">
                          {(scores.get(node.id) ?? 0).toFixed(4)} · <span className="text-red-500">Unreachable</span>
                        </p>
                      </div>
                      <Unplug size={14} className="text-red-500 mt-0.5 flex-shrink-0" aria-label="Unreachable page" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-3 py-2.5 border-b border-border">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
              Score Ranking
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {mainRanked.map((item) => {
              const sourceNode = nodeById.get(item.id);
              const tags = sourceNode?.data.tags;
              return (
              <li key={item.id}>
                <button
                  className="w-full text-left py-2.5 pr-3 hover:bg-surface transition-colors flex items-start gap-2"
                  style={{ paddingLeft: 12 + item.depth * 16 }}
                  onClick={() => handleClick(item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark truncate flex items-center">
                      {renderClusterDots(tags)}
                      <span className="truncate">{item.urlTemplate}</span>
                    </p>
                    <p className="text-[11px] text-muted-fg font-mono">
                      {item.score.toFixed(4)}
                      {depthMap.size > 0 && (() => {
                        const depth = depthMap.get(item.id);
                        if (depth == null || depth === Infinity) return null;
                        const isDeep = depth > 3;
                        return (
                          <>
                            {' · '}
                            <span className={isDeep ? 'text-amber-500' : ''}>
                              Depth {depth}{isDeep ? ' ⚠' : ''}
                            </span>
                          </>
                        );
                      })()}
                      {outboundMap.size > 0 && (() => {
                        const outbound = outboundMap.get(item.id);
                        if (outbound == null) return null;
                        const isOver = outbound > OUTBOUND_WARNING_THRESHOLD;
                        return (
                          <>
                            {' · '}
                            <span className={isOver ? 'text-red-500' : ''}>
                              {outbound} links
                            </span>
                          </>
                        );
                      })()}
                    </p>
                  </div>
                  {weakNodes.has(item.id) && (
                    <Tooltip>
                      <TooltipTrigger
                        data-testid="score-weak-warning"
                        className="flex-shrink-0 cursor-default inline-flex outline-none mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TriangleAlert size={14} className="text-amber-500" aria-label="Weak page" />
                      </TooltipTrigger>
                      <TooltipContent>
                        This page&apos;s PageRank score is significantly below average (below mean − 1σ). Consider adding more inbound internal links to strengthen it.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </button>
              </li>
              );
            })}
          </ul>
          {mainRanked.length === 0 && (
            <p className="px-3 py-4 text-[11px] text-muted-fg text-center">
              Add nodes to see scores
            </p>
          )}
        </>
      )}

      {activeTab === 'health' && (
        <HealthPanel nodes={nodes} depthMap={depthMap} outboundMap={outboundMap} />
      )}
    </aside>
  );
}
