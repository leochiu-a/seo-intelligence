import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
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
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { ScoreSidebar } from './components/ScoreSidebar';
import {
  createDefaultNode,
  updateNodeData,
  updateEdgeLinkCount,
  calculatePageRank,
  classifyScoreTier,
  identifyWeakNodes,
  parseImportJson,
  type UrlNodeData,
  type LinkCountEdgeData,
  type ScoreTier,
} from './lib/graph-utils';

// Extended node data type that includes the update callback for EditPopover wiring
// and score fields for dynamic visual rendering
interface AppNodeData extends UrlNodeData {
  onUpdate: (id: string, data: Partial<UrlNodeData>) => void;
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
): { nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: { urlTemplate: string; pageCount: number } }>; edges: Array<{ id: string; source: string; target: string; type?: string; markerEnd?: unknown; data: { linkCount: number } }> } {
  return {
    nodes: nodes.map(({ id, type, position, data: { urlTemplate, pageCount } }) => ({
      id,
      type,
      position,
      data: { urlTemplate, pageCount },
    })),
    edges: edges.map(({ id, source, target, type, markerEnd, data }) => ({
      id,
      source,
      target,
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
  // Guard: prevents save effect from overwriting localStorage during the initial restore frame
  const isRestoring = useRef(true);

  // Use a ref to hold the stable update callback so nodes don't need to be re-mapped
  const onNodeDataUpdate = useCallback(
    (nodeId: string, newData: Partial<UrlNodeData>) => {
      // updateNodeData from graph-utils handles the immutable update
      setNodes((nds) => updateNodeData(nds as Node<UrlNodeData>[], nodeId, newData) as Node<AppNodeData>[]);
    },
    [setNodes],
  );

  const addNode = useCallback(
    (position: { x: number; y: number }) => {
      const newNode = createDefaultNode(position);
      setNodes((nds) =>
        nds.concat({
          ...newNode,
          data: { ...newNode.data, onUpdate: onNodeDataUpdate },
        }),
      );
    },
    [onNodeDataUpdate, setNodes],
  );

  const onEdgeLinkCountChange = useCallback(
    (edgeId: string, linkCount: number) => {
      setEdges((eds) => updateEdgeLinkCount(eds, edgeId, linkCount));
    },
    [setEdges],
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
              data: { ...n.data, onUpdate: onNodeDataUpdate },
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
    [reactFlowInstance, addNode, setNodes, setEdges, onNodeDataUpdate, onEdgeLinkCountChange],
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
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'linkCountEdge',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
            data: { linkCount: 1, onLinkCountChange: onEdgeLinkCountChange },
          },
          eds,
        ),
      );
    },
    [setEdges, onEdgeLinkCountChange],
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

  const onExportJson = useCallback(() => {
    const exportData = {
      nodes: nodes.map((n) => ({
        id: n.id,
        urlTemplate: n.data.urlTemplate,
        pageCount: n.data.pageCount,
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

  const onExportCsv = useCallback(() => {
    const rows = nodes.map((n) => ({
      urlTemplate: n.data.urlTemplate,
      pageCount: n.data.pageCount,
      score: scores.get(n.id) ?? 0,
    }));
    rows.sort((a, b) => b.score - a.score);
    const lines = ['url_template,page_count,score'];
    for (const row of rows) {
      const quotedUrl = `"${row.urlTemplate.replace(/"/g, '""')}"`;
      lines.push(`${quotedUrl},${row.pageCount},${row.score.toFixed(4)}`);
    }
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seo-planner-scores.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, scores]);

  // Restore graph from localStorage on mount (runs once — empty dep array)
  // Must be defined BEFORE the save effect so React processes restore before save.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // No saved graph: empty canvas is already in place via initialNodes/initialEdges
      isRestoring.current = false;
      return;
    }
    try {
      const parsed = JSON.parse(saved) as {
        nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: { urlTemplate: string; pageCount: number } }>;
        edges: Array<{ id: string; source: string; target: string; type?: string; markerEnd?: unknown; data: { linkCount: number } }>;
      };
      const restoredNodes: Node<AppNodeData>[] = parsed.nodes.map((n) => ({
        ...n,
        type: n.type ?? 'urlNode',
        data: {
          urlTemplate: n.data.urlTemplate,
          pageCount: n.data.pageCount,
          onUpdate: onNodeDataUpdate,
        },
      }));
      const restoredEdges: Edge[] = parsed.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
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
    isRestoring.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save graph to localStorage on every change (skips the initial restore frame)
  useEffect(() => {
    if (isRestoring.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeGraph(nodes, edges)));
  }, [nodes, edges]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <Toolbar onAddNode={onAddNode} onExportJson={onExportJson} onExportCsv={onExportCsv} isEmpty={nodes.length === 0} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={enrichedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-400">
                    Start mapping your link structure
                  </p>
                  <p className="text-sm text-gray-400 mt-2 max-w-sm">
                    Drag a URL Node from the left panel onto the canvas, then connect nodes to model
                    how pages link to each other.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Or use + Add Node above to place a node at canvas center.
                  </p>
                </div>
              </div>
            )}
          </ReactFlow>
        </div>
        <ScoreSidebar nodes={nodes} scores={scores} weakNodes={weakNodes} />
      </div>
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
