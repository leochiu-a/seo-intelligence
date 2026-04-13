import type { Node, Edge } from 'reactflow';

export interface UrlNodeData {
  urlTemplate: string;
  pageCount: number;
}

export interface LinkCountEdgeData {
  linkCount: number;
}

let nodeIdCounter = 0;

export function resetNodeIdCounter(): void {
  nodeIdCounter = 0;
}

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

export function updateNodeData(
  nodes: Node<UrlNodeData>[],
  nodeId: string,
  newData: Partial<UrlNodeData>,
): Node<UrlNodeData>[] {
  return nodes.map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n,
  );
}

export function updateEdgeLinkCount(
  edges: Edge<LinkCountEdgeData>[],
  edgeId: string,
  linkCount: number,
): Edge<LinkCountEdgeData>[] {
  return edges.map((e) =>
    e.id === edgeId ? { ...e, data: { ...e.data, linkCount } } : e,
  );
}

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

export function validateLinkCount(count: number): number {
  if (Number.isNaN(count) || count < 1) {
    return 1;
  }
  return Math.floor(count);
}

export function formatPageCount(n: number): string {
  return n === 1 ? '1 page' : `${n} pages`;
}
