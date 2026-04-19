import type { Node, Edge } from "@xyflow/react";
import type { AppNodeData } from "../App";
import type { Placement } from "./graph-utils";

export interface SerializedGraphNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    urlTemplate: string;
    pageCount: number;
    isGlobal?: boolean;
    placements?: Placement[];
    isRoot?: boolean;
    tags?: string[];
  };
}

export interface SerializedGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  markerEnd?: unknown;
  data: { linkCount: number };
}

/** Strips runtime-only fields before writing to localStorage */
export function serializeGraph(
  nodes: Node<AppNodeData>[],
  edges: Edge[],
): { nodes: SerializedGraphNode[]; edges: SerializedGraphEdge[] } {
  return {
    nodes: nodes.map(
      ({
        id,
        type,
        position,
        data: { urlTemplate, pageCount, isGlobal, placements, isRoot, tags },
      }) => ({
        id,
        type,
        position,
        data: {
          urlTemplate,
          pageCount,
          ...(isGlobal && { isGlobal }),
          ...(placements?.length && { placements }),
          ...(isRoot && { isRoot }),
          ...(tags?.length && { tags }),
        },
      }),
    ),
    edges: edges.map(
      ({ id, source, target, sourceHandle, targetHandle, type, markerEnd, data }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
        type,
        markerEnd,
        data: { linkCount: (data as { linkCount?: number })?.linkCount ?? 1 },
      }),
    ),
  };
}
