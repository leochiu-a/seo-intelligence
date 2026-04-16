import { useState, useCallback } from 'react';
import {
  SCENARIOS_KEY,
  OLD_STORAGE_KEY,
  type ScenarioRecord,
  type ScenariosStore,
  type SerializedNode,
  type SerializedEdge,
} from '../lib/scenario-types';

// ---------------------------------------------------------------------------
// Serialization helpers (mirrors serializeGraph in App.tsx, but works with
// already-typed Node<AppNodeData> — we accept generic objects so the hook
// stays free of ReactFlow imports)
// ---------------------------------------------------------------------------

function serializeNodes(nodes: object[]): SerializedNode[] {
  return nodes.map((n: any) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      urlTemplate: n.data?.urlTemplate ?? '',
      pageCount: n.data?.pageCount ?? 1,
      ...(n.data?.isGlobal != null && { isGlobal: n.data.isGlobal }),
      ...(n.data?.placements?.length && { placements: n.data.placements }),
      ...(n.data?.isRoot != null && { isRoot: n.data.isRoot }),
    },
  }));
}

function serializeEdges(edges: object[]): SerializedEdge[] {
  return edges.map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    type: e.type,
    markerEnd: e.markerEnd,
    data: { linkCount: (e.data as { linkCount?: number })?.linkCount ?? 1 },
  }));
}

// ---------------------------------------------------------------------------
// loadOrMigrate — exported for direct testing
// ---------------------------------------------------------------------------

/**
 * Reads localStorage and returns a ScenariosStore.
 *
 * Priority:
 * 1. seo-planner-scenarios present → return parsed store as-is
 * 2. seo-planner-graph present → migrate: wrap in Default scenario, delete old key
 * 3. Neither → create fresh store with a single "Scenario 1"
 */
export function loadOrMigrate(): ScenariosStore {
  // 1. New key exists — use it directly
  const existing = localStorage.getItem(SCENARIOS_KEY);
  if (existing) {
    try {
      return JSON.parse(existing) as ScenariosStore;
    } catch {
      // Fall through to fresh start
    }
  }

  // 2. Old single-graph key exists — migrate
  const oldData = localStorage.getItem(OLD_STORAGE_KEY);
  if (oldData) {
    try {
      const parsed = JSON.parse(oldData) as { nodes: SerializedNode[]; edges: SerializedEdge[] };
      const id = crypto.randomUUID();
      const store: ScenariosStore = {
        activeScenarioId: id,
        scenarios: [
          {
            id,
            name: 'Default',
            nodes: parsed.nodes ?? [],
            edges: parsed.edges ?? [],
          },
        ],
      };
      localStorage.removeItem(OLD_STORAGE_KEY);
      return store;
    } catch {
      // Fall through to fresh start
    }
  }

  // 3. Fresh start
  const id = crypto.randomUUID();
  return {
    activeScenarioId: id,
    scenarios: [{ id, name: 'Scenario 1', nodes: [], edges: [] }],
  };
}

// ---------------------------------------------------------------------------
// useScenarios hook
// ---------------------------------------------------------------------------

export interface UseScenariosResult {
  store: ScenariosStore;
  createScenario: (mode: 'blank' | 'clone', currentNodes: object[], currentEdges: object[]) => ScenarioRecord;
  switchScenario: (targetId: string, currentNodes: object[], currentEdges: object[]) => ScenarioRecord | null;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => ScenarioRecord | null;
  persist: () => void;
  updateActiveGraph: (serializedNodes: SerializedNode[], serializedEdges: SerializedEdge[]) => void;
}

export function useScenarios(): UseScenariosResult {
  const [store, setStore] = useState<ScenariosStore>(() => loadOrMigrate());

  /**
   * createScenario — adds a new scenario to the store.
   * Also serializes currentNodes/currentEdges into the currently-active slot.
   */
  const createScenario = useCallback(
    (mode: 'blank' | 'clone', currentNodes: object[], currentEdges: object[]): ScenarioRecord => {
      const serializedNodes = serializeNodes(currentNodes);
      const serializedEdges = serializeEdges(currentEdges);

      let newScenario!: ScenarioRecord;

      setStore((prev) => {
        const newId = crypto.randomUUID();
        const newName = `Scenario ${prev.scenarios.length + 1}`;

        // Serialize current graph into active slot
        const updatedScenarios = prev.scenarios.map((s) =>
          s.id === prev.activeScenarioId
            ? { ...s, nodes: serializedNodes, edges: serializedEdges }
            : s,
        );

        newScenario = {
          id: newId,
          name: newName,
          nodes: mode === 'clone' ? structuredClone(serializedNodes) : [],
          edges: mode === 'clone' ? structuredClone(serializedEdges) : [],
        };

        return {
          activeScenarioId: newId,
          scenarios: [...updatedScenarios, newScenario],
        };
      });

      return newScenario;
    },
    [],
  );

  /**
   * switchScenario — serializes current graph into active slot, switches to target.
   * Returns the target scenario record for the caller to restore.
   */
  const switchScenario = useCallback(
    (targetId: string, currentNodes: object[], currentEdges: object[]): ScenarioRecord | null => {
      const serializedNodes = serializeNodes(currentNodes);
      const serializedEdges = serializeEdges(currentEdges);

      let targetRecord: ScenarioRecord | null = null;

      setStore((prev) => {
        const updatedScenarios = prev.scenarios.map((s) => {
          if (s.id === prev.activeScenarioId) {
            return { ...s, nodes: serializedNodes, edges: serializedEdges };
          }
          return s;
        });

        targetRecord = updatedScenarios.find((s) => s.id === targetId) ?? null;

        return {
          activeScenarioId: targetId,
          scenarios: updatedScenarios,
        };
      });

      return targetRecord;
    },
    [],
  );

  /**
   * renameScenario — updates only the name field.
   */
  const renameScenario = useCallback((id: string, name: string): void => {
    setStore((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === id ? { ...s, name } : s)),
    }));
  }, []);

  /**
   * deleteScenario — removes a scenario.
   * Returns null if only one scenario exists (D-03, cannot delete last).
   * If deleted scenario was active, falls back to first remaining.
   */
  const deleteScenario = useCallback((id: string): ScenarioRecord | null => {
    let result: ScenarioRecord | null = null;

    setStore((prev) => {
      if (prev.scenarios.length <= 1) {
        result = null;
        return prev; // no-op
      }

      const remaining = prev.scenarios.filter((s) => s.id !== id);
      const newActiveId =
        prev.activeScenarioId === id ? remaining[0].id : prev.activeScenarioId;

      result = remaining.find((s) => s.id === newActiveId) ?? remaining[0];

      return {
        activeScenarioId: newActiveId,
        scenarios: remaining,
      };
    });

    return result;
  }, []);

  /**
   * persist — writes store to localStorage.
   */
  const persist = useCallback((): void => {
    setStore((prev) => {
      localStorage.setItem(SCENARIOS_KEY, JSON.stringify(prev));
      return prev;
    });
  }, []);

  /**
   * updateActiveGraph — updates active scenario's nodes/edges without switching.
   * Used by App.tsx save effect.
   */
  const updateActiveGraph = useCallback(
    (serializedNodes: SerializedNode[], serializedEdges: SerializedEdge[]): void => {
      setStore((prev) => ({
        ...prev,
        scenarios: prev.scenarios.map((s) =>
          s.id === prev.activeScenarioId
            ? { ...s, nodes: serializedNodes, edges: serializedEdges }
            : s,
        ),
      }));
    },
    [],
  );

  return {
    store,
    createScenario,
    switchScenario,
    renameScenario,
    deleteScenario,
    persist,
    updateActiveGraph,
  };
}
