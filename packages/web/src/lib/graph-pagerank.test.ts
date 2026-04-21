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

describe("calculatePageRank - rootId parameter", () => {
  it("Test A: root node score is higher than non-root nodes when rootId is provided (3 nodes, no edges)", () => {
    // 3 nodes: root + 2 others, no edges, no global nodes
    // Root should receive synthetic inbound from the 2 others -> higher score
    const nodes = [makeNode("root", { isRoot: true }), makeNode("a"), makeNode("b")];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const scores = calculatePageRank(nodes, edges, "root");

    const rootScore = scores.get("root")!;
    const aScore = scores.get("a")!;
    const bScore = scores.get("b")!;

    expect(rootScore).toBeGreaterThan(aScore);
    expect(rootScore).toBeGreaterThan(bScore);
  });

  it("Test B: root node that is also global but has no placements escapes 'low' tier when there are 3+ nodes", () => {
    // Root is global but has no placements — global injection skips it (totalPlacementLinks=0)
    // Root injection should still fire
    const nodes = [
      makeNode("root", { isRoot: true, isGlobal: true, placements: [] }),
      makeNode("a"),
      makeNode("b"),
    ];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const scores = calculatePageRank(nodes, edges, "root");

    const allScores = [...scores.values()];
    const rootScore = scores.get("root")!;
    const tier = classifyScoreTier(rootScore, allScores);

    expect(tier).not.toBe("low");
  });

  it("Test C: non-root, non-global nodes are unaffected by root injection (do not receive extra synthetic inbound)", () => {
    // In a 3-node graph with a root, only root gets synthetic inbound from others.
    // Non-root nodes "a" and "b" should NOT receive synthetic inbound from root injection.
    const nodes = [makeNode("root", { isRoot: true }), makeNode("a"), makeNode("b")];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const scores = calculatePageRank(nodes, edges, "root");

    // "a" and "b" should have equal scores (no asymmetry introduced between them)
    const aScore = scores.get("a")!;
    const bScore = scores.get("b")!;
    expect(aScore).toBeCloseTo(bScore, 5);
  });

  it("Test D: rootId=null — behavior is unchanged, no root injection", () => {
    // Without rootId, scores should match classic 3-node graph output (no injection)
    const nodes = [makeNode("root"), makeNode("a"), makeNode("b")];
    const edges: Edge<LinkCountEdgeData>[] = [];

    const scoresWithNull = calculatePageRank(nodes, edges, null);
    const scoresWithoutArg = calculatePageRank(nodes, edges);

    // All three nodes should have equal scores when no root injection and no edges
    const rootScore = scoresWithNull.get("root")!;
    const aScore = scoresWithNull.get("a")!;
    const bScore = scoresWithNull.get("b")!;

    expect(rootScore).toBeCloseTo(aScore, 5);
    expect(rootScore).toBeCloseTo(bScore, 5);

    // Should match output of calling without rootId
    for (const [id, score] of scoresWithNull) {
      expect(score).toBeCloseTo(scoresWithoutArg.get(id)!, 5);
    }
  });
});
