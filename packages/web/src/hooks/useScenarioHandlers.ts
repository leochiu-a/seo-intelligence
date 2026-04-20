import { useCallback } from "react";
import { type Node, type Edge } from "@xyflow/react";
import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import { syncNodeIdCounter, type UrlNodeData, type LinkCountEdgeData } from "../lib/graph-utils";
import type { AppNodeData } from "../App";
import type { UseScenariosResult } from "./useScenarios";
import type { UseNodeCallbacksResult } from "./useNodeCallbacks";
import type { SerializedGraphNode, SerializedGraphEdge } from "../lib/serialize-graph";

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
  isSwitchingRef,
}: UseScenarioHandlersArgs): UseScenarioHandlersResult {
  const handleSwitchScenario = useCallback(
    (targetId: string) => {
      if (targetId === store.activeScenarioId) return;
      isSwitchingRef.current = true;
      const target = switchScenario(targetId, nodes, edges);
      if (!target) return;
      const { wiredNodes, wiredEdges } = wireCallbacks(target.nodes, target.edges);
      syncNodeIdCounter(wiredNodes);
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
      syncNodeIdCounter(wiredNodes);
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
      syncNodeIdCounter(wiredNodes);
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
      const { wiredNodes, wiredEdges } = wireCallbacks(
        importedNodes as SerializedGraphNode[],
        importedEdges as SerializedGraphEdge[],
      );
      syncNodeIdCounter(wiredNodes);
      setNodes(wiredNodes);
      setEdges(wiredEdges);
    },
    [wireCallbacks, setNodes, setEdges],
  );

  return {
    handleSwitchScenario,
    handleCreateScenario,
    handleDeleteScenario,
    handleImportFromDialog,
  };
}
