import { renderHook } from "@testing-library/react";
import type { Node, Edge } from "@xyflow/react";
import { useGraphAnalytics } from "./useGraphAnalytics";
import type { AppNodeData } from "../App";
import type { LinkCountEdgeData } from "../lib/graph-utils";

function makeNode(id: string, overrides: Partial<AppNodeData> = {}): Node<AppNodeData> {
  return {
    id,
    type: "urlNode",
    position: { x: 0, y: 0 },
    data: {
      urlTemplate: `/${id}`,
      pageCount: 1,
      onUpdate: () => {},
      onRootToggle: () => {},
      onZIndexChange: () => {},
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
    data: { linkCount },
  };
}

describe("useGraphAnalytics", () => {
  it("Test 1 (empty graph): returns empty structures for empty nodes/edges", () => {
    const { result } = renderHook(() => useGraphAnalytics([], []));

    expect(result.current.scores).toBeInstanceOf(Map);
    expect(result.current.scores.size).toBe(0);
    expect(result.current.weakNodes).toBeInstanceOf(Set);
    expect(result.current.weakNodes.size).toBe(0);
    expect(result.current.allScoreValues).toEqual([]);
    expect(result.current.rootId).toBeNull();
    expect(result.current.depthMap).toBeInstanceOf(Map);
    expect(result.current.depthMap.size).toBe(0);
    expect(result.current.orphanNodes).toBeInstanceOf(Set);
    expect(result.current.orphanNodes.size).toBe(0);
    expect(result.current.unreachableNodes).toBeInstanceOf(Set);
    expect(result.current.unreachableNodes.size).toBe(0);
    expect(result.current.outboundMap).toBeInstanceOf(Map);
    expect(result.current.outboundMap.size).toBe(0);
    expect(result.current.enrichedNodes).toEqual([]);
  });

  it("Test 2 (rootId derivation): rootId equals the node with isRoot=true", () => {
    const nodes = [makeNode("a", { isRoot: true }), makeNode("b")];

    const { result } = renderHook(() => useGraphAnalytics(nodes, []));

    expect(result.current.rootId).toBe("a");
  });

  it("Test 3 (enrichedNodes): every node carries defined scoreTier, numeric outboundCount, boolean isOverLinked", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];

    const { result } = renderHook(() => useGraphAnalytics(nodes, edges));

    for (const node of result.current.enrichedNodes) {
      expect(node.data.scoreTier).toBeDefined();
      expect(typeof node.data.outboundCount).toBe("number");
      expect(typeof node.data.isOverLinked).toBe("boolean");
    }
  });

  it("Test 4 (referential stability): scores Map reference is stable across re-renders with same inputs", () => {
    const nodes = [makeNode("a")];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const { result, rerender } = renderHook(() => useGraphAnalytics(nodes, edges));

    const firstScores = result.current.scores;
    rerender();
    expect(result.current.scores).toBe(firstScores);
  });

  it("Test 5 (unreachableNodes from Infinity): nodes with depth=Infinity appear in unreachableNodes", () => {
    // Setup: root node "a" with no path to "b" (b has no inbound edge from a's subtree)
    const nodes = [makeNode("a", { isRoot: true }), makeNode("b")];
    // No edges connecting a → b, so b is unreachable from root
    const edges: Edge<LinkCountEdgeData>[] = [];

    const { result } = renderHook(() => useGraphAnalytics(nodes, edges));

    // "b" has no path from root "a", so depthMap should have Infinity for "b"
    expect(result.current.unreachableNodes.has("b")).toBe(true);
  });
});
