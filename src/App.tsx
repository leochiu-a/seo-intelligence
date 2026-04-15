import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { UrlNode } from './components/UrlNode';
import { LinkCountEdge } from './components/LinkCountEdge';
import { Toolbar } from './components/Toolbar';
import { ScoreSidebar } from './components/ScoreSidebar';
import { FilterPanel } from './components/FilterPanel';
import { ImportDialog } from './components/ImportDialog';
import { useFilterState } from './hooks/useFilterState';
import {
  createDefaultNode,
  updateNodeData,
  updateEdgeLinkCount,
  calculatePageRank,
  classifyScoreTier,
  identifyWeakNodes,
  parseImportJson,
  getClosestHandleIds,
  type UrlNodeData,
  type LinkCountEdgeData,
  type ScoreTier,
  type Placement,
} from './lib/graph-utils';

// Extended node data type that includes the update callback for EditPopover wiring
// and score fields for dynamic visual rendering
interface AppNodeData extends UrlNodeData {
  onUpdate: (id: string, data: Partial<UrlNodeData>) => void;
  onZIndexChange: (id: string, zIndex: number) => void;
  scoreTier?: ScoreTier;
  isWeak?: boolean;
}

// Define nodeTypes and edgeTypes outside the component to avoid infinite re-renders (React Flow docs requirement)
const nodeTypes = { urlNode: UrlNode };
const edgeTypes = { linkCountEdge: LinkCountEdge };

const STORAGE_KEY = 'seo-planner-graph';

/** Strips runtime-only fields before writing to localStorage */
function serializeGraph(
  nodes: Node<AppNodeData>[],
  edges: Edge[],
): { nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: { urlTemplate: string; pageCount: number; isGlobal?: boolean; placements?: Placement[] } }>; edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; type?: string; markerEnd?: unknown; data: { linkCount: number } }> } {
  return {
    nodes: nodes.map(({ id, type, position, data: { urlTemplate, pageCount, isGlobal, placements } }) => ({
      id,
      type,
      position,
      data: { urlTemplate, pageCount, ...(isGlobal && { isGlobal }), ...(placements?.length && { placements }) },
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

  const addNode = useCallback(
    (position: { x: number; y: number }) => {
      const newNode = createDefaultNode(position);
      setNodes((nds) =>
        nds.concat({
          ...newNode,
          data: { ...newNode.data, onUpdate: onNodeDataUpdate, onZIndexChange: onNodeZIndexChange },
        }),
      );
    },
    [onNodeDataUpdate, onNodeZIndexChange, setNodes],
  );

  const onEdgeLinkCountChange = useCallback(
    (edgeId: string, linkCount: number) => {
      setEdges((eds) => updateEdgeLinkCount(eds, edgeId, linkCount));
    },
    [setEdges],
  );

  const handleImportFromDialog = useCallback(
    (importedNodes: Node<UrlNodeData>[], importedEdges: Edge<LinkCountEdgeData>[]) => {
      // Wire runtime callbacks into imported data (same pattern as onDrop handler)
      const wiredNodes = importedNodes.map((n) => ({
        ...n,
        data: { ...n.data, onUpdate: onNodeDataUpdate, onZIndexChange: onNodeZIndexChange },
      }));
      const wiredEdges = importedEdges.map((edge) => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
        data: { ...edge.data, onLinkCountChange: onEdgeLinkCountChange },
      }));
      setNodes(wiredNodes as Node<AppNodeData>[]);
      setEdges(wiredEdges);
    },
    [onNodeDataUpdate, onNodeZIndexChange, onEdgeLinkCountChange, setNodes, setEdges],
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
              data: { ...n.data, onUpdate: onNodeDataUpdate, onZIndexChange: onNodeZIndexChange },
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
    [reactFlowInstance, addNode, setNodes, setEdges, onNodeDataUpdate, onNodeZIndexChange, onEdgeLinkCountChange],
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

  // Enrich nodes with score tier and weak flag for UrlNode rendering
  const enrichedNodes = useMemo(() => {
    return nodes.map((node) => {
      const score = scores.get(node.id) ?? 0;
      const scoreTier = classifyScoreTier(score, allScoreValues);
      const isWeak = weakNodes.has(node.id);
      // Only create new object if score data changed
      if (node.data.scoreTier === scoreTier && node.data.isWeak === isWeak) {
        return node;
      }
      return {
        ...node,
        data: { ...node.data, scoreTier, isWeak },
      };
    });
  }, [nodes, scores, weakNodes, allScoreValues]);

  // Derive highlighted node IDs from active filter keys
  const highlightedNodeIds = useMemo(() => {
    if (activeFilters.size === 0) return null; // null means "no filtering active"

    const ids = new Set<string>();
    for (const key of activeFilters) {
      if (key.startsWith('placement-name:')) {
        // "placement-name:{name}" — highlight all global nodes carrying that placement name
        const name = key.slice('placement-name:'.length);
        for (const node of nodes) {
          if (
            node.data.isGlobal &&
            node.data.placements?.some((p) => p.name === name)
          ) {
            ids.add(node.id);
          }
        }
      }
    }
    return ids;
  }, [activeFilters, nodes]);

  // Apply opacity styles based on active filters
  const styledNodes = useMemo(() => {
    if (highlightedNodeIds === null) {
      // No filter active: strip any leftover opacity style
      return enrichedNodes.map((node) =>
        node.style?.opacity != null
          ? { ...node, style: { ...node.style, opacity: undefined } }
          : node,
      );
    }
    return enrichedNodes.map((node) => {
      const isHighlighted = highlightedNodeIds.has(node.id);
      const targetOpacity = isHighlighted ? 1 : 0.2;
      if (node.style?.opacity === targetOpacity) return node;
      return {
        ...node,
        style: {
          ...node.style,
          opacity: targetOpacity,
          ...(isHighlighted ? { filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' } : {}),
        },
      };
    });
  }, [enrichedNodes, highlightedNodeIds]);

  const onExportJson = useCallback(() => {
    const exportData = {
      nodes: nodes.map((n) => ({
        id: n.id,
        urlTemplate: n.data.urlTemplate,
        pageCount: n.data.pageCount,
        ...(n.data.isGlobal && { isGlobal: n.data.isGlobal }),
        ...(n.data.placements?.length && { placements: n.data.placements }),
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
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seo-planner-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, scores]);

  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    localStorage.removeItem(STORAGE_KEY);
  }, [setNodes, setEdges]);

  // Restore graph from localStorage on mount (runs once — empty dep array)
  // Must be defined BEFORE the save effect so React processes restore before save.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // No saved graph: empty canvas is already in place via initialNodes/initialEdges
      return;
    }
    try {
      const parsed = JSON.parse(saved) as {
        nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: { urlTemplate: string; pageCount: number; isGlobal?: boolean; placements?: Placement[] } }>;
        edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; type?: string; markerEnd?: unknown; data: { linkCount: number } }>;
      };
      const restoredNodes: Node<AppNodeData>[] = parsed.nodes.map((n) => ({
        ...n,
        type: n.type ?? 'urlNode',
        data: {
          urlTemplate: n.data.urlTemplate,
          pageCount: n.data.pageCount,
          ...(n.data.isGlobal != null && { isGlobal: n.data.isGlobal }),
          ...(n.data.placements != null && { placements: n.data.placements }),
          onUpdate: onNodeDataUpdate,
          onZIndexChange: onNodeZIndexChange,
        },
      }));
      const restoredEdges: Edge[] = parsed.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...(e.sourceHandle != null ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle != null ? { targetHandle: e.targetHandle } : {}),
        type: e.type ?? 'linkCountEdge',
        markerEnd: (e.markerEnd as import('reactflow').EdgeMarkerType | undefined) ?? { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
        data: {
          linkCount: e.data?.linkCount ?? 1,
          onLinkCountChange: onEdgeLinkCountChange,
        },
      }));
      setNodes(restoredNodes);
      setEdges(restoredEdges);
    } catch {
      // Corrupt data: fall back to empty canvas already in place
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save graph to localStorage on every change (skips the very first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeGraph(nodes, edges)));
  }, [nodes, edges]);

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-dark">
      <Toolbar onAddNode={onAddNode} onImportJson={() => setShowImportDialog(true)} onExportJson={onExportJson} onClearCanvas={handleClearCanvas} isEmpty={nodes.length === 0} />
      <div className="flex flex-1 overflow-hidden">
        <FilterPanel
          nodes={nodes}
          activeFilters={activeFilters}
          onToggle={toggleFilter}
          onClear={clearFilters}
        />
        <div className="flex-1" ref={reactFlowWrapper}>
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
        <ScoreSidebar nodes={nodes} scores={scores} weakNodes={weakNodes} />
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
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
