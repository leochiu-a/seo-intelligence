import type { Node, Edge } from "@xyflow/react";
import type { UrlNodeData, LinkCountEdgeData } from "./graph-utils";

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
