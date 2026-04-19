import { describe, it, expect } from "vitest";
import { serializeGraph } from "./serialize-graph";
import type { Node, Edge } from "@xyflow/react";
import type { AppNodeData } from "../App";
import type { LinkCountEdgeData } from "./graph-utils";
import { MarkerType } from "@xyflow/react";

// Minimal AppNodeData factory with runtime callbacks
function makeNode(id: string, overrides: Partial<AppNodeData> = {}): Node<AppNodeData> {
  return {
    id,
    type: "urlNode",
    position: { x: 10, y: 20 },
    data: {
      urlTemplate: "/page/<id>",
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
  overrides: Partial<Edge<LinkCountEdgeData>> = {},
): Edge<LinkCountEdgeData> {
  return {
    id,
    source,
    target,
    type: "linkCountEdge",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#9CA3AF" },
    sourceHandle: null,
    targetHandle: null,
    data: { linkCount: 3 },
    ...overrides,
  };
}

describe("serializeGraph", () => {
  it("Test 1: strips runtime-only fields from node.data, keeping only serializable fields", () => {
    const node = makeNode("n1", {
      urlTemplate: "/blog/<id>",
      pageCount: 5,
      // runtime fields
      scoreTier: "high",
      isWeak: true,
      isOrphan: false,
      isUnreachable: false,
      crawlDepth: 2,
      outboundCount: 3,
      isOverLinked: false,
      isDimmed: false,
    });

    const { nodes } = serializeGraph([node], []);
    const serialized = nodes[0];

    // Should have serializable fields
    expect(serialized.data.urlTemplate).toBe("/blog/<id>");
    expect(serialized.data.pageCount).toBe(5);

    // Should NOT have runtime fields
    expect("onUpdate" in serialized.data).toBe(false);
    expect("onRootToggle" in serialized.data).toBe(false);
    expect("onZIndexChange" in serialized.data).toBe(false);
    expect("scoreTier" in serialized.data).toBe(false);
    expect("isWeak" in serialized.data).toBe(false);
    expect("isOrphan" in serialized.data).toBe(false);
    expect("isUnreachable" in serialized.data).toBe(false);
    expect("crawlDepth" in serialized.data).toBe(false);
    expect("outboundCount" in serialized.data).toBe(false);
    expect("isOverLinked" in serialized.data).toBe(false);
    expect("isDimmed" in serialized.data).toBe(false);
  });

  it("Test 2: omits optional fields when falsy", () => {
    const node = makeNode("n1", {
      isGlobal: false,
      placements: [],
      isRoot: false,
      tags: [],
    });

    const { nodes } = serializeGraph([node], []);
    const data = nodes[0].data;

    expect("isGlobal" in data).toBe(false);
    expect("placements" in data).toBe(false);
    expect("isRoot" in data).toBe(false);
    expect("tags" in data).toBe(false);
  });

  it("Test 3: includes optional fields when truthy", () => {
    const node = makeNode("n1", {
      isGlobal: true,
      placements: [{ id: "p1", name: "Home", linkCount: 2 }],
      isRoot: true,
      tags: ["x"],
    });

    const { nodes } = serializeGraph([node], []);
    const data = nodes[0].data;

    expect(data.isGlobal).toBe(true);
    expect(data.placements).toEqual([{ id: "p1", name: "Home", linkCount: 2 }]);
    expect(data.isRoot).toBe(true);
    expect(data.tags).toEqual(["x"]);
  });

  it("Test 4: passes through node id, type, and position verbatim", () => {
    const node = makeNode("my-node");
    node.type = "urlNode";
    node.position = { x: 42, y: 99 };

    const { nodes } = serializeGraph([node], []);
    expect(nodes[0].id).toBe("my-node");
    expect(nodes[0].type).toBe("urlNode");
    expect(nodes[0].position).toEqual({ x: 42, y: 99 });
  });

  it("Test 5: maps edges to correct shape, defaulting linkCount to 1 when undefined", () => {
    const edge = makeEdge("e1", "n1", "n2", {
      sourceHandle: "handle-s",
      targetHandle: "handle-t",
      type: "linkCountEdge",
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { linkCount: undefined as unknown as number },
    });

    const { edges } = serializeGraph([], [edge]);
    const serialized = edges[0];

    expect(serialized.id).toBe("e1");
    expect(serialized.source).toBe("n1");
    expect(serialized.target).toBe("n2");
    expect(serialized.sourceHandle).toBe("handle-s");
    expect(serialized.targetHandle).toBe("handle-t");
    expect(serialized.type).toBe("linkCountEdge");
    expect(serialized.data.linkCount).toBe(1);
  });

  it("Test 6: preserves null sourceHandle/targetHandle (does not convert to undefined)", () => {
    const edge = makeEdge("e1", "n1", "n2", {
      sourceHandle: null,
      targetHandle: null,
      data: { linkCount: 2 },
    });

    const { edges } = serializeGraph([], [edge]);
    expect(edges[0].sourceHandle).toBeNull();
    expect(edges[0].targetHandle).toBeNull();
  });

  it("Test 7 (integration): round-trip through JSON stringify/parse produces equivalent shape with no function refs", () => {
    const node = makeNode("n1", {
      urlTemplate: "/products/<id>",
      pageCount: 10,
      isGlobal: true,
      tags: ["seo", "product"],
      // runtime
      scoreTier: "mid",
      isWeak: false,
      crawlDepth: 3,
    });
    const edge = makeEdge("e1", "n1", "n2", { data: { linkCount: 5 } });

    const result = serializeGraph([node], [edge]);
    const roundTripped = JSON.parse(JSON.stringify(result));

    // No functions survive JSON round-trip
    expect(typeof roundTripped.nodes[0].data.onUpdate).toBe("undefined");
    // Data shape preserved
    expect(roundTripped.nodes[0].data.urlTemplate).toBe("/products/<id>");
    expect(roundTripped.nodes[0].data.isGlobal).toBe(true);
    expect(roundTripped.nodes[0].data.tags).toEqual(["seo", "product"]);
    expect(roundTripped.edges[0].data.linkCount).toBe(5);
  });
});
