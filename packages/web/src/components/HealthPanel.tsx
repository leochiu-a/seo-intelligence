import { useState, useMemo } from 'react';
import { Link2, Layers, Tag } from 'lucide-react';
import type { Node } from 'reactflow';
import {
  getHealthStatus,
  hasAnyWarning,
  type UrlNodeData,
  type HealthStatus,
} from '../lib/graph-utils';

interface HealthPanelProps {
  nodes: Node<UrlNodeData>[];
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
}

interface HealthRow {
  id: string;
  urlTemplate: string;
  status: HealthStatus;
  hasWarn: boolean;
}

const WARN_CLASS = 'text-red-500';
const OK_CLASS = 'text-muted-fg';

export function HealthPanel({ nodes, depthMap, outboundMap }: HealthPanelProps) {
  const [warningsOnly, setWarningsOnly] = useState(false);

  const rows = useMemo<HealthRow[]>(() => {
    const computed = nodes.map((n) => {
      const status = getHealthStatus(n, depthMap, outboundMap);
      return {
        id: n.id,
        urlTemplate: n.data.urlTemplate,
        status,
        hasWarn: hasAnyWarning(status),
      };
    });
    // Warnings-first sort, then alphabetical (D-09)
    computed.sort((a, b) => {
      if (a.hasWarn !== b.hasWarn) return a.hasWarn ? -1 : 1;
      return a.urlTemplate.localeCompare(b.urlTemplate);
    });
    return computed;
  }, [nodes, depthMap, outboundMap]);

  const warningCount = rows.filter((r) => r.hasWarn).length;
  const visibleRows = warningsOnly ? rows.filter((r) => r.hasWarn) : rows;

  return (
    <div data-testid="health-panel">
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
          Health Check
        </h2>
        <p className="text-[11px] text-muted-fg mt-1" data-testid="health-summary">
          {warningCount} / {rows.length} pages have warnings
        </p>
        <label className="flex items-center gap-1.5 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={warningsOnly}
            onChange={(e) => setWarningsOnly(e.target.checked)}
            data-testid="warnings-only-toggle"
            className="h-3 w-3"
          />
          <span className="text-[11px] text-dark">Show warnings only</span>
        </label>
      </div>

      {nodes.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-muted-fg text-center">
          No nodes to check
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {visibleRows.map((row) => (
            <li
              key={row.id}
              data-testid="health-row"
              className="px-3 py-2.5 flex items-center gap-2"
            >
              <span className="flex-1 min-w-0 text-sm text-dark truncate">
                {row.urlTemplate}
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  data-testid="badge-links"
                  className={row.status.links === 'warn' ? WARN_CLASS : OK_CLASS}
                  aria-label={row.status.links === 'warn' ? 'Over-linked' : 'Links ok'}
                >
                  <Link2 size={14} />
                </span>
                {row.status.depth !== 'na' && (
                  <span
                    data-testid="badge-depth"
                    className={row.status.depth === 'warn' ? WARN_CLASS : OK_CLASS}
                    aria-label={row.status.depth === 'warn' ? 'Too deep' : 'Depth ok'}
                  >
                    <Layers size={14} />
                  </span>
                )}
                <span
                  data-testid="badge-tags"
                  className={row.status.tags === 'warn' ? WARN_CLASS : OK_CLASS}
                  aria-label={row.status.tags === 'warn' ? 'Untagged' : 'Tagged'}
                >
                  <Tag size={14} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
