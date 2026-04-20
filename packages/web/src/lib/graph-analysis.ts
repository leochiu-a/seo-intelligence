import type { Node, Edge } from "@xyflow/react";
import type { UrlNodeData } from "./graph-utils";

// ---------------------------------------------------------------------------
// Phase 11.1: PM Health Check — 3-metric status helper
// ---------------------------------------------------------------------------

/**
 * Outbound-link warning threshold. A non-global node whose total outbound link
 * count (explicit edges + implicit global injection) exceeds this value is
 * flagged as over-linked.
 */
export const OUTBOUND_WARNING_THRESHOLD = 150;
export const DEPTH_WARNING_THRESHOLD = 3;

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
  edges: Edge[],
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
  edges: Edge[],
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
