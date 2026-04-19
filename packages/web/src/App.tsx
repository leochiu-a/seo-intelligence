import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ConnectionMode,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UrlNode } from './components/UrlNode';
import { LinkCountEdge } from './components/LinkCountEdge';
import { Toolbar } from './components/Toolbar';
import { ScenarioTabBar } from './components/ScenarioTabBar';
import { ScoreSidebar } from './components/ScoreSidebar';
import { FilterPanel } from './components/FilterPanel';
import { ImportDialog } from './components/ImportDialog';
import { TooltipProvider } from './components/ui/tooltip';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable';
import { useFilterState } from './hooks/useFilterState';
import { useScenarios } from './hooks/useScenarios';
import {
  createDefaultNode,
  updateNodeData,
  updateEdgeLinkCount,
  calculatePageRank,
  classifyScoreTier,
  identifyWeakNodes,
  parseImportJson,
  getClosestHandleIds,
  calculateCrawlDepth,
  identifyOrphanNodes,
  calculateOutboundLinks,
  OUTBOUND_WARNING_THRESHOLD,
  type UrlNodeData,
  type LinkCountEdgeData,
  type ScoreTier,
  type Placement,
} from './lib/graph-utils';

// Extended node data type that includes the update callback for EditPopover wiring
// and score fields for dynamic visual rendering
interface AppNodeData extends UrlNodeData {
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
}

// Define nodeTypes and edgeTypes outside the component to avoid infinite re-renders (React Flow docs requirement)
const nodeTypes = { urlNode: UrlNode };
const edgeTypes = { linkCountEdge: LinkCountEdge };

/** Strips runtime-only fields before writing to localStorage */
function serializeGraph(
  nodes: Node<AppNodeData>[],
  edges: Edge[],
): { nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: { urlTemplate: string; pageCount: number; isGlobal?: boolean; placements?: Placement[]; isRoot?: boolean; tags?: string[] } }>; edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; type?: string; markerEnd?: unknown; data: { linkCount: number } }> } {
  return {
    nodes: nodes.map(({ id, type, position, data: { urlTemplate, pageCount, isGlobal, placements, isRoot, tags } }) => ({
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
    })),
    edges: edges.map(({ id, source, target, sourceHandle, targetHandle, type, markerEnd, data }) => ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type,
      markerEnd,
      data: { linkCount: (data as { linkCount?: number })?.linkCount ?? 1 },
    })),
  };
}

const initialNodes: Node<AppNodeData>[] = [];
const initialEdges: Edge[] = [];

function AppInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
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
  const activeScenario = store.scenarios.find((s) => s.id === store.activeScenarioId) ?? store.scenarios[0];

  const { activeFilters, toggle: toggleFilter, clear: clearFilters } = useFilterState();

  // Use a ref to hold the stable update callback so nodes don't need to be re-mapped
  const onNodeDataUpdate = useCallback(
    (nodeId: string, newData: Partial<UrlNodeData>) => {
      // updateNodeData from graph-utils handles the immutable update
      setNodes((nds) => updateNodeData(nds as Node<UrlNodeData>[], nodeId, newData) as Node<AppNodeData>[]);
    },
    [setNodes],
  );

  // Route node.zIndex updates through the same setNodes used for data updates.
  // This prevents a race where UrlNode's zIndex effect (previously using
  // useReactFlow().setNodes) read a stale nodes snapshot and clobbered freshly
  // saved data from EditPopover's Confirm handler.
  const onNodeZIndexChange = useCallback(
    (nodeId: string, zIndex: number) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId && n.zIndex !== zIndex ? { ...n, zIndex } : n)),
      );
    },
    [setNodes],
  );

  // onRootToggle ensures only one node is root at a time (exclusive root designation)
  const onRootToggle = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            // Toggle this node's root status
            const newIsRoot = !n.data.isRoot;
            return { ...n, data: { ...n.data, isRoot: newIsRoot } };
          }
          // Clear root from all other nodes
          if (n.data.isRoot) {
            return { ...n, data: { ...n.data, isRoot: false } };
          }
          return n;
        }),
      );
    },
    [setNodes],
  );

  const addNode = useCallback(
    (position: { x: number; y: number }) => {
      const newNode = createDefaultNode(position);
      setNodes((nds) =>
        nds.concat({
          ...newNode,
          data: { ...newNode.data, onUpdate: onNodeDataUpdate, onRootToggle, onZIndexChange: onNodeZIndexChange },
        }),
      );
    },
    [onNodeDataUpdate, onRootToggle, onNodeZIndexChange, setNodes],
  );

  const onEdgeLinkCountChange = useCallback(
    (edgeId: string, linkCount: number) => {
      setEdges((eds) => updateEdgeLinkCount(eds, edgeId, linkCount));
    },
    [setEdges],
  );

  // Helper: re-attach runtime callbacks onto serialized nodes/edges from a scenario record
  const wireCallbacks = useCallback(
    (
      serializedNodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: { urlTemplate: string; pageCount: number; isGlobal?: boolean; placements?: Placement[]; isRoot?: boolean; tags?: string[] } }>,
      serializedEdges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; type?: string; markerEnd?: unknown; data: { linkCount: number } }>,
    ): { wiredNodes: Node<AppNodeData>[]; wiredEdges: Edge[] } => {
      const wiredNodes: Node<AppNodeData>[] = serializedNodes.map((n) => ({
        ...n,
        type: n.type ?? 'urlNode',
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
      const wiredEdges: Edge[] = serializedEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...(e.sourceHandle != null ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle != null ? { targetHandle: e.targetHandle } : {}),
        type: e.type ?? 'linkCountEdge',
        markerEnd: (e.markerEnd as import('reactflow').EdgeMarkerType | undefined) ?? { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
        data: { linkCount: e.data?.linkCount ?? 1, onLinkCountChange: onEdgeLinkCountChange },
      }));
      return { wiredNodes, wiredEdges };
    },
    [onNodeDataUpdate, onRootToggle, onNodeZIndexChange, onEdgeLinkCountChange],
  );

  // Scenario switch handler
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
      requestAnimationFrame(() => { isSwitchingRef.current = false; });
    },
    [store.activeScenarioId, nodes, edges, switchScenario, wireCallbacks, setNodes, setEdges, persist],
  );

  // Scenario create handler
  const handleCreateScenario = useCallback(
    (mode: 'blank' | 'clone') => {
      isSwitchingRef.current = true;
      const newScenario = createScenario(mode, nodes, edges);
      const { wiredNodes, wiredEdges } = wireCallbacks(newScenario.nodes, newScenario.edges);
      setNodes(wiredNodes);
      setEdges(wiredEdges);
      persist();
      requestAnimationFrame(() => { isSwitchingRef.current = false; });
    },
    [nodes, edges, createScenario, wireCallbacks, setNodes, setEdges, persist],
  );

  // Scenario delete handler
  const handleDeleteScenario = useCallback(
    (id: string) => {
      const result = deleteScenario(id);
      if (!result) return; // only one scenario — D-03
      isSwitchingRef.current = true;
      const { wiredNodes, wiredEdges } = wireCallbacks(result.nodes, result.edges);
      setNodes(wiredNodes);
      setEdges(wiredEdges);
      persist();
      requestAnimationFrame(() => { isSwitchingRef.current = false; });
    },
    [deleteScenario, wireCallbacks, setNodes, setEdges, persist],
  );

  const handleImportFromDialog = useCallback(
    (importedNodes: Node<UrlNodeData>[], importedEdges: Edge<LinkCountEdgeData>[]) => {
      // Wire runtime callbacks into imported data (same pattern as onDrop handler)
      const wiredNodes = importedNodes.map((n) => ({
        ...n,
        data: { ...n.data, onUpdate: onNodeDataUpdate, onRootToggle, onZIndexChange: onNodeZIndexChange },
      }));
      const wiredEdges = importedEdges.map((edge) => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
        data: { ...edge.data, onLinkCountChange: onEdgeLinkCountChange },
      }));
      setNodes(wiredNodes as Node<AppNodeData>[]);
      setEdges(wiredEdges);
    },
    [onNodeDataUpdate, onRootToggle, onNodeZIndexChange, onEdgeLinkCountChange, setNodes, setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Handle JSON file import via drag-and-drop
      const file = Array.from(event.dataTransfer.files).find((f) =>
        f.name.endsWith('.json'),
      );
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const { nodes: importedNodes, edges: importedEdges } = parseImportJson(
              e.target?.result as string,
            );
            // Wire runtime callbacks into edges before setting state
            const wiredEdges = importedEdges.map((edge) => ({
              ...edge,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
              data: { ...edge.data, onLinkCountChange: onEdgeLinkCountChange },
            }));
            setNodes(importedNodes.map((n) => ({
              ...n,
              data: { ...n.data, onUpdate: onNodeDataUpdate, onRootToggle, onZIndexChange: onNodeZIndexChange },
            })));
            setEdges(wiredEdges);
          } catch {
            // Invalid JSON — silently ignore (file was dropped by mistake)
          }
        };
        reader.readAsText(file);
        return;
      }

      // Handle sidebar node drag onto canvas
      const type = event.dataTransfer.getData('application/reactflow');
      if (type !== 'urlNode' || !reactFlowInstance) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(position);
    },
    [reactFlowInstance, addNode, setNodes, setEdges, onNodeDataUpdate, onRootToggle, onNodeZIndexChange, onEdgeLinkCountChange],
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
            type: 'linkCountEdge',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
            data: { linkCount: 1, onLinkCountChange: onEdgeLinkCountChange },
          },
          eds,
        ),
      );
    },
    [nodes, setEdges, onEdgeLinkCountChange],
  );

  // Recalculate scores on every graph change (per D-13, SCORE-02)
  const scores = useMemo(
    () => calculatePageRank(nodes, edges),
    [nodes, edges],
  );

  const weakNodes = useMemo(
    () => identifyWeakNodes(scores),
    [scores],
  );

  const allScoreValues = useMemo(
    () => [...scores.values()],
    [scores],
  );

  // Derive root node ID from nodes state
  const rootId = useMemo(
    () => nodes.find((n) => n.data.isRoot)?.id ?? null,
    [nodes],
  );

  // Compute crawl depth map using BFS from root
  const depthMap = useMemo(
    () => calculateCrawlDepth(nodes, edges, rootId),
    [nodes, edges, rootId],
  );

  // Identify orphan nodes (zero inbound, excluding root)
  const orphanNodes = useMemo(
    () => identifyOrphanNodes(nodes, edges, rootId),
    [nodes, edges, rootId],
  );

  // Identify unreachable nodes (have depth = Infinity in depthMap)
  const unreachableNodes = useMemo(() => {
    const set = new Set<string>();
    for (const [id, depth] of depthMap) {
      if (depth === Infinity) set.add(id);
    }
    return set;
  }, [depthMap]);

  // Compute total outbound links per node (explicit edges + implicit global contribution).
  // Global source nodes contribute 0 implicit per Phase 4 D-01 parity.
  const outboundMap = useMemo(
    () => calculateOutboundLinks(nodes, edges),
    [nodes, edges],
  );

  // Enrich nodes with score tier, weak flag, and crawl depth/orphan fields for UrlNode rendering
  const enrichedNodes = useMemo(() => {
    return nodes.map((node) => {
      const score = scores.get(node.id) ?? 0;
      const scoreTier = classifyScoreTier(score, allScoreValues);
      const isWeak = weakNodes.has(node.id);
      const isOrphan = orphanNodes.has(node.id);
      const isUnreachable = unreachableNodes.has(node.id);
      const crawlDepth = depthMap.get(node.id);
      const outboundCount = outboundMap.get(node.id) ?? 0;
      const isOverLinked = outboundCount > OUTBOUND_WARNING_THRESHOLD;
      // Only create new object if any enriched data changed
      if (
        node.data.scoreTier === scoreTier &&
        node.data.isWeak === isWeak &&
        node.data.isOrphan === isOrphan &&
        node.data.isUnreachable === isUnreachable &&
        node.data.crawlDepth === crawlDepth &&
        node.data.outboundCount === outboundCount &&
        node.data.isOverLinked === isOverLinked
      ) {
        return node;
      }
      // Tags, placements, isGlobal, isRoot ride through via ...node.data spread (Phase 999.5 D-17).
      return {
        ...node,
        data: {
          ...node.data,
          scoreTier,
          isWeak,
          isOrphan,
          isUnreachable,
          crawlDepth,
          outboundCount,
          isOverLinked,
        },
      };
    });
  }, [nodes, scores, weakNodes, allScoreValues, orphanNodes, unreachableNodes, depthMap, outboundMap]);

  // Derive highlighted node IDs from active filter keys (AND-combine across dimensions)
  const highlightedNodeIds = useMemo(() => {
    const placementKeys = [...activeFilters].filter((k) => k.startsWith('placement-name:'));
    const clusterKeys = [...activeFilters].filter((k) => k.startsWith('cluster:'));
    if (placementKeys.length === 0 && clusterKeys.length === 0) return null;

    const placementMatches = new Set<string>();
    for (const key of placementKeys) {
      const name = key.slice('placement-name:'.length);
      for (const node of nodes) {
        if (node.data.isGlobal && node.data.placements?.some((p) => p.name === name)) {
          placementMatches.add(node.id);
        }
      }
    }

    const clusterMatches = new Set<string>();
    for (const key of clusterKeys) {
      const tag = key.slice('cluster:'.length);
      for (const node of nodes) {
        if (node.data.tags?.includes(tag)) {
          clusterMatches.add(node.id);
        }
      }
    }

    if (placementKeys.length > 0 && clusterKeys.length > 0) {
      return new Set([...placementMatches].filter((id) => clusterMatches.has(id)));
    }
    if (placementKeys.length > 0) return placementMatches;
    return clusterMatches;
  }, [activeFilters, nodes]);

  // Apply dim flag based on active filters (stripe persists via sibling DOM structure in UrlNode)
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
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seo-planner-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, scores, depthMap, outboundMap]);

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
      <Toolbar onAddNode={onAddNode} onImportJson={() => setShowImportDialog(true)} onExportJson={onExportJson} onClearCanvas={handleClearCanvas} isEmpty={nodes.length === 0} />
      <ScenarioTabBar
        scenarios={store.scenarios}
        activeId={store.activeScenarioId}
        onSwitch={handleSwitchScenario}
        onAdd={handleCreateScenario}
        onRename={(id, name) => { renameScenario(id, name); persist(); }}
        onDelete={handleDeleteScenario}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize="17%" minSize="10%" maxSize="35%">
          <FilterPanel
            nodes={nodes}
            activeFilters={activeFilters}
            onToggle={toggleFilter}
            onClear={clearFilters}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize="63%" minSize="30%">
          <div className="h-full" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={styledNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              connectionMode={ConnectionMode.Loose}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.3}
              style={{ background: 'var(--color-canvas)' }}
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
                  background: '#ffffff',
                  border: '1px solid var(--color-border)',
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
                      Drag a URL Node from the left panel onto the canvas, then connect nodes to model
                      how pages link to each other.
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

        <ResizableHandle />

        <ResizablePanel defaultSize="20%" minSize="10%" maxSize="40%">
          <ScoreSidebar
            nodes={nodes}
            scores={scores}
            weakNodes={weakNodes}
            orphanNodes={orphanNodes}
            unreachableNodes={unreachableNodes}
            depthMap={depthMap}
            outboundMap={outboundMap}
            rootId={rootId}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportFromDialog}
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
