import type { Node, Edge } from "@xyflow/react";
import type { UrlNodeData, LinkCountEdgeData } from "./graph-utils";
import { calculatePageRank, classifyScoreTier } from "./graph-pagerank";

function makeNode(id: string, overrides: Partial<UrlNodeData> = {}): Node<UrlNodeData> {
  return {
    id,
    type: "urlNode",
    position: { x: 0, y: 0 },
    data: {
      urlTemplate: `/${id}`,
      pageCount: 1,
      ...overrides,
    } as UrlNodeData,
  };
}

function makeEdge(source: string, target: string, linkCount = 1): Edge<LinkCountEdgeData> {
  return { id: `e-${source}-${target}`, source, target, data: { linkCount } };
}

describe("calculatePageRank - self-loop exclusion", () => {
  it("self-loop does not affect scores — two nodes with and without self-loop produce equal results", () => {
    const nodesWithLoop = [makeNode("a"), makeNode("b")];
    const nodesWithoutLoop = [makeNode("a"), makeNode("b")];
    const selfLoop = makeEdge("a", "a", 10);

    const scoresWithLoop = calculatePageRank(nodesWithLoop, [selfLoop]);
    const scoresWithoutLoop = calculatePageRank(nodesWithoutLoop, []);

    expect(scoresWithLoop.get("a")).toBeCloseTo(scoresWithoutLoop.get("a")!, 5);
    expect(scoresWithLoop.get("b")).toBeCloseTo(scoresWithoutLoop.get("b")!, 5);
  });

  it("self-loop on high-pageCount node does not trap rank — rank flows to other nodes", () => {
    const nodes = [makeNode("source"), makeNode("sink", { pageCount: 1000 }), makeNode("other")];
    const edges = [
      makeEdge("source", "sink", 10),
      makeEdge("source", "other", 10),
      makeEdge("sink", "sink", 6),
    ];

    const scores = calculatePageRank(nodes, edges);
    expect(scores.get("other")!).toBeGreaterThan(1 - 0.85);
  });
});

describe("calculatePageRank - Personalized PageRank (root-biased teleport)", () => {
  it("root receives N·(1-d) teleport mass — far above non-root disconnected nodes", () => {
    // 3 disconnected nodes: root + a + b. With root-biased teleport, root gets
    // N·(1-d) = 3·0.15 = 0.45 teleport, others get 0. Dangling rank also flows to root.
    // Non-root disconnected nodes converge to near-zero rather than 1.0.
    const nodes = [makeNode("root", { isRoot: true }), makeNode("a"), makeNode("b")];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const scores = calculatePageRank(nodes, edges, "root");

    expect(scores.get("root")!).toBeGreaterThan(scores.get("a")!);
    expect(scores.get("root")!).toBeGreaterThan(scores.get("b")!);
    // Scores still sum to N (conservation preserved under personalized teleport)
    const total = [...scores.values()].reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(nodes.length, 1);
  });

  it("root is not classified as 'low' even when isolated with no explicit inbound", () => {
    const nodes = [
      makeNode("root", {
        isRoot: true,
        isGlobal: true,
        placements: [{ id: "p1", name: "Header", linkCount: 1 }],
        pageCount: 1,
      }),
      makeNode("a", { pageCount: 500 }),
      makeNode("b", { pageCount: 500 }),
    ];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const scores = calculatePageRank(nodes, edges, "root");
    const tier = classifyScoreTier(scores.get("root")!, [...scores.values()]);

    expect(tier).not.toBe("low");
  });

  it("rootId=null falls back to uniform teleport (classic PageRank)", () => {
    // Without rootId, three disconnected nodes should have equal scores.
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const scoresNull = calculatePageRank(nodes, [], null);
    const scoresNoArg = calculatePageRank(nodes, []);

    for (const id of ["a", "b", "c"]) {
      expect(scoresNull.get(id)).toBeCloseTo(scoresNoArg.get(id)!, 5);
    }
    expect(scoresNull.get("a")).toBeCloseTo(scoresNull.get("b")!, 5);
    expect(scoresNull.get("b")).toBeCloseTo(scoresNull.get("c")!, 5);
  });

  it("non-root nodes are not directly boosted by the teleport vector", () => {
    // a and b both receive 0 teleport mass; their scores only come from inbound rank.
    const nodes = [makeNode("root", { isRoot: true }), makeNode("a"), makeNode("b")];
    const scores = calculatePageRank(nodes, [], "root");

    expect(scores.get("a")).toBeCloseTo(scores.get("b")!, 5);
  });
});
