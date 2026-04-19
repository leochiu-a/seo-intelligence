import { useCallback } from "react";
import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import type { UrlNodeData, LinkCountEdgeData } from "../lib/graph-utils";
import type { AppNodeData } from "../App";
import type { UseScenariosResult } from "./useScenarios";
import type { UseNodeCallbacksResult } from "./useNodeCallbacks";

export interface UseScenarioHandlersArgs {
  store: UseScenariosResult["store"];
  nodes: Node<AppNodeData>[];
  edges: Edge<LinkCountEdgeData>[];
  setNodes: Dispatch<SetStateAction<Node<AppNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge<LinkCountEdgeData>[]>>;
  switchScenario: UseScenariosResult["switchScenario"];
  createScenario: UseScenariosResult["createScenario"];
  deleteScenario: UseScenariosResult["deleteScenario"];
  persist: UseScenariosResult["persist"];
  wireCallbacks: UseNodeCallbacksResult["wireCallbacks"];
  onNodeDataUpdate: (id: string, data: Partial<UrlNodeData>) => void;
  onRootToggle: (id: string) => void;
  onNodeZIndexChange: (id: string, z: number) => void;
  onEdgeLinkCountChange: (id: string, c: number) => void;
  isSwitchingRef: MutableRefObject<boolean>;
}

export interface UseScenarioHandlersResult {
  handleSwitchScenario: (targetId: string) => void;
  handleCreateScenario: (mode: "blank" | "clone") => void;
  handleDeleteScenario: (id: string) => void;
  handleImportFromDialog: (nodes: Node<UrlNodeData>[], edges: Edge<LinkCountEdgeData>[]) => void;
}

export function useScenarioHandlers({
  store,
  nodes,
  edges,
  setNodes,
  setEdges,
  switchScenario,
  createScenario,
  deleteScenario,
  persist,
  wireCallbacks,
  onNodeDataUpdate,
  onRootToggle,
  onNodeZIndexChange,
  onEdgeLinkCountChange,
  isSwitchingRef,
}: UseScenarioHandlersArgs): UseScenarioHandlersResult {
  const handleSwitchScenario = useCallback(
    (targetId: string) => {
      if (targetId === store.activeScenarioId) return;
      isSwitchingRef.current = true;
      const target = switchScenario(targetId, nodes, edges);
      if (!target) return;
      const { wiredNodes, wiredEdges } = wireCallbacks(target.nodes, target.edges);
      setNodes(wiredNodes);
      setEdges(wiredEdges);
      persist();
      requestAnimationFrame(() => {
        isSwitchingRef.current = false;
      });
    },
    [
      store.activeScenarioId,
      nodes,
      edges,
      switchScenario,
      wireCallbacks,
      setNodes,
      setEdges,
      persist,
      isSwitchingRef,
    ],
  );

  const handleCreateScenario = useCallback(
    (mode: "blank" | "clone") => {
      isSwitchingRef.current = true;
      const newScenario = createScenario(mode, nodes, edges);
      const { wiredNodes, wiredEdges } = wireCallbacks(newScenario.nodes, newScenario.edges);
      setNodes(wiredNodes);
      setEdges(wiredEdges);
      persist();
      requestAnimationFrame(() => {
        isSwitchingRef.current = false;
      });
    },
    [nodes, edges, createScenario, wireCallbacks, setNodes, setEdges, persist, isSwitchingRef],
  );

  const handleDeleteScenario = useCallback(
    (id: string) => {
      const result = deleteScenario(id);
      if (!result) return; // only one scenario — D-03
      isSwitchingRef.current = true;
      const { wiredNodes, wiredEdges } = wireCallbacks(result.nodes, result.edges);
      setNodes(wiredNodes);
      setEdges(wiredEdges);
      persist();
      requestAnimationFrame(() => {
        isSwitchingRef.current = false;
      });
    },
    [deleteScenario, wireCallbacks, setNodes, setEdges, persist, isSwitchingRef],
  );

  const handleImportFromDialog = useCallback(
    (importedNodes: Node<UrlNodeData>[], importedEdges: Edge<LinkCountEdgeData>[]) => {
      const wiredNodes = importedNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onUpdate: onNodeDataUpdate,
          onRootToggle,
          onZIndexChange: onNodeZIndexChange,
        },
      }));
      const wiredEdges: Edge<LinkCountEdgeData>[] = importedEdges.map((edge) => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#9CA3AF" },
        data: { linkCount: edge.data?.linkCount ?? 1, onLinkCountChange: onEdgeLinkCountChange },
      }));
      setNodes(wiredNodes as Node<AppNodeData>[]);
      setEdges(wiredEdges);
    },
    [onNodeDataUpdate, onRootToggle, onNodeZIndexChange, onEdgeLinkCountChange, setNodes, setEdges],
  );

  return {
    handleSwitchScenario,
    handleCreateScenario,
    handleDeleteScenario,
    handleImportFromDialog,
  };
}
