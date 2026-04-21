import { useMemo } from "react";
import { TriangleAlert, Unplug } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { UrlNodeData } from "../lib/graph-utils";
import { buildUrlTree, OUTBOUND_WARNING_THRESHOLD, type UrlTreeNode } from "../lib/graph-analysis";
import { getClusterColor } from "../lib/cluster-colors";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface ScorePanelProps {
  nodes: Node<UrlNodeData>[];
  scores: Map<string, number>;
  weakNodes: Set<string>;
  orphanNodes: Set<string>;
  unreachableNodes: Set<string>;
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
  rootId: string | null;
  onNodeHighlight?: (id: string | null) => void;
}

function renderClusterDots(tags: string[] | undefined) {
  if (!tags || tags.length === 0) return null;
  const visible = tags.slice(0, 3);
  return (
    <span
      className="inline-flex items-center gap-0.5 mr-1 flex-shrink-0"
      data-testid="cluster-dots"
    >
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

function flattenTree(treeNodes: UrlTreeNode[]): UrlTreeNode[] {
  const result: UrlTreeNode[] = [];
  for (const node of treeNodes) {
    result.push(node);
    result.push(...flattenTree(node.children));
  }
  return result;
}

export function ScorePanel({
  nodes,
  scores,
  weakNodes,
  orphanNodes,
  unreachableNodes,
  depthMap,
  outboundMap,
  rootId,
  onNodeHighlight,
}: ScorePanelProps) {
  const { fitView, setNodes } = useReactFlow();

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const { orphanList, unreachableOnlyList, mainRanked } = useMemo(() => {
    const tree = buildUrlTree(nodes, scores);
    const ranked = flattenTree(tree);
    return {
      orphanList: nodes.filter((n) => orphanNodes.has(n.id)),
      unreachableOnlyList: nodes.filter(
        (n) => unreachableNodes.has(n.id) && !orphanNodes.has(n.id),
      ),
      mainRanked: ranked.filter(
        (item) => !orphanNodes.has(item.id) && !unreachableNodes.has(item.id),
      ),
    };
  }, [nodes, scores, orphanNodes, unreachableNodes]);

  const handleClick = (nodeId: string) => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    setTimeout(() => {
      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
    }, 50);
    onNodeHighlight?.(nodeId);
  };

  return (
    <>
      {!rootId && nodes.length > 0 && (
        <div className="px-3 py-3 bg-amber-50 border-b border-border">
          <p className="text-xs text-amber-700">
            Set a root node to see crawl depth. Click a node's edit button and enable "Root
            (Homepage)".
          </p>
        </div>
      )}

      {orphanList.length > 0 && (
        <div>
          <div className="px-3 py-2 bg-red-50 border-b border-border">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600 flex items-center gap-1.5">
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
                    <p className="text-xs text-muted-fg font-mono">
                      {(scores.get(node.id) ?? 0).toFixed(4)} ·{" "}
                      <span className="text-red-500">No inbound links</span>
                    </p>
                  </div>
                  <Unplug
                    size={14}
                    className="text-red-500 mt-0.5 flex-shrink-0"
                    aria-label="Orphan page"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unreachableOnlyList.length > 0 && (
        <div>
          <div className="px-3 py-2 bg-red-50 border-b border-border">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600 flex items-center gap-1.5">
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
                    <p className="text-xs text-muted-fg font-mono">
                      {(scores.get(node.id) ?? 0).toFixed(4)} ·{" "}
                      <span className="text-red-500">Unreachable</span>
                    </p>
                  </div>
                  <Unplug
                    size={14}
                    className="text-red-500 mt-0.5 flex-shrink-0"
                    aria-label="Unreachable page"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-fg">
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
                  <p className="text-xs text-muted-fg font-mono">
                    {item.score.toFixed(4)}
                    {depthMap.size > 0 &&
                      (() => {
                        const depth = depthMap.get(item.id);
                        if (depth == null || depth === Infinity) return null;
                        const isDeep = depth > 3;
                        return (
                          <>
                            {" · "}
                            <span className={isDeep ? "text-amber-500" : ""}>
                              Depth {depth}
                              {isDeep ? " ⚠" : ""}
                            </span>
                          </>
                        );
                      })()}
                    {outboundMap.size > 0 &&
                      (() => {
                        const outbound = outboundMap.get(item.id);
                        if (outbound == null) return null;
                        const isOver = outbound > OUTBOUND_WARNING_THRESHOLD;
                        return (
                          <>
                            {" · "}
                            <span className={isOver ? "text-red-500" : ""}>{outbound} links</span>
                          </>
                        );
                      })()}
                  </p>
                </div>
                {weakNodes.has(item.id) && (
                  <Tooltip>
                    <TooltipTrigger
                      render={<span />}
                      data-testid="score-weak-warning"
                      className="flex-shrink-0 cursor-default inline-flex outline-none mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TriangleAlert size={14} className="text-amber-500" aria-label="Weak page" />
                    </TooltipTrigger>
                    <TooltipContent>
                      This page&apos;s PageRank score is significantly below average (below mean −
                      1σ). Consider adding more inbound internal links to strengthen it.
                    </TooltipContent>
                  </Tooltip>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {mainRanked.length === 0 && (
        <p className="px-3 py-4 text-xs text-muted-fg text-center">Add nodes to see scores</p>
      )}
    </>
  );
}
