import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Edge } from "@xyflow/react";
import { loadOrMigrate, useScenarios } from "./useScenarios";
import { SCENARIOS_KEY, OLD_STORAGE_KEY } from "../lib/scenario-types";
import type { LinkCountEdgeData } from "../lib/graph-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeNode = (id: string) => ({
  id,
  type: "urlNode" as const,
  position: { x: 0, y: 0 },
  data: { urlTemplate: `/page/${id}`, pageCount: 1 },
});

const makeEdge = (id: string, source: string, target: string) => ({
  id,
  source,
  target,
  type: "linkCountEdge",
  markerEnd: undefined,
  sourceHandle: null,
  targetHandle: null,
  data: { linkCount: 1 },
});

// ---------------------------------------------------------------------------
// loadOrMigrate
// ---------------------------------------------------------------------------

describe("loadOrMigrate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("fresh start: no localStorage → single Scenario 1 with empty nodes/edges", () => {
    const store = loadOrMigrate();
    expect(store.scenarios).toHaveLength(1);
    expect(store.scenarios[0].name).toBe("Scenario 1");
    expect(store.scenarios[0].nodes).toEqual([]);
    expect(store.scenarios[0].edges).toEqual([]);
    expect(store.activeScenarioId).toBe(store.scenarios[0].id);
  });

  it("migration: old seo-planner-graph key → wraps as Default scenario and removes old key", () => {
    const oldData = {
      nodes: [makeNode("n1")],
      edges: [],
    };
    localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify(oldData));

    const store = loadOrMigrate();
    expect(store.scenarios).toHaveLength(1);
    expect(store.scenarios[0].name).toBe("Default");
    expect(store.scenarios[0].nodes).toHaveLength(1);
    expect(store.scenarios[0].nodes[0].id).toBe("n1");
    expect(store.scenarios[0].edges).toHaveLength(0);

    // Old key must be removed after migration
    expect(localStorage.getItem(OLD_STORAGE_KEY)).toBeNull();
  });

  it("migration: old key ignored when seo-planner-scenarios already exists", () => {
    const existingStore = {
      activeScenarioId: "abc",
      scenarios: [{ id: "abc", name: "My Scenario", nodes: [], edges: [] }],
    };
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(existingStore));
    localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify({ nodes: [makeNode("old")], edges: [] }));

    const store = loadOrMigrate();
    expect(store.activeScenarioId).toBe("abc");
    expect(store.scenarios[0].name).toBe("My Scenario");
    expect(store.scenarios).toHaveLength(1);
  });

  it("checks seo-planner-scenarios before seo-planner-graph (migration order)", () => {
    // When both keys exist, scenarios key wins — proves check order
    const newStore = {
      activeScenarioId: "new1",
      scenarios: [{ id: "new1", name: "New", nodes: [], edges: [] }],
    };
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(newStore));
    localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify({ nodes: [makeNode("old")], edges: [] }));

    const store = loadOrMigrate();
    expect(store.activeScenarioId).toBe("new1");
  });
});

// ---------------------------------------------------------------------------
// useScenarios hook
// ---------------------------------------------------------------------------

describe("useScenarios", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('createScenario("blank") adds empty scenario and saves current graph into previous slot', () => {
    const { result } = renderHook(() => useScenarios());
    const firstId = result.current.store.activeScenarioId;
    const currentNodes = [makeNode("x1")];
    const currentEdges = [makeEdge("e1", "x1", "x1")];

    act(() => {
      result.current.createScenario("blank", currentNodes, currentEdges);
    });

    const { store } = result.current;
    expect(store.scenarios).toHaveLength(2);
    const newScenario = store.scenarios.find((s) => s.id !== firstId)!;
    expect(newScenario.nodes).toEqual([]);
    expect(newScenario.edges).toEqual([]);
    expect(newScenario.name).toMatch(/^Scenario \d+$/);

    // Previous scenario should have serialized current graph
    const prevScenario = store.scenarios.find((s) => s.id === firstId)!;
    expect(prevScenario.nodes).toHaveLength(1);
    expect(prevScenario.nodes[0].id).toBe("x1");
  });

  it('createScenario("blank") name follows Scenario N pattern', () => {
    const { result } = renderHook(() => useScenarios());

    act(() => {
      result.current.createScenario("blank", [], []);
    });
    act(() => {
      result.current.createScenario("blank", [], []);
    });

    const names = result.current.store.scenarios.map((s) => s.name);
    expect(names).toContain("Scenario 1");
    expect(names).toContain("Scenario 2");
    expect(names).toContain("Scenario 3");
  });

  it('createScenario("clone") deep-copies current nodes/edges (no shared references)', () => {
    const { result } = renderHook(() => useScenarios());
    const currentNodes = [makeNode("c1")];
    const currentEdges = [makeEdge("ce1", "c1", "c1")];

    let cloned: ReturnType<typeof result.current.createScenario>;
    act(() => {
      cloned = result.current.createScenario("clone", currentNodes, currentEdges);
    });

    expect(cloned!.nodes).toHaveLength(1);
    expect(cloned!.nodes[0].id).toBe("c1");

    // Mutation of original should not affect clone
    currentNodes[0].data.pageCount = 999;
    expect(cloned!.nodes[0].data.pageCount).toBe(1);
  });

  it("switchScenario serializes current graph into old slot and returns target scenario", () => {
    const { result } = renderHook(() => useScenarios());
    const firstId = result.current.store.activeScenarioId;

    // Create a second scenario
    act(() => {
      result.current.createScenario("blank", [], []);
    });
    const secondId = result.current.store.scenarios.find((s) => s.id !== firstId)!.id;

    const currentNodes = [makeNode("sw1")];
    const currentEdges: Edge<LinkCountEdgeData>[] = [];

    let target: ReturnType<typeof result.current.switchScenario> | undefined;
    act(() => {
      target = result.current.switchScenario(firstId, currentNodes, currentEdges);
    });

    expect(result.current.store.activeScenarioId).toBe(firstId);
    // Second scenario's slot should have the serialized nodes from before switch
    const secondSlot = result.current.store.scenarios.find((s) => s.id === secondId)!;
    expect(secondSlot.nodes).toHaveLength(1);
    expect(secondSlot.nodes[0].id).toBe("sw1");

    void target;
  });

  it("renameScenario updates only the name, not nodes/edges", () => {
    const { result } = renderHook(() => useScenarios());
    const id = result.current.store.activeScenarioId;

    act(() => {
      result.current.renameScenario(id, "My Custom Name");
    });

    const scenario = result.current.store.scenarios.find((s) => s.id === id)!;
    expect(scenario.name).toBe("My Custom Name");
    expect(scenario.nodes).toEqual([]);
    expect(scenario.edges).toEqual([]);
  });

  it("deleteScenario removes scenario; active switches to first remaining", () => {
    const { result } = renderHook(() => useScenarios());
    const firstId = result.current.store.activeScenarioId;

    act(() => {
      result.current.createScenario("blank", [], []);
    });
    const secondId = result.current.store.scenarios.find((s) => s.id !== firstId)!.id;

    act(() => {
      result.current.deleteScenario(firstId);
    });

    expect(result.current.store.scenarios).toHaveLength(1);
    expect(result.current.store.activeScenarioId).toBe(secondId);
  });

  it("deleteScenario returns null when only one scenario exists (D-03)", () => {
    const { result } = renderHook(() => useScenarios());
    const id = result.current.store.activeScenarioId;

    let ret: ReturnType<typeof result.current.deleteScenario>;
    act(() => {
      ret = result.current.deleteScenario(id);
    });

    expect(ret!).toBeNull();
    expect(result.current.store.scenarios).toHaveLength(1);
  });

  it("persist() writes store to localStorage under seo-planner-scenarios", () => {
    const { result } = renderHook(() => useScenarios());

    act(() => {
      result.current.persist();
    });

    const raw = localStorage.getItem(SCENARIOS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.activeScenarioId).toBe(result.current.store.activeScenarioId);
  });

  it("updateActiveGraph updates active scenario nodes/edges in store", () => {
    const { result } = renderHook(() => useScenarios());
    const id = result.current.store.activeScenarioId;

    const serializedNodes = [makeNode("u1")];
    const serializedEdges: [] = [];

    act(() => {
      result.current.updateActiveGraph(serializedNodes, serializedEdges);
    });

    const scenario = result.current.store.scenarios.find((s) => s.id === id)!;
    expect(scenario.nodes).toHaveLength(1);
    expect(scenario.nodes[0].id).toBe("u1");
  });
});
