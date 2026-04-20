import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { useCanvasHandlers, type UseCanvasHandlersArgs } from "./useCanvasHandlers";
import type { AppNodeData } from "../App";
import type { LinkCountEdgeData } from "../lib/graph-utils";
import type { SerializedGraphNode, SerializedGraphEdge } from "../lib/serialize-graph";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNode(id: string): Node<AppNodeData> {
  return {
    id,
    type: "urlNode",
    position: { x: 10, y: 20 },
    data: {
      urlTemplate: `/page/${id}`,
      pageCount: 1,
      onUpdate: vi.fn(),
      onRootToggle: vi.fn(),
      onZIndexChange: vi.fn(),
    },
  };
}

function makeDragEvent(
  overrides: Partial<{
    dataTransferData: Record<string, string>;
    files: File[];
    clientX: number;
    clientY: number;
  }> = {},
) {
  return {
    preventDefault: vi.fn(),
    dataTransfer: {
      dropEffect: "",
      get files() {
        return overrides.files ?? [];
      },
      getData: vi.fn((type: string) => overrides.dataTransferData?.[type] ?? ""),
    },
    clientX: overrides.clientX ?? 100,
    clientY: overrides.clientY ?? 200,
  } as unknown as React.DragEvent;
}

function makeConnection(
  overrides: Partial<{
    source: string | null;
    target: string | null;
    sourceHandle: string | null;
    targetHandle: string | null;
  }> = {},
) {
  return {
    source: overrides.source ?? "n1",
    target: overrides.target ?? "n2",
    sourceHandle: overrides.sourceHandle ?? null,
    targetHandle: overrides.targetHandle ?? null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCanvasHandlers", () => {
  let setNodes: ReturnType<typeof vi.fn>;
  let setEdges: ReturnType<typeof vi.fn>;
  let addNode: ReturnType<typeof vi.fn>;
  let wireCallbacks: ReturnType<typeof vi.fn>;
  let onEdgeLinkCountChange: ReturnType<typeof vi.fn>;
  let reactFlowInstance: { screenToFlowPosition: ReturnType<typeof vi.fn> } | null;

  beforeEach(() => {
    setNodes = vi.fn();
    setEdges = vi.fn();
    addNode = vi.fn();
    onEdgeLinkCountChange = vi.fn();
    wireCallbacks = vi
      .fn()
      .mockImplementation((nodes: SerializedGraphNode[], edges: SerializedGraphEdge[]) => ({
        wiredNodes: nodes.map((n) => ({
          ...n,
          data: { ...n.data, onUpdate: vi.fn(), onRootToggle: vi.fn(), onZIndexChange: vi.fn() },
        })),
        wiredEdges: edges.map((e) => ({
          ...e,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#9CA3AF" },
          data: { linkCount: e.data?.linkCount ?? 1, onLinkCountChange: vi.fn() },
        })),
      }));
    reactFlowInstance = {
      screenToFlowPosition: vi.fn().mockReturnValue({ x: 50, y: 60 }),
    };

    vi.stubGlobal("window", { innerWidth: 1024, innerHeight: 768 });
  });

  function makeArgs(overrides = {}): UseCanvasHandlersArgs {
    const nodes = [makeNode("n1"), makeNode("n2")];
    return {
      reactFlowInstance: reactFlowInstance as unknown as ReturnType<
        typeof import("@xyflow/react").useReactFlow
      >,
      addNode,
      nodes,
      setNodes,
      setEdges,
      wireCallbacks,
      onEdgeLinkCountChange,
      ...overrides,
    } as unknown as UseCanvasHandlersArgs;
  }

  it("Test 1 (onDragOver): calls preventDefault and sets dropEffect to move", () => {
    const { result } = renderHook(() => useCanvasHandlers(makeArgs()));
    const event = makeDragEvent();

    act(() => {
      result.current.onDragOver(event);
    });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.dataTransfer.dropEffect).toBe("move");
  });

  it("Test 2 (onDrop JSON file): parses and wires nodes/edges from dropped JSON file", async () => {
    // parseImportJson expects flat structure: urlTemplate/pageCount at top level of each node
    const jsonContent = JSON.stringify({
      nodes: [{ id: "n1", urlTemplate: "/a", pageCount: 1, x: 0, y: 0 }],
      edges: [{ id: "e1", source: "n1", target: "n2", linkCount: 2 }],
    });

    const mockFile = { name: "graph.json" } as File;

    // Stub FileReader to call onload synchronously
    vi.stubGlobal(
      "FileReader",
      class MockFileReader {
        onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
        readAsText(_file: File) {
          this.onload?.({
            target: { result: jsonContent },
          } as unknown as ProgressEvent<FileReader>);
        }
      },
    );

    const { result } = renderHook(() => useCanvasHandlers(makeArgs()));
    const event = makeDragEvent({ files: [mockFile] });

    act(() => {
      result.current.onDrop(event);
    });

    expect(setNodes).toHaveBeenCalledOnce();
    expect(setEdges).toHaveBeenCalledOnce();

    const wiredNodesArg = setNodes.mock.calls[0][0] as Node<AppNodeData>[];
    expect(typeof wiredNodesArg[0].data.onUpdate).toBe("function");
    expect(typeof wiredNodesArg[0].data.onRootToggle).toBe("function");
    expect(typeof wiredNodesArg[0].data.onZIndexChange).toBe("function");

    const wiredEdgesArg = setEdges.mock.calls[0][0] as Edge<LinkCountEdgeData>[];
    expect(wiredEdgesArg[0].markerEnd).toBeDefined();
    expect(typeof wiredEdgesArg[0].data?.onLinkCountChange).toBe("function");
  });

  it("Test 3 (onDrop JSON file invalid): silently ignores parse failure, does not call setNodes/setEdges", () => {
    const mockFile = { name: "bad.json" } as File;

    vi.stubGlobal(
      "FileReader",
      class MockFileReader {
        onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
        readAsText(_file: File) {
          this.onload?.({
            target: { result: "{{INVALID JSON" },
          } as unknown as ProgressEvent<FileReader>);
        }
      },
    );

    const { result } = renderHook(() => useCanvasHandlers(makeArgs()));
    const event = makeDragEvent({ files: [mockFile] });

    act(() => {
      result.current.onDrop(event);
    });

    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();
  });

  it("Test 4 (onDrop sidebar node): calls addNode with screenToFlowPosition result when type=urlNode", () => {
    const { result } = renderHook(() => useCanvasHandlers(makeArgs()));
    const event = makeDragEvent({
      dataTransferData: { "application/reactflow": "urlNode" },
      clientX: 300,
      clientY: 400,
    });

    act(() => {
      result.current.onDrop(event);
    });

    expect(reactFlowInstance!.screenToFlowPosition).toHaveBeenCalledWith({ x: 300, y: 400 });
    expect(addNode).toHaveBeenCalledWith({ x: 50, y: 60 });
  });

  it("Test 5 (onDrop sidebar node no instance): does NOT call addNode when reactFlowInstance is null", () => {
    const { result } = renderHook(() => useCanvasHandlers(makeArgs({ reactFlowInstance: null })));
    const event = makeDragEvent({
      dataTransferData: { "application/reactflow": "urlNode" },
    });

    act(() => {
      result.current.onDrop(event);
    });

    expect(addNode).not.toHaveBeenCalled();
  });

  it("Test 6 (onAddNode with instance): calls addNode with screenToFlowPosition at window center", () => {
    const { result } = renderHook(() => useCanvasHandlers(makeArgs()));

    act(() => {
      result.current.onAddNode();
    });

    expect(reactFlowInstance!.screenToFlowPosition).toHaveBeenCalledWith({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    expect(addNode).toHaveBeenCalledWith({ x: 50, y: 60 });
  });

  it("Test 7 (onAddNode without instance): calls addNode with {x:250, y:250} fallback", () => {
    const { result } = renderHook(() => useCanvasHandlers(makeArgs({ reactFlowInstance: null })));

    act(() => {
      result.current.onAddNode();
    });

    expect(addNode).toHaveBeenCalledWith({ x: 250, y: 250 });
  });

  it("Test 8 (onConnect with sourceHandle): passes connection unmodified into setEdges updater", () => {
    const { result } = renderHook(() => useCanvasHandlers(makeArgs()));
    const connection = makeConnection({
      sourceHandle: "handle-top",
      targetHandle: "handle-bottom",
    });

    act(() => {
      result.current.onConnect(connection as import("@xyflow/react").Connection);
    });

    expect(setEdges).toHaveBeenCalledOnce();
    const updater = setEdges.mock.calls[0][0];
    const output = updater([]);
    expect(output[0].type).toBe("linkCountEdge");
    expect(output[0].source).toBe("n1");
    expect(output[0].target).toBe("n2");
  });

  it("Test 9 (onConnect without sourceHandle): computes handles via getClosestHandleIds and merges into connection", () => {
    const nodes = [makeNode("n1"), makeNode("n2")];
    const { result } = renderHook(() => useCanvasHandlers(makeArgs({ nodes })));
    const connection = makeConnection({ source: "n1", target: "n2", sourceHandle: null });

    act(() => {
      result.current.onConnect(connection as import("@xyflow/react").Connection);
    });

    expect(setEdges).toHaveBeenCalledOnce();
    const updater = setEdges.mock.calls[0][0];
    const output = updater([]);
    expect(output[0].type).toBe("linkCountEdge");
    expect(output[0].markerEnd).toEqual({ type: MarkerType.ArrowClosed, color: "#9CA3AF" });
    expect(output[0].data.linkCount).toBe(1);
    expect(typeof output[0].data.onLinkCountChange).toBe("function");
  });

  it("Test 10 (onConnect missing node): passes un-handled connection through when source/target not found in nodes", () => {
    const nodes = [makeNode("n1")]; // only n1, not n2
    const { result } = renderHook(() => useCanvasHandlers(makeArgs({ nodes })));
    const connection = makeConnection({ source: "n1", target: "n-missing", sourceHandle: null });

    act(() => {
      result.current.onConnect(connection as import("@xyflow/react").Connection);
    });

    expect(setEdges).toHaveBeenCalledOnce();
    const updater = setEdges.mock.calls[0][0];
    const output = updater([]);
    expect(output[0].type).toBe("linkCountEdge");
  });
});
