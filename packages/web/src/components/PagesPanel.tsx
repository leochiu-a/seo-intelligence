import { useMemo, useState, useRef, useEffect } from "react";
import { TriangleAlert, Unplug } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { UrlNodeData } from "../lib/graph-utils";
import {
  getHealthStatus,
  hasAnyWarning,
  buildTooltipContent,
  OUTBOUND_WARNING_THRESHOLD,
  DEPTH_WARNING_THRESHOLD,
  type HealthStatus,
} from "../lib/graph-analysis";
import { classifyScoreTier, type ScoreTier } from "../lib/graph-pagerank";
import { getClusterColor } from "../lib/cluster-colors";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScoreTierBadge } from "./ScoreTierBadge";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "issue-tier", label: "Issue-tier (default)" },
  { value: "score-hi", label: "Score (high → low)" },
  { value: "score-lo", label: "Score (low → high)" },
  { value: "depth-deep", label: "Depth (deep → shallow)" },
  { value: "outbound-hi", label: "Outbound (high → low)" },
  { value: "inbound-lo", label: "Inbound (low → high)" },
  { value: "url-asc", label: "URL template (A → Z)" },
];

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
      return (a, b) => {
        const byGroup = a.issueGroup - b.issueGroup;
        if (byGroup !== 0) return byGroup;
        const byScore = a.score - b.score;
        return byScore || a.urlTemplate.localeCompare(b.urlTemplate);
      };
    case "score-hi":
      return (a, b) => b.score - a.score || a.urlTemplate.localeCompare(b.urlTemplate);
    case "score-lo":
      return (a, b) => a.score - b.score || a.urlTemplate.localeCompare(b.urlTemplate);
    case "depth-deep":
      return (a, b) => {
        const da = a.depth ?? Number.POSITIVE_INFINITY;
        const db = b.depth ?? Number.POSITIVE_INFINITY;
        if (da === db) return a.urlTemplate.localeCompare(b.urlTemplate);
        return db - da;
      };
    case "outbound-hi":
      return (a, b) => b.outbound - a.outbound || a.urlTemplate.localeCompare(b.urlTemplate);
    case "inbound-lo":
      return (a, b) => a.inbound - b.inbound || a.urlTemplate.localeCompare(b.urlTemplate);
    case "url-asc":
      return (a, b) => a.urlTemplate.localeCompare(b.urlTemplate);
  }
}

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

  const fitTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    },
    [],
  );

  const [sortMode, setSortMode] = useState<SortMode>("issue-tier");

  const rows = useMemo<PageRow[]>(() => {
    return nodes.map((n) => {
      const score = scores.get(n.id) ?? 0;
      const isOrphan = orphanNodes.has(n.id);
      const isUnreachable = unreachableNodes.has(n.id) && !isOrphan;
      const isWeak = weakNodes.has(n.id);
      const status = getHealthStatus(n, depthMap, outboundMap);
      const rawDepth = depthMap.get(n.id);
      const depth = rawDepth == null || rawDepth === Infinity ? undefined : rawDepth;
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

  const handleClick = (nodeId: string) => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    if (fitTimerRef.current != null) window.clearTimeout(fitTimerRef.current);
    fitTimerRef.current = window.setTimeout(() => {
      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
    }, 50);
    onNodeHighlight?.(nodeId);
  };

  const orphanSlice = sortedRows.filter((r) => r.issueGroup === 0);
  const unreachableSlice = sortedRows.filter((r) => r.issueGroup === 1);
  const restSlice = sortedRows.filter((r) => r.issueGroup >= 2);
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
          <span className="text-xs text-dark truncate flex-1 min-w-0">{r.urlTemplate}</span>
          <span className="ml-2 flex-shrink-0 inline-flex">{renderWarningBadge(r)}</span>
        </div>
        <div className="flex items-center mt-1 text-xs text-muted-fg font-mono">
          <span>{r.score.toFixed(4)}</span>
          {rootId !== null && r.depth !== undefined && (
            <>
              <span className="mx-1">·</span>
              <span className={r.depth > DEPTH_WARNING_THRESHOLD ? "text-amber-500" : ""}>
                Depth {r.depth}
              </span>
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

      <div className="flex items-center gap-2 px-3 pt-2 pb-2 text-xs text-dark">
        <span className="flex-shrink-0">Sort</span>
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger data-testid="pages-sort" size="sm" className="flex-1 min-w-0 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                data-testid={`pages-sort-option-${opt.value}`}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {nodes.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-fg text-center">Add nodes to see pages</p>
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
            <ul className="divide-y divide-border">{sortedRows.map(renderRow)}</ul>
          )}
        </>
      )}
    </div>
  );
}
