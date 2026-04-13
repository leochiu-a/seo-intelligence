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
