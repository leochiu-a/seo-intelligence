import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ConnectionMode,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { UrlNode } from "./components/UrlNode";
import { LinkCountEdge } from "./components/LinkCountEdge";
import { Toolbar } from "./components/Toolbar";
import { ScenarioTabBar } from "./components/ScenarioTabBar";
import { SidePanel } from "./components/SidePanel";
import { CopyForAIDialog } from "./components/CopyForAIDialog";
import { ImportDialog } from "./components/ImportDialog";
import { LegendDialog } from "./components/LegendDialog";
import { TooltipProvider } from "./components/ui/tooltip";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";
import { useFilterState } from "./hooks/useFilterState";
import { useScenarios } from "./hooks/useScenarios";
import { useGraphAnalytics } from "./hooks/useGraphAnalytics";
import { useHighlightedNodes } from "./hooks/useHighlightedNodes";
import { useDialogState } from "./hooks/useDialogState";
import { useNodeCallbacks } from "./hooks/useNodeCallbacks";
import { useScenarioHandlers } from "./hooks/useScenarioHandlers";
import { useCanvasHandlers } from "./hooks/useCanvasHandlers";
import {
  buildCopyForAIText,
  type UrlNodeData,
  type LinkCountEdgeData,
  type ScoreTier,
} from "./lib/graph-utils";
import { serializeGraph } from "./lib/serialize-graph";

// Extended node data type that includes the update callback for EditPopover wiring
// and score fields for dynamic visual rendering
export type AppNodeData = UrlNodeData & {
  onUpdate: (id: string, data: Partial<UrlNodeData>) => void;
  onRootToggle: (id: string) => void;
  onZIndexChange: (id: string, zIndex: number) => void;
  scoreTier?: ScoreTier;
  isWeak?: boolean;
  isOrphan?: boolean;
  isUnreachable?: boolean;
  crawlDepth?: number;
  outboundCount?: number;
  isOverLinked?: boolean;
  isDimmed?: boolean;
};

// Define nodeTypes and edgeTypes outside the component to avoid infinite re-renders (React Flow docs requirement)
const nodeTypes = { urlNode: UrlNode };
const edgeTypes = { linkCountEdge: LinkCountEdge };

const initialNodes: Node<AppNodeData>[] = [];
const initialEdges: Edge<LinkCountEdgeData>[] = [];

function AppInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AppNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<LinkCountEdgeData>>(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    Node<AppNodeData>,
    Edge<LinkCountEdgeData>
  > | null>(null);
  const {
    showImportDialog,
    setShowImportDialog,
    showLegendDialog,
    setShowLegendDialog,
    showCopyForAIDialog,
    setShowCopyForAIDialog,
  } = useDialogState();
  // Guard: save effect skips its first invocation (regardless of restore timing), then saves on all subsequent renders
  const isFirstRender = useRef(true);
  // Guard: suppresses save effect during scenario switch to prevent corrupt writes
  const isSwitchingRef = useRef(false);

  const {
    store,
    createScenario,
    switchScenario,
    renameScenario,
    deleteScenario,
    persist,
    updateActiveGraph,
  } = useScenarios();

  // Derive active scenario from store
  const activeScenario =
    store.scenarios.find((s) => s.id === store.activeScenarioId) ?? store.scenarios[0];

  const { activeFilters, toggle: toggleFilter, clear: clearFilters } = useFilterState();

  // Route-highlight state: ID of the focal node whose neighbourhood is highlighted.
  // null = no route highlight active.
  const [highlightedRouteNodeId, setHighlightedRouteNodeId] = useState<string | null>(null);

  const handleNodeHighlight = useCallback((id: string | null) => {
    setHighlightedRouteNodeId((prev) => (prev === id ? null : id));
  }, []);

  const clearRouteHighlight = useCallback(() => {
    setHighlightedRouteNodeId(null);
  }, []);

  const { addNode, wireCallbacks, onEdgeLinkCountChange } = useNodeCallbacks({
    setNodes,
    setEdges,
  });

  const {
    handleSwitchScenario,
    handleCreateScenario,
    handleDeleteScenario,
    handleImportFromDialog,
  } = useScenarioHandlers({
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
  });

  const { onDragOver, onDrop, onAddNode, onConnect } = useCanvasHandlers({
    reactFlowInstance,
    addNode,
    nodes,
    setNodes,
    setEdges,
    wireCallbacks,
    onEdgeLinkCountChange,
  });

  const {
    scores,
    weakNodes,
    allScoreValues,
    rootId,
    depthMap,
    orphanNodes,
    unreachableNodes,
    outboundMap,
    enrichedNodes,
  } = useGraphAnalytics(nodes, edges);

  const { styledNodes } = useHighlightedNodes(
    enrichedNodes,
    edges,
    activeFilters,
    highlightedRouteNodeId,
  );

  const onExportJson = useCallback(() => {
    const exportData = {
      nodes: nodes.map((n) => ({
        id: n.id,
        urlTemplate: n.data.urlTemplate,
        pageCount: n.data.pageCount,
        ...(n.data.isGlobal && { isGlobal: n.data.isGlobal }),
        ...(n.data.isRoot && { isRoot: n.data.isRoot }),
        ...(n.data.placements?.length && { placements: n.data.placements }),
        ...(n.data.tags?.length && { tags: n.data.tags }),
        x: n.position.x,
        y: n.position.y,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        linkCount: (e.data as LinkCountEdgeData)?.linkCount ?? 1,
      })),
      scores: Object.fromEntries(scores),
      depthMap: Object.fromEntries(depthMap),
      outboundMap: Object.fromEntries(outboundMap),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seo-planner-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, scores, depthMap, outboundMap]);

  const [copyForAIText, setCopyForAIText] = useState("");

  const onCopyForAI = useCallback(() => {
    const text = buildCopyForAIText({
      nodes: nodes.map((n) => ({ id: n.id, data: n.data })),
      edges: edges.map((e) => ({
        source: e.source,
        target: e.target,
        data: { linkCount: (e.data as LinkCountEdgeData | undefined)?.linkCount ?? 1 },
      })),
      scores,
      allScoreValues,
      depthMap,
      outboundMap,
    });
    setCopyForAIText(text);
    setShowCopyForAIDialog(true);
  }, [nodes, edges, scores, allScoreValues, depthMap, outboundMap]);

  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    // Save effect will write empty graph to active scenario via updateActiveGraph + persist
  }, [setNodes, setEdges]);

  // Restore active scenario from useScenarios store on mount (runs once)
  // Must be defined BEFORE the save effect so React processes restore before save.
  useEffect(() => {
    if (activeScenario.nodes.length === 0 && activeScenario.edges.length === 0) return;
    const { wiredNodes, wiredEdges } = wireCallbacks(activeScenario.nodes, activeScenario.edges);
    setNodes(wiredNodes);
    setEdges(wiredEdges);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save graph to active scenario on every change (skips the very first render, skips during switch)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isSwitchingRef.current) return; // suppress save during scenario switch
    const serialized = serializeGraph(nodes, edges);
    updateActiveGraph(serialized.nodes, serialized.edges);
    persist();
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-dark">
      <Toolbar
        onAddNode={onAddNode}
        onImportJson={() => setShowImportDialog(true)}
        onExportJson={onExportJson}
        onCopyForAI={onCopyForAI}
        onClearCanvas={handleClearCanvas}
        isEmpty={nodes.length === 0}
        onLegendOpen={() => setShowLegendDialog(true)}
      />
      <ScenarioTabBar
        scenarios={store.scenarios}
        activeId={store.activeScenarioId}
        onSwitch={handleSwitchScenario}
        onAdd={handleCreateScenario}
        onRename={(id, name) => {
          renameScenario(id, name);
          persist();
        }}
        onDelete={handleDeleteScenario}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel defaultSize="20%" minSize="15%" maxSize="40%">
            <SidePanel
              nodes={nodes}
              scores={scores}
              weakNodes={weakNodes}
              orphanNodes={orphanNodes}
              unreachableNodes={unreachableNodes}
              depthMap={depthMap}
              outboundMap={outboundMap}
              rootId={rootId}
              onNodeHighlight={handleNodeHighlight}
              activeFilters={activeFilters}
              onFilterToggle={toggleFilter}
              onFilterClear={clearFilters}
            />
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize="80%" minSize="50%">
            <div className="h-full" ref={reactFlowWrapper}>
              <ReactFlow<Node<AppNodeData>, Edge<LinkCountEdgeData>>
                nodes={styledNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_e, node) => handleNodeHighlight(node.id)}
                onPaneClick={clearRouteHighlight}
                connectionMode={ConnectionMode.Loose}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                deleteKeyCode={["Backspace", "Delete"]}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                minZoom={0.3}
                style={{ background: "var(--color-canvas)" }}
              >
                <Background
                  color="var(--color-border)"
                  variant={BackgroundVariant.Dots}
                  gap={28}
                  size={1.5}
                />
                <Controls
                  showInteractive={false}
                  orientation="horizontal"
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    padding: 4,
                  }}
                />
                <MiniMap />
                {nodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-muted-fg">
                        Start mapping your link structure
                      </p>
                      <p className="text-sm text-muted-fg mt-2 max-w-sm">
                        Use Add Node above or drag a URL Node onto the canvas, then connect nodes to
                        model how pages link to each other.
                      </p>
                      <p className="text-xs text-muted-fg mt-1">
                        Or use Add Node above to place a node at canvas center.
                      </p>
                    </div>
                  </div>
                )}
              </ReactFlow>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportFromDialog}
      />
      <LegendDialog open={showLegendDialog} onClose={() => setShowLegendDialog(false)} />
      <CopyForAIDialog
        open={showCopyForAIDialog}
        onClose={() => setShowCopyForAIDialog(false)}
        text={copyForAIText}
      />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <AppInner />
      </ReactFlowProvider>
    </TooltipProvider>
  );
}
