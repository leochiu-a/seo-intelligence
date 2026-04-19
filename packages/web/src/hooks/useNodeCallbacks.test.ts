import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { useNodeCallbacks } from "./useNodeCallbacks";
import type { AppNodeData } from "../App";
import type { LinkCountEdgeData } from "../lib/graph-utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNode(id: string, overrides: Partial<AppNodeData> = {}): Node<AppNodeData> {
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
      ...overrides,
    },
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  linkCount = 1,
): Edge<LinkCountEdgeData> {
  return {
    id,
    source,
    target,
    type: "linkCountEdge",
    data: { linkCount },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useNodeCallbacks", () => {
  let setNodes: ReturnType<typeof vi.fn>;
  let setEdges: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setNodes = vi.fn();
    setEdges = vi.fn();
  });

  it("Test 1 (onNodeDataUpdate): updater merges new data into matching node, preserving other fields", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    act(() => {
      result.current.onNodeDataUpdate("n1", { urlTemplate: "/x" });
    });

    expect(setNodes).toHaveBeenCalledOnce();
    const updater = setNodes.mock.calls[0][0];
    const input = [makeNode("n1", { urlTemplate: "/a", pageCount: 5 })];
    const output = updater(input);
    expect(output[0].data.urlTemplate).toBe("/x");
    expect(output[0].data.pageCount).toBe(5);
  });

  it("Test 2 (onNodeZIndexChange): updater sets zIndex on matching node", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    act(() => {
      result.current.onNodeZIndexChange("n1", 5);
    });

    const updater = setNodes.mock.calls[0][0];
    const input = [makeNode("n1"), makeNode("n2")];
    const output = updater(input);
    expect(output[0].zIndex).toBe(5);
    // n2 unchanged
    expect(output[1]).toBe(input[1]);
  });

  it("Test 3 (onNodeZIndexChange no-op): returns same reference when zIndex already matches", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    act(() => {
      result.current.onNodeZIndexChange("n1", 5);
    });

    const updater = setNodes.mock.calls[0][0];
    const nodeWithSameZIndex = { ...makeNode("n1"), zIndex: 5 };
    const input = [nodeWithSameZIndex];
    const output = updater(input);
    // Same reference returned — no-op guard
    expect(output[0]).toBe(nodeWithSameZIndex);
  });

  it("Test 4 (onRootToggle on): sets isRoot=true on toggled node and clears isRoot from others", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    act(() => {
      result.current.onRootToggle("n1");
    });

    const updater = setNodes.mock.calls[0][0];
    const otherRoot = makeNode("n2", { isRoot: true });
    const input = [makeNode("n1"), otherRoot];
    const output = updater(input);
    expect(output[0].data.isRoot).toBe(true);
    expect(output[1].data.isRoot).toBe(false);
  });

  it("Test 5 (onRootToggle off): toggles isRoot=false when node is currently root", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    act(() => {
      result.current.onRootToggle("n1");
    });

    const updater = setNodes.mock.calls[0][0];
    const rootNode = makeNode("n1", { isRoot: true });
    const input = [rootNode];
    const output = updater(input);
    expect(output[0].data.isRoot).toBe(false);
  });

  it("Test 6 (addNode): appends a new node with onUpdate/onRootToggle/onZIndexChange wired", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    act(() => {
      result.current.addNode({ x: 10, y: 20 });
    });

    const updater = setNodes.mock.calls[0][0];
    const input: Node<AppNodeData>[] = [];
    const output = updater(input);

    expect(output).toHaveLength(1);
    const newNode = output[0];
    expect(typeof newNode.data.onUpdate).toBe("function");
    expect(typeof newNode.data.onRootToggle).toBe("function");
    expect(typeof newNode.data.onZIndexChange).toBe("function");
    expect(newNode.data.urlTemplate).toBe("/page/<id>");
    expect(newNode.data.pageCount).toBe(1);
  });

  it("Test 7 (onEdgeLinkCountChange): calls setEdges with updateEdgeLinkCount updater", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    act(() => {
      result.current.onEdgeLinkCountChange("e1", 3);
    });

    expect(setEdges).toHaveBeenCalledOnce();
    const updater = setEdges.mock.calls[0][0];
    const input = [makeEdge("e1", "n1", "n2", 1)];
    const output = updater(input);
    expect(output[0].data.linkCount).toBe(3);
  });

  it("Test 8 (wireCallbacks nodes): attaches onUpdate/onRootToggle/onZIndexChange and preserves optional fields", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    const serializedNodes = [
      {
        id: "n1",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: {
          urlTemplate: "/page/n1",
          pageCount: 2,
          isGlobal: true,
          placements: [{ id: "p1", name: "Home", linkCount: 1 }],
          isRoot: true,
          tags: ["seo"],
        },
      },
    ];

    const { wiredNodes } = result.current.wireCallbacks(serializedNodes, []);

    expect(typeof wiredNodes[0].data.onUpdate).toBe("function");
    expect(typeof wiredNodes[0].data.onRootToggle).toBe("function");
    expect(typeof wiredNodes[0].data.onZIndexChange).toBe("function");
    expect(wiredNodes[0].data.isGlobal).toBe(true);
    expect(wiredNodes[0].data.placements).toEqual([{ id: "p1", name: "Home", linkCount: 1 }]);
    expect(wiredNodes[0].data.isRoot).toBe(true);
    expect(wiredNodes[0].data.tags).toEqual(["seo"]);
    // default type applied when missing
    expect(wiredNodes[0].type).toBe("urlNode");
  });

  it("Test 9 (wireCallbacks edges): wires edges with defaults and onLinkCountChange", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    const serializedEdges = [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        data: { linkCount: 1 },
      },
    ];

    const { wiredEdges } = result.current.wireCallbacks([], serializedEdges);
    const edge = wiredEdges[0];

    expect(edge.type).toBe("linkCountEdge");
    expect(edge.markerEnd).toEqual({ type: MarkerType.ArrowClosed, color: "#9CA3AF" });
    expect(edge.data?.linkCount).toBe(1);
    expect(typeof edge.data?.onLinkCountChange).toBe("function");
  });

  it("Test 10 (sourceHandle passthrough): preserves explicit null sourceHandle, omits when undefined", () => {
    const { result } = renderHook(() => useNodeCallbacks({ setNodes, setEdges }));

    const edgesWithNull = [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        sourceHandle: null,
        targetHandle: null,
        data: { linkCount: 1 },
      },
    ];
    const edgesWithUndefined = [{ id: "e2", source: "n1", target: "n2", data: { linkCount: 1 } }];

    const { wiredEdges: edgesNull } = result.current.wireCallbacks([], edgesWithNull);
    expect("sourceHandle" in edgesNull[0]).toBe(true);
    expect(edgesNull[0].sourceHandle).toBeNull();

    const { wiredEdges: edgesUndef } = result.current.wireCallbacks([], edgesWithUndefined);
    expect("sourceHandle" in edgesUndef[0]).toBe(false);
  });

  it("Test 11 (reference stability): callbacks are referentially equal across rerenders when inputs unchanged", () => {
    let renderCount = 0;
    const { result, rerender } = renderHook(() => {
      renderCount++;
      return useNodeCallbacks({ setNodes, setEdges });
    });

    const first = result.current;
    rerender();
    const second = result.current;

    expect(renderCount).toBeGreaterThan(1);
    expect(first.onNodeDataUpdate).toBe(second.onNodeDataUpdate);
    expect(first.onNodeZIndexChange).toBe(second.onNodeZIndexChange);
    expect(first.onRootToggle).toBe(second.onRootToggle);
    expect(first.addNode).toBe(second.addNode);
    expect(first.onEdgeLinkCountChange).toBe(second.onEdgeLinkCountChange);
    expect(first.wireCallbacks).toBe(second.wireCallbacks);
  });
});
