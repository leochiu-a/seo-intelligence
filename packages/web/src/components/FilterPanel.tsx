import type { Node } from '@xyflow/react';
import { collectPlacementGroups, collectClusterGroups } from '../lib/graph-utils';
import type { UrlNodeData, PlacementGroup, ClusterGroup } from '../lib/graph-utils';
import { Checkbox } from '@/components/ui/checkbox';

interface FilterPanelProps {
  nodes: Node<UrlNodeData>[];
  activeFilters: Set<string>;
  onToggle: (key: string) => void;
  onClear: () => void;
}

export function FilterPanel({ nodes, activeFilters, onToggle, onClear }: FilterPanelProps) {
  const placementGroups: PlacementGroup[] = collectPlacementGroups(nodes);
  const clusterGroups: ClusterGroup[] = collectClusterGroups(nodes);

  return (
    <aside
      className="w-[200px] shrink-0 border-r border-border bg-white overflow-y-auto flex flex-col"
      data-testid="filter-panel"
    >
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-fg">
          By placement
        </h2>
      </div>

      {placementGroups.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-fg text-center" data-testid="filter-empty">
          No placement filters
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {placementGroups.map((group) => {
            const filterKey = `placement-name:${group.placementName}`;
            return (
              <li key={group.placementName} className="py-2 px-3">
                {/* Top-level placement name checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    aria-label={group.placementName}
                    checked={activeFilters.has(filterKey)}
                    onCheckedChange={() => onToggle(filterKey)}
                  />
                  <span
                    className="text-sm text-dark truncate cursor-pointer select-none font-medium"
                    title={group.placementName}
                    onClick={() => onToggle(filterKey)}
                  >
                    {group.placementName}
                  </span>
                </div>

                {/* Sub-items: read-only node URL templates */}
                <ul className="mt-1.5 space-y-0.5 pl-4">
                  {group.nodeLabels.map((label, idx) => (
                    <li
                      key={group.nodeIds[idx]}
                      className="text-sm text-muted-fg truncate"
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

      {clusterGroups.length > 0 && (
        <>
          <div className="px-3 py-2.5 border-b border-t border-border">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-fg">
              By cluster
            </h2>
          </div>
          <ul className="divide-y divide-border" data-testid="cluster-filter-list">
            {clusterGroups.map((group) => {
              const filterKey = `cluster:${group.tagName}`;
              return (
                <li key={group.tagName} className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      aria-label={group.tagName}
                      checked={activeFilters.has(filterKey)}
                      onCheckedChange={() => onToggle(filterKey)}
                    />
                    <span
                      className="text-sm text-dark truncate cursor-pointer select-none font-medium"
                      title={group.tagName}
                      onClick={() => onToggle(filterKey)}
                    >
                      {group.tagName}
                    </span>
                  </div>

                  {/* Sub-items: node URL templates in this cluster */}
                  <ul className="mt-1.5 space-y-0.5 pl-4">
                    {group.nodeLabels.map((label, idx) => (
                      <li
                        key={group.nodeIds[idx]}
                        className="text-sm text-muted-fg truncate"
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
        </>
      )}

      {activeFilters.size > 0 && (
        <div className="px-3 py-2 border-t border-border">
          <button
            onClick={onClear}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </aside>
  );
}
