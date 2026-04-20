import { useState, useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import type { Node } from "@xyflow/react";
import { type UrlNodeData } from "../lib/graph-utils";
import { classifyScoreTier, type ScoreTier } from "../lib/graph-pagerank";
import {
  getHealthStatus,
  hasAnyWarning,
  buildTooltipContent,
  type HealthStatus,
} from "../lib/graph-analysis";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScoreTierBadge } from "./ScoreTierBadge";

interface HealthPanelProps {
  nodes: Node<UrlNodeData>[];
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
  scores: Map<string, number>;
  allScoreValues: number[];
}

interface HealthRow {
  id: string;
  urlTemplate: string;
  status: HealthStatus;
  hasWarn: boolean;
}

interface TierRow {
  id: string;
  urlTemplate: string;
  tier: ScoreTier;
}

const TIER_ORDER: Record<string, number> = { low: 0, mid: 1, high: 2 };

export function HealthPanel({
  nodes,
  depthMap,
  outboundMap,
  scores,
  allScoreValues,
}: HealthPanelProps) {
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

  const tierRows = useMemo<TierRow[]>(() => {
    if (allScoreValues.length === 0) return [];
    return nodes
      .map<TierRow>((n) => ({
        id: n.id,
        urlTemplate: n.data.urlTemplate,
        tier: classifyScoreTier(scores.get(n.id) ?? 0, allScoreValues),
      }))
      .filter((r) => r.tier in TIER_ORDER)
      .sort((a, b) => {
        if (a.tier !== b.tier)
          return (TIER_ORDER[a.tier] ?? Infinity) - (TIER_ORDER[b.tier] ?? Infinity);
        return a.urlTemplate.localeCompare(b.urlTemplate);
      });
  }, [nodes, scores, allScoreValues]);

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
        <p className="px-3 py-4 text-[11px] text-muted-fg text-center">No nodes to check</p>
      ) : visibleRows.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-muted-fg text-center">All pages are healthy</p>
      ) : (
        <ul className="divide-y divide-border">
          {visibleRows.map((row) => (
            <li
              key={row.id}
              data-testid="health-row"
              className="px-3 py-2.5 flex items-center gap-2"
            >
              <span className="flex-1 min-w-0 text-sm text-dark truncate">{row.urlTemplate}</span>
              {row.hasWarn && (
                <Tooltip>
                  <TooltipTrigger
                    data-testid="warning-icon"
                    className="text-amber-500 flex-shrink-0 cursor-default inline-flex outline-none"
                  >
                    <TriangleAlert size={14} />
                  </TooltipTrigger>
                  <TooltipContent>{buildTooltipContent(row.status)}</TooltipContent>
                </Tooltip>
              )}
            </li>
          ))}
        </ul>
      )}

      {tierRows.length > 0 && (
        <div data-testid="score-tier-section">
          <div className="px-3 py-2.5 border-t border-border">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
              Score Tier
            </h2>
            <p className="text-[11px] text-muted-fg mt-1" data-testid="score-tier-summary">
              {tierRows.length} pages in score tier
            </p>
          </div>
          <ul className="divide-y divide-border">
            {tierRows.map((row) => (
              <li
                key={row.id}
                data-testid="score-tier-row"
                data-tier={row.tier}
                className="px-3 py-2.5 flex items-center gap-2"
              >
                <span className="flex-1 min-w-0 text-sm text-dark truncate">{row.urlTemplate}</span>
                <ScoreTierBadge
                  tier={row.tier}
                  className="flex-shrink-0"
                  testId="score-tier-badge"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
