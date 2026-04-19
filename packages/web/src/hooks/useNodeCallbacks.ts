import { useCallback } from "react";
import { MarkerType, type Node, type Edge, type EdgeMarkerType } from "@xyflow/react";
import type { Dispatch, SetStateAction } from "react";
import {
  createDefaultNode,
  updateNodeData,
  updateEdgeLinkCount,
  type UrlNodeData,
  type LinkCountEdgeData,
} from "../lib/graph-utils";
import type { AppNodeData } from "../App";
import type { SerializedGraphNode, SerializedGraphEdge } from "../lib/serialize-graph";

export interface UseNodeCallbacksArgs {
  setNodes: Dispatch<SetStateAction<Node<AppNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge<LinkCountEdgeData>[]>>;
}

export interface UseNodeCallbacksResult {
  onNodeDataUpdate: (nodeId: string, newData: Partial<AppNodeData>) => void;
  onNodeZIndexChange: (nodeId: string, zIndex: number) => void;
  onRootToggle: (nodeId: string) => void;
  addNode: (position: { x: number; y: number }) => void;
  onEdgeLinkCountChange: (edgeId: string, linkCount: number) => void;
  wireCallbacks: (
    serializedNodes: SerializedGraphNode[],
    serializedEdges: SerializedGraphEdge[],
  ) => { wiredNodes: Node<AppNodeData>[]; wiredEdges: Edge<LinkCountEdgeData>[] };
}

export function useNodeCallbacks({
  setNodes,
  setEdges,
}: UseNodeCallbacksArgs): UseNodeCallbacksResult {
  const onNodeDataUpdate = useCallback(
    (nodeId: string, newData: Partial<UrlNodeData>) => {
      setNodes(
        (nds) => updateNodeData(nds as Node<UrlNodeData>[], nodeId, newData) as Node<AppNodeData>[],
      );
    },
    [setNodes],
  );

  const onNodeZIndexChange = useCallback(
    (nodeId: string, zIndex: number) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId && n.zIndex !== zIndex ? { ...n, zIndex } : n)),
      );
    },
    [setNodes],
  );

  const onRootToggle = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            const newIsRoot = !n.data.isRoot;
            return { ...n, data: { ...n.data, isRoot: newIsRoot } };
          }
          if (n.data.isRoot) {
            return { ...n, data: { ...n.data, isRoot: false } };
          }
          return n;
        }),
      );
    },
    [setNodes],
  );

  const onEdgeLinkCountChange = useCallback(
    (edgeId: string, linkCount: number) => {
      setEdges((eds) => updateEdgeLinkCount(eds, edgeId, linkCount));
    },
    [setEdges],
  );

  const addNode = useCallback(
    (position: { x: number; y: number }) => {
      const newNode = createDefaultNode(position);
      setNodes((nds) =>
        nds.concat({
          ...newNode,
          data: {
            ...newNode.data,
            onUpdate: onNodeDataUpdate,
            onRootToggle,
            onZIndexChange: onNodeZIndexChange,
          },
        }),
      );
    },
    [onNodeDataUpdate, onRootToggle, onNodeZIndexChange, setNodes],
  );

  const wireCallbacks = useCallback(
    (
      serializedNodes: SerializedGraphNode[],
      serializedEdges: SerializedGraphEdge[],
    ): { wiredNodes: Node<AppNodeData>[]; wiredEdges: Edge<LinkCountEdgeData>[] } => {
      const wiredNodes: Node<AppNodeData>[] = serializedNodes.map((n) => ({
        ...n,
        type: n.type ?? "urlNode",
        data: {
          urlTemplate: n.data.urlTemplate,
          pageCount: n.data.pageCount,
          ...(n.data.isGlobal != null && { isGlobal: n.data.isGlobal }),
          ...(n.data.placements != null && { placements: n.data.placements }),
          ...(n.data.isRoot != null && { isRoot: n.data.isRoot }),
          ...(n.data.tags?.length && { tags: n.data.tags }),
          onUpdate: onNodeDataUpdate,
          onRootToggle,
          onZIndexChange: onNodeZIndexChange,
        },
      }));
      const wiredEdges: Edge<LinkCountEdgeData>[] = serializedEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...(e.sourceHandle !== undefined ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle !== undefined ? { targetHandle: e.targetHandle } : {}),
        type: e.type ?? "linkCountEdge",
        markerEnd: (e.markerEnd as EdgeMarkerType | undefined) ?? {
          type: MarkerType.ArrowClosed,
          color: "#9CA3AF",
        },
        data: { linkCount: e.data?.linkCount ?? 1, onLinkCountChange: onEdgeLinkCountChange },
      }));
      return { wiredNodes, wiredEdges };
    },
    [onNodeDataUpdate, onRootToggle, onNodeZIndexChange, onEdgeLinkCountChange],
  );

  return {
    onNodeDataUpdate,
    onNodeZIndexChange,
    onRootToggle,
    addNode,
    onEdgeLinkCountChange,
    wireCallbacks,
  };
}
