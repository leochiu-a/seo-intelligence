import { useMemo, useState } from "react";
import { TriangleAlert, Unplug } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { UrlNodeData } from "../lib/graph-utils";
import {
  getHealthStatus,
  hasAnyWarning,
  buildTooltipContent,
  OUTBOUND_WARNING_THRESHOLD,
  type HealthStatus,
} from "../lib/graph-analysis";
import { classifyScoreTier, type ScoreTier } from "../lib/graph-pagerank";
import { getClusterColor } from "../lib/cluster-colors";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScoreTierBadge } from "./ScoreTierBadge";

interface PagesPanelProps {
  nodes: Node<UrlNodeData>[];
  scores: Map<string, number>;
  allScoreValues: number[];
  weakNodes: Set<string>;
  orphanNodes: Set<string>;
  unreachableNodes: Set<string>;
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
  inboundMap: Map<string, number>;
  rootId: string | null;
  onNodeHighlight?: (id: string | null) => void;
}

type SortMode =
  | "issue-tier"
  | "score-hi"
  | "score-lo"
  | "depth-deep"
  | "outbound-hi"
  | "inbound-lo"
  | "url-asc";

type FilterTier = "low" | "mid" | "high";

interface PageRow {
  id: string;
  urlTemplate: string;
  tags: string[] | undefined;
  score: number;
  depth: number | undefined;
  inbound: number;
  outbound: number;
  tier: ScoreTier;
  status: HealthStatus;
  isOrphan: boolean;
  isUnreachable: boolean;
  isWeak: boolean;
  issueGroup: 0 | 1 | 2 | 3; // 0 orphan, 1 unreachable-only, 2 warning, 3 clean
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

function getSortComparator(mode: SortMode): (a: PageRow, b: PageRow) => number {
  switch (mode) {
    case "issue-tier":
      return (a, b) =>
        a.issueGroup - b.issueGroup ||
        a.score - b.score ||
        a.urlTemplate.localeCompare(b.urlTemplate);
    case "score-hi":
      return (a, b) => b.score - a.score || a.urlTemplate.localeCompare(b.urlTemplate);
    case "score-lo":
      return (a, b) => a.score - b.score || a.urlTemplate.localeCompare(b.urlTemplate);
    case "depth-deep":
      return (a, b) =>
        (b.depth ?? -1) - (a.depth ?? -1) || a.urlTemplate.localeCompare(b.urlTemplate);
    case "outbound-hi":
      return (a, b) => b.outbound - a.outbound || a.urlTemplate.localeCompare(b.urlTemplate);
    case "inbound-lo":
      return (a, b) => a.inbound - b.inbound || a.urlTemplate.localeCompare(b.urlTemplate);
    case "url-asc":
      return (a, b) => a.urlTemplate.localeCompare(b.urlTemplate);
  }
}

const TIER_PILL_ACTIVE: Record<FilterTier, string> = {
  low: "bg-red-100 text-red-700 border border-red-200",
  mid: "bg-amber-100 text-amber-700 border border-amber-200",
  high: "bg-green-100 text-green-700 border border-green-200",
};
const TIER_PILL_INACTIVE = "border border-border text-muted-fg bg-white";

export function PagesPanel({
  nodes,
  scores,
  allScoreValues,
  weakNodes,
  orphanNodes,
  unreachableNodes,
  depthMap,
  outboundMap,
  inboundMap,
  rootId,
  onNodeHighlight,
}: PagesPanelProps) {
  const { fitView, setNodes } = useReactFlow();

  const [sortMode, setSortMode] = useState<SortMode>("issue-tier");
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [tierFilter, setTierFilter] = useState<Set<FilterTier>>(
    () => new Set<FilterTier>(["low", "mid", "high"]),
  );

  const rows = useMemo<PageRow[]>(() => {
    return nodes.map((n) => {
      const score = scores.get(n.id) ?? 0;
      const isOrphan = orphanNodes.has(n.id);
      const isUnreachable = unreachableNodes.has(n.id) && !isOrphan;
      const isWeak = weakNodes.has(n.id);
      const status = getHealthStatus(n, depthMap, outboundMap);
      const rawDepth = depthMap.get(n.id);
      const depth =
        rawDepth == null || rawDepth === Infinity ? undefined : rawDepth;
      const inbound = inboundMap.get(n.id) ?? 0;
      const outbound = outboundMap.get(n.id) ?? 0;
      const tier = classifyScoreTier(score, allScoreValues);
      const hasGeneralWarn = hasAnyWarning(status) || isWeak;
      const issueGroup: PageRow["issueGroup"] = isOrphan
        ? 0
        : isUnreachable
          ? 1
          : hasGeneralWarn
            ? 2
            : 3;
      return {
        id: n.id,
        urlTemplate: n.data.urlTemplate,
        tags: n.data.tags,
        score,
        depth,
        inbound,
        outbound,
        tier,
        status,
        isOrphan,
        isUnreachable,
        isWeak,
        issueGroup,
      };
    });
  }, [
    nodes,
    scores,
    allScoreValues,
    weakNodes,
    orphanNodes,
    unreachableNodes,
    depthMap,
    outboundMap,
    inboundMap,
  ]);

  const sortedRows = useMemo(() => {
    const cmp = getSortComparator(sortMode);
    return [...rows].sort(cmp);
  }, [rows, sortMode]);

  const visibleRows = useMemo(() => {
    return sortedRows.filter((r) => {
      if (r.tier !== "neutral" && !tierFilter.has(r.tier as FilterTier)) return false;
      if (warningsOnly) {
        const hasIssue = r.isOrphan || r.isUnreachable || hasAnyWarning(r.status) || r.isWeak;
        if (!hasIssue) return false;
      }
      return true;
    });
  }, [sortedRows, tierFilter, warningsOnly]);

  const tierCounts = useMemo(() => {
    let low = 0,
      mid = 0,
      high = 0;
    for (const r of rows) {
      if (r.tier === "low") low++;
      else if (r.tier === "mid") mid++;
      else if (r.tier === "high") high++;
    }
    return { low, mid, high };
  }, [rows]);

  const handleClick = (nodeId: string) => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    setTimeout(() => {
      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
    }, 50);
    onNodeHighlight?.(nodeId);
  };

  const toggleTier = (tier: FilterTier) => {
    setTierFilter((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  const orphanSlice = visibleRows.filter((r) => r.issueGroup === 0);
  const unreachableSlice = visibleRows.filter((r) => r.issueGroup === 1);
  const restSlice = visibleRows.filter((r) => r.issueGroup >= 2);
  const showBanners = sortMode === "issue-tier";

  const renderWarningBadge = (r: PageRow) => {
    if (r.isOrphan) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={<span />}
            data-testid="pages-warn-orphan"
            className="flex-shrink-0 cursor-default inline-flex outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Unplug size={14} className="text-red-500" aria-label="Orphan page" />
          </TooltipTrigger>
          <TooltipContent>Orphan — no inbound links</TooltipContent>
        </Tooltip>
      );
    }
    if (r.isUnreachable) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={<span />}
            data-testid="pages-warn-unreachable"
            className="flex-shrink-0 cursor-default inline-flex outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Unplug size={14} className="text-red-500" aria-label="Unreachable page" />
          </TooltipTrigger>
          <TooltipContent>Unreachable — no path from root</TooltipContent>
        </Tooltip>
      );
    }
    const hasGeneralWarn = hasAnyWarning(r.status) || r.isWeak;
    if (!hasGeneralWarn) return null;
    const parts = [buildTooltipContent(r.status)];
    if (r.isWeak) parts.push("Weak page (low PageRank)");
    const tooltip = parts.filter((s) => s && s.length > 0).join("\n");
    return (
      <Tooltip>
        <TooltipTrigger
          render={<span />}
          data-testid="pages-warn-general"
          className="flex-shrink-0 cursor-default inline-flex outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <TriangleAlert size={14} className="text-amber-500" aria-label="Warning" />
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  };

  const renderRow = (r: PageRow) => (
    <li key={r.id} data-testid="pages-row" data-node-id={r.id}>
      <button
        type="button"
        className="w-full text-left px-3 py-2.5 hover:bg-surface transition-colors"
        onClick={() => handleClick(r.id)}
      >
        <div className="flex items-center min-w-0">
          {renderClusterDots(r.tags)}
          <span className="text-sm text-dark truncate flex-1 min-w-0">{r.urlTemplate}</span>
          <span className="ml-2 flex-shrink-0 inline-flex">{renderWarningBadge(r)}</span>
        </div>
        <div className="flex items-center mt-0.5 text-xs text-muted-fg font-mono">
          <span>{r.score.toFixed(4)}</span>
          {rootId !== null && r.depth !== undefined && (
            <>
              <span className="mx-1">·</span>
              <span className={r.depth > 3 ? "text-amber-500" : ""}>Depth {r.depth}</span>
            </>
          )}
          <span className="mx-1">·</span>
          <span>in {r.inbound}</span>
          <span className="mx-1">·</span>
          <span className={r.outbound > OUTBOUND_WARNING_THRESHOLD ? "text-red-500" : ""}>
            out {r.outbound}
          </span>
          <div className="ml-auto flex-shrink-0">
            <ScoreTierBadge tier={r.tier} testId="pages-tier-badge" />
          </div>
        </div>
      </button>
    </li>
  );

  return (
    <div data-testid="pages-panel">
      {!rootId && nodes.length > 0 && (
        <div className="px-3 py-3 bg-amber-50 border-b border-border">
          <p className="text-xs text-amber-700">
            Set a root node to see crawl depth. Click a node's edit button and enable "Root
            (Homepage)".
          </p>
        </div>
      )}

      {allScoreValues.length > 0 && (
        <p
          className="px-3 pt-2 text-xs text-muted-fg"
          data-testid="pages-tier-summary"
        >
          {tierCounts.low} Low · {tierCounts.mid} Mid · {tierCounts.high} High
        </p>
      )}

      <label className="block px-3 py-2 text-xs text-dark">
        Sort by
        <select
          data-testid="pages-sort"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="mt-1 block w-full border border-border rounded px-2 py-1 text-xs bg-white"
        >
          <option value="issue-tier">Issue-tier (default)</option>
          <option value="score-hi">Score (high → low)</option>
          <option value="score-lo">Score (low → high)</option>
          <option value="depth-deep">Depth (deep → shallow)</option>
          <option value="outbound-hi">Outbound (high → low)</option>
          <option value="inbound-lo">Inbound (low → high)</option>
          <option value="url-asc">URL template (A → Z)</option>
        </select>
      </label>

      <label className="flex items-center gap-2 px-3 pb-1 cursor-pointer">
        <Checkbox
          checked={warningsOnly}
          onCheckedChange={(c) => setWarningsOnly(c === true)}
          data-testid="pages-warnings-only"
        />
        <span className="text-xs text-dark select-none">Show warnings only</span>
      </label>

      <div className="flex gap-1 px-3 pb-2">
        {(["low", "mid", "high"] as FilterTier[]).map((tier) => {
          const active = tierFilter.has(tier);
          return (
            <button
              key={tier}
              type="button"
              data-testid={`pages-tier-${tier}`}
              aria-pressed={active}
              onClick={() => toggleTier(tier)}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${active ? TIER_PILL_ACTIVE[tier] : TIER_PILL_INACTIVE}`}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </button>
          );
        })}
      </div>

      {nodes.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-fg text-center">Add nodes to see pages</p>
      ) : visibleRows.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-fg text-center">
          No pages match current filters
        </p>
      ) : (
        <>
          {showBanners && orphanSlice.length > 0 && (
            <>
              <div
                className="px-3 py-2 bg-red-50 border-b border-border"
                data-testid="pages-banner-orphan"
              >
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600 flex items-center gap-1.5">
                  <Unplug size={12} />
                  Orphan Pages ({orphanSlice.length})
                </h2>
              </div>
              <ul className="divide-y divide-border">{orphanSlice.map(renderRow)}</ul>
            </>
          )}
          {showBanners && unreachableSlice.length > 0 && (
            <>
              <div
                className="px-3 py-2 bg-red-50 border-b border-border"
                data-testid="pages-banner-unreachable"
              >
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600 flex items-center gap-1.5">
                  <Unplug size={12} />
                  Unreachable ({unreachableSlice.length})
                </h2>
              </div>
              <ul className="divide-y divide-border">{unreachableSlice.map(renderRow)}</ul>
            </>
          )}
          {showBanners ? (
            restSlice.length > 0 && (
              <ul className="divide-y divide-border">{restSlice.map(renderRow)}</ul>
            )
          ) : (
            <ul className="divide-y divide-border">{visibleRows.map(renderRow)}</ul>
          )}
        </>
      )}
    </div>
  );
}
