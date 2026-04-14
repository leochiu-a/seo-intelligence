import { render, act, waitFor } from '@testing-library/react';
import { useState, StrictMode } from 'react';
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import App from './App';

// ---- Reactflow mock ----
// Provide minimal stubs so AppInner can mount without the real ReactFlow
vi.mock('reactflow', async () => {
  const React = await import('react');

  function useNodesState<T>(
    initial: Node<T>[],
  ): [Node<T>[], React.Dispatch<React.SetStateAction<Node<T>[]>>, (changes: NodeChange[]) => void] {
    const [nodes, setNodes] = useState<Node<T>[]>(initial);
    return [nodes, setNodes, vi.fn()];
  }

  function useEdgesState(
    initial: Edge[],
  ): [Edge[], React.Dispatch<React.SetStateAction<Edge[]>>, (changes: EdgeChange[]) => void] {
    const [edges, setEdges] = useState<Edge[]>(initial);
    return [edges, setEdges, vi.fn()];
  }

  return {
    default: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'react-flow' }, children),
    ReactFlow: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'react-flow' }, children),
    ReactFlowProvider: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    BackgroundVariant: { Dots: 'dots' },
    ConnectionMode: { Loose: 'loose' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
    useNodesState,
    useEdgesState,
    useReactFlow: () => ({ fitView: vi.fn(), screenToFlowPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }) }),
    addEdge: (_connection: unknown, eds: Edge[]) => eds,
  };
});

// ---- Mock child components not under test ----
vi.mock('./components/Sidebar', () => ({ Sidebar: () => null }));
vi.mock('./components/Toolbar', () => ({ Toolbar: () => null }));
vi.mock('./components/ScoreSidebar', () => ({ ScoreSidebar: () => null }));
vi.mock('./components/ImportDialog', () => ({ ImportDialog: () => null }));

// ---- Helpers ----
const STORAGE_KEY = 'seo-planner-graph';

function makeSerializedGraph() {
  return JSON.stringify({
    nodes: [
      { id: 'n1', type: 'urlNode', position: { x: 100, y: 100 }, data: { urlTemplate: '/page-a', pageCount: 5 } },
      { id: 'n2', type: 'urlNode', position: { x: 300, y: 100 }, data: { urlTemplate: '/page-b', pageCount: 3 } },
    ],
    edges: [
      {
        id: 'e1',
        source: 'n1',
        target: 'n2',
        type: 'linkCountEdge',
        markerEnd: { type: 'arrowclosed', color: '#9CA3AF' },
        data: { linkCount: 2 },
      },
    ],
  });
}

function seedLocalStorage() {
  localStorage.setItem(STORAGE_KEY, makeSerializedGraph());
}

// ---- Tests ----
describe('App localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('restores nodes from localStorage after remount — localStorage is not overwritten with empty state', async () => {
    // Pre-seed localStorage with a non-empty graph
    seedLocalStorage();

    // Render App in StrictMode to simulate the production environment
    // StrictMode double-invokes effects, which is what triggers the bug:
    // restore effect (2nd invocation) reads the now-empty localStorage written by the save effect
    const { unmount } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    // Let all effects settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // CRITICAL assertion: localStorage must NOT have been overwritten with empty nodes/edges
    const afterMount = localStorage.getItem(STORAGE_KEY);
    expect(afterMount).not.toBeNull();

    const parsed = JSON.parse(afterMount!);
    // Bug: if save effect fires before restore's setNodes applies, nodes=[] gets saved
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.nodes[0].id).toBe('n1');
    expect(parsed.nodes[1].id).toBe('n2');

    unmount();

    // Remount in StrictMode — simulates page refresh
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // After remount the saved data must still be intact
    await waitFor(() => {
      const afterRemount = localStorage.getItem(STORAGE_KEY);
      expect(afterRemount).not.toBeNull();
      const reparsed = JSON.parse(afterRemount!);
      expect(reparsed.nodes).toHaveLength(2);
    });
  });
});
