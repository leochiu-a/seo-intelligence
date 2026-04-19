import type { Node, Edge } from "@xyflow/react";

export interface Placement {
  id: string;
  name: string;
  linkCount: number;
}

export type UrlNodeData = {
  urlTemplate: string;
  pageCount: number;
  isGlobal?: boolean;
  placements?: Placement[];
  isRoot?: boolean;
  tags?: string[];
};

export type LinkCountEdgeData = {
  linkCount: number;
  onLinkCountChange?: (edgeId: string, linkCount: number) => void;
};

let nodeIdCounter = 0;

/** Resets the node id counter to 0. Used in tests for deterministic ids. */
export function resetNodeIdCounter(): void {
  nodeIdCounter = 0;
}

/**
 * Creates a new URL node with default values and a unique auto-incremented id.
 * Default urlTemplate: '/page/<id>', default pageCount: 1.
 */
export function createDefaultNode(position: { x: number; y: number }): Node<UrlNodeData> {
  nodeIdCounter += 1;
  return {
    id: `node-${nodeIdCounter}`,
    type: "urlNode",
    position,
    data: {
      urlTemplate: "/page/<id>",
      pageCount: 1,
    },
  };
}

/**
 * Returns a new nodes array where the matching node's data is shallowly merged
 * with newData. All other nodes are returned by reference (unchanged).
 */
export function updateNodeData(
  nodes: Node<UrlNodeData>[],
  nodeId: string,
  newData: Partial<UrlNodeData>,
): Node<UrlNodeData>[] {
  return nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
}

/**
 * Returns a new edges array where the matching edge's linkCount is updated.
 * All other edges are returned by reference (unchanged).
 */
export function updateEdgeLinkCount(
  edges: Edge<LinkCountEdgeData>[],
  edgeId: string,
  linkCount: number,
): Edge<LinkCountEdgeData>[] {
  return edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, linkCount } } : e));
}

/**
 * Validates node form data.
 * Returns an error string if invalid, null if valid.
 */
export function validateNodeData(data: { urlTemplate: string; pageCount: number }): string | null {
  if (data.urlTemplate.trim() === "") {
    return "URL template cannot be empty";
  }
  if (data.pageCount < 1) {
    return "Page count must be at least 1";
  }
  return null;
}

/**
 * Clamps a link count to a valid integer >= 1.
 * NaN, negative values, and 0 all return 1. Decimals are floored.
 */
export function validateLinkCount(count: number): number {
  if (Number.isNaN(count) || count < 1) {
    return 1;
  }
  return Math.floor(count);
}

/**
 * Formats a page count as a human-readable string.
 * Returns "1 page" for 1, "{n} pages" for all other values.
 */
export function formatPageCount(n: number): string {
  return n === 1 ? "1 page" : `${n} pages`;
}

export type ScoreTier = "high" | "mid" | "low" | "neutral";

const DAMPING = 0.85;
const MAX_ITER = 100;
const EPSILON = 0.0001;

/**
 * Multiplicative bonus applied to edges whose source and target share ≥ 1 tag.
 * Applied identically in the inbound rank-transfer loop and the totalWeightedOut
 * precompute so PageRank math stays consistent. Module-private per Phase 999.5 D-08 —
 * matches Phase 8/10 precedent for threshold constants. No UI knob.
 */
const CLUSTER_BONUS_FACTOR = 1.5;

/**
 * Outbound-link warning threshold. A non-global node whose total outbound link
 * count (explicit edges + implicit global injection) exceeds this value is
 * flagged as over-linked. Colocated with DAMPING/MAX_ITER/EPSILON per Phase 10
 * D-05. Exported (not module-private) so UrlNode.tsx and ScoreSidebar.tsx in
 * plan 10-02 can reuse the single source of truth instead of duplicating 150.
 */
export const OUTBOUND_WARNING_THRESHOLD = 150;
export const DEPTH_WARNING_THRESHOLD = 3;

/**
 * Returns true when source and target tag arrays share at least one tag.
 * Handles undefined/empty inputs by returning false. Used by calculatePageRank
 * to decide whether an edge gets the CLUSTER_BONUS_FACTOR multiplier.
 */
export function hasSameCluster(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  const setB = new Set(b);
  for (const tag of a) {
    if (setB.has(tag)) return true;
  }
  return false;
}

/**
 * Iterative PageRank with page count and link count weighting.
 * d = 0.85, convergence delta < 0.0001, max 100 iterations.
 *
 * Algorithm:
 * 1. Initialize all scores to 1.0
 * 2. For each iteration:
 *    a. For each node u, compute:
 *       PR(u) = (1 - d) + d * sum over all v linking to u of:
 *         PR(v) * linkCount(v->u) * pageCount(u) / totalWeightedOutbound(v)
 *       where totalWeightedOutbound(v) = sum of (linkCount(v->w) * pageCount(w)) for all w that v links to
 *    b. Check convergence: max absolute delta across all nodes < 0.0001
 * 3. Return Map<nodeId, score>
 */
export function calculatePageRank(
  nodes: Node<UrlNodeData>[],
  edges: Edge<LinkCountEdgeData>[],
): Map<string, number> {
  if (nodes.length === 0) return new Map();

  // Build node lookup for pageCount
  const nodeMap = new Map<string, UrlNodeData>();
  for (const n of nodes) {
    nodeMap.set(n.id, n.data);
  }

  // Build inbound adjacency: targetId -> Array<{ sourceId, linkCount, sameCluster }>
  const inbound = new Map<
    string,
    Array<{ sourceId: string; linkCount: number; sameCluster: boolean }>
  >();
  // Build outbound adjacency: sourceId -> Array<{ targetId, linkCount, sameCluster }>
  const outbound = new Map<
    string,
    Array<{ targetId: string; linkCount: number; sameCluster: boolean }>
  >();

  for (const n of nodes) {
    inbound.set(n.id, []);
    outbound.set(n.id, []);
  }

  for (const e of edges) {
    const lc = e.data?.linkCount ?? 1;
    const srcTags = nodeMap.get(e.source)?.tags;
    const tgtTags = nodeMap.get(e.target)?.tags;
    const sameCluster = hasSameCluster(srcTags, tgtTags);
    inbound.get(e.target)?.push({ sourceId: e.source, linkCount: lc, sameCluster });
    outbound.get(e.source)?.push({ targetId: e.target, linkCount: lc, sameCluster });
  }

  // Global node injection: every non-global node implicitly links to each global node.
  // Synthetic edges carry sameCluster flag computed against tags of both ends (Phase 999.5 D-04).
  const globalNodes = nodes.filter((n) => n.data.isGlobal);
  const nonGlobalNodes = nodes.filter((n) => !n.data.isGlobal);
  for (const globalNode of globalNodes) {
    const totalPlacementLinks = (globalNode.data.placements ?? []).reduce(
      (sum, p) => sum + p.linkCount,
      0,
    );
    if (totalPlacementLinks <= 0) continue;

    for (const sourceNode of nonGlobalNodes) {
      const sameCluster = hasSameCluster(sourceNode.data.tags, globalNode.data.tags);
      inbound.get(globalNode.id)?.push({
        sourceId: sourceNode.id,
        linkCount: totalPlacementLinks,
        sameCluster,
      });
      outbound.get(sourceNode.id)?.push({
        targetId: globalNode.id,
        linkCount: totalPlacementLinks,
        sameCluster,
      });
    }
  }

  // Precompute totalWeightedOutbound for each node. Same-cluster edges contribute
  // linkCount × CLUSTER_BONUS_FACTOR so rank transfer stays consistent with
  // the bonused denominator (Phase 999.5 D-06).
  const totalWeightedOut = new Map<string, number>();
  for (const n of nodes) {
    let total = 0;
    for (const { targetId, linkCount, sameCluster } of outbound.get(n.id) ?? []) {
      const targetPageCount = nodeMap.get(targetId)?.pageCount ?? 1;
      const effectiveLinkCount = sameCluster ? linkCount * CLUSTER_BONUS_FACTOR : linkCount;
      total += effectiveLinkCount * targetPageCount;
    }
    totalWeightedOut.set(n.id, total);
  }

  // Initialize scores
  let scores = new Map<string, number>();
  for (const n of nodes) {
    scores.set(n.id, 1.0);
  }

  const N = nodes.length;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const newScores = new Map<string, number>();
    let maxDelta = 0;

    // Dangling node handling: collect rank from nodes with no outbound edges
    // and redistribute evenly so scores sum to N
    let danglingRank = 0;
    for (const n of nodes) {
      if ((outbound.get(n.id)?.length ?? 0) === 0) {
        danglingRank += scores.get(n.id) ?? 1.0;
      }
    }
    const danglingShare = (DAMPING * danglingRank) / N;

    for (const n of nodes) {
      const pageCount = nodeMap.get(n.id)?.pageCount ?? 1;
      let rank = 1 - DAMPING + danglingShare;

      for (const { sourceId, linkCount, sameCluster } of inbound.get(n.id) ?? []) {
        const sourceScore = scores.get(sourceId) ?? 1.0;
        const sourceTotal = totalWeightedOut.get(sourceId) ?? 0;
        if (sourceTotal > 0) {
          const effectiveLinkCount = sameCluster ? linkCount * CLUSTER_BONUS_FACTOR : linkCount;
          rank += (DAMPING * sourceScore * effectiveLinkCount * pageCount) / sourceTotal;
        }
      }

      newScores.set(n.id, rank);
      const delta = Math.abs(rank - (scores.get(n.id) ?? 1.0));
      if (delta > maxDelta) maxDelta = delta;
    }

    scores = newScores;
    if (maxDelta < EPSILON) break;
  }

  return scores;
}

/**
 * Total outbound links per node:
 *   sum(explicit edge.linkCount) + implicit global contribution
 *
 * For a NON-GLOBAL source node: implicit = sum over all global nodes G of
 *   sum(G.data.placements.linkCount).
 * For a GLOBAL source node: implicit = 0 (mirrors Phase 4 D-01 — no
 * global->global synthetic injection).
 *
 * `linkCount` is already a per-source-page figure (Phase 1 EDGE-01), so no
 * pageCount multiplication is applied.
 *
 * Returns Map<nodeId, totalOutbound>. Every node in `nodes` is present in the
 * returned map (defaulting to 0).
 */
export function calculateOutboundLinks(
  nodes: Node<UrlNodeData>[],
  edges: Edge<LinkCountEdgeData>[],
): Map<string, number> {
  const result = new Map<string, number>();
  for (const n of nodes) {
    result.set(n.id, 0);
  }

  // Explicit outbound edges (counted for every source, global or non-global)
  for (const e of edges) {
    const lc = e.data?.linkCount ?? 1;
    if (result.has(e.source)) {
      result.set(e.source, (result.get(e.source) ?? 0) + lc);
    }
  }

  // Implicit global contribution — only non-global sources pick this up.
  const globalPlacementSum = nodes
    .filter((n) => n.data.isGlobal)
    .reduce((total, g) => {
      const perGlobal = (g.data.placements ?? []).reduce((sum, p) => sum + p.linkCount, 0);
      return total + perGlobal;
    }, 0);

  if (globalPlacementSum > 0) {
    for (const n of nodes) {
      if (n.data.isGlobal) continue; // D-02: global sources contribute 0 implicit
      result.set(n.id, (result.get(n.id) ?? 0) + globalPlacementSum);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Phase 11.1: PM Health Check — 3-metric status helper
// ---------------------------------------------------------------------------

export interface HealthStatus {
  links: "ok" | "warn";
  depth: "ok" | "warn" | "na";
  tags: "ok" | "warn";
}

/**
 * Pure health evaluator for a single node against the Phase 11.1 3 metrics:
 *   - Links: warn when outbound > OUTBOUND_WARNING_THRESHOLD (150)
 *   - Depth: warn when depth > DEPTH_WARNING_THRESHOLD OR depth === Infinity;
 *     'na' when depthMap is empty (no root set); 'warn' when node is unreachable
 *   - Tags:  warn when node.data.tags is missing/empty or all entries are
 *            empty strings after trim
 *
 * Pure function — no React, no side effects. Suitable for sort predicates and
 * memoized renders.
 */
export function getHealthStatus(
  node: Node<UrlNodeData>,
  depthMap: Map<string, number>,
  outboundMap: Map<string, number>,
): HealthStatus {
  // Links
  const outbound = outboundMap.get(node.id) ?? 0;
  const links: HealthStatus["links"] = outbound > OUTBOUND_WARNING_THRESHOLD ? "warn" : "ok";

  // Depth
  let depth: HealthStatus["depth"];
  if (depthMap.size === 0) {
    depth = "na"; // no root set, depth is not computable
  } else if (!depthMap.has(node.id)) {
    depth = "warn"; // root is set but node is unreachable
  } else {
    const d = depthMap.get(node.id)!;
    depth = d === Infinity || d > DEPTH_WARNING_THRESHOLD ? "warn" : "ok";
  }

  // Tags — treat whitespace-only entries as empty
  const trimmed = (node.data.tags ?? []).filter((t) => t.trim() !== "");
  const tags: HealthStatus["tags"] = trimmed.length === 0 ? "warn" : "ok";

  return { links, depth, tags };
}

/**
 * Warnings-first sort helper. Returns true when any metric is 'warn'.
 * 'na' depth is NOT a warning (no root set → no actionable signal).
 */
export function hasAnyWarning(status: HealthStatus): boolean {
  return status.links === "warn" || status.depth === "warn" || status.tags === "warn";
}

export function buildTooltipContent(status: HealthStatus): string {
  const issues: string[] = [];
  if (status.links === "warn") issues.push("Outbound links > 150");
  if (status.depth === "warn") issues.push(`Crawl depth > ${DEPTH_WARNING_THRESHOLD}`);
  if (status.tags === "warn") issues.push("No tags assigned");
  return issues.join("\n");
}

/**
 * Classifies a score into a tier based on its RANK among allScores (percentile-based).
 * Top ~1/3 by rank → 'high', middle ~1/3 → 'mid', bottom ~1/3 → 'low'. Rationale: linear
 * min-max thirds compresses all nodes into 'low' when one outlier dominates the range
 * (e.g. a global node with 357k pages). Returns 'neutral' when allScores.length <= 1 or
 * all scores are equal.
 *
 * Split rule: highFirstIdx = n - ceil(n/3), midFirstIdx = n - ceil(2n/3) (ascending sorted).
 * On uneven n the TOP tier gets the extra slot (ceil gives top-heavy tie-break).
 * Example: n=4 → 2 high / 1 mid / 1 low; n=9 → 3/3/3; n=2 → 1 high / 0 mid / 1 low.
 *
 * Tie rule (asymmetric): ties at the mid/high boundary all become 'high' (bias up); ties
 * at the low/mid boundary all become 'low' (bias down). This keeps the top and bottom
 * tiers 'sticky' so a tied group spanning a boundary collapses into one tier instead of
 * splitting arbitrarily by insertion order.
 *
 * @perf This sorts a copy of allScores on every call. With N nodes in useGraphAnalytics,
 * that is O(N² log N) total. Fine for MVP scale (<100 nodes). Future optimization:
 * memoize sorted thresholds in the caller and accept pre-computed cutoffs as an overload.
 */
export function classifyScoreTier(score: number, allScores: number[]): ScoreTier {
  if (allScores.length <= 1) return "neutral";

  // Sort ascending copy — do NOT mutate caller's array
  const sorted = [...allScores].sort((a, b) => a - b);
  const n = sorted.length;

  if (sorted[0] === sorted[n - 1]) return "neutral";

  // First index of each tier in ascending sort. Math.ceil so uneven splits favour the top tier.
  const highFirstIdx = n - Math.ceil(n / 3); // e.g. n=9 → 6; n=4 → 2
  const midFirstIdx = n - Math.ceil((2 * n) / 3); // e.g. n=9 → 3; n=4 → 1

  const highThreshold = sorted[highFirstIdx];
  // Upper bound of the low tier. When midFirstIdx is 0, there is no low-tier element to
  // bound mid from below; using Infinity makes the mid check always fail, degenerating
  // the split to high/low only (see n=2 case).
  const lowLastIdx = midFirstIdx - 1;
  const midFloor = lowLastIdx >= 0 ? sorted[lowLastIdx] : Infinity;

  if (score >= highThreshold) return "high";
  if (score > midFloor) return "mid";
  return "low";
}

/**
 * Identifies weak nodes: those with score below (mean - 1 stddev).
 * If stddev is 0 (all equal), returns empty set.
 */
export function identifyWeakNodes(scores: Map<string, number>): Set<string> {
  if (scores.size <= 1) return new Set();

  const values = Array.from(scores.values());
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  if (stddev < 0.00001) return new Set();

  const threshold = mean - stddev;
  const weak = new Set<string>();

  for (const [id, score] of scores) {
    if (score < threshold) {
      weak.add(id);
    }
  }

  return weak;
}

export interface PlacementGroup {
  placementName: string;
  nodeIds: string[];
  nodeLabels: string[];
}

/**
 * Groups all global nodes by their unique placement names.
 * Each group contains the IDs and URL templates of all global nodes that carry that placement name.
 * Results are sorted alphabetically by placementName for stable rendering.
 * Empty-string placement names are skipped. Duplicate names on the same node are deduplicated.
 */
export function collectPlacementGroups(nodes: Node<UrlNodeData>[]): PlacementGroup[] {
  const groups = new Map<string, { nodeIds: string[]; nodeLabels: string[] }>();

  for (const node of nodes) {
    if (!node.data.isGlobal || !node.data.placements?.length) continue;

    const seenNamesForThisNode = new Set<string>();
    for (const placement of node.data.placements) {
      const name = placement.name.trim();
      if (!name) continue;
      if (seenNamesForThisNode.has(name)) continue;
      seenNamesForThisNode.add(name);

      if (!groups.has(name)) {
        groups.set(name, { nodeIds: [], nodeLabels: [] });
      }
      const group = groups.get(name)!;
      group.nodeIds.push(node.id);
      group.nodeLabels.push(node.data.urlTemplate);
    }
  }

  return Array.from(groups.entries())
    .map(([placementName, { nodeIds, nodeLabels }]) => ({ placementName, nodeIds, nodeLabels }))
    .sort((a, b) => a.placementName.localeCompare(b.placementName));
}

export interface ClusterGroup {
  tagName: string;
  nodeIds: string[];
  nodeLabels: string[];
}

/**
 * Groups nodes (global + non-global) by unique cluster tag names.
 * Dedupes duplicates, skips empty strings, sorts alphabetically.
 */
export function collectClusterGroups(nodes: Node<UrlNodeData>[]): ClusterGroup[] {
  const groups = new Map<string, { nodeIds: string[]; nodeLabels: string[] }>();

  for (const node of nodes) {
    if (!node.data.tags?.length) continue;
    const seen = new Set<string>();
    for (const rawTag of node.data.tags) {
      const tag = rawTag.trim();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      if (!groups.has(tag)) groups.set(tag, { nodeIds: [], nodeLabels: [] });
      const g = groups.get(tag)!;
      g.nodeIds.push(node.id);
      g.nodeLabels.push(node.data.urlTemplate);
    }
  }

  return Array.from(groups.entries())
    .map(([tagName, { nodeIds, nodeLabels }]) => ({ tagName, nodeIds, nodeLabels }))
    .sort((a, b) => a.tagName.localeCompare(b.tagName));
}

/**
 * BFS shortest-path distance from the designated root node to all other nodes.
 * Follows directed edges (source -> target). Also includes synthetic edges
 * from every non-global node to every global node (same as PageRank injection).
 * Returns Map<nodeId, depth>. Root = 0, unreachable = Infinity.
 * If rootId is null/undefined or not found, returns empty Map.
 */
export function calculateCrawlDepth(
  nodes: Node<UrlNodeData>[],
  edges: Edge<LinkCountEdgeData>[],
  rootId: string | null | undefined,
): Map<string, number> {
  if (!rootId || nodes.length === 0) return new Map();
  if (!nodes.some((n) => n.id === rootId)) return new Map();

  // Build adjacency list: sourceId -> Set<targetId>
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());

  for (const e of edges) {
    adj.get(e.source)?.add(e.target);
  }

  // Global node synthetic edges: every non-global node -> every global node
  const globalNodeIds = nodes.filter((n) => n.data.isGlobal).map((n) => n.id);
  const nonGlobalNodeIds = nodes.filter((n) => !n.data.isGlobal).map((n) => n.id);
  for (const globalId of globalNodeIds) {
    for (const srcId of nonGlobalNodeIds) {
      adj.get(srcId)?.add(globalId);
    }
  }

  // BFS
  const depth = new Map<string, number>();
  for (const n of nodes) depth.set(n.id, Infinity);
  depth.set(rootId, 0);

  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current)!;
    for (const neighbor of adj.get(current) ?? []) {
      if (depth.get(neighbor)! > currentDepth + 1) {
        depth.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  return depth;
}

/**
 * Identifies orphan nodes: nodes with zero inbound edges (explicit + synthetic global),
 * excluding the root node.
 * Returns Set<nodeId> of orphan node IDs.
 *
 * Per D-10: Orphan = zero inbound edges, excluding root. Distinct from weak and unreachable.
 */
export function identifyOrphanNodes(
  nodes: Node<UrlNodeData>[],
  edges: Edge<LinkCountEdgeData>[],
  rootId: string | null | undefined,
): Set<string> {
  if (nodes.length === 0) return new Set();

  // Count inbound edges per node (explicit edges)
  const inboundCount = new Map<string, number>();
  for (const n of nodes) inboundCount.set(n.id, 0);

  for (const e of edges) {
    inboundCount.set(e.target, (inboundCount.get(e.target) ?? 0) + 1);
  }

  // Global node synthetic inbound: every non-global node links to every global node
  const globalNodeIds = new Set(nodes.filter((n) => n.data.isGlobal).map((n) => n.id));
  const nonGlobalCount = nodes.filter((n) => !n.data.isGlobal).length;
  for (const globalId of globalNodeIds) {
    inboundCount.set(globalId, (inboundCount.get(globalId) ?? 0) + nonGlobalCount);
  }

  const orphans = new Set<string>();
  for (const [id, count] of inboundCount) {
    if (count === 0 && id !== rootId) {
      orphans.add(id);
    }
  }

  return orphans;
}

/**
 * Collects unique, non-empty placement names from all global nodes
 * EXCEPT the node with the given currentNodeId.
 */
export function collectPlacementSuggestions(
  nodes: Node<UrlNodeData>[],
  currentNodeId: string,
): string[] {
  const names = nodes
    .filter((n) => n.id !== currentNodeId && n.data.isGlobal && n.data.placements?.length)
    .flatMap((n) => (n.data.placements ?? []).map((p) => p.name).filter(Boolean));
  return [...new Set(names)];
}

/**
 * Collects unique, non-empty tag names from all nodes EXCEPT the node with
 * the given currentNodeId. Mirrors collectPlacementSuggestions shape.
 * Phase 999.5 D-02 + Phase 6 PLACE-04: consumer uses empty array to hide
 * autocomplete dropdown.
 */
export function collectClusterSuggestions(
  nodes: Node<UrlNodeData>[],
  currentNodeId: string,
): string[] {
  const tags = nodes
    .filter((n) => n.id !== currentNodeId && n.data.tags?.length)
    .flatMap((n) => (n.data.tags ?? []).filter((t) => t.trim() !== ""));
  return [...new Set(tags)];
}

/** Returns IDs of the focal node and every node directly connected to it (either direction). */
export function getConnectedElements(nodeId: string, edges: Edge[]): Set<string> {
  const ids = new Set<string>();
  if (!nodeId) return ids;
  ids.add(nodeId);
  for (const edge of edges) {
    if (edge.source === nodeId) ids.add(edge.target);
    else if (edge.target === nodeId) ids.add(edge.source);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// URL tree hierarchy
// ---------------------------------------------------------------------------

export interface UrlTreeNode {
  id: string;
  urlTemplate: string;
  score: number;
  /** 0 = root level, 1 = child, 2 = grandchild, … */
  depth: number;
  children: UrlTreeNode[];
}

/**
 * Builds a tree of URL nodes based on path-prefix relationships.
 *
 * Rules:
 * - A node A is the parent of node B iff A's path segments are a strict prefix
 *   of B's path segments and A has the most specific match (longest prefix).
 * - The "/" node (empty segments) is never treated as a parent of anything.
 * - Within each level, nodes are sorted by score descending.
 */
export function buildUrlTree(
  nodes: Node<UrlNodeData>[],
  scores: Map<string, number>,
): UrlTreeNode[] {
  // Parse each node into a flat record with its path segments
  const flat = nodes.map((n) => ({
    id: n.id,
    urlTemplate: n.data.urlTemplate,
    score: scores.get(n.id) ?? 0,
    segments: n.data.urlTemplate.split("/").filter((s) => s.length > 0),
  }));

  // Sort by segment count ascending so potential parents come first
  flat.sort((a, b) => a.segments.length - b.segments.length);

  // Build UrlTreeNode map (id → node)
  const nodeMap = new Map<string, UrlTreeNode>();
  for (const item of flat) {
    nodeMap.set(item.id, {
      id: item.id,
      urlTemplate: item.urlTemplate,
      score: item.score,
      depth: 0,
      children: [],
    });
  }

  const roots: UrlTreeNode[] = [];

  for (const item of flat) {
    const treeNode = nodeMap.get(item.id)!;

    // Find best parent: longest strict-prefix match with segments.length > 0
    let bestParent: (typeof flat)[number] | null = null;
    for (const candidate of flat) {
      if (candidate.id === item.id) continue;
      const cs = candidate.segments;
      // Candidate must have fewer segments than item (strict prefix)
      // AND candidate segments must not be empty (prevent "/" from parenting)
      if (cs.length === 0 || cs.length >= item.segments.length) continue;
      // Check prefix
      if (!cs.every((seg, i) => seg === item.segments[i])) continue;
      // Keep the most specific (longest) prefix
      if (bestParent === null || cs.length > bestParent.segments.length) {
        bestParent = candidate;
      }
    }

    if (bestParent) {
      const parentNode = nodeMap.get(bestParent.id)!;
      treeNode.depth = parentNode.depth + 1;
      parentNode.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  // Sort children and roots by score descending
  function sortByScore(arr: UrlTreeNode[]): void {
    arr.sort((a, b) => b.score - a.score);
    for (const node of arr) sortByScore(node.children);
  }
  sortByScore(roots);

  return roots;
}

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
  allScoreValues: number[];
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
}

function formatNodeLine(
  node: CopyForAIInput["nodes"][number],
  scores: Map<string, number>,
  allScoreValues: number[],
  depthMap: Map<string, number>,
  outboundMap: Map<string, number>,
): string {
  const { id, data } = node;
  const tier = classifyScoreTier(scores.get(id) ?? 0, allScoreValues);

  let depthStr: string;
  if (!depthMap.has(id)) {
    depthStr = "-";
  } else {
    const d = depthMap.get(id)!;
    depthStr = d === Infinity ? "unreachable" : String(d);
  }

  const outbound = outboundMap.get(id) ?? 0;

  let line = `- ${data.urlTemplate}  pages: ${data.pageCount}  score: ${tier}  depth: ${depthStr}  outbound: ${outbound}`;
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
  const { nodes, edges, scores, allScoreValues, depthMap, outboundMap } = input;

  const templateById = new Map<string, string>(nodes.map((n) => [n.id, n.data.urlTemplate]));

  const lines: string[] = [];

  lines.push("# SEO Internal Link Structure");
  lines.push("");
  lines.push(`## Nodes (${nodes.length} total)`);

  for (const node of nodes) {
    lines.push(formatNodeLine(node, scores, allScoreValues, depthMap, outboundMap));
  }

  lines.push("");
  lines.push("## Links");

  for (const edge of edges) {
    const edgeLine = formatEdgeLine(edge, templateById);
    if (edgeLine) lines.push(edgeLine);
  }

  return lines.join("\n") + "\n";
}
