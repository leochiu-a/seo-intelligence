import { useState, useEffect, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useReactFlow } from 'reactflow';
import type { Node } from 'reactflow';
import type { UrlNodeData, UrlTreeNode } from '../lib/graph-utils';
import { buildUrlTree } from '../lib/graph-utils';

interface ScoreSidebarProps {
  nodes: Node<UrlNodeData>[];
  scores: Map<string, number>;
  weakNodes: Set<string>;
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

export function ScoreSidebar({ nodes, scores, weakNodes }: ScoreSidebarProps) {
  const { fitView, setNodes } = useReactFlow();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  // Refs hold drag state so mousemove handlers never go stale
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef<number | null>(null);

  const tree = buildUrlTree(nodes, scores);
  const ranked = flattenTree(tree);

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
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
          Score Ranking
        </h2>
      </div>
      <ul className="divide-y divide-border">
        {ranked.map((item) => (
          <li key={item.id}>
            <button
              className="w-full text-left py-2.5 pr-3 hover:bg-surface transition-colors flex items-start gap-2"
              style={{ paddingLeft: item.depth * 16 }}
              onClick={() => handleClick(item.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark truncate">{item.urlTemplate}</p>
                <p className="text-[11px] text-muted-fg font-mono">{item.score.toFixed(4)}</p>
              </div>
              {weakNodes.has(item.id) && (
                <TriangleAlert size={14} className="text-amber-500 mt-0.5 flex-shrink-0" aria-label="Weak page" />
              )}
            </button>
          </li>
        ))}
      </ul>
      {ranked.length === 0 && (
        <p className="px-3 py-4 text-[11px] text-muted-fg text-center">
          Add nodes to see scores
        </p>
      )}
    </aside>
  );
}
