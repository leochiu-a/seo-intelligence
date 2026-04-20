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
 * Advances the internal id counter so future createDefaultNode() calls
 * produce ids strictly greater than every `node-<N>` id already present.
 * Safe to call repeatedly (monotonically non-decreasing).
 * Non-matching ids (e.g. "custom-abc") are ignored.
 */
export function syncNodeIdCounter(nodes: ReadonlyArray<{ id: string }>): void {
  let max = nodeIdCounter;
  for (const n of nodes) {
    const m = /^node-(\d+)$/.exec(n.id);
    if (m) {
      const v = Number(m[1]);
      if (Number.isSafeInteger(v) && v > max) max = v;
    }
  }
  nodeIdCounter = max;
}

/**
 * Creates a new URL node with default values and a unique auto-incremented id.
 * Default urlTemplate: '/page/<id>', default pageCount: 1.
 *
 * Optional `existingNodes` syncs the counter to max(existing ids) before
 * incrementing, guaranteeing a collision-free id.
 * Backward compatible — calls without existingNodes behave exactly as before.
 */
export function createDefaultNode(
  position: { x: number; y: number },
  existingNodes?: ReadonlyArray<{ id: string }>,
): Node<UrlNodeData> {
  if (existingNodes && existingNodes.length) syncNodeIdCounter(existingNodes);
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

// Re-exports — preserve backward compatibility with existing consumers.
// See graph-pagerank.ts, graph-analysis.ts, graph-io.ts for the implementations.
export * from "./graph-pagerank";
export * from "./graph-analysis";
export * from "./graph-io";
