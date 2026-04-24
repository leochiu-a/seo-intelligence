import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { type LinkCountEdgeData } from "../lib/graph-utils";
import {
  calculatePageRank,
  identifyWeakNodes,
  classifyScoreTier,
  calculateOutboundLinks,
} from "../lib/graph-pagerank";
import {
  calculateCrawlDepth,
  calculateInboundLinks,
  identifyOrphanNodes,
  OUTBOUND_WARNING_THRESHOLD,
} from "../lib/graph-analysis";
import type { AppNodeData } from "../App";

export interface GraphAnalyticsResult {
  scores: Map<string, number>;
  weakNodes: Set<string>;
  allScoreValues: number[];
  rootId: string | null;
  depthMap: Map<string, number>;
  orphanNodes: Set<string>;
  unreachableNodes: Set<string>;
  outboundMap: Map<string, number>;
  inboundMap: Map<string, number>;
  enrichedNodes: Node<AppNodeData>[];
}

export function useGraphAnalytics(
  nodes: Node<AppNodeData>[],
  edges: Edge<LinkCountEdgeData>[],
): GraphAnalyticsResult {
  // Derive root node ID — used as both teleport target for Personalized PageRank
  // and as the BFS origin for crawl depth below.
  const rootId = useMemo(() => nodes.find((n) => n.data.isRoot)?.id ?? null, [nodes]);

  // Recalculate scores on every graph change (per D-13, SCORE-02).
  // Personalized PageRank: teleport biased to root so homepage accumulates rank
  // reflecting its role as the canonical entry point.
  const scores = useMemo(() => calculatePageRank(nodes, edges, rootId), [nodes, edges, rootId]);

  const weakNodes = useMemo(() => identifyWeakNodes(scores), [scores]);

  const allScoreValues = useMemo(() => [...scores.values()], [scores]);

  // Compute crawl depth map using BFS from root
  const depthMap = useMemo(() => calculateCrawlDepth(nodes, edges, rootId), [nodes, edges, rootId]);

  // Identify orphan nodes (zero inbound, excluding root)
  const orphanNodes = useMemo(
    () => identifyOrphanNodes(nodes, edges, rootId),
    [nodes, edges, rootId],
  );

  // Identify unreachable nodes (have depth = Infinity in depthMap)
  const unreachableNodes = useMemo(() => {
    const set = new Set<string>();
    for (const [id, depth] of depthMap) {
      if (depth === Infinity) set.add(id);
    }
    return set;
  }, [depthMap]);

  // Compute total outbound links per node (explicit edges + implicit global contribution).
  // Global source nodes contribute 0 implicit per Phase 4 D-01 parity.
  const outboundMap = useMemo(() => calculateOutboundLinks(nodes, edges), [nodes, edges]);

  // Total inbound links per node: explicit edges + implicit global inbound
  // (every non-global implicitly links to every global; global->global excluded).
  const inboundMap = useMemo(() => calculateInboundLinks(nodes, edges), [nodes, edges]);

  // Enrich nodes with score tier, weak flag, and crawl depth/orphan fields for UrlNode rendering
  const enrichedNodes = useMemo(() => {
    return nodes.map((node) => {
      const score = scores.get(node.id) ?? 0;
      const scoreTier = classifyScoreTier(score, allScoreValues);
      const isWeak = weakNodes.has(node.id);
      const isOrphan = orphanNodes.has(node.id);
      const isUnreachable = unreachableNodes.has(node.id);
      const crawlDepth = depthMap.get(node.id);
      const outboundCount = outboundMap.get(node.id) ?? 0;
      const isOverLinked = outboundCount > OUTBOUND_WARNING_THRESHOLD;
      // Only create new object if any enriched data changed
      if (
        node.data.scoreTier === scoreTier &&
        node.data.isWeak === isWeak &&
        node.data.isOrphan === isOrphan &&
        node.data.isUnreachable === isUnreachable &&
        node.data.crawlDepth === crawlDepth &&
        node.data.outboundCount === outboundCount &&
        node.data.isOverLinked === isOverLinked
      ) {
        return node;
      }
      // Tags, placements, isGlobal, isRoot ride through via ...node.data spread (Phase 999.5 D-17).
      return {
        ...node,
        data: {
          ...node.data,
          scoreTier,
          isWeak,
          isOrphan,
          isUnreachable,
          crawlDepth,
          outboundCount,
          isOverLinked,
        },
      };
    });
  }, [
    nodes,
    scores,
    weakNodes,
    allScoreValues,
    orphanNodes,
    unreachableNodes,
    depthMap,
    outboundMap,
  ]);

  return {
    scores,
    weakNodes,
    allScoreValues,
    rootId,
    depthMap,
    orphanNodes,
    unreachableNodes,
    outboundMap,
    inboundMap,
    enrichedNodes,
  };
}
