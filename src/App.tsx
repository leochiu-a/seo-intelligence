import { useState, useCallback, useRef, useMemo } from 'react';
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
  type UrlNodeData,
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

const initialNodes: Node<AppNodeData>[] = [];
const initialEdges: Edge[] = [];

function AppInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

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

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (type !== 'urlNode' || !reactFlowInstance) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(position);
    },
    [reactFlowInstance, addNode],
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

  const onEdgeLinkCountChange = useCallback(
    (edgeId: string, linkCount: number) => {
      setEdges((eds) => updateEdgeLinkCount(eds, edgeId, linkCount));
    },
    [setEdges],
  );

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

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <Toolbar onAddNode={onAddNode} />
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
