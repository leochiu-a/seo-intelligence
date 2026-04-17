import type { Node } from 'reactflow';
import { collectPlacementGroups } from '../lib/graph-utils';
import type { UrlNodeData, PlacementGroup } from '../lib/graph-utils';

interface FilterPanelProps {
  nodes: Node<UrlNodeData>[];
  activeFilters: Set<string>;
  onToggle: (key: string) => void;
  onClear: () => void;
}

export function FilterPanel({ nodes, activeFilters, onToggle, onClear }: FilterPanelProps) {
  const groups: PlacementGroup[] = collectPlacementGroups(nodes);

  return (
    <aside
      className="w-[200px] shrink-0 border-r border-border bg-white overflow-y-auto flex flex-col"
      data-testid="filter-panel"
    >
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
          Placement Filters
        </h2>
      </div>

      {groups.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-muted-fg text-center" data-testid="filter-empty">
          No placement filters
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {groups.map((group) => {
            const filterKey = `placement-name:${group.placementName}`;
            return (
              <li key={group.placementName} className="py-2 px-3">
                {/* Top-level placement name checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`filter-pname-${group.placementName}`}
                    checked={activeFilters.has(filterKey)}
                    onChange={() => onToggle(filterKey)}
                    className="rounded border-border accent-blue-600"
                  />
                  <label
                    htmlFor={`filter-pname-${group.placementName}`}
                    className="text-xs text-dark truncate cursor-pointer select-none font-medium"
                    title={group.placementName}
                  >
                    {group.placementName}
                  </label>
                </div>

                {/* Sub-items: read-only node URL templates */}
                <ul className="mt-1.5 space-y-0.5 pl-4">
                  {group.nodeLabels.map((label, idx) => (
                    <li
                      key={group.nodeIds[idx]}
                      className="text-[11px] text-muted-fg truncate"
                      title={label}
                    >
                      {label}
                    </li>
                  ))}
                </ul>
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
