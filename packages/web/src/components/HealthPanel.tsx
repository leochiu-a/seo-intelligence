import { useState, useMemo } from 'react';
import { TriangleAlert } from 'lucide-react';
import type { Node } from '@xyflow/react';
import {
  getHealthStatus,
  hasAnyWarning,
  type UrlNodeData,
  type HealthStatus,
} from '../lib/graph-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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

function buildTooltipContent(status: HealthStatus): string {
  const issues: string[] = [];
  if (status.links === 'warn') issues.push('Outbound links > 150');
  if (status.depth === 'warn') issues.push('Crawl depth > 3');
  if (status.tags === 'warn') issues.push('No tags assigned');
  return issues.join('\n');
}

export function HealthPanel({ nodes, depthMap, outboundMap }: HealthPanelProps) {
  const [warningsOnly, setWarningsOnly] = useState(true);

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
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <Checkbox
            checked={warningsOnly}
            onCheckedChange={(checked) => setWarningsOnly(checked === true)}
            data-testid="warnings-only-toggle"
          />
          <span className="text-[11px] text-dark select-none">Show warnings only</span>
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
              {row.hasWarn && (
                <Tooltip>
                  <TooltipTrigger
                    data-testid="warning-icon"
                    className="text-amber-500 flex-shrink-0 cursor-default inline-flex outline-none"
                  >
                    <TriangleAlert size={14} />
                  </TooltipTrigger>
                  <TooltipContent className="whitespace-pre-line">
                    {buildTooltipContent(row.status)}
                  </TooltipContent>
                </Tooltip>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { buildTooltipContent };
