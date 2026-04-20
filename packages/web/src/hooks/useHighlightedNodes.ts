import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { type LinkCountEdgeData } from "../lib/graph-utils";
import { getConnectedElements } from "../lib/graph-analysis";
import type { AppNodeData } from "../App";

export interface HighlightedNodesResult {
  styledNodes: Node<AppNodeData>[];
  highlightedNodeIds: Set<string> | null;
}

export function useHighlightedNodes(
  enrichedNodes: Node<AppNodeData>[],
  edges: Edge<LinkCountEdgeData>[],
  activeFilters: Set<string>,
  highlightedRouteNodeId: string | null,
): HighlightedNodesResult {
  // Derive highlighted node IDs from active filter keys (AND-combine across dimensions)
  const highlightedNodeIds = useMemo(() => {
    const placementKeys = [...activeFilters].filter((k) => k.startsWith("placement-name:"));
    const clusterKeys = [...activeFilters].filter((k) => k.startsWith("cluster:"));

    let filterIds: Set<string> | null = null;
    if (placementKeys.length > 0 || clusterKeys.length > 0) {
      const placementMatches = new Set<string>();
      for (const key of placementKeys) {
        const name = key.slice("placement-name:".length);
        for (const node of enrichedNodes) {
          if (node.data.isGlobal && node.data.placements?.some((p) => p.name === name)) {
            placementMatches.add(node.id);
          }
        }
      }
      const clusterMatches = new Set<string>();
      for (const key of clusterKeys) {
        const tag = key.slice("cluster:".length);
        for (const node of enrichedNodes) {
          if (node.data.tags?.includes(tag)) clusterMatches.add(node.id);
        }
      }
      if (placementKeys.length > 0 && clusterKeys.length > 0) {
        filterIds = new Set([...placementMatches].filter((id) => clusterMatches.has(id)));
      } else {
        filterIds = placementKeys.length > 0 ? placementMatches : clusterMatches;
      }
    }

    const routeIds = highlightedRouteNodeId
      ? getConnectedElements(highlightedRouteNodeId, edges)
      : null;

    if (routeIds !== null) return routeIds;
    return filterIds;
  }, [activeFilters, enrichedNodes, highlightedRouteNodeId, edges]);

  const styledNodes = useMemo(() => {
    if (highlightedNodeIds === null) {
      return enrichedNodes.map((node) =>
        node.data.isDimmed ? { ...node, data: { ...node.data, isDimmed: false } } : node,
      );
    }
    return enrichedNodes.map((node) => {
      const isDimmed = !highlightedNodeIds.has(node.id);
      if (node.data.isDimmed === isDimmed) return node;
      return { ...node, data: { ...node.data, isDimmed } };
    });
  }, [enrichedNodes, highlightedNodeIds]);

  return { styledNodes, highlightedNodeIds };
}
