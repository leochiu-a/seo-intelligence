import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Node, Edge } from "@xyflow/react";
import { useScenarioHandlers } from "./useScenarioHandlers";
import type { AppNodeData } from "../App";
import type { LinkCountEdgeData } from "../lib/graph-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNode(id: string): Node<AppNodeData> {
  return {
    id,
    type: "urlNode",
    position: { x: 0, y: 0 },
    data: {
      urlTemplate: `/page/${id}`,
      pageCount: 1,
      onUpdate: vi.fn(),
      onRootToggle: vi.fn(),
      onZIndexChange: vi.fn(),
    },
  };
}

function makeEdge(id: string, source: string, target: string): Edge<LinkCountEdgeData> {
  return { id, source, target, type: "linkCountEdge", data: { linkCount: 1 } };
}

const serializedNode = {
  id: "n1",
  type: "urlNode",
  position: { x: 0, y: 0 },
  data: { urlTemplate: "/page/n1", pageCount: 1 },
};

const serializedEdge = {
  id: "e1",
  source: "n1",
  target: "n2",
  data: { linkCount: 1 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useScenarioHandlers", () => {
  let setNodes: ReturnType<typeof vi.fn>;
  let setEdges: ReturnType<typeof vi.fn>;
  let switchScenario: ReturnType<typeof vi.fn>;
  let createScenario: ReturnType<typeof vi.fn>;
  let deleteScenario: ReturnType<typeof vi.fn>;
  let persist: ReturnType<typeof vi.fn>;
  let wireCallbacks: ReturnType<typeof vi.fn>;
  let onNodeDataUpdate: ReturnType<typeof vi.fn>;
  let onRootToggle: ReturnType<typeof vi.fn>;
  let onNodeZIndexChange: ReturnType<typeof vi.fn>;
  let onEdgeLinkCountChange: ReturnType<typeof vi.fn>;
  let isSwitchingRef: { current: boolean };
  let store: {
    activeScenarioId: string;
    scenarios: {
      id: string;
      name: string;
      nodes: (typeof serializedNode)[];
      edges: (typeof serializedEdge)[];
    }[];
  };

  beforeEach(() => {
    setNodes = vi.fn();
    setEdges = vi.fn();
    persist = vi.fn();
    onNodeDataUpdate = vi.fn();
    onRootToggle = vi.fn();
    onNodeZIndexChange = vi.fn();
    onEdgeLinkCountChange = vi.fn();
    isSwitchingRef = { current: false };
    store = {
      activeScenarioId: "s1",
      scenarios: [
        { id: "s1", name: "Scenario 1", nodes: [serializedNode], edges: [serializedEdge] },
      ],
    };

    const wiredNodesResult = [makeNode("n1")];
    const wiredEdgesResult = [makeEdge("e1", "n1", "n2")];
    wireCallbacks = vi
      .fn()
      .mockReturnValue({ wiredNodes: wiredNodesResult, wiredEdges: wiredEdgesResult });

    switchScenario = vi
      .fn()
      .mockReturnValue({
        id: "s2",
        name: "Scenario 2",
        nodes: [serializedNode],
        edges: [serializedEdge],
      });
    createScenario = vi
      .fn()
      .mockReturnValue({
        id: "s3",
        name: "Scenario 3",
        nodes: [serializedNode],
        edges: [serializedEdge],
      });
    deleteScenario = vi
      .fn()
      .mockReturnValue({
        id: "s1",
        name: "Scenario 1",
        nodes: [serializedNode],
        edges: [serializedEdge],
      });

    // Synchronous rAF mock
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  function makeArgs(overrides = {}) {
    const nodes = [makeNode("n1")];
    const edges = [makeEdge("e1", "n1", "n2")];
    return {
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
      onNodeDataUpdate,
      onRootToggle,
      onNodeZIndexChange,
      onEdgeLinkCountChange,
      isSwitchingRef,
      ...overrides,
    };
  }

  it("Test 1 (handleSwitchScenario same ID): no-op when targetId === activeScenarioId", () => {
    const { result } = renderHook(() => useScenarioHandlers(makeArgs()));

    act(() => {
      result.current.handleSwitchScenario("s1"); // same as activeScenarioId
    });

    expect(switchScenario).not.toHaveBeenCalled();
    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("Test 2 (handleSwitchScenario different ID): wires and applies nodes/edges + persist + rAF reset", () => {
    const { result } = renderHook(() => useScenarioHandlers(makeArgs()));

    act(() => {
      result.current.handleSwitchScenario("s2");
    });

    expect(isSwitchingRef.current).toBe(false); // reset by rAF
    expect(switchScenario).toHaveBeenCalledOnce();
    expect(wireCallbacks).toHaveBeenCalledOnce();
    expect(setNodes).toHaveBeenCalledOnce();
    expect(setEdges).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledOnce();
  });

  it("Test 3 (handleSwitchScenario null target): early-returns without setNodes/setEdges/persist", () => {
    switchScenario = vi.fn().mockReturnValue(null);
    const { result } = renderHook(() => useScenarioHandlers(makeArgs({ switchScenario })));

    act(() => {
      result.current.handleSwitchScenario("s2");
    });

    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("Test 4 (handleCreateScenario blank): creates blank scenario, wires, applies, persist, rAF reset", () => {
    const { result } = renderHook(() => useScenarioHandlers(makeArgs()));

    act(() => {
      result.current.handleCreateScenario("blank");
    });

    expect(createScenario).toHaveBeenCalledWith("blank", expect.any(Array), expect.any(Array));
    expect(wireCallbacks).toHaveBeenCalledOnce();
    expect(setNodes).toHaveBeenCalledOnce();
    expect(setEdges).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledOnce();
    expect(isSwitchingRef.current).toBe(false);
  });

  it("Test 4b (handleCreateScenario clone): creates clone scenario", () => {
    const { result } = renderHook(() => useScenarioHandlers(makeArgs()));

    act(() => {
      result.current.handleCreateScenario("clone");
    });

    expect(createScenario).toHaveBeenCalledWith("clone", expect.any(Array), expect.any(Array));
  });

  it("Test 5 (handleDeleteScenario null): early-returns when deleteScenario returns null (last scenario)", () => {
    deleteScenario = vi.fn().mockReturnValue(null);
    const { result } = renderHook(() => useScenarioHandlers(makeArgs({ deleteScenario })));

    act(() => {
      result.current.handleDeleteScenario("s1");
    });

    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    // isSwitchingRef NOT set when result is null
    expect(isSwitchingRef.current).toBe(false);
  });

  it("Test 6 (handleDeleteScenario normal): wires, applies, persist, rAF reset", () => {
    const { result } = renderHook(() => useScenarioHandlers(makeArgs()));

    act(() => {
      result.current.handleDeleteScenario("s2");
    });

    expect(deleteScenario).toHaveBeenCalledWith("s2");
    expect(wireCallbacks).toHaveBeenCalledOnce();
    expect(setNodes).toHaveBeenCalledOnce();
    expect(setEdges).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledOnce();
    expect(isSwitchingRef.current).toBe(false);
  });

  it("Test 7 (handleImportFromDialog): wires importedNodes/edges and calls setNodes+setEdges", () => {
    const { result } = renderHook(() => useScenarioHandlers(makeArgs()));

    const importedNode: Node<{ urlTemplate: string; pageCount: number }> = {
      id: "n-import",
      type: "urlNode",
      position: { x: 5, y: 5 },
      data: { urlTemplate: "/imported", pageCount: 3 },
    };
    const importedEdge: Edge<LinkCountEdgeData> = {
      id: "e-import",
      source: "n-import",
      target: "n1",
      data: { linkCount: 2 },
    };

    act(() => {
      // @ts-expect-error -- simplified node for test
      result.current.handleImportFromDialog([importedNode], [importedEdge]);
    });

    expect(setNodes).toHaveBeenCalledOnce();
    expect(setEdges).toHaveBeenCalledOnce();

    // Verify wired node has callbacks attached
    const wiredNodesArg = setNodes.mock.calls[0][0] as Node<AppNodeData>[];
    expect(typeof wiredNodesArg[0].data.onUpdate).toBe("function");
    expect(typeof wiredNodesArg[0].data.onRootToggle).toBe("function");
    expect(typeof wiredNodesArg[0].data.onZIndexChange).toBe("function");

    // Verify wired edges have markerEnd default + linkCount + onLinkCountChange
    const wiredEdgesArg = setEdges.mock.calls[0][0] as Edge<LinkCountEdgeData>[];
    expect(wiredEdgesArg[0].markerEnd).toBeDefined();
    expect(wiredEdgesArg[0].data?.linkCount).toBe(2);
    expect(typeof wiredEdgesArg[0].data?.onLinkCountChange).toBe("function");
  });
});
