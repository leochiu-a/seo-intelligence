import type { Node, Edge } from "@xyflow/react";
import type { UrlNodeData, LinkCountEdgeData, Placement } from "./graph-utils";
import { OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD } from "./graph-pagerank";

/**
 * Handle IDs for UrlNode's 4 handles (one per side).
 * With ConnectionMode.Loose, each handle acts as both source and target.
 */
export const HANDLE_IDS = {
  top: "handle-top",
  right: "handle-right",
  bottom: "handle-bottom",
  left: "handle-left",
} as const;

/**
 * Computes the closest handle pair given source and target node positions.
 * Uses absolute dx/dy to determine whether horizontal or vertical axis dominates.
 * When |dx| >= |dy|, horizontal wins; otherwise vertical wins.
 */
export function getClosestHandleIds(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal dominates
    if (dx >= 0) {
      return { sourceHandle: HANDLE_IDS.right, targetHandle: HANDLE_IDS.left };
    } else {
      return { sourceHandle: HANDLE_IDS.left, targetHandle: HANDLE_IDS.right };
    }
  } else {
    // Vertical dominates
    if (dy >= 0) {
      return { sourceHandle: HANDLE_IDS.bottom, targetHandle: HANDLE_IDS.top };
    } else {
      return { sourceHandle: HANDLE_IDS.top, targetHandle: HANDLE_IDS.bottom };
    }
  }
}

/**
 * Parses a JSON string produced by the export feature and returns
 * ReactFlow-compatible nodes and edges arrays.
 * Throws if the JSON is malformed or required fields are missing.
 */
export function parseImportJson(raw: string): {
  nodes: Node<UrlNodeData>[];
  edges: Edge<LinkCountEdgeData>[];
} {
  const data = JSON.parse(raw) as unknown;

  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as Record<string, unknown>).nodes) ||
    !Array.isArray((data as Record<string, unknown>).edges)
  ) {
    throw new Error('Import JSON must have "nodes" and "edges" arrays');
  }

  const { nodes: rawNodes, edges: rawEdges } = data as {
    nodes: unknown[];
    edges: unknown[];
  };

  const nodes: Node<UrlNodeData>[] = rawNodes.map((n, i) => {
    const node = n as Record<string, unknown>;
    if (typeof node.urlTemplate !== "string") {
      throw new Error(`Node at index ${i} is missing "urlTemplate"`);
    }
    if (typeof node.pageCount !== "number") {
      throw new Error(`Node at index ${i} is missing "pageCount"`);
    }
    const isGlobal = typeof node.isGlobal === "boolean" ? node.isGlobal : undefined;
    const isRoot = typeof node.isRoot === "boolean" ? node.isRoot : undefined;
    const placements = Array.isArray(node.placements)
      ? (node.placements as Placement[])
      : undefined;
    const tagsRaw = Array.isArray(node.tags) ? node.tags : undefined;
    const tags = tagsRaw ? tagsRaw.filter((t): t is string => typeof t === "string") : undefined;
    return {
      id: String(node.id),
      type: "urlNode",
      position: { x: Number(node.x ?? 0), y: Number(node.y ?? 0) },
      data: {
        urlTemplate: node.urlTemplate,
        pageCount: node.pageCount,
        ...(isGlobal != null && { isGlobal }),
        ...(isRoot != null && { isRoot }),
        ...(placements != null && { placements }),
        ...(tags != null && tags.length > 0 && { tags }),
      },
    };
  });

  const posById = new Map(nodes.map((n) => [n.id, n.position]));

  const edges: Edge<LinkCountEdgeData>[] = rawEdges.map((e) => {
    const edge = e as Record<string, unknown>;
    const sourceHandle = typeof edge.sourceHandle === "string" ? edge.sourceHandle : undefined;
    const targetHandle = typeof edge.targetHandle === "string" ? edge.targetHandle : undefined;

    let resolvedSourceHandle = sourceHandle;
    let resolvedTargetHandle = targetHandle;

    if (!resolvedSourceHandle || !resolvedTargetHandle) {
      const srcPos = posById.get(String(edge.source));
      const tgtPos = posById.get(String(edge.target));
      if (srcPos && tgtPos) {
        const handles = getClosestHandleIds(srcPos, tgtPos);
        resolvedSourceHandle = resolvedSourceHandle ?? handles.sourceHandle;
        resolvedTargetHandle = resolvedTargetHandle ?? handles.targetHandle;
      }
    }

    return {
      id: String(edge.id),
      source: String(edge.source),
      target: String(edge.target),
      type: "linkCountEdge",
      data: { linkCount: typeof edge.linkCount === "number" ? edge.linkCount : 1 },
      ...(resolvedSourceHandle && { sourceHandle: resolvedSourceHandle }),
      ...(resolvedTargetHandle && { targetHandle: resolvedTargetHandle }),
    };
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// buildCopyForAIText — pure serializer for AI-assisted review
// ---------------------------------------------------------------------------

export interface CopyForAIInput {
  nodes: Array<{
    id: string;
    data: UrlNodeData & { isRoot?: boolean; isGlobal?: boolean };
  }>;
  edges: Array<{ source: string; target: string; data?: { linkCount?: number } }>;
  scores: Map<string, number>;
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
}

/**
 * Serializes one node into a plain-text line for the copy-to-AI output.
 *
 * Format:
 *   - {urlTemplate}  pages: {n}  score: {0.00}  health: {high|mid|low}  [warn: {reasons}]  depth: {n|unreachable|-}  outbound: {n}  [root]  [global]
 *
 * Fields:
 *   score   — numeric PageRank value rounded to 2 decimal places (fallback 0.00 when missing)
 *   health  — composite of 3 indicators: outbound links, crawl depth, cluster tags
 *               0 warns → high | 1 warn → mid | 2+ warns → low
 *   warn    — comma-separated reasons, omitted when health is high
 *               outbound-warn  outbound count > OUTBOUND_WARNING_THRESHOLD
 *               depth-warn     depth > DEPTH_WARNING_THRESHOLD, Infinity, or unreachable (only when root is set)
 *               no-tags        node has no non-empty cluster tags
 *   depth   — crawl depth from root; "unreachable" when Infinity; "-" when no root is set
 *
 * Example (all warns):
 *   - /zh-tw/theme/{slug}  pages: 2  score: 0.10  health: low  warn: depth-warn,no-tags  depth: unreachable  outbound: 42
 *
 * Example (no warns):
 *   - /zh-tw/destination/{slug}  pages: 274  score: 0.85  health: high  depth: 1  outbound: 37 [global]
 */
function formatNodeLine(
  node: CopyForAIInput["nodes"][number],
  scores: Map<string, number>,
  depthMap: Map<string, number>,
  outboundMap: Map<string, number>,
): string {
  const { id, data } = node;
  const numericScore = (scores.get(id) ?? 0).toFixed(2);

  let depthStr: string;
  if (!depthMap.has(id)) {
    depthStr = "-";
  } else {
    const d = depthMap.get(id)!;
    depthStr = d === Infinity ? "unreachable" : String(d);
  }

  const outbound = outboundMap.get(id) ?? 0;

  // Health score from 3 indicators: links, depth, tags
  const warnReasons: string[] = [];
  if (outbound > OUTBOUND_WARNING_THRESHOLD) warnReasons.push("outbound-warn");
  if (depthMap.size > 0) {
    if (!depthMap.has(id)) {
      warnReasons.push("depth-warn");
    } else {
      const d = depthMap.get(id)!;
      if (d === Infinity || d > DEPTH_WARNING_THRESHOLD) warnReasons.push("depth-warn");
    }
  }
  const trimmedTags = (data.tags ?? []).filter((t) => t.trim() !== "");
  if (trimmedTags.length === 0) warnReasons.push("no-tags");

  const healthTier = warnReasons.length === 0 ? "high" : warnReasons.length === 1 ? "mid" : "low";

  let line = `- ${data.urlTemplate}  pages: ${data.pageCount}  score: ${numericScore}  health: ${healthTier}`;
  if (warnReasons.length > 0) line += `  warn: ${warnReasons.join(",")}`;
  line += `  depth: ${depthStr}  outbound: ${outbound}`;
  if (data.isRoot) line += " [root]";
  if (data.isGlobal) line += " [global]";
  return line;
}

function formatEdgeLine(
  edge: CopyForAIInput["edges"][number],
  templateById: Map<string, string>,
): string | null {
  const sourceTpl = templateById.get(edge.source);
  const targetTpl = templateById.get(edge.target);
  if (!sourceTpl || !targetTpl) return null;
  const linkCount = edge.data?.linkCount ?? 1;
  return `- ${sourceTpl} → ${targetTpl}  (${linkCount} links)`;
}

/**
 * Serializes the current graph into a compact plain-text format optimized for
 * paste-into-LLM usage. Pure function — no side effects, no DOM/clipboard access.
 */
export function buildCopyForAIText(input: CopyForAIInput): string {
  const { nodes, edges, scores, depthMap, outboundMap } = input;

  const templateById = new Map<string, string>(nodes.map((n) => [n.id, n.data.urlTemplate]));

  const lines: string[] = [];

  lines.push("# SEO Internal Link Structure");
  lines.push("");
  lines.push(`## Nodes (${nodes.length} total)`);

  for (const node of nodes) {
    lines.push(formatNodeLine(node, scores, depthMap, outboundMap));
  }

  lines.push("");
  lines.push("## Links");

  for (const edge of edges) {
    const edgeLine = formatEdgeLine(edge, templateById);
    if (edgeLine) lines.push(edgeLine);
  }

  return lines.join("\n") + "\n";
}
