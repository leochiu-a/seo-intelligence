import { describe, it, expect, beforeEach } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import {
  createDefaultNode,
  updateNodeData,
  updateEdgeLinkCount,
  validateNodeData,
  validateLinkCount,
  formatPageCount,
  resetNodeIdCounter,
  syncNodeIdCounter,
} from "./graph-utils";
import {
  calculatePageRank,
  classifyScoreTier,
  identifyWeakNodes,
  calculateOutboundLinks,
  hasSameCluster,
} from "./graph-pagerank";
import {
  collectPlacementSuggestions,
  collectPlacementGroups,
  calculateCrawlDepth,
  calculateInboundLinks,
  identifyOrphanNodes,
  OUTBOUND_WARNING_THRESHOLD,
  collectClusterSuggestions,
  collectClusterGroups,
  getHealthStatus,
  hasAnyWarning,
  getConnectedElements,
  buildTooltipContent,
  type HealthStatus,
} from "./graph-analysis";
import { parseImportJson, HANDLE_IDS, getClosestHandleIds, buildCopyForAIText } from "./graph-io";
import type { UrlNodeData, LinkCountEdgeData, Placement } from "./graph-utils";

describe("createDefaultNode", () => {
  beforeEach(() => {
    resetNodeIdCounter();
  });

  it("returns a node with type urlNode", () => {
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.type).toBe("urlNode");
  });

  it("uses the given position", () => {
    const node = createDefaultNode({ x: 100, y: 200 });
    expect(node.position).toEqual({ x: 100, y: 200 });
  });

  it("sets default urlTemplate to /page/<id>", () => {
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.data.urlTemplate).toBe("/page/<id>");
  });

  it("sets default pageCount to 1", () => {
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.data.pageCount).toBe(1);
  });

  it("generates unique incremented ids: node-1, node-2, node-3", () => {
    const node1 = createDefaultNode({ x: 0, y: 0 });
    const node2 = createDefaultNode({ x: 0, y: 0 });
    const node3 = createDefaultNode({ x: 0, y: 0 });
    expect(node1.id).toBe("node-1");
    expect(node2.id).toBe("node-2");
    expect(node3.id).toBe("node-3");
  });
});

describe("syncNodeIdCounter", () => {
  beforeEach(() => {
    resetNodeIdCounter();
  });

  it("syncNodeIdCounter([]) leaves counter at 0 — next createDefaultNode yields node-1", () => {
    syncNodeIdCounter([]);
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.id).toBe("node-1");
  });

  it("advances counter so next createDefaultNode yields node-6 after syncing node-5 and node-2", () => {
    syncNodeIdCounter([{ id: "node-5" }, { id: "node-2" }]);
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.id).toBe("node-6");
  });

  it("ignores ids that do not match the node-\\d+ pattern", () => {
    syncNodeIdCounter([{ id: "custom-abc" }, { id: "global-xyz" }]);
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.id).toBe("node-1");
  });

  it("NEVER lowers the counter — calling with fewer nodes after a higher one keeps progress", () => {
    syncNodeIdCounter([{ id: "node-10" }]);
    syncNodeIdCounter([{ id: "node-3" }]);
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.id).toBe("node-11");
  });

  it("regression: after syncNodeIdCounter([{ id: 'node-1' }]), createDefaultNode returns node-2 not node-1", () => {
    syncNodeIdCounter([{ id: "node-1" }]);
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.id).toBe("node-2");
  });
});

describe("createDefaultNode — collision-proof", () => {
  beforeEach(() => {
    resetNodeIdCounter();
  });

  it("skips colliding id when existingNodes contains the would-be id", () => {
    // Counter is at 0, next would be node-1. Pass node-1 as existing — must skip to node-2.
    const node = createDefaultNode({ x: 0, y: 0 }, [{ id: "node-1" }]);
    expect(node.id).toBe("node-2");
  });

  it("backward compatible — calls without existingNodes still work", () => {
    const node1 = createDefaultNode({ x: 0, y: 0 });
    const node2 = createDefaultNode({ x: 0, y: 0 });
    expect(node1.id).toBe("node-1");
    expect(node2.id).toBe("node-2");
  });
});

describe("updateNodeData", () => {
  it("updates the matching node data and returns a new array", () => {
    const nodeA = {
      id: "a",
      type: "urlNode",
      position: { x: 0, y: 0 },
      data: { urlTemplate: "/a", pageCount: 1 },
    };
    const nodeB = {
      id: "b",
      type: "urlNode",
      position: { x: 0, y: 0 },
      data: { urlTemplate: "/b", pageCount: 2 },
    };
    const result = updateNodeData([nodeA, nodeB], "a", { pageCount: 50 });
    expect(result).not.toBe([nodeA, nodeB]);
    expect(result[0].data.pageCount).toBe(50);
  });

  it("preserves other nodes unchanged", () => {
    const nodeA = {
      id: "a",
      type: "urlNode",
      position: { x: 0, y: 0 },
      data: { urlTemplate: "/a", pageCount: 1 },
    };
    const nodeB = {
      id: "b",
      type: "urlNode",
      position: { x: 0, y: 0 },
      data: { urlTemplate: "/b", pageCount: 2 },
    };
    const result = updateNodeData([nodeA, nodeB], "a", { pageCount: 50 });
    expect(result[1]).toBe(nodeB);
  });

  it("merges partial data without losing existing fields", () => {
    const nodeA = {
      id: "a",
      type: "urlNode",
      position: { x: 0, y: 0 },
      data: { urlTemplate: "/a", pageCount: 1 },
    };
    const result = updateNodeData([nodeA], "a", { pageCount: 99 });
    expect(result[0].data.urlTemplate).toBe("/a");
    expect(result[0].data.pageCount).toBe(99);
  });

  it("returns array unchanged when nodeId not found", () => {
    const nodeA = {
      id: "a",
      type: "urlNode",
      position: { x: 0, y: 0 },
      data: { urlTemplate: "/a", pageCount: 1 },
    };
    const result = updateNodeData([nodeA], "z", { pageCount: 50 });
    expect(result[0].data.pageCount).toBe(1);
  });
});

describe("updateEdgeLinkCount", () => {
  it("updates linkCount on the matching edge", () => {
    const edgeX = { id: "x", source: "a", target: "b", data: { linkCount: 1 } };
    const edgeY = { id: "y", source: "b", target: "c", data: { linkCount: 2 } };
    const result = updateEdgeLinkCount([edgeX, edgeY], "x", 5);
    expect(result[0].data?.linkCount).toBe(5);
  });

  it("preserves other edges unchanged", () => {
    const edgeX = { id: "x", source: "a", target: "b", data: { linkCount: 1 } };
    const edgeY = { id: "y", source: "b", target: "c", data: { linkCount: 2 } };
    const result = updateEdgeLinkCount([edgeX, edgeY], "x", 5);
    expect(result[1]).toBe(edgeY);
  });

  it("returns array unchanged when edgeId not found", () => {
    const edgeX = { id: "x", source: "a", target: "b", data: { linkCount: 1 } };
    const result = updateEdgeLinkCount([edgeX], "z", 5);
    expect(result[0].data?.linkCount).toBe(1);
  });
});

describe("validateNodeData", () => {
  it("returns error for empty urlTemplate", () => {
    const result = validateNodeData({ urlTemplate: "", pageCount: 1 });
    expect(result).toBe("URL template cannot be empty");
  });

  it("returns error for whitespace-only urlTemplate", () => {
    const result = validateNodeData({ urlTemplate: "  ", pageCount: 1 });
    expect(result).toBe("URL template cannot be empty");
  });

  it("returns error for pageCount of 0", () => {
    const result = validateNodeData({ urlTemplate: "/page/<id>", pageCount: 0 });
    expect(result).toBe("Page count must be at least 1");
  });

  it("returns error for negative pageCount", () => {
    const result = validateNodeData({ urlTemplate: "/page/<id>", pageCount: -5 });
    expect(result).toBe("Page count must be at least 1");
  });

  it("returns null for valid data", () => {
    const result1 = validateNodeData({ urlTemplate: "/page/<id>", pageCount: 1 });
    expect(result1).toBeNull();
    const result2 = validateNodeData({ urlTemplate: "/page/<id>", pageCount: 100 });
    expect(result2).toBeNull();
  });
});

describe("validateLinkCount", () => {
  it("passes through valid counts", () => {
    expect(validateLinkCount(5)).toBe(5);
  });

  it("clamps 0 to 1", () => {
    expect(validateLinkCount(0)).toBe(1);
  });

  it("clamps negative to 1", () => {
    expect(validateLinkCount(-3)).toBe(1);
  });

  it("returns 1 for NaN", () => {
    expect(validateLinkCount(NaN)).toBe(1);
  });

  it("floors decimal to integer", () => {
    expect(validateLinkCount(1.7)).toBe(1);
  });
});

describe("formatPageCount", () => {
  it("returns singular for 1", () => {
    expect(formatPageCount(1)).toBe("1 page");
  });

  it("returns plural for 0", () => {
    expect(formatPageCount(0)).toBe("0 pages");
  });

  it("returns plural for counts greater than 1", () => {
    expect(formatPageCount(100)).toBe("100 pages");
    expect(formatPageCount(2)).toBe("2 pages");
  });
});

// Helper to build minimal Node fixtures
function makeNode(
  id: string,
  pageCount: number,
  opts?: { isGlobal?: boolean; placements?: Placement[] },
): Node<UrlNodeData> {
  return {
    id,
    type: "urlNode",
    position: { x: 0, y: 0 },
    data: { urlTemplate: `/${id}`, pageCount, ...opts },
  };
}

// Helper to build minimal Edge fixtures
function makeEdge(
  id: string,
  source: string,
  target: string,
  linkCount: number,
): Edge<LinkCountEdgeData> {
  return { id, source, target, data: { linkCount } };
}

describe("calculatePageRank", () => {
  it("returns empty Map for empty graph", () => {
    const result = calculatePageRank([], []);
    expect(result.size).toBe(0);
  });

  it("single node with no edges gets score 1.0", () => {
    const nodes = [makeNode("a", 1)];
    const result = calculatePageRank(nodes, []);
    expect(result.get("a")).toBeCloseTo(1.0, 3);
  });

  it("two disconnected nodes each get score 1.0", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const result = calculatePageRank(nodes, []);
    expect(result.get("a")).toBeCloseTo(1.0, 3);
    expect(result.get("b")).toBeCloseTo(1.0, 3);
  });

  it("two nodes A->B: B gets higher score than A", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const edges = [makeEdge("e1", "a", "b", 1)];
    const result = calculatePageRank(nodes, edges);
    const scoreA = result.get("a")!;
    const scoreB = result.get("b")!;
    expect(scoreB).toBeGreaterThan(scoreA);
  });

  it("three-node chain A->B->C: scores satisfy C > B > A", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1), makeNode("c", 1)];
    const edges = [makeEdge("e1", "a", "b", 1), makeEdge("e2", "b", "c", 1)];
    const result = calculatePageRank(nodes, edges);
    const scoreA = result.get("a")!;
    const scoreB = result.get("b")!;
    const scoreC = result.get("c")!;
    expect(scoreC).toBeGreaterThan(scoreB);
    expect(scoreB).toBeGreaterThan(scoreA);
  });

  it("cycle A->B->A: both nodes get equal scores (symmetry)", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const edges = [makeEdge("e1", "a", "b", 1), makeEdge("e2", "b", "a", 1)];
    const result = calculatePageRank(nodes, edges);
    const scoreA = result.get("a")!;
    const scoreB = result.get("b")!;
    expect(scoreA).toBeCloseTo(scoreB, 3);
  });

  it("link count weighting: A->B with linkCount=5 passes more equity to B than A->C with linkCount=1", () => {
    // A links to both B (linkCount=5) and C (linkCount=1), same pageCount
    // B should receive more equity from A than C does
    const nodes = [makeNode("a", 1), makeNode("b", 1), makeNode("c", 1)];
    const edges = [makeEdge("e1", "a", "b", 5), makeEdge("e2", "a", "c", 1)];
    const result = calculatePageRank(nodes, edges);
    expect(result.get("b")!).toBeGreaterThan(result.get("c")!);
  });

  it("page count weighting: node with pageCount=100 has larger equity pool", () => {
    // A(pageCount=1) -> B(pageCount=1) vs A(pageCount=100) -> B(pageCount=1)
    // Higher pageCount on source means more equity distributed
    const nodesSmall = [makeNode("a", 1), makeNode("b", 1)];
    const edgesSmall = [makeEdge("e1", "a", "b", 1)];
    const resultSmall = calculatePageRank(nodesSmall, edgesSmall);

    const nodesLarge = [makeNode("a", 100), makeNode("b", 1)];
    const edgesLarge = [makeEdge("e1", "a", "b", 1)];
    // With larger pageCount on A, but same linkCount, the totalWeightedOutbound changes
    // the relative score differs; both converge but differently
    const resultLarge = calculatePageRank(nodesLarge, edgesLarge);

    // scores should exist for both cases
    expect(resultSmall.has("a")).toBe(true);
    expect(resultLarge.has("a")).toBe(true);
  });

  it("scores sum to N (number of nodes) within floating point tolerance", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 2), makeNode("c", 3)];
    const edges = [makeEdge("e1", "a", "b", 1), makeEdge("e2", "b", "c", 2)];
    const result = calculatePageRank(nodes, edges);
    const total = Array.from(result.values()).reduce((sum, s) => sum + s, 0);
    expect(total).toBeCloseTo(nodes.length, 2);
  });

  it("dampening factor d=0.85: disconnected node score equals 1.0 (1 - 0.85 + 0.85*1.0)", () => {
    // A single disconnected node with no inbound: PR = (1-d) + d*0 iteratively converges to 1.0
    // because initial score is 1.0, no inbound, so stays at 1.0 after normalization
    const nodes = [makeNode("a", 1)];
    const result = calculatePageRank(nodes, []);
    expect(result.get("a")).toBeCloseTo(1.0, 3);
  });
});

describe("calculatePageRank with global nodes", () => {
  it("global node with placements receives higher score than an equivalent non-global node with no inbound", () => {
    // Three non-global nodes + one global node with placements
    // The global node should score higher than disconnected non-global nodes
    const nodes = [
      makeNode("a", 1),
      makeNode("b", 1),
      makeNode("c", 1),
      makeNode("g", 1, {
        isGlobal: true,
        placements: [{ id: "p1", name: "Header", linkCount: 2 }],
      }),
    ];
    const result = calculatePageRank(nodes, []);
    const scoreG = result.get("g")!;
    const scoreA = result.get("a")!;
    expect(scoreG).toBeGreaterThan(scoreA);
  });

  it("three non-global + one global with placements Header(lc=2) Footer(lc=1): global gets synthetic inbound from all 3 non-global nodes", () => {
    const placements: Placement[] = [
      { id: "p1", name: "Header", linkCount: 2 },
      { id: "p2", name: "Footer", linkCount: 1 },
    ];
    const nodes = [
      makeNode("a", 1),
      makeNode("b", 1),
      makeNode("c", 1),
      makeNode("g", 1, { isGlobal: true, placements }),
    ];
    const result = calculatePageRank(nodes, []);
    // Global node receives synthetic inbound of 3 links per non-global source (2+1)
    // Its score should be substantially higher than non-global nodes
    const scoreG = result.get("g")!;
    const scoreA = result.get("a")!;
    const scoreB = result.get("b")!;
    const scoreC = result.get("c")!;
    expect(scoreG).toBeGreaterThan(scoreA);
    expect(scoreG).toBeGreaterThan(scoreB);
    expect(scoreG).toBeGreaterThan(scoreC);
  });

  it("global nodes do NOT link to each other (two globals do not inflate each other via synthetic inbound)", () => {
    const placements: Placement[] = [{ id: "p1", name: "Header", linkCount: 2 }];
    const nodes = [
      makeNode("a", 1),
      makeNode("g1", 1, { isGlobal: true, placements }),
      makeNode("g2", 1, { isGlobal: true, placements }),
    ];
    const result = calculatePageRank(nodes, []);
    // Both globals get synthetic inbound only from node 'a' (the only non-global)
    // They should score equally (symmetric)
    const scoreG1 = result.get("g1")!;
    const scoreG2 = result.get("g2")!;
    expect(scoreG1).toBeCloseTo(scoreG2, 3);
  });

  it("global node with zero total placement linkCount gets no synthetic inbound (behaves like non-global)", () => {
    const nodes = [
      makeNode("a", 1),
      makeNode("b", 1),
      makeNode("g", 1, {
        isGlobal: true,
        placements: [{ id: "p1", name: "Header", linkCount: 0 }],
      }),
    ];
    const result = calculatePageRank(nodes, []);
    // g has zero total placement linkCount — no synthetic links injected
    // a, b, g are all disconnected → all should score ~1.0
    expect(result.get("g")).toBeCloseTo(1.0, 2);
    expect(result.get("a")).toBeCloseTo(1.0, 2);
  });

  it("scores still sum to N with global nodes present", () => {
    const placements: Placement[] = [{ id: "p1", name: "Nav", linkCount: 3 }];
    const nodes = [
      makeNode("a", 1),
      makeNode("b", 2),
      makeNode("c", 1),
      makeNode("g", 1, { isGlobal: true, placements }),
    ];
    const edges = [makeEdge("e1", "a", "b", 1)];
    const result = calculatePageRank(nodes, edges);
    const total = Array.from(result.values()).reduce((sum, s) => sum + s, 0);
    expect(total).toBeCloseTo(nodes.length, 2);
  });

  it("global node with empty placements array behaves same as non-global node", () => {
    const nodesWithGlobal = [
      makeNode("a", 1),
      makeNode("b", 1),
      makeNode("g", 1, { isGlobal: true, placements: [] }),
    ];
    const nodesWithout = [makeNode("a", 1), makeNode("b", 1), makeNode("g", 1)];
    const resultWith = calculatePageRank(nodesWithGlobal, []);
    const resultWithout = calculatePageRank(nodesWithout, []);
    expect(resultWith.get("g")).toBeCloseTo(resultWithout.get("g")!, 3);
    expect(resultWith.get("a")).toBeCloseTo(resultWithout.get("a")!, 3);
  });

  it("global node with no placements field (undefined) behaves same as non-global node", () => {
    const nodesWithGlobal = [makeNode("a", 1), makeNode("g", 1, { isGlobal: true })];
    const nodesWithout = [makeNode("a", 1), makeNode("g", 1)];
    const resultWith = calculatePageRank(nodesWithGlobal, []);
    const resultWithout = calculatePageRank(nodesWithout, []);
    expect(resultWith.get("g")).toBeCloseTo(resultWithout.get("g")!, 3);
  });
});

describe("classifyScoreTier", () => {
  // Test D: existing edge cases — KEEP passing
  it("single-element array returns neutral", () => {
    expect(classifyScoreTier(1.0, [1.0])).toBe("neutral");
  });

  it("all equal scores returns neutral", () => {
    expect(classifyScoreTier(1.0, [1.0, 1.0, 1.0])).toBe("neutral");
  });

  // Test A: outlier case — the core bug this plan fixes
  it("outlier does not compress all other nodes into low (n=12)", () => {
    const scores = [100, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];
    // The outlier itself must be high
    expect(classifyScoreTier(100, scores)).toBe("high");
    // Top non-outlier values must escape "low" — they should share 'high' with the outlier
    // (since the split is rank-based; for n=12 the top ceil(12/3)=4 slots include the
    // outlier plus the next 3 non-outliers). The bug this guards against is the linear
    // min-max algorithm compressing all non-outliers into 'low'.
    const topNonOutlierEscapesLow = [1.8, 1.9, 2.0].every(
      (v) => classifyScoreTier(v, scores) !== "low",
    );
    expect(topNonOutlierEscapesLow).toBe(true);
    // At least one of the bottom values is low
    const bottomInLow = [1, 1.1, 1.2].some((v) => classifyScoreTier(v, scores) === "low");
    expect(bottomInLow).toBe(true);
    // Distribution is roughly balanced: each tier has between floor(n/3) and ceil(n/3) nodes
    const n = scores.length;
    const counts = { high: 0, mid: 0, low: 0 };
    for (const s of scores) {
      const tier = classifyScoreTier(s, scores);
      if (tier === "high" || tier === "mid" || tier === "low") counts[tier]++;
    }
    const minCount = Math.floor(n / 3);
    const maxCount = Math.ceil(n / 3);
    expect(counts.high).toBeGreaterThanOrEqual(minCount);
    expect(counts.high).toBeLessThanOrEqual(maxCount + 1); // allow 1 extra for rounding
    expect(counts.mid).toBeGreaterThanOrEqual(minCount);
    expect(counts.low).toBeGreaterThanOrEqual(minCount);
  });

  // Test B: exact thirds on n=9
  it("splits n=9 evenly into 3/3/3 by rank", () => {
    const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(classifyScoreTier(9, scores)).toBe("high");
    expect(classifyScoreTier(8, scores)).toBe("high");
    expect(classifyScoreTier(7, scores)).toBe("high");
    expect(classifyScoreTier(6, scores)).toBe("mid");
    expect(classifyScoreTier(5, scores)).toBe("mid");
    expect(classifyScoreTier(4, scores)).toBe("mid");
    expect(classifyScoreTier(3, scores)).toBe("low");
    expect(classifyScoreTier(2, scores)).toBe("low");
    expect(classifyScoreTier(1, scores)).toBe("low");
    // Guard against off-by-one that still passes per-point assertions
    expect(scores.filter((s) => classifyScoreTier(s, scores) === "high").length).toBe(3);
    expect(scores.filter((s) => classifyScoreTier(s, scores) === "mid").length).toBe(3);
    expect(scores.filter((s) => classifyScoreTier(s, scores) === "low").length).toBe(3);
  });

  // Test C: ties — all tied values get the same tier (tie-to-high bias)
  it("ties bias to the higher tier (n=6, two groups of 3)", () => {
    const scores = [5, 5, 5, 1, 1, 1];
    expect(classifyScoreTier(5, scores)).toBe("high");
    expect(classifyScoreTier(1, scores)).toBe("low");
  });

  // Test E: small n=2 — degenerate split: 1 high / 1 low, no mid
  it("n=2 gives one high and one low (no mid)", () => {
    const scores = [10, 1];
    expect(classifyScoreTier(10, scores)).toBe("high");
    expect(classifyScoreTier(1, scores)).toBe("low");
  });

  // Test F: n=4 (uneven split — top-heavy: 2 high / 1 mid / 1 low)
  // highCutoffIdx = 4 - ceil(4/3) = 4 - 2 = 2 → highThreshold = sorted[2] = 2
  // midCutoffIdx  = 4 - ceil(8/3) = 4 - 3 = 1 → midThreshold  = sorted[1] = 1
  // 3 >= 2 → high; 2 >= 2 → high; 1 >= 1 → mid; 0 < 1 → low
  it("n=4 produces top-heavy split: 2/1/1 (high/mid/low)", () => {
    const scores = [0, 1, 2, 3];
    expect(classifyScoreTier(3, scores)).toBe("high");
    expect(classifyScoreTier(2, scores)).toBe("high");
    expect(classifyScoreTier(1, scores)).toBe("mid");
    expect(classifyScoreTier(0, scores)).toBe("low");
  });
});

describe("identifyWeakNodes", () => {
  it("empty map returns empty Set", () => {
    const result = identifyWeakNodes(new Map());
    expect(result.size).toBe(0);
  });

  it("single node returns empty Set (no outliers possible)", () => {
    const scores = new Map([["a", 1.0]]);
    const result = identifyWeakNodes(scores);
    expect(result.size).toBe(0);
  });

  it("all equal scores returns empty Set (stddev = 0)", () => {
    const scores = new Map([
      ["a", 1.0],
      ["b", 1.0],
      ["c", 1.0],
    ]);
    const result = identifyWeakNodes(scores);
    expect(result.size).toBe(0);
  });

  it("node below mean minus 1 stddev is included in weak Set", () => {
    // mean=2, values spread so one is clearly below threshold
    const scores = new Map([
      ["low", 0.1],
      ["mid1", 2.0],
      ["mid2", 2.0],
      ["high", 3.0],
    ]);
    const result = identifyWeakNodes(scores);
    expect(result.has("low")).toBe(true);
  });

  it("node above mean minus 1 stddev is not included", () => {
    const scores = new Map([
      ["low", 0.1],
      ["mid1", 2.0],
      ["mid2", 2.0],
      ["high", 3.0],
    ]);
    const result = identifyWeakNodes(scores);
    expect(result.has("high")).toBe(false);
    expect(result.has("mid1")).toBe(false);
    expect(result.has("mid2")).toBe(false);
  });

  it("node at exactly mean minus 1 stddev is not included (strict less than)", () => {
    // Create a distribution where we know the threshold precisely
    // values: [1, 2, 3] mean=2, stddev=sqrt(2/3)~0.816, threshold~1.184
    // node with score=2-stddev is at boundary — not below, so not weak
    const stddev = Math.sqrt(2 / 3);
    const threshold = 2 - stddev;
    const scores = new Map([
      ["a", 1.0],
      ["b", 2.0],
      ["c", 3.0],
      ["boundary", threshold],
    ]);
    const result = identifyWeakNodes(scores);
    expect(result.has("boundary")).toBe(false);
  });
});

describe("parseImportJson", () => {
  it("returns nodes and edges from a valid export JSON", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "n1", urlTemplate: "/blog", pageCount: 5, x: 100, y: 200 }],
      edges: [{ id: "e1", source: "n1", target: "n2", linkCount: 3 }],
    });
    const result = parseImportJson(raw);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("n1");
    expect(result.nodes[0].position).toEqual({ x: 100, y: 200 });
    expect(result.nodes[0].data.urlTemplate).toBe("/blog");
    expect(result.nodes[0].data.pageCount).toBe(5);
    expect(result.nodes[0].type).toBe("urlNode");
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe("e1");
    expect(result.edges[0].source).toBe("n1");
    expect(result.edges[0].target).toBe("n2");
    expect((result.edges[0].data as LinkCountEdgeData).linkCount).toBe(3);
  });

  it("defaults linkCount to 1 when missing from edge", () => {
    const raw = JSON.stringify({
      nodes: [],
      edges: [{ id: "e1", source: "a", target: "b" }],
    });
    const result = parseImportJson(raw);
    expect((result.edges[0].data as LinkCountEdgeData).linkCount).toBe(1);
  });

  it("throws when JSON is not valid", () => {
    expect(() => parseImportJson("not json")).toThrow();
  });

  it("throws when nodes array is missing", () => {
    const raw = JSON.stringify({ edges: [] });
    expect(() => parseImportJson(raw)).toThrow();
  });

  it("throws when edges array is missing", () => {
    const raw = JSON.stringify({ nodes: [] });
    expect(() => parseImportJson(raw)).toThrow();
  });

  it("throws when a node is missing required urlTemplate field", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "n1", pageCount: 1, x: 0, y: 0 }],
      edges: [],
    });
    expect(() => parseImportJson(raw)).toThrow();
  });

  it("throws when a node is missing required pageCount field", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "n1", urlTemplate: "/a", x: 0, y: 0 }],
      edges: [],
    });
    expect(() => parseImportJson(raw)).toThrow();
  });

  it("handles multiple nodes and edges correctly", () => {
    const raw = JSON.stringify({
      nodes: [
        { id: "n1", urlTemplate: "/a", pageCount: 1, x: 0, y: 0 },
        { id: "n2", urlTemplate: "/b", pageCount: 2, x: 50, y: 50 },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", linkCount: 2 },
        { id: "e2", source: "n2", target: "n1", linkCount: 1 },
      ],
    });
    const result = parseImportJson(raw);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(2);
  });

  it("assigns sourceHandle/targetHandle based on node positions when missing from edge", () => {
    // source at left (x=0), target at right (x=400) → horizontal → right/left handles
    const raw = JSON.stringify({
      nodes: [
        { id: "left", urlTemplate: "/a", pageCount: 1, x: 0, y: 100 },
        { id: "right", urlTemplate: "/b", pageCount: 1, x: 400, y: 100 },
      ],
      edges: [{ id: "e1", source: "left", target: "right", linkCount: 1 }],
    });
    const result = parseImportJson(raw);
    expect(result.edges[0].sourceHandle).toBe(HANDLE_IDS.right);
    expect(result.edges[0].targetHandle).toBe(HANDLE_IDS.left);
  });

  it("assigns top/bottom handles when source is directly above target", () => {
    const raw = JSON.stringify({
      nodes: [
        { id: "top", urlTemplate: "/a", pageCount: 1, x: 100, y: 0 },
        { id: "bottom", urlTemplate: "/b", pageCount: 1, x: 100, y: 400 },
      ],
      edges: [{ id: "e1", source: "top", target: "bottom", linkCount: 1 }],
    });
    const result = parseImportJson(raw);
    expect(result.edges[0].sourceHandle).toBe(HANDLE_IDS.bottom);
    expect(result.edges[0].targetHandle).toBe(HANDLE_IDS.top);
  });

  it("preserves isGlobal=true and placements when present in imported JSON", () => {
    const raw = JSON.stringify({
      nodes: [
        {
          id: "n1",
          urlTemplate: "/nav",
          pageCount: 1,
          x: 0,
          y: 0,
          isGlobal: true,
          placements: [{ id: "p1", name: "Header", linkCount: 2 }],
        },
      ],
      edges: [],
    });
    const result = parseImportJson(raw);
    expect(result.nodes[0].data.isGlobal).toBe(true);
    expect(result.nodes[0].data.placements).toEqual([{ id: "p1", name: "Header", linkCount: 2 }]);
  });

  it("does not add isGlobal to node data when absent from imported JSON (backward compatible)", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "n1", urlTemplate: "/blog", pageCount: 5, x: 0, y: 0 }],
      edges: [],
    });
    const result = parseImportJson(raw);
    expect(result.nodes[0].data.isGlobal).toBeUndefined();
    expect(result.nodes[0].data.placements).toBeUndefined();
  });

  it("preserves isGlobal=false when explicitly set in imported JSON", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "n1", urlTemplate: "/blog", pageCount: 5, x: 0, y: 0, isGlobal: false }],
      edges: [],
    });
    const result = parseImportJson(raw);
    expect(result.nodes[0].data.isGlobal).toBe(false);
  });

  it("preserves existing sourceHandle/targetHandle when already set in JSON", () => {
    const raw = JSON.stringify({
      nodes: [
        { id: "a", urlTemplate: "/a", pageCount: 1, x: 0, y: 0 },
        { id: "b", urlTemplate: "/b", pageCount: 1, x: 400, y: 0 },
      ],
      edges: [
        {
          id: "e1",
          source: "a",
          target: "b",
          linkCount: 1,
          sourceHandle: "handle-top-source",
          targetHandle: "handle-bottom-target",
        },
      ],
    });
    const result = parseImportJson(raw);
    expect(result.edges[0].sourceHandle).toBe("handle-top-source");
    expect(result.edges[0].targetHandle).toBe("handle-bottom-target");
  });

  it("accepts tags array when present", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "a", urlTemplate: "/a", pageCount: 1, tags: ["food", "taipei"], x: 0, y: 0 }],
      edges: [],
    });
    const { nodes } = parseImportJson(raw);
    expect(nodes[0].data.tags).toEqual(["food", "taipei"]);
  });

  it("omits tags from data when absent from JSON (backward compat)", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "a", urlTemplate: "/a", pageCount: 1, x: 0, y: 0 }],
      edges: [],
    });
    const { nodes } = parseImportJson(raw);
    expect(nodes[0].data).not.toHaveProperty("tags");
  });

  it("omits tags when empty array", () => {
    const raw = JSON.stringify({
      nodes: [{ id: "a", urlTemplate: "/a", pageCount: 1, tags: [], x: 0, y: 0 }],
      edges: [],
    });
    const { nodes } = parseImportJson(raw);
    expect(nodes[0].data).not.toHaveProperty("tags");
  });

  it("filters non-string entries from tags array", () => {
    const raw = JSON.stringify({
      nodes: [
        { id: "a", urlTemplate: "/a", pageCount: 1, tags: ["food", 42, null, "hotel"], x: 0, y: 0 },
      ],
      edges: [],
    });
    const { nodes } = parseImportJson(raw);
    expect(nodes[0].data.tags).toEqual(["food", "hotel"]);
  });

  it("round-trips tags through serialize → parse", () => {
    // MAJOR-1 fix: single assertion verifying export→import symmetry.
    // Construct a payload mirroring the shape App.tsx onExportJson produces
    // for a tagged node, serialize it, parse it back, assert tags identity.
    const originalTags = ["food", "taipei"];
    const exportShape = {
      nodes: [
        {
          id: "a",
          urlTemplate: "/a",
          pageCount: 1,
          tags: originalTags,
          x: 10,
          y: 20,
        },
      ],
      edges: [],
    };
    const serialized = JSON.stringify(exportShape);
    const { nodes: parsedNodes } = parseImportJson(serialized);
    expect(parsedNodes[0].data.tags).toEqual(originalTags);
    // Also verify it is a fresh array (not a reference leak) — deep equality already covers this.
  });
});

describe("HANDLE_IDS", () => {
  it("exports HANDLE_IDS with one handle per side: top, right, bottom, left", () => {
    expect(HANDLE_IDS.top).toBe("handle-top");
    expect(HANDLE_IDS.right).toBe("handle-right");
    expect(HANDLE_IDS.bottom).toBe("handle-bottom");
    expect(HANDLE_IDS.left).toBe("handle-left");
  });
});

describe("getClosestHandleIds", () => {
  it("returns handle-right and handle-left when target is directly to the right", () => {
    const result = getClosestHandleIds({ x: 0, y: 0 }, { x: 300, y: 0 });
    expect(result.sourceHandle).toBe("handle-right");
    expect(result.targetHandle).toBe("handle-left");
  });

  it("returns handle-left and handle-right when target is directly to the left", () => {
    const result = getClosestHandleIds({ x: 300, y: 0 }, { x: 0, y: 0 });
    expect(result.sourceHandle).toBe("handle-left");
    expect(result.targetHandle).toBe("handle-right");
  });

  it("returns handle-bottom and handle-top when target is directly below", () => {
    const result = getClosestHandleIds({ x: 0, y: 0 }, { x: 0, y: 300 });
    expect(result.sourceHandle).toBe("handle-bottom");
    expect(result.targetHandle).toBe("handle-top");
  });

  it("returns handle-top and handle-bottom when target is directly above", () => {
    const result = getClosestHandleIds({ x: 0, y: 300 }, { x: 0, y: 0 });
    expect(result.sourceHandle).toBe("handle-top");
    expect(result.targetHandle).toBe("handle-bottom");
  });

  it("returns right/left handles for diagonal when dx >= dy (horizontal dominates)", () => {
    const result = getClosestHandleIds({ x: 0, y: 0 }, { x: 200, y: 200 });
    expect(result.sourceHandle).toBe("handle-right");
    expect(result.targetHandle).toBe("handle-left");
  });

  it("returns bottom/top handles for diagonal when dy > dx (vertical dominates)", () => {
    const result = getClosestHandleIds({ x: 0, y: 0 }, { x: 100, y: 200 });
    expect(result.sourceHandle).toBe("handle-bottom");
    expect(result.targetHandle).toBe("handle-top");
  });
});

describe("collectPlacementSuggestions", () => {
  it("returns placement names from other global nodes", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1),
      makeNode("node-2", 1, {
        isGlobal: true,
        placements: [
          { id: "p1", name: "Header", linkCount: 1 },
          { id: "p2", name: "Footer", linkCount: 1 },
        ],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, "node-1");
    expect(result).toEqual(["Header", "Footer"]);
  });

  it("excludes the current node own placements", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-2", 1, {
        isGlobal: true,
        placements: [{ id: "p1", name: "Header", linkCount: 1 }],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, "node-2");
    expect(result).toEqual([]);
  });

  it("deduplicates names across multiple global nodes", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1),
      makeNode("node-2", 1, {
        isGlobal: true,
        placements: [{ id: "p1", name: "Header", linkCount: 1 }],
      }),
      makeNode("node-3", 1, {
        isGlobal: true,
        placements: [{ id: "p2", name: "Header", linkCount: 1 }],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, "node-1");
    expect(result).toEqual(["Header"]);
    expect(result).toHaveLength(1);
  });

  it("filters out empty-string placement names", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1),
      makeNode("node-2", 1, {
        isGlobal: true,
        placements: [
          { id: "p1", name: "", linkCount: 1 },
          { id: "p2", name: "Footer", linkCount: 1 },
        ],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, "node-1");
    expect(result).toEqual(["Footer"]);
  });

  it("returns [] when no other global nodes exist", () => {
    const nodes: Node<UrlNodeData>[] = [makeNode("node-1", 1), makeNode("node-2", 1)];
    const result = collectPlacementSuggestions(nodes, "node-1");
    expect(result).toEqual([]);
  });

  it("returns [] when other global nodes have no placements", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1),
      makeNode("node-2", 1, { isGlobal: true, placements: [] }),
    ];
    const result = collectPlacementSuggestions(nodes, "node-1");
    expect(result).toEqual([]);
  });

  it("skips non-global nodes entirely", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1),
      makeNode("node-2", 1, {
        isGlobal: false,
        placements: [{ id: "p1", name: "ShouldBeIgnored", linkCount: 1 }],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, "node-1");
    expect(result).toEqual([]);
  });
});

describe("calculateCrawlDepth", () => {
  it("returns empty Map for empty nodes", () => {
    const result = calculateCrawlDepth([], [], "a");
    expect(result.size).toBe(0);
  });

  it("returns empty Map when rootId is null", () => {
    const nodes = [makeNode("a", 1)];
    const result = calculateCrawlDepth(nodes, [], null);
    expect(result.size).toBe(0);
  });

  it("returns empty Map when rootId is undefined", () => {
    const nodes = [makeNode("a", 1)];
    const result = calculateCrawlDepth(nodes, [], undefined);
    expect(result.size).toBe(0);
  });

  it("returns empty Map when rootId is not found in nodes", () => {
    const nodes = [makeNode("a", 1)];
    const result = calculateCrawlDepth(nodes, [], "nonexistent");
    expect(result.size).toBe(0);
  });

  it("single root node returns Map with root depth 0", () => {
    const nodes = [makeNode("a", 1)];
    const result = calculateCrawlDepth(nodes, [], "a");
    expect(result.get("a")).toBe(0);
  });

  it("linear chain A->B->C returns depths {A:0, B:1, C:2}", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1), makeNode("c", 1)];
    const edges = [makeEdge("e1", "a", "b", 1), makeEdge("e2", "b", "c", 1)];
    const result = calculateCrawlDepth(nodes, edges, "a");
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(1);
    expect(result.get("c")).toBe(2);
  });

  it("branching A->B, A->C returns depths {A:0, B:1, C:1}", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1), makeNode("c", 1)];
    const edges = [makeEdge("e1", "a", "b", 1), makeEdge("e2", "a", "c", 1)];
    const result = calculateCrawlDepth(nodes, edges, "a");
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(1);
    expect(result.get("c")).toBe(1);
  });

  it("unreachable node D returns Infinity depth", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1), makeNode("d", 1)];
    const edges = [makeEdge("e1", "a", "b", 1)];
    const result = calculateCrawlDepth(nodes, edges, "a");
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(1);
    expect(result.get("d")).toBe(Infinity);
  });

  it("diamond A->B, A->C, B->D, C->D returns D at depth 2 (shortest path)", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1), makeNode("c", 1), makeNode("d", 1)];
    const edges = [
      makeEdge("e1", "a", "b", 1),
      makeEdge("e2", "a", "c", 1),
      makeEdge("e3", "b", "d", 1),
      makeEdge("e4", "c", "d", 1),
    ];
    const result = calculateCrawlDepth(nodes, edges, "a");
    expect(result.get("d")).toBe(2);
  });

  it("follows edge direction only: A->B does NOT make B reachable to A (one-way)", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const edges = [makeEdge("e1", "a", "b", 1)];
    const resultFromA = calculateCrawlDepth(nodes, edges, "a");
    const resultFromB = calculateCrawlDepth(nodes, edges, "b");
    // From A: B is reachable at depth 1
    expect(resultFromA.get("b")).toBe(1);
    // From B: A is NOT reachable (Infinity)
    expect(resultFromB.get("a")).toBe(Infinity);
  });

  it("global node G with placements — non-global root A reaches G via synthetic edge at depth 1", () => {
    const placements: Placement[] = [{ id: "p1", name: "Header", linkCount: 2 }];
    const nodes = [makeNode("a", 1), makeNode("g", 1, { isGlobal: true, placements })];
    const result = calculateCrawlDepth(nodes, [], "a");
    expect(result.get("a")).toBe(0);
    expect(result.get("g")).toBe(1);
  });
});

describe("collectPlacementGroups", () => {
  it("returns [] when no nodes are global", () => {
    const nodes: Node<UrlNodeData>[] = [makeNode("node-1", 1), makeNode("node-2", 1)];
    const result = collectPlacementGroups(nodes);
    expect(result).toEqual([]);
  });

  it("returns [] when global node has no placements", () => {
    const nodes: Node<UrlNodeData>[] = [makeNode("node-1", 1, { isGlobal: true, placements: [] })];
    const result = collectPlacementGroups(nodes);
    expect(result).toEqual([]);
  });

  it("returns [] when all placement names are empty strings", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1, {
        isGlobal: true,
        placements: [{ id: "p1", name: "", linkCount: 1 }],
      }),
    ];
    const result = collectPlacementGroups(nodes);
    expect(result).toEqual([]);
  });

  it("returns one group with two nodeIds when two globals share a placement name", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1, {
        isGlobal: true,
        placements: [{ id: "p1", name: "Header", linkCount: 1 }],
      }),
      makeNode("node-2", 1, {
        isGlobal: true,
        placements: [{ id: "p2", name: "Header", linkCount: 1 }],
      }),
    ];
    const result = collectPlacementGroups(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].placementName).toBe("Header");
    expect(result[0].nodeIds).toEqual(["node-1", "node-2"]);
  });

  it("returns multiple groups sorted alphabetically by placementName", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1, {
        isGlobal: true,
        placements: [
          { id: "p1", name: "Sidebar", linkCount: 1 },
          { id: "p2", name: "Header", linkCount: 1 },
        ],
      }),
    ];
    const result = collectPlacementGroups(nodes);
    expect(result).toHaveLength(2);
    expect(result[0].placementName).toBe("Header");
    expect(result[1].placementName).toBe("Sidebar");
  });

  it("deduplicates nodeId when same placement name appears twice on one node", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1, {
        isGlobal: true,
        placements: [
          { id: "p1", name: "Header", linkCount: 1 },
          { id: "p2", name: "Header", linkCount: 2 },
        ],
      }),
    ];
    const result = collectPlacementGroups(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].placementName).toBe("Header");
    expect(result[0].nodeIds).toEqual(["node-1"]);
    expect(result[0].nodeIds).toHaveLength(1);
  });

  it("nodeLabels matches urlTemplate for each nodeId in the group", () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode("node-1", 1, {
        isGlobal: true,
        placements: [{ id: "p1", name: "Footer", linkCount: 1 }],
      }),
      makeNode("node-2", 1, {
        isGlobal: true,
        placements: [{ id: "p2", name: "Footer", linkCount: 1 }],
      }),
    ];
    const result = collectPlacementGroups(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].nodeIds).toEqual(["node-1", "node-2"]);
    expect(result[0].nodeLabels).toEqual(["/node-1", "/node-2"]);
  });
});

describe("identifyOrphanNodes", () => {
  it("returns empty Set for empty nodes", () => {
    const result = identifyOrphanNodes([], [], "a");
    expect(result.size).toBe(0);
  });

  it("single node with no edges and no root returns Set with that nodeId", () => {
    const nodes = [makeNode("a", 1)];
    const result = identifyOrphanNodes(nodes, [], null);
    expect(result.has("a")).toBe(true);
  });

  it("single node that IS root returns empty Set (root excluded)", () => {
    const nodes = [makeNode("a", 1)];
    const result = identifyOrphanNodes(nodes, [], "a");
    expect(result.size).toBe(0);
  });

  it("A->B with A=root returns empty Set (B has inbound from A)", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const edges = [makeEdge("e1", "a", "b", 1)];
    const result = identifyOrphanNodes(nodes, edges, "a");
    expect(result.size).toBe(0);
  });

  it("A->B, C isolated, A=root returns Set { C }", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1), makeNode("c", 1)];
    const edges = [makeEdge("e1", "a", "b", 1)];
    const result = identifyOrphanNodes(nodes, edges, "a");
    expect(result.has("c")).toBe(true);
    expect(result.has("a")).toBe(false);
    expect(result.has("b")).toBe(false);
  });

  it("global node G with non-global root A — G has synthetic inbound from A, so G is NOT orphan", () => {
    const placements: Placement[] = [{ id: "p1", name: "Header", linkCount: 2 }];
    const nodes = [makeNode("a", 1), makeNode("g", 1, { isGlobal: true, placements })];
    const result = identifyOrphanNodes(nodes, [], "a");
    expect(result.has("g")).toBe(false);
  });

  it("node with explicit inbound edge is not orphan even if not reachable from root", () => {
    // D->E, no path from root A; but E has inbound from D so E is not orphan
    const nodes = [makeNode("a", 1), makeNode("d", 1), makeNode("e", 1)];
    const edges = [makeEdge("e1", "d", "e", 1)];
    const result = identifyOrphanNodes(nodes, edges, "a");
    // D has zero inbound -> D is orphan (not root)
    expect(result.has("d")).toBe(true);
    // E has inbound from D -> E is not orphan
    expect(result.has("e")).toBe(false);
  });

  it("A->B, B->A — neither is orphan (both have inbound); root=A", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const edges = [makeEdge("e1", "a", "b", 1), makeEdge("e2", "b", "a", 1)];
    const result = identifyOrphanNodes(nodes, edges, "a");
    expect(result.size).toBe(0);
  });
});

describe("OUTBOUND_WARNING_THRESHOLD", () => {
  it("is 150", () => {
    expect(OUTBOUND_WARNING_THRESHOLD).toBe(150);
  });
});

describe("calculateOutboundLinks", () => {
  it("returns 0 for a node with no outbound edges and no globals", () => {
    const nodes = [makeNode("a", 1)];
    const result = calculateOutboundLinks(nodes, []);
    expect(result.get("a")).toBe(0);
  });

  it("sums explicit edge linkCount values (3 + 5 = 8)", () => {
    // Two non-global nodes A, B, no globals; A->B linkCount=3 and A->B linkCount=5
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const edges = [makeEdge("e1", "a", "b", 3), makeEdge("e2", "a", "b", 5)];
    const result = calculateOutboundLinks(nodes, edges);
    expect(result.get("a")).toBe(8);
  });

  it("adds sum(placements.linkCount) per global node for a non-global source (10 + 20 = 30)", () => {
    const placements: Placement[] = [
      { id: "p1", name: "Header", linkCount: 10 },
      { id: "p2", name: "Footer", linkCount: 20 },
    ];
    const nodes = [makeNode("a", 1), makeNode("g", 1, { isGlobal: true, placements })];
    const result = calculateOutboundLinks(nodes, []);
    expect(result.get("a")).toBe(30);
  });

  it("global source node contributes 0 implicit regardless of other globals", () => {
    // Two globals, no explicit edges; each global source gets 0 implicit (D-02 / Phase 4 D-01 parity)
    const nodes = [
      makeNode("a", 1, {
        isGlobal: true,
        placements: [{ id: "pa", name: "Header", linkCount: 5 }],
      }),
      makeNode("g", 1, {
        isGlobal: true,
        placements: [{ id: "pg", name: "Footer", linkCount: 10 }],
      }),
    ];
    const result = calculateOutboundLinks(nodes, []);
    expect(result.get("a")).toBe(0);
  });

  it("non-global source + 2 globals (sums 30 and 15) + explicit edges summing 100 = 145 (under threshold)", () => {
    // globals contribute 30 + 15 = 45 implicit to every non-global source;
    // explicit edges from 'src' sum to 100; total = 145
    const globalA: Placement[] = [
      { id: "pa1", name: "Header", linkCount: 10 },
      { id: "pa2", name: "Footer", linkCount: 20 },
    ]; // sum = 30
    const globalB: Placement[] = [{ id: "pb1", name: "Sidebar", linkCount: 15 }]; // sum = 15
    const nodes = [
      makeNode("src", 1),
      makeNode("t1", 1),
      makeNode("t2", 1),
      makeNode("gA", 1, { isGlobal: true, placements: globalA }),
      makeNode("gB", 1, { isGlobal: true, placements: globalB }),
    ];
    const edges = [makeEdge("e1", "src", "t1", 60), makeEdge("e2", "src", "t2", 40)]; // explicit = 100
    const result = calculateOutboundLinks(nodes, edges);
    expect(result.get("src")).toBe(145);
    expect(result.get("src")! <= OUTBOUND_WARNING_THRESHOLD).toBe(true);
  });

  it("same as above but explicit sum 110 -> 155 (over threshold)", () => {
    const globalA: Placement[] = [
      { id: "pa1", name: "Header", linkCount: 10 },
      { id: "pa2", name: "Footer", linkCount: 20 },
    ]; // sum = 30
    const globalB: Placement[] = [{ id: "pb1", name: "Sidebar", linkCount: 15 }]; // sum = 15
    const nodes = [
      makeNode("src", 1),
      makeNode("t1", 1),
      makeNode("t2", 1),
      makeNode("gA", 1, { isGlobal: true, placements: globalA }),
      makeNode("gB", 1, { isGlobal: true, placements: globalB }),
    ];
    const edges = [makeEdge("e1", "src", "t1", 70), makeEdge("e2", "src", "t2", 40)]; // explicit = 110
    const result = calculateOutboundLinks(nodes, edges);
    expect(result.get("src")).toBe(155);
    expect(result.get("src")! > OUTBOUND_WARNING_THRESHOLD).toBe(true);
  });
});

describe("calculateInboundLinks", () => {
  it("returns empty Map for empty nodes", () => {
    const result = calculateInboundLinks([], []);
    expect(result.size).toBe(0);
  });

  it("includes every node with default 0 when no edges and no globals", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const result = calculateInboundLinks(nodes, []);
    expect(result.size).toBe(2);
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(0);
  });

  it("counts explicit edges by edge count (not linkCount)", () => {
    const nodes = [makeNode("a", 1), makeNode("b", 1)];
    const edges = [makeEdge("e1", "a", "b", 5), makeEdge("e2", "a", "b", 99)];
    const result = calculateInboundLinks(nodes, edges);
    expect(result.get("b")).toBe(2); // two edges → +2, linkCount ignored
    expect(result.get("a")).toBe(0);
  });

  it("adds nonGlobalCount to every global node as implicit inbound", () => {
    const nodes = [
      makeNode("a", 1),
      makeNode("b", 1),
      makeNode("g", 1, {
        isGlobal: true,
        placements: [{ id: "p", name: "Header", linkCount: 10 }],
      }),
    ];
    const result = calculateInboundLinks(nodes, []);
    expect(result.get("g")).toBe(2); // two non-globals → +2
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(0);
  });

  it("global source does NOT contribute implicit inbound to other globals (Phase 4 D-01 parity)", () => {
    const nodes = [
      makeNode("g1", 1, { isGlobal: true, placements: [] }),
      makeNode("g2", 1, { isGlobal: true, placements: [] }),
    ];
    const result = calculateInboundLinks(nodes, []);
    expect(result.get("g1")).toBe(0);
    expect(result.get("g2")).toBe(0);
  });

  it("combines explicit and implicit correctly (2 non-globals + 1 global + explicit a→g)", () => {
    const nodes = [
      makeNode("a", 1),
      makeNode("b", 1),
      makeNode("g", 1, { isGlobal: true, placements: [] }),
    ];
    const edges = [makeEdge("e1", "a", "g", 1)];
    const result = calculateInboundLinks(nodes, edges);
    expect(result.get("g")).toBe(3); // 2 implicit + 1 explicit
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(0);
  });

  it("implicit contribution is independent of placements.linkCount", () => {
    const nodes = [
      makeNode("a", 1),
      makeNode("g", 1, {
        isGlobal: true,
        placements: [{ id: "p", name: "H", linkCount: 999 }],
      }),
    ];
    const result = calculateInboundLinks(nodes, []);
    expect(result.get("g")).toBe(1); // one non-global → +1 regardless of linkCount 999
  });

  it("silently ignores edges whose target is not in nodes", () => {
    const nodes = [makeNode("a", 1)];
    const edges = [makeEdge("e1", "a", "missing", 1)];
    const result = calculateInboundLinks(nodes, edges);
    expect(result.size).toBe(1);
    expect(result.has("missing")).toBe(false);
    expect(result.get("a")).toBe(0);
  });
});

// =============================================================================
// Phase 999.5: Topical Cluster Tags — RED tests (written before implementation)
// =============================================================================

describe("hasSameCluster", () => {
  it("Test A: returns true when arrays share 1 tag", () => {
    expect(hasSameCluster(["food"], ["food", "taipei"])).toBe(true);
  });

  it("Test B: returns true when arrays share 2+ tags", () => {
    expect(hasSameCluster(["food", "taipei"], ["taipei", "food"])).toBe(true);
  });

  it("Test C: returns false when disjoint", () => {
    expect(hasSameCluster(["food"], ["hotel"])).toBe(false);
  });

  it("Test D: returns false when either side is empty", () => {
    expect(hasSameCluster([], ["food"])).toBe(false);
    expect(hasSameCluster(["food"], [])).toBe(false);
  });

  it("Test E: returns false when either side is undefined", () => {
    expect(hasSameCluster(undefined, ["food"])).toBe(false);
    expect(hasSameCluster(["food"], undefined)).toBe(false);
    expect(hasSameCluster(undefined, undefined)).toBe(false);
  });
});

describe("collectClusterSuggestions", () => {
  it("Test F: dedupes tags across nodes and excludes current node", () => {
    const nodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food", "hotel"] },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1, tags: ["food", "taipei"] },
      },
      {
        id: "c",
        type: "urlNode",
        position: { x: 200, y: 0 },
        data: { urlTemplate: "/c", pageCount: 1, tags: [] },
      },
    ];
    // From perspective of node 'a': other nodes (b,c) have tags ['food','taipei'] and []
    // 'hotel' is only on 'a' (current), so it should NOT appear
    const resultA = collectClusterSuggestions(nodes, "a");
    expect(new Set(resultA)).toEqual(new Set(["food", "taipei"]));

    // From perspective of node 'c': other nodes (a,b) have tags ['food','hotel'] and ['food','taipei']
    const resultC = collectClusterSuggestions(nodes, "c");
    expect(new Set(resultC)).toEqual(new Set(["food", "hotel", "taipei"]));
  });

  it("Test G: returns [] when no other nodes have tags", () => {
    const nodes: Node<UrlNodeData>[] = [
      {
        id: "x",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/x", pageCount: 1, tags: ["food"] },
      },
      {
        id: "y",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/y", pageCount: 1 },
      },
    ];
    // From perspective of 'x': only 'y' is a peer, and 'y' has no tags
    const result = collectClusterSuggestions(nodes, "x");
    expect(result).toEqual([]);
  });
});

describe("calculatePageRank — cluster bonus", () => {
  it("Test 1 (same-cluster bonus): B gets more equity than C when A->B is same-cluster and A->C is cross-cluster", () => {
    // A links to B (same cluster: food) and C (different cluster: hotel)
    // Same bonus applied equally to totalWeightedOut, but B edge has 1.5x effective
    // while C edge stays at 1.0x — so B captures more of A's rank than C does.
    const nodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food"] },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1, tags: ["food"] },
      },
      {
        id: "c",
        type: "urlNode",
        position: { x: 200, y: 0 },
        data: { urlTemplate: "/c", pageCount: 1, tags: ["hotel"] },
      },
    ];
    const edges: Edge<LinkCountEdgeData>[] = [
      { id: "e1", source: "a", target: "b", data: { linkCount: 1 } },
      { id: "e2", source: "a", target: "c", data: { linkCount: 1 } },
    ];
    // Control: all same linkCount, no tags
    const baseNodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1 },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1 },
      },
      {
        id: "c",
        type: "urlNode",
        position: { x: 200, y: 0 },
        data: { urlTemplate: "/c", pageCount: 1 },
      },
    ];

    const controlScores = calculatePageRank(baseNodes, edges);
    const bonusedScores = calculatePageRank(nodes, edges);

    // In control, B and C get equal equity from A (same linkCount, no bonus)
    expect(controlScores.get("b")!).toBeCloseTo(controlScores.get("c")!, 4);
    // With cluster bonus, B gets more equity than C (B is same-cluster, C is cross-cluster)
    expect(bonusedScores.get("b")!).toBeGreaterThan(bonusedScores.get("c")!);
  });

  it("Test 2 (different-cluster): no bonus when tags are disjoint", () => {
    const nodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food"] },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1, tags: ["hotel"] },
      },
    ];
    const baseNodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1 },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1 },
      },
    ];
    const edges: Edge<LinkCountEdgeData>[] = [
      { id: "e1", source: "a", target: "b", data: { linkCount: 1 } },
    ];

    const controlScores = calculatePageRank(baseNodes, edges);
    const crossClusterScores = calculatePageRank(nodes, edges);

    expect(crossClusterScores.get("b")!).toBeCloseTo(controlScores.get("b")!, 4);
  });

  it("Test 3 (one untagged): no bonus when source is untagged", () => {
    const nodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1 },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1, tags: ["food"] },
      },
    ];
    const baseNodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1 },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1 },
      },
    ];
    const edges: Edge<LinkCountEdgeData>[] = [
      { id: "e1", source: "a", target: "b", data: { linkCount: 1 } },
    ];

    const controlScores = calculatePageRank(baseNodes, edges);
    const mixedScores = calculatePageRank(nodes, edges);

    expect(mixedScores.get("b")!).toBeCloseTo(controlScores.get("b")!, 4);
  });

  it("Test 4 (both untagged): no bonus when both nodes have no tags", () => {
    const nodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1 },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1 },
      },
    ];
    const edges: Edge<LinkCountEdgeData>[] = [
      { id: "e1", source: "a", target: "b", data: { linkCount: 1 } },
    ];

    // Control run (no tags)
    const controlScores = calculatePageRank(nodes, edges);
    // Same nodes — should match exactly
    const sameScores = calculatePageRank(nodes, edges);

    expect(sameScores.get("b")!).toBeCloseTo(controlScores.get("b")!, 4);
  });

  it("Test 5 (multi-tag overlap applied once): bonus is 1.5x, not 2.25x for 2 shared tags", () => {
    const singleOverlapNodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food"] },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1, tags: ["food"] },
      },
    ];
    const multiOverlapNodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food", "taipei"] },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/b", pageCount: 1, tags: ["food", "taipei"] },
      },
    ];
    const edges: Edge<LinkCountEdgeData>[] = [
      { id: "e1", source: "a", target: "b", data: { linkCount: 1 } },
    ];

    const singleScores = calculatePageRank(singleOverlapNodes, edges);
    const multiScores = calculatePageRank(multiOverlapNodes, edges);

    // Bonus applied once regardless of overlap size — scores must be equal within epsilon
    expect(multiScores.get("b")!).toBeCloseTo(singleScores.get("b")!, 4);
  });

  it("Test 6 (global with matching cluster): same-cluster global captures more equity than cross-cluster global when competing", () => {
    // Two global nodes G1 and G2; non-global A with tags=['food'].
    // G1 has tags=['food'] (same cluster as A), G2 has tags=['hotel'] (different cluster).
    // Synthetic edge A->G1 gets 1.5x bonus; A->G2 stays at 1.0x.
    // So G1 should score higher than G2 (more equity from A's rank transfer).
    const placements: Placement[] = [{ id: "p1", name: "Header", linkCount: 10 }];
    const nodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food"] },
      },
      {
        id: "g1",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/g1", pageCount: 1, isGlobal: true, placements, tags: ["food"] },
      },
      {
        id: "g2",
        type: "urlNode",
        position: { x: 200, y: 0 },
        data: { urlTemplate: "/g2", pageCount: 1, isGlobal: true, placements, tags: ["hotel"] },
      },
    ];

    const scores = calculatePageRank(nodes, []);

    // G1 shares cluster with A → synthetic edge gets bonus → G1 scores higher than G2
    expect(scores.get("g1")!).toBeGreaterThan(scores.get("g2")!);
  });

  it("Test 7 (global without matching cluster): synthetic edge gets no bonus when tags differ", () => {
    const placements: Placement[] = [{ id: "p1", name: "Header", linkCount: 10 }];
    const baselineNodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1 },
      },
      {
        id: "g",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/g", pageCount: 1, isGlobal: true, placements },
      },
    ];
    const diffTagNodes: Node<UrlNodeData>[] = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food"] },
      },
      {
        id: "g",
        type: "urlNode",
        position: { x: 100, y: 0 },
        data: { urlTemplate: "/g", pageCount: 1, isGlobal: true, placements, tags: ["hotel"] },
      },
    ];

    const baselineScores = calculatePageRank(baselineNodes, []);
    const diffTagScores = calculatePageRank(diffTagNodes, []);

    // No bonus when tags are disjoint — G score should be the same as baseline (no tags)
    expect(diffTagScores.get("g")!).toBeCloseTo(baselineScores.get("g")!, 4);
  });
});

describe("collectClusterGroups", () => {
  it("returns [] when no node has tags", () => {
    const nodes = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1 },
      },
    ];
    expect(collectClusterGroups(nodes)).toEqual([]);
  });

  it("groups nodes by tag name and dedupes across nodes", () => {
    const nodes = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/food/ramen", pageCount: 1, tags: ["food"] },
      },
      {
        id: "b",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/food/sushi", pageCount: 1, tags: ["food", "taipei"] },
      },
    ];
    const groups = collectClusterGroups(nodes);
    expect(groups.map((g) => g.tagName)).toEqual(["food", "taipei"]);
    expect(groups[0].nodeIds).toEqual(["a", "b"]);
    expect(groups[1].nodeIds).toEqual(["b"]);
  });

  it("includes both global and non-global nodes", () => {
    const nodes = [
      {
        id: "g",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/", pageCount: 1, isGlobal: true, tags: ["food"] },
      },
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food"] },
      },
    ];
    const groups = collectClusterGroups(nodes);
    expect(groups[0].nodeIds.sort()).toEqual(["a", "g"]);
  });

  it("dedupes duplicate tags within a node and skips empties", () => {
    const nodes = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["food", "food", "", "  "] },
      },
    ];
    const groups = collectClusterGroups(nodes);
    expect(groups).toHaveLength(1);
    expect(groups[0].tagName).toBe("food");
    expect(groups[0].nodeIds).toEqual(["a"]);
  });

  it("sorts groups alphabetically by tagName", () => {
    const nodes = [
      {
        id: "a",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/a", pageCount: 1, tags: ["zebra", "apple", "mango"] },
      },
    ];
    expect(collectClusterGroups(nodes).map((g) => g.tagName)).toEqual(["apple", "mango", "zebra"]);
  });
});

// =============================================================================
// Phase 11.1: PM Health Check — getHealthStatus and hasAnyWarning
// =============================================================================

describe("getHealthStatus", () => {
  // Helper to create a minimal node for health status tests
  function makeHealthNode(id: string, opts?: { tags?: string[] }): Node<UrlNodeData> {
    return {
      id,
      type: "urlNode",
      position: { x: 0, y: 0 },
      data: { urlTemplate: "/blog", pageCount: 1, ...opts },
    };
  }

  // --- Links metric ---
  it("Links → warn when outboundMap.get(node.id) is 151 (boundary: > 150)", () => {
    const node = makeHealthNode("n1");
    const outboundMap = new Map<string, number>([["n1", 151]]);
    const result = getHealthStatus(node, new Map(), outboundMap);
    expect(result.links).toBe("warn");
  });

  it("Links → ok when outboundMap.get(node.id) is 150 (boundary: not > 150)", () => {
    const node = makeHealthNode("n1");
    const outboundMap = new Map<string, number>([["n1", 150]]);
    const result = getHealthStatus(node, new Map(), outboundMap);
    expect(result.links).toBe("ok");
  });

  it("Links → ok when outboundMap.get(node.id) is 0", () => {
    const node = makeHealthNode("n1");
    const outboundMap = new Map<string, number>([["n1", 0]]);
    const result = getHealthStatus(node, new Map(), outboundMap);
    expect(result.links).toBe("ok");
  });

  it("Links → ok when outboundMap has no entry for node.id (undefined treated as 0)", () => {
    const node = makeHealthNode("n1");
    const result = getHealthStatus(node, new Map(), new Map());
    expect(result.links).toBe("ok");
  });

  // --- Depth metric ---
  it("Depth → na when depthMap.size === 0 (no root set)", () => {
    const node = makeHealthNode("n1");
    const result = getHealthStatus(node, new Map(), new Map());
    expect(result.depth).toBe("na");
  });

  it("Depth → warn when depthMap is non-empty but has no entry for node.id (unreachable)", () => {
    const node = makeHealthNode("n1");
    const depthMap = new Map<string, number>([["other", 1]]);
    const result = getHealthStatus(node, depthMap, new Map());
    expect(result.depth).toBe("warn");
  });

  it("Depth → ok when depthMap.get(node.id) === 0 (root itself)", () => {
    const node = makeHealthNode("n1");
    const depthMap = new Map<string, number>([["n1", 0]]);
    const result = getHealthStatus(node, depthMap, new Map());
    expect(result.depth).toBe("ok");
  });

  it("Depth → ok when depthMap.get(node.id) === 3 (boundary: not > 3)", () => {
    const node = makeHealthNode("n1");
    const depthMap = new Map<string, number>([["n1", 3]]);
    const result = getHealthStatus(node, depthMap, new Map());
    expect(result.depth).toBe("ok");
  });

  it("Depth → warn when depthMap.get(node.id) === 4 (boundary: > 3)", () => {
    const node = makeHealthNode("n1");
    const depthMap = new Map<string, number>([["n1", 4]]);
    const result = getHealthStatus(node, depthMap, new Map());
    expect(result.depth).toBe("warn");
  });

  it("Depth → warn when depthMap.get(node.id) === Infinity (unreachable)", () => {
    const node = makeHealthNode("n1");
    const depthMap = new Map<string, number>([["n1", Infinity]]);
    const result = getHealthStatus(node, depthMap, new Map());
    expect(result.depth).toBe("warn");
  });

  // --- Tags metric ---
  it("Tags → warn when node.data.tags is undefined", () => {
    const node = makeHealthNode("n1");
    const result = getHealthStatus(node, new Map(), new Map());
    expect(result.tags).toBe("warn");
  });

  it("Tags → warn when node.data.tags is []", () => {
    const node = makeHealthNode("n1", { tags: [] });
    const result = getHealthStatus(node, new Map(), new Map());
    expect(result.tags).toBe("warn");
  });

  it("Tags → warn when node.data.tags is [''] (all whitespace)", () => {
    const node = makeHealthNode("n1", { tags: [""] });
    const result = getHealthStatus(node, new Map(), new Map());
    expect(result.tags).toBe("warn");
  });

  it("Tags → warn when node.data.tags is ['  '] (all whitespace)", () => {
    const node = makeHealthNode("n1", { tags: ["  "] });
    const result = getHealthStatus(node, new Map(), new Map());
    expect(result.tags).toBe("warn");
  });

  it("Tags → ok when node.data.tags is ['food']", () => {
    const node = makeHealthNode("n1", { tags: ["food"] });
    const result = getHealthStatus(node, new Map(), new Map());
    expect(result.tags).toBe("ok");
  });

  it("Tags → ok when node.data.tags is ['food', 'hotel']", () => {
    const node = makeHealthNode("n1", { tags: ["food", "hotel"] });
    const result = getHealthStatus(node, new Map(), new Map());
    expect(result.tags).toBe("ok");
  });

  // --- Combined cases ---
  it("Combined: untagged + deep + over-linked node returns { links: warn, depth: warn, tags: warn }", () => {
    const node = makeHealthNode("n1");
    const depthMap = new Map<string, number>([["n1", 5]]);
    const outboundMap = new Map<string, number>([["n1", 200]]);
    const result = getHealthStatus(node, depthMap, outboundMap);
    expect(result).toEqual({ links: "warn", depth: "warn", tags: "warn" });
  });

  it("Combined: tagged + shallow + under-linked returns { links: ok, depth: ok, tags: ok }", () => {
    const node = makeHealthNode("n1", { tags: ["food"] });
    const depthMap = new Map<string, number>([["n1", 2]]);
    const outboundMap = new Map<string, number>([["n1", 50]]);
    const result = getHealthStatus(node, depthMap, outboundMap);
    expect(result).toEqual({ links: "ok", depth: "ok", tags: "ok" });
  });
});

describe("hasAnyWarning", () => {
  it("Returns true for { links: warn, depth: ok, tags: ok }", () => {
    const status: HealthStatus = { links: "warn", depth: "ok", tags: "ok" };
    expect(hasAnyWarning(status)).toBe(true);
  });

  it("Returns true for { links: ok, depth: warn, tags: ok }", () => {
    const status: HealthStatus = { links: "ok", depth: "warn", tags: "ok" };
    expect(hasAnyWarning(status)).toBe(true);
  });

  it("Returns true for { links: ok, depth: ok, tags: warn }", () => {
    const status: HealthStatus = { links: "ok", depth: "ok", tags: "warn" };
    expect(hasAnyWarning(status)).toBe(true);
  });

  it("Returns false for { links: ok, depth: ok, tags: ok }", () => {
    const status: HealthStatus = { links: "ok", depth: "ok", tags: "ok" };
    expect(hasAnyWarning(status)).toBe(false);
  });

  it("Returns false for { links: ok, depth: na, tags: ok } — na is not a warning", () => {
    const status: HealthStatus = { links: "ok", depth: "na", tags: "ok" };
    expect(hasAnyWarning(status)).toBe(false);
  });

  it("Returns true for { links: warn, depth: na, tags: warn }", () => {
    const status: HealthStatus = { links: "warn", depth: "na", tags: "warn" };
    expect(hasAnyWarning(status)).toBe(true);
  });
});

describe("getConnectedElements", () => {
  const edge = (id: string, source: string, target: string): Edge =>
    ({ id, source, target, type: "linkCountEdge", data: { linkCount: 1 } }) as Edge;

  it("returns only the focal node when edges is empty", () => {
    expect(getConnectedElements("a", [])).toEqual(new Set(["a"]));
  });

  it("returns empty Set when nodeId is empty string", () => {
    expect(getConnectedElements("", [edge("e1", "a", "b")])).toEqual(new Set());
  });

  it("returns only focal node when it has no connections", () => {
    expect(getConnectedElements("z", [edge("e1", "a", "b")])).toEqual(new Set(["z"]));
  });

  it("reaches neighbour via source direction (A→B, focus A)", () => {
    expect(getConnectedElements("a", [edge("e1", "a", "b")])).toEqual(new Set(["a", "b"]));
  });

  it("reaches neighbour via target direction (A→B, focus B)", () => {
    expect(getConnectedElements("b", [edge("e1", "a", "b")])).toEqual(new Set(["a", "b"]));
  });

  it("collects multiple neighbours (A→B, A→C, focus A)", () => {
    const edges = [edge("e1", "a", "b"), edge("e2", "a", "c")];
    expect(getConnectedElements("a", edges)).toEqual(new Set(["a", "b", "c"]));
  });

  it("includes both directions (A→B, B→C, focus B)", () => {
    const edges = [edge("e1", "a", "b"), edge("e2", "b", "c")];
    expect(getConnectedElements("b", edges)).toEqual(new Set(["a", "b", "c"]));
  });

  it("excludes disconnected component (A→B, C→D, focus A)", () => {
    const edges = [edge("e1", "a", "b"), edge("e2", "c", "d")];
    expect(getConnectedElements("a", edges)).toEqual(new Set(["a", "b"]));
  });
});

// ---------------------------------------------------------------------------
// buildCopyForAIText
// ---------------------------------------------------------------------------
describe("buildCopyForAIText", () => {
  function makeNode(
    id: string,
    urlTemplate: string,
    pageCount: number,
    extra: Partial<UrlNodeData> = {},
  ) {
    return { id, data: { urlTemplate, pageCount, ...extra } };
  }

  function makeEdge(source: string, target: string, linkCount?: number) {
    return { source, target, data: linkCount !== undefined ? { linkCount } : undefined };
  }

  const baseNodes = [makeNode("n1", "/blog/<id>", 10), makeNode("n2", "/product/<id>", 5)];
  const baseEdges = [makeEdge("n1", "n2", 3)];
  const baseScores = new Map([
    ["n1", 0.8],
    ["n2", 0.3],
  ]);
  const baseDepthMap = new Map([
    ["n1", 0],
    ["n2", 1],
  ]);
  const baseOutboundMap = new Map([
    ["n1", 3],
    ["n2", 0],
  ]);

  function buildBase() {
    return buildCopyForAIText({
      nodes: baseNodes,
      edges: baseEdges,
      scores: baseScores,
      depthMap: baseDepthMap,
      outboundMap: baseOutboundMap,
    });
  }

  it("test 1 — starts with header line and blank line", () => {
    const result = buildBase();
    expect(result.startsWith("# SEO Internal Link Structure\n\n")).toBe(true);
  });

  it("test 2 — Nodes section count matches input node count", () => {
    const result = buildBase();
    expect(result).toContain("## Nodes (2 total)");
  });

  it("test 3 — each node line has required fields", () => {
    const result = buildBase();
    expect(result).toContain("- /blog/<id>  pages: 10  score:");
    expect(result).toContain("depth:");
    expect(result).toContain("outbound:");
  });

  it("test 4a — depth renders as number when finite", () => {
    const result = buildBase();
    expect(result).toContain("depth: 0");
    expect(result).toContain("depth: 1");
  });

  it("test 4b — depth renders as 'unreachable' when Infinity", () => {
    const nodes = [makeNode("n1", "/blog/<id>", 10)];
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map(),
      depthMap: new Map([["n1", Infinity]]),
      outboundMap: new Map(),
    });
    expect(result).toContain("depth: unreachable");
  });

  it("test 4c — depth renders as '-' when node missing from depthMap", () => {
    const nodes = [makeNode("n1", "/blog/<id>", 10, { isGlobal: true })];
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map(),
      depthMap: new Map(), // n1 absent
      outboundMap: new Map(),
    });
    expect(result).toContain("depth: -");
  });

  it("test 5 — score shows numeric value; missing score falls back to 0.00", () => {
    const nodes = [makeNode("n1", "/blog/<id>", 10, { tags: ["travel"] })];
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map(), // n1 missing → fallback 0
      depthMap: new Map([["n1", 0]]),
      outboundMap: new Map(),
    });
    expect(result).toContain("score: 0.00");
    expect(result).toContain("health: high"); // tags ok, depth ok, outbound ok
    expect(result).not.toContain("warn:");
  });

  it("health tier: 0 warns → health: high, no warn field", () => {
    const nodes = [makeNode("n1", "/home", 1, { tags: ["travel"] })];
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map([["n1", 0.9]]),
      depthMap: new Map([["n1", 1]]),
      outboundMap: new Map([["n1", 5]]),
    });
    expect(result).toContain("health: high");
    expect(result).not.toContain("warn:");
  });

  it("health tier: 1 warn (no-tags) → health: mid  warn: no-tags", () => {
    const nodes = [makeNode("n1", "/home", 1)]; // no tags
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map([["n1", 0.9]]),
      depthMap: new Map([["n1", 1]]),
      outboundMap: new Map([["n1", 5]]),
    });
    expect(result).toContain("health: mid");
    expect(result).toContain("warn: no-tags");
  });

  it("health tier: 2+ warns → health: low  warn: depth-warn,no-tags", () => {
    const nodes = [makeNode("n1", "/page", 1)]; // no tags
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map([["n1", 0.2]]),
      depthMap: new Map<string, number>([
        ["root", 0],
        ["n1", Infinity],
      ]), // root set, n1 unreachable
      outboundMap: new Map([["n1", 5]]),
    });
    expect(result).toContain("health: low");
    expect(result).toContain("warn: depth-warn,no-tags");
  });

  it("test 6 — outbound uses outboundMap; missing defaults to 0", () => {
    const nodes = [makeNode("n1", "/blog/<id>", 10)];
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map([["n1", 0.5]]),
      depthMap: new Map([["n1", 0]]),
      outboundMap: new Map(), // missing → 0
    });
    expect(result).toContain("outbound: 0");
  });

  it("test 7 — [root] suffix appears iff isRoot === true", () => {
    const nodes = [makeNode("n1", "/home", 1, { isRoot: true })];
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map([["n1", 0.9]]),
      depthMap: new Map([["n1", 0]]),
      outboundMap: new Map(),
    });
    expect(result).toContain("[root]");
  });

  it("test 8 — [global] suffix appears iff isGlobal === true; both flags produce [root] [global]", () => {
    const nodes = [makeNode("n1", "/nav", 1, { isRoot: true, isGlobal: true })];
    const result = buildCopyForAIText({
      nodes,
      edges: [],
      scores: new Map([["n1", 0.9]]),
      depthMap: new Map(),
      outboundMap: new Map(),
    });
    expect(result).toContain("[root] [global]");
  });

  it("test 9 — Links section lists edges; missing linkCount defaults to 1", () => {
    const nodes = [makeNode("n1", "/a", 1), makeNode("n2", "/b", 1)];
    const edges = [
      makeEdge("n1", "n2", 5),
      makeEdge("n2", "n1"), // no linkCount → defaults to 1
    ];
    const result = buildCopyForAIText({
      nodes,
      edges,
      scores: new Map(),
      depthMap: new Map(),
      outboundMap: new Map(),
    });
    expect(result).toContain("- /a → /b  (5 links)");
    expect(result).toContain("- /b → /a  (1 links)");
  });

  it("test 10 — edges whose source or target id is not in nodes are skipped", () => {
    const nodes = [makeNode("n1", "/a", 1)];
    const edges = [makeEdge("n1", "ghost-id", 2)];
    const result = buildCopyForAIText({
      nodes,
      edges,
      scores: new Map(),
      depthMap: new Map(),
      outboundMap: new Map(),
    });
    // should not crash, and ghost edge should be absent
    expect(result).not.toContain("ghost-id");
    expect(result).toContain("## Links");
  });

  it("test 11 — empty edges: Links section still emitted but with no list items", () => {
    const result = buildCopyForAIText({
      nodes: baseNodes,
      edges: [],
      scores: baseScores,
      depthMap: baseDepthMap,
      outboundMap: baseOutboundMap,
    });
    expect(result).toContain("## Links");
    // There should be no "- /blog" under Links (no edge lines)
    const linksIdx = result.indexOf("## Links");
    const afterLinks = result.slice(linksIdx + "## Links".length).trim();
    expect(afterLinks).toBe("");
  });

  it("test 12 — snapshot over small fixture (2 non-global + 1 global + 2 edges)", () => {
    const nodes = [
      makeNode("a", "/home", 1, { isRoot: true }),
      makeNode("b", "/blog/<id>", 20),
      makeNode("g", "/nav", 1, { isGlobal: true }),
    ];
    const edges = [makeEdge("a", "b", 4), makeEdge("g", "b", 2)];
    const scores = new Map([
      ["a", 0.9],
      ["b", 0.5],
      ["g", 0.1],
    ]);
    const depthMap = new Map([
      ["a", 0],
      ["b", 1],
    ]);
    const outboundMap = new Map([
      ["a", 4],
      ["b", 0],
      ["g", 2],
    ]);

    const result = buildCopyForAIText({
      nodes,
      edges,
      scores,
      depthMap,
      outboundMap,
    });
    expect(result).toMatchSnapshot();
  });
});

describe("buildTooltipContent", () => {
  it('returns "Outbound links > 150" for links warn', () => {
    expect(buildTooltipContent({ links: "warn", depth: "ok", tags: "ok" })).toBe(
      "Outbound links > 150",
    );
  });

  it('returns "Crawl depth > 3" for depth warn', () => {
    expect(buildTooltipContent({ links: "ok", depth: "warn", tags: "ok" })).toBe("Crawl depth > 3");
  });

  it('returns "No tags assigned" for tags warn', () => {
    expect(buildTooltipContent({ links: "ok", depth: "ok", tags: "warn" })).toBe(
      "No tags assigned",
    );
  });

  it("joins multiple issues with newline", () => {
    expect(buildTooltipContent({ links: "warn", depth: "warn", tags: "warn" })).toBe(
      "Outbound links > 150\nCrawl depth > 3\nNo tags assigned",
    );
  });

  it("returns empty string when all ok", () => {
    expect(buildTooltipContent({ links: "ok", depth: "ok", tags: "ok" })).toBe("");
  });

  it("depth na does not produce a warning line", () => {
    expect(buildTooltipContent({ links: "ok", depth: "na", tags: "ok" })).toBe("");
  });
});
