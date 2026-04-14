import type { Node } from 'reactflow';
import type { UrlNodeData } from '../lib/graph-utils';

interface FilterPanelProps {
  nodes: Node<UrlNodeData>[];
  activeFilters: Set<string>;
  onToggle: (key: string) => void;
  onClear: () => void;
}

export function FilterPanel({ nodes, activeFilters, onToggle, onClear }: FilterPanelProps) {
  const globalNodes = nodes.filter((n) => n.data.isGlobal === true);

  return (
    <aside
      className="w-[200px] shrink-0 border-r border-border bg-white overflow-y-auto flex flex-col"
      data-testid="filter-panel"
    >
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
          Global Filters
        </h2>
      </div>

      {globalNodes.length === 0 ? (
        <p
          className="px-3 py-4 text-[11px] text-muted-fg text-center"
          data-testid="filter-empty"
        >
          No global nodes
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {globalNodes.map((node) => {
            const nodeKey = `node:${node.id}`;
            const placements = node.data.placements ?? [];

            return (
              <li key={node.id} className="py-2 px-3">
                {/* Global node checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`filter-node-${node.id}`}
                    checked={activeFilters.has(nodeKey)}
                    onChange={() => onToggle(nodeKey)}
                    className="rounded border-border accent-blue-600"
                  />
                  <label
                    htmlFor={`filter-node-${node.id}`}
                    className="text-xs text-dark truncate cursor-pointer select-none"
                    title={node.data.urlTemplate}
                  >
                    {node.data.urlTemplate}
                  </label>
                </div>

                {/* Placement sub-checkboxes */}
                {placements.length > 0 && (
                  <ul className="mt-1.5 space-y-1 pl-4">
                    {placements.map((p) => {
                      const placementKey = `placement:${node.id}:${p.id}`;
                      return (
                        <li key={p.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`filter-placement-${node.id}-${p.id}`}
                            checked={activeFilters.has(placementKey)}
                            onChange={() => onToggle(placementKey)}
                            className="rounded border-border accent-blue-600"
                          />
                          <label
                            htmlFor={`filter-placement-${node.id}-${p.id}`}
                            className="text-[11px] text-muted-fg cursor-pointer select-none"
                          >
                            {p.name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {activeFilters.size > 0 && (
        <div className="px-3 py-2 border-t border-border">
          <button
            onClick={onClear}
            className="w-full text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </aside>
  );
}
