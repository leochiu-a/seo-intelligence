import { renderHook } from "@testing-library/react";
import type { Node, Edge } from "@xyflow/react";
import { useHighlightedNodes } from "./useHighlightedNodes";
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

describe("useHighlightedNodes", () => {
  it("Test 1 (no filters, no route): returns highlightedNodeIds=null and no node is dimmed", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const { result } = renderHook(() => useHighlightedNodes(nodes, edges, new Set(), null));

    expect(result.current.highlightedNodeIds).toBeNull();
    for (const node of result.current.styledNodes) {
      expect(node.data.isDimmed).toBeFalsy();
    }
  });

  it("Test 2 (placement filter dims non-matching nodes): non-matching nodes get isDimmed=true", () => {
    const globalNode = makeNode("global", {
      isGlobal: true,
      placements: [{ id: "p1", name: "Header", linkCount: 1 }],
    });
    const regularNode = makeNode("regular");
    const nodes = [globalNode, regularNode];
    const edges: Edge<LinkCountEdgeData>[] = [];
    const activeFilters = new Set(["placement-name:Header"]);

    const { result } = renderHook(() => useHighlightedNodes(nodes, edges, activeFilters, null));

    const styledGlobal = result.current.styledNodes.find((n) => n.id === "global");
    const styledRegular = result.current.styledNodes.find((n) => n.id === "regular");
    expect(styledGlobal?.data.isDimmed).toBe(false);
    expect(styledRegular?.data.isDimmed).toBe(true);
  });

  it("Test 3 (cluster filter dims non-matching nodes): non-tagged node gets isDimmed=true", () => {
    const taggedNode = makeNode("tagged", { tags: ["food"] });
    const untaggedNode = makeNode("untagged");
    const nodes = [taggedNode, untaggedNode];
    const edges: Edge<LinkCountEdgeData>[] = [];
    const activeFilters = new Set(["cluster:food"]);

    const { result } = renderHook(() => useHighlightedNodes(nodes, edges, activeFilters, null));

    const styledTagged = result.current.styledNodes.find((n) => n.id === "tagged");
    const styledUntagged = result.current.styledNodes.find((n) => n.id === "untagged");
    expect(styledTagged?.data.isDimmed).toBe(false);
    expect(styledUntagged?.data.isDimmed).toBe(true);
  });

  it("Test 4 (AND across dimensions): node matching placement but not cluster is dimmed", () => {
    const globalNode = makeNode("global", {
      isGlobal: true,
      placements: [{ id: "p1", name: "Header", linkCount: 1 }],
      // no "food" tag - doesn't match cluster filter
    });
    const nodes = [globalNode];
    const edges: Edge<LinkCountEdgeData>[] = [];
    const activeFilters = new Set(["placement-name:Header", "cluster:food"]);

    const { result } = renderHook(() => useHighlightedNodes(nodes, edges, activeFilters, null));

    // highlightedNodeIds should NOT contain global (AND: must match both dimensions)
    expect(result.current.highlightedNodeIds?.has("global")).toBeFalsy();
  });

  it("Test 5 (route highlight overrides filter): highlightedNodeIds equals connected elements of route node", () => {
    const nodes = [makeNode("n1"), makeNode("n2"), makeNode("n3")];
    const edges = [makeEdge("e1", "n1", "n2")];
    const activeFilters = new Set(["cluster:food"]); // active filter

    const { result } = renderHook(() => useHighlightedNodes(nodes, edges, activeFilters, "n1"));

    // Route highlight overrides filter — highlightedNodeIds should include n1 and n2 (connected elements)
    expect(result.current.highlightedNodeIds).not.toBeNull();
    expect(result.current.highlightedNodeIds?.has("n1")).toBe(true);
    expect(result.current.highlightedNodeIds?.has("n2")).toBe(true);
    // n3 is not connected to n1 so should not be included
    expect(result.current.highlightedNodeIds?.has("n3")).toBe(false);
  });

  it("Test 6 (styled referential stability): unchanged node reference is returned as-is", () => {
    const nodeA = makeNode("a"); // no isDimmed
    const nodes = [nodeA];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const { result, rerender } = renderHook(() =>
      useHighlightedNodes(nodes, edges, new Set(), null),
    );

    const firstStyledA = result.current.styledNodes.find((n) => n.id === "a");
    rerender();
    const secondStyledA = result.current.styledNodes.find((n) => n.id === "a");
    // Same reference because isDimmed didn't change (still falsy → false)
    expect(firstStyledA).toBe(secondStyledA);
  });
});
