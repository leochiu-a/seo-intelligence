import { TriangleAlert } from 'lucide-react';
import { useReactFlow } from 'reactflow';
import type { Node } from 'reactflow';
import type { UrlNodeData } from '../lib/graph-utils';

interface ScoreSidebarProps {
  nodes: Node<UrlNodeData>[];
  scores: Map<string, number>;
  weakNodes: Set<string>;
}

export function ScoreSidebar({ nodes, scores, weakNodes }: ScoreSidebarProps) {
  const { fitView, setNodes } = useReactFlow();

  // Sort nodes by score descending
  const ranked = [...nodes]
    .map((n) => ({ id: n.id, urlTemplate: n.data.urlTemplate, score: scores.get(n.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const handleClick = (nodeId: string) => {
    // Select the node and fitView to it
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    // Small timeout to let selection state propagate, then fitView
    setTimeout(() => {
      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
    }, 50);
  };

  return (
    <aside className="w-60 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
      <div className="px-3 py-2 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Score Ranking</h2>
      </div>
      <ul className="divide-y divide-gray-100">
        {ranked.map((item) => (
          <li key={item.id}>
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-start gap-2"
              onClick={() => handleClick(item.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{item.urlTemplate}</p>
                <p className="text-xs text-gray-500 font-mono">{item.score.toFixed(4)}</p>
              </div>
              {weakNodes.has(item.id) && (
                <TriangleAlert size={14} className="text-amber-500 mt-0.5 flex-shrink-0" aria-label="Weak page" />
              )}
            </button>
          </li>
        ))}
      </ul>
      {ranked.length === 0 && (
        <p className="px-3 py-4 text-xs text-gray-400 text-center">Add nodes to see scores</p>
      )}
    </aside>
  );
}
