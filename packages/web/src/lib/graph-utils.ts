import type { Node, Edge } from 'reactflow';

export interface Placement {
  id: string;
  name: string;
  linkCount: number;
}

export interface UrlNodeData {
  urlTemplate: string;
  pageCount: number;
  isGlobal?: boolean;
  placements?: Placement[];
  isRoot?: boolean;
}

export interface LinkCountEdgeData {
  linkCount: number;
}

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
    type: 'urlNode',
    position,
    data: {
      urlTemplate: '/page/<id>',
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
  return nodes.map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n,
  );
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
  return edges.map((e) =>
    e.id === edgeId ? { ...e, data: { ...e.data, linkCount } } : e,
  );
}

/**
 * Validates node form data.
 * Returns an error string if invalid, null if valid.
 */
export function validateNodeData(data: {
  urlTemplate: string;
  pageCount: number;
}): string | null {
  if (data.urlTemplate.trim() === '') {
    return 'URL template cannot be empty';
  }
  if (data.pageCount < 1) {
    return 'Page count must be at least 1';
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
  return n === 1 ? '1 page' : `${n} pages`;
}

export type ScoreTier = 'high' | 'mid' | 'low' | 'neutral';

const DAMPING = 0.85;
const MAX_ITER = 100;
const EPSILON = 0.0001;

/**
 * Outbound-link warning threshold. A non-global node whose total outbound link
 * count (explicit edges + implicit global injection) exceeds this value is
 * flagged as over-linked. Colocated with DAMPING/MAX_ITER/EPSILON per Phase 10
 * D-05. Exported (not module-private) so UrlNode.tsx and ScoreSidebar.tsx in
 * plan 10-02 can reuse the single source of truth instead of duplicating 150.
 */
export const OUTBOUND_WARNING_THRESHOLD = 150;

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

  // Build inbound adjacency: targetId -> Array<{ sourceId, linkCount }>
  const inbound = new Map<string, Array<{ sourceId: string; linkCount: number }>>();
  // Build outbound adjacency: sourceId -> Array<{ targetId, linkCount }>
  const outbound = new Map<string, Array<{ targetId: string; linkCount: number }>>();

  for (const n of nodes) {
    inbound.set(n.id, []);
    outbound.set(n.id, []);
  }

  for (const e of edges) {
    const lc = e.data?.linkCount ?? 1;
    inbound.get(e.target)?.push({ sourceId: e.source, linkCount: lc });
    outbound.get(e.source)?.push({ targetId: e.target, linkCount: lc });
  }

  // Global node injection: every non-global node implicitly links to each global node
  const globalNodes = nodes.filter((n) => n.data.isGlobal);
  const nonGlobalNodes = nodes.filter((n) => !n.data.isGlobal);
  for (const globalNode of globalNodes) {
    const totalPlacementLinks = (globalNode.data.placements ?? []).reduce(
      (sum, p) => sum + p.linkCount,
      0,
    );
    if (totalPlacementLinks <= 0) continue;

    for (const sourceNode of nonGlobalNodes) {
      inbound.get(globalNode.id)?.push({
        sourceId: sourceNode.id,
        linkCount: totalPlacementLinks,
      });
      outbound.get(sourceNode.id)?.push({
        targetId: globalNode.id,
        linkCount: totalPlacementLinks,
      });
    }
  }

  // Precompute totalWeightedOutbound for each node
  const totalWeightedOut = new Map<string, number>();
  for (const n of nodes) {
    let total = 0;
    for (const { targetId, linkCount } of outbound.get(n.id) ?? []) {
      const targetPageCount = nodeMap.get(targetId)?.pageCount ?? 1;
      total += linkCount * targetPageCount;
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
      let rank = (1 - DAMPING) + danglingShare;

      for (const { sourceId, linkCount } of inbound.get(n.id) ?? []) {
        const sourceScore = scores.get(sourceId) ?? 1.0;
        const sourceTotal = totalWeightedOut.get(sourceId) ?? 0;
        if (sourceTotal > 0) {
          rank += DAMPING * sourceScore * linkCount * pageCount / sourceTotal;
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
      const perGlobal = (g.data.placements ?? []).reduce(
        (sum, p) => sum + p.linkCount,
        0,
      );
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

/**
 * Classifies a score into a tier based on relative thirds of the score range.
 * If only one unique score exists, returns 'neutral'.
 */
export function classifyScoreTier(
  score: number,
  allScores: number[],
): ScoreTier {
  if (allScores.length <= 1) return 'neutral';

  const min = Math.min(...allScores);
  const max = Math.max(...allScores);

  if (min === max) return 'neutral';

  const range = max - min;
  const lowThreshold = min + range / 3;
  const highThreshold = min + (2 * range) / 3;

  if (score >= highThreshold) return 'high';
  if (score >= lowThreshold) return 'mid';
  return 'low';
}

/**
 * Identifies weak nodes: those with score below (mean - 1 stddev).
 * If stddev is 0 (all equal), returns empty set.
 */
export function identifyWeakNodes(
  scores: Map<string, number>,
): Set<string> {
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
    segments: n.data.urlTemplate
      .split('/')
      .filter((s) => s.length > 0),
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
  top: 'handle-top',
  right: 'handle-right',
  bottom: 'handle-bottom',
  left: 'handle-left',
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
    typeof data !== 'object' ||
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
    if (typeof node.urlTemplate !== 'string') {
      throw new Error(`Node at index ${i} is missing "urlTemplate"`);
    }
    if (typeof node.pageCount !== 'number') {
      throw new Error(`Node at index ${i} is missing "pageCount"`);
    }
    const isGlobal = typeof node.isGlobal === 'boolean' ? node.isGlobal : undefined;
    const isRoot = typeof node.isRoot === 'boolean' ? node.isRoot : undefined;
    const placements = Array.isArray(node.placements) ? (node.placements as Placement[]) : undefined;
    return {
      id: String(node.id),
      type: 'urlNode',
      position: { x: Number(node.x ?? 0), y: Number(node.y ?? 0) },
      data: {
        urlTemplate: node.urlTemplate,
        pageCount: node.pageCount,
        ...(isGlobal != null && { isGlobal }),
        ...(isRoot != null && { isRoot }),
        ...(placements != null && { placements }),
      },
    };
  });

  const posById = new Map(nodes.map((n) => [n.id, n.position]));

  const edges: Edge<LinkCountEdgeData>[] = rawEdges.map((e) => {
    const edge = e as Record<string, unknown>;
    const sourceHandle = typeof edge.sourceHandle === 'string' ? edge.sourceHandle : undefined;
    const targetHandle = typeof edge.targetHandle === 'string' ? edge.targetHandle : undefined;

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
      type: 'linkCountEdge',
      data: { linkCount: typeof edge.linkCount === 'number' ? edge.linkCount : 1 },
      ...(resolvedSourceHandle && { sourceHandle: resolvedSourceHandle }),
      ...(resolvedTargetHandle && { targetHandle: resolvedTargetHandle }),
    };
  });

  return { nodes, edges };
}
