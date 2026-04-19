import { useCallback } from "react";
import {
  MarkerType,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { Dispatch, SetStateAction } from "react";
import { parseImportJson, getClosestHandleIds, type LinkCountEdgeData } from "../lib/graph-utils";
import type { AppNodeData } from "../App";
import type { UseNodeCallbacksResult } from "./useNodeCallbacks";
import type { SerializedGraphNode, SerializedGraphEdge } from "../lib/serialize-graph";

export interface UseCanvasHandlersArgs {
  reactFlowInstance: ReactFlowInstance<Node<AppNodeData>, Edge<LinkCountEdgeData>> | null;
  addNode: (pos: { x: number; y: number }) => void;
  nodes: Node<AppNodeData>[];
  setNodes: Dispatch<SetStateAction<Node<AppNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge<LinkCountEdgeData>[]>>;
  wireCallbacks: UseNodeCallbacksResult["wireCallbacks"];
  onEdgeLinkCountChange: (id: string, c: number) => void;
}

export interface UseCanvasHandlersResult {
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAddNode: () => void;
  onConnect: (c: Connection) => void;
}

export function useCanvasHandlers({
  reactFlowInstance,
  addNode,
  nodes,
  setNodes,
  setEdges,
  wireCallbacks,
  onEdgeLinkCountChange,
}: UseCanvasHandlersArgs): UseCanvasHandlersResult {
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Handle JSON file import via drag-and-drop
      const file = Array.from(event.dataTransfer.files).find((f) => f.name.endsWith(".json"));
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const { nodes: importedNodes, edges: importedEdges } = parseImportJson(
              e.target?.result as string,
            );
            const { wiredNodes, wiredEdges } = wireCallbacks(
              importedNodes as SerializedGraphNode[],
              importedEdges as SerializedGraphEdge[],
            );
            setNodes(wiredNodes);
            setEdges(wiredEdges);
          } catch {
            // Invalid JSON — silently ignore (file was dropped by mistake)
          }
        };
        reader.readAsText(file);
        return;
      }

      // Handle sidebar node drag onto canvas
      const type = event.dataTransfer.getData("application/reactflow");
      if (type !== "urlNode" || !reactFlowInstance) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(position);
    },
    [reactFlowInstance, addNode, setNodes, setEdges, wireCallbacks],
  );

  const onAddNode = useCallback(() => {
    const position = reactFlowInstance
      ? reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
      : { x: 250, y: 250 };
    addNode(position);
  }, [reactFlowInstance, addNode]);

  const onConnect = useCallback(
    (connection: Connection) => {
      let conn = connection;
      if (!conn.sourceHandle) {
        const sourceNode = nodes.find((n) => n.id === conn.source);
        const targetNode = nodes.find((n) => n.id === conn.target);
        if (sourceNode && targetNode) {
          const handles = getClosestHandleIds(sourceNode.position, targetNode.position);
          conn = { ...conn, ...handles };
        }
      }
      setEdges((eds) =>
        addEdge(
          {
            ...conn,
            type: "linkCountEdge",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#9CA3AF" },
            data: { linkCount: 1, onLinkCountChange: onEdgeLinkCountChange },
          },
          eds,
        ),
      );
    },
    [nodes, setEdges, onEdgeLinkCountChange],
  );

  return { onDragOver, onDrop, onAddNode, onConnect };
}
