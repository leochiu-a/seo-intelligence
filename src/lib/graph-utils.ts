import type { Node, Edge } from 'reactflow';

export interface UrlNodeData {
  urlTemplate: string;
  pageCount: number;
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
