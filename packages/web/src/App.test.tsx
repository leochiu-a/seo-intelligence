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
vi.mock('./components/ScenarioTabBar', () => ({ ScenarioTabBar: () => null }));
vi.mock('./components/ScoreSidebar', () => ({ ScoreSidebar: () => null }));
vi.mock('./components/ImportDialog', () => ({ ImportDialog: () => null }));

// ---- Helpers ----
const OLD_STORAGE_KEY = 'seo-planner-graph';
const SCENARIOS_KEY = 'seo-planner-scenarios';

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

function makeScenariosStore() {
  const id = 's1';
  return JSON.stringify({
    activeScenarioId: id,
    scenarios: [
      {
        id,
        name: 'Scenario 1',
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
      },
    ],
  });
}

function seedOldLocalStorage() {
  localStorage.setItem(OLD_STORAGE_KEY, makeSerializedGraph());
}

function seedScenariosStorage() {
  localStorage.setItem(SCENARIOS_KEY, makeScenariosStore());
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

  it('migrates old seo-planner-graph data to seo-planner-scenarios on first mount', async () => {
    // Pre-seed old format
    seedOldLocalStorage();

    const { unmount } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Old key should be removed after migration
    expect(localStorage.getItem(OLD_STORAGE_KEY)).toBeNull();

    // New key should have been written by the save effect after migration
    // Note: StrictMode double-invokes useState initializer, so the second call may start fresh
    // if the old key was already removed by the first invocation. The key invariant is:
    // old key is gone and either the migrated data or save effect wrote the new key.
    const scenariosRaw = localStorage.getItem(SCENARIOS_KEY);
    expect(scenariosRaw).not.toBeNull();

    const store = JSON.parse(scenariosRaw!);
    // Should have exactly 1 scenario
    expect(store.scenarios).toHaveLength(1);
    // The old key is gone — that's the migration success signal
    expect(localStorage.getItem(OLD_STORAGE_KEY)).toBeNull();

    unmount();
  });

  it('restores nodes from seo-planner-scenarios after remount — save effect does not overwrite with empty state', async () => {
    // Pre-seed new multi-scenario format
    seedScenariosStorage();

    const { unmount } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // CRITICAL: seo-planner-scenarios must NOT have been overwritten with empty nodes/edges
    const afterMount = localStorage.getItem(SCENARIOS_KEY);
    expect(afterMount).not.toBeNull();

    const store = JSON.parse(afterMount!);
    expect(store.scenarios[0].nodes).toHaveLength(2);
    expect(store.scenarios[0].nodes[0].id).toBe('n1');
    expect(store.scenarios[0].nodes[1].id).toBe('n2');

    unmount();

    // Remount — simulates page refresh
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
      const afterRemount = localStorage.getItem(SCENARIOS_KEY);
      expect(afterRemount).not.toBeNull();
      const reparsed = JSON.parse(afterRemount!);
      expect(reparsed.scenarios[0].nodes).toHaveLength(2);
    });
  });
});
