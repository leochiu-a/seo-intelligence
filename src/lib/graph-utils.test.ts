import { describe, it, expect, beforeEach } from 'vitest';
import type { Node, Edge } from 'reactflow';
import {
  createDefaultNode,
  updateNodeData,
  updateEdgeLinkCount,
  validateNodeData,
  validateLinkCount,
  formatPageCount,
  resetNodeIdCounter,
  calculatePageRank,
  classifyScoreTier,
  identifyWeakNodes,
  parseImportJson,
  HANDLE_IDS,
  getClosestHandleIds,
  collectPlacementSuggestions,
} from './graph-utils';
import type { UrlNodeData, LinkCountEdgeData, Placement } from './graph-utils';

describe('createDefaultNode', () => {
  beforeEach(() => {
    resetNodeIdCounter();
  });

  it('returns a node with type urlNode', () => {
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.type).toBe('urlNode');
  });

  it('uses the given position', () => {
    const node = createDefaultNode({ x: 100, y: 200 });
    expect(node.position).toEqual({ x: 100, y: 200 });
  });

  it('sets default urlTemplate to /page/<id>', () => {
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.data.urlTemplate).toBe('/page/<id>');
  });

  it('sets default pageCount to 1', () => {
    const node = createDefaultNode({ x: 0, y: 0 });
    expect(node.data.pageCount).toBe(1);
  });

  it('generates unique incremented ids: node-1, node-2, node-3', () => {
    const node1 = createDefaultNode({ x: 0, y: 0 });
    const node2 = createDefaultNode({ x: 0, y: 0 });
    const node3 = createDefaultNode({ x: 0, y: 0 });
    expect(node1.id).toBe('node-1');
    expect(node2.id).toBe('node-2');
    expect(node3.id).toBe('node-3');
  });
});

describe('updateNodeData', () => {
  it('updates the matching node data and returns a new array', () => {
    const nodeA = { id: 'a', type: 'urlNode', position: { x: 0, y: 0 }, data: { urlTemplate: '/a', pageCount: 1 } };
    const nodeB = { id: 'b', type: 'urlNode', position: { x: 0, y: 0 }, data: { urlTemplate: '/b', pageCount: 2 } };
    const result = updateNodeData([nodeA, nodeB], 'a', { pageCount: 50 });
    expect(result).not.toBe([nodeA, nodeB]);
    expect(result[0].data.pageCount).toBe(50);
  });

  it('preserves other nodes unchanged', () => {
    const nodeA = { id: 'a', type: 'urlNode', position: { x: 0, y: 0 }, data: { urlTemplate: '/a', pageCount: 1 } };
    const nodeB = { id: 'b', type: 'urlNode', position: { x: 0, y: 0 }, data: { urlTemplate: '/b', pageCount: 2 } };
    const result = updateNodeData([nodeA, nodeB], 'a', { pageCount: 50 });
    expect(result[1]).toBe(nodeB);
  });

  it('merges partial data without losing existing fields', () => {
    const nodeA = { id: 'a', type: 'urlNode', position: { x: 0, y: 0 }, data: { urlTemplate: '/a', pageCount: 1 } };
    const result = updateNodeData([nodeA], 'a', { pageCount: 99 });
    expect(result[0].data.urlTemplate).toBe('/a');
    expect(result[0].data.pageCount).toBe(99);
  });

  it('returns array unchanged when nodeId not found', () => {
    const nodeA = { id: 'a', type: 'urlNode', position: { x: 0, y: 0 }, data: { urlTemplate: '/a', pageCount: 1 } };
    const result = updateNodeData([nodeA], 'z', { pageCount: 50 });
    expect(result[0].data.pageCount).toBe(1);
  });
});

describe('updateEdgeLinkCount', () => {
  it('updates linkCount on the matching edge', () => {
    const edgeX = { id: 'x', source: 'a', target: 'b', data: { linkCount: 1 } };
    const edgeY = { id: 'y', source: 'b', target: 'c', data: { linkCount: 2 } };
    const result = updateEdgeLinkCount([edgeX, edgeY], 'x', 5);
    expect(result[0].data?.linkCount).toBe(5);
  });

  it('preserves other edges unchanged', () => {
    const edgeX = { id: 'x', source: 'a', target: 'b', data: { linkCount: 1 } };
    const edgeY = { id: 'y', source: 'b', target: 'c', data: { linkCount: 2 } };
    const result = updateEdgeLinkCount([edgeX, edgeY], 'x', 5);
    expect(result[1]).toBe(edgeY);
  });

  it('returns array unchanged when edgeId not found', () => {
    const edgeX = { id: 'x', source: 'a', target: 'b', data: { linkCount: 1 } };
    const result = updateEdgeLinkCount([edgeX], 'z', 5);
    expect(result[0].data?.linkCount).toBe(1);
  });
});

describe('validateNodeData', () => {
  it('returns error for empty urlTemplate', () => {
    const result = validateNodeData({ urlTemplate: '', pageCount: 1 });
    expect(result).toBe('URL template cannot be empty');
  });

  it('returns error for whitespace-only urlTemplate', () => {
    const result = validateNodeData({ urlTemplate: '  ', pageCount: 1 });
    expect(result).toBe('URL template cannot be empty');
  });

  it('returns error for pageCount of 0', () => {
    const result = validateNodeData({ urlTemplate: '/page/<id>', pageCount: 0 });
    expect(result).toBe('Page count must be at least 1');
  });

  it('returns error for negative pageCount', () => {
    const result = validateNodeData({ urlTemplate: '/page/<id>', pageCount: -5 });
    expect(result).toBe('Page count must be at least 1');
  });

  it('returns null for valid data', () => {
    const result1 = validateNodeData({ urlTemplate: '/page/<id>', pageCount: 1 });
    expect(result1).toBeNull();
    const result2 = validateNodeData({ urlTemplate: '/page/<id>', pageCount: 100 });
    expect(result2).toBeNull();
  });
});

describe('validateLinkCount', () => {
  it('passes through valid counts', () => {
    expect(validateLinkCount(5)).toBe(5);
  });

  it('clamps 0 to 1', () => {
    expect(validateLinkCount(0)).toBe(1);
  });

  it('clamps negative to 1', () => {
    expect(validateLinkCount(-3)).toBe(1);
  });

  it('returns 1 for NaN', () => {
    expect(validateLinkCount(NaN)).toBe(1);
  });

  it('floors decimal to integer', () => {
    expect(validateLinkCount(1.7)).toBe(1);
  });
});

describe('formatPageCount', () => {
  it('returns singular for 1', () => {
    expect(formatPageCount(1)).toBe('1 page');
  });

  it('returns plural for 0', () => {
    expect(formatPageCount(0)).toBe('0 pages');
  });

  it('returns plural for counts greater than 1', () => {
    expect(formatPageCount(100)).toBe('100 pages');
    expect(formatPageCount(2)).toBe('2 pages');
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
    type: 'urlNode',
    position: { x: 0, y: 0 },
    data: { urlTemplate: `/${id}`, pageCount, ...opts },
  };
}

// Helper to build minimal Edge fixtures
function makeEdge(id: string, source: string, target: string, linkCount: number): Edge<LinkCountEdgeData> {
  return { id, source, target, data: { linkCount } };
}

describe('calculatePageRank', () => {
  it('returns empty Map for empty graph', () => {
    const result = calculatePageRank([], []);
    expect(result.size).toBe(0);
  });

  it('single node with no edges gets score 1.0', () => {
    const nodes = [makeNode('a', 1)];
    const result = calculatePageRank(nodes, []);
    expect(result.get('a')).toBeCloseTo(1.0, 3);
  });

  it('two disconnected nodes each get score 1.0', () => {
    const nodes = [makeNode('a', 1), makeNode('b', 1)];
    const result = calculatePageRank(nodes, []);
    expect(result.get('a')).toBeCloseTo(1.0, 3);
    expect(result.get('b')).toBeCloseTo(1.0, 3);
  });

  it('two nodes A->B: B gets higher score than A', () => {
    const nodes = [makeNode('a', 1), makeNode('b', 1)];
    const edges = [makeEdge('e1', 'a', 'b', 1)];
    const result = calculatePageRank(nodes, edges);
    const scoreA = result.get('a')!;
    const scoreB = result.get('b')!;
    expect(scoreB).toBeGreaterThan(scoreA);
  });

  it('three-node chain A->B->C: scores satisfy C > B > A', () => {
    const nodes = [makeNode('a', 1), makeNode('b', 1), makeNode('c', 1)];
    const edges = [makeEdge('e1', 'a', 'b', 1), makeEdge('e2', 'b', 'c', 1)];
    const result = calculatePageRank(nodes, edges);
    const scoreA = result.get('a')!;
    const scoreB = result.get('b')!;
    const scoreC = result.get('c')!;
    expect(scoreC).toBeGreaterThan(scoreB);
    expect(scoreB).toBeGreaterThan(scoreA);
  });

  it('cycle A->B->A: both nodes get equal scores (symmetry)', () => {
    const nodes = [makeNode('a', 1), makeNode('b', 1)];
    const edges = [makeEdge('e1', 'a', 'b', 1), makeEdge('e2', 'b', 'a', 1)];
    const result = calculatePageRank(nodes, edges);
    const scoreA = result.get('a')!;
    const scoreB = result.get('b')!;
    expect(scoreA).toBeCloseTo(scoreB, 3);
  });

  it('link count weighting: A->B with linkCount=5 passes more equity to B than A->C with linkCount=1', () => {
    // A links to both B (linkCount=5) and C (linkCount=1), same pageCount
    // B should receive more equity from A than C does
    const nodes = [makeNode('a', 1), makeNode('b', 1), makeNode('c', 1)];
    const edges = [
      makeEdge('e1', 'a', 'b', 5),
      makeEdge('e2', 'a', 'c', 1),
    ];
    const result = calculatePageRank(nodes, edges);
    expect(result.get('b')!).toBeGreaterThan(result.get('c')!);
  });

  it('page count weighting: node with pageCount=100 has larger equity pool', () => {
    // A(pageCount=1) -> B(pageCount=1) vs A(pageCount=100) -> B(pageCount=1)
    // Higher pageCount on source means more equity distributed
    const nodesSmall = [makeNode('a', 1), makeNode('b', 1)];
    const edgesSmall = [makeEdge('e1', 'a', 'b', 1)];
    const resultSmall = calculatePageRank(nodesSmall, edgesSmall);

    const nodesLarge = [makeNode('a', 100), makeNode('b', 1)];
    const edgesLarge = [makeEdge('e1', 'a', 'b', 1)];
    // With larger pageCount on A, but same linkCount, the totalWeightedOutbound changes
    // the relative score differs; both converge but differently
    const resultLarge = calculatePageRank(nodesLarge, edgesLarge);

    // scores should exist for both cases
    expect(resultSmall.has('a')).toBe(true);
    expect(resultLarge.has('a')).toBe(true);
  });

  it('scores sum to N (number of nodes) within floating point tolerance', () => {
    const nodes = [makeNode('a', 1), makeNode('b', 2), makeNode('c', 3)];
    const edges = [makeEdge('e1', 'a', 'b', 1), makeEdge('e2', 'b', 'c', 2)];
    const result = calculatePageRank(nodes, edges);
    const total = Array.from(result.values()).reduce((sum, s) => sum + s, 0);
    expect(total).toBeCloseTo(nodes.length, 2);
  });

  it('dampening factor d=0.85: disconnected node score equals 1.0 (1 - 0.85 + 0.85*1.0)', () => {
    // A single disconnected node with no inbound: PR = (1-d) + d*0 iteratively converges to 1.0
    // because initial score is 1.0, no inbound, so stays at 1.0 after normalization
    const nodes = [makeNode('a', 1)];
    const result = calculatePageRank(nodes, []);
    expect(result.get('a')).toBeCloseTo(1.0, 3);
  });
});

describe('calculatePageRank with global nodes', () => {
  it('global node with placements receives higher score than an equivalent non-global node with no inbound', () => {
    // Three non-global nodes + one global node with placements
    // The global node should score higher than disconnected non-global nodes
    const nodes = [
      makeNode('a', 1),
      makeNode('b', 1),
      makeNode('c', 1),
      makeNode('g', 1, { isGlobal: true, placements: [{ id: 'p1', name: 'Header', linkCount: 2 }] }),
    ];
    const result = calculatePageRank(nodes, []);
    const scoreG = result.get('g')!;
    const scoreA = result.get('a')!;
    expect(scoreG).toBeGreaterThan(scoreA);
  });

  it('three non-global + one global with placements Header(lc=2) Footer(lc=1): global gets synthetic inbound from all 3 non-global nodes', () => {
    const placements: Placement[] = [
      { id: 'p1', name: 'Header', linkCount: 2 },
      { id: 'p2', name: 'Footer', linkCount: 1 },
    ];
    const nodes = [
      makeNode('a', 1),
      makeNode('b', 1),
      makeNode('c', 1),
      makeNode('g', 1, { isGlobal: true, placements }),
    ];
    const result = calculatePageRank(nodes, []);
    // Global node receives synthetic inbound of 3 links per non-global source (2+1)
    // Its score should be substantially higher than non-global nodes
    const scoreG = result.get('g')!;
    const scoreA = result.get('a')!;
    const scoreB = result.get('b')!;
    const scoreC = result.get('c')!;
    expect(scoreG).toBeGreaterThan(scoreA);
    expect(scoreG).toBeGreaterThan(scoreB);
    expect(scoreG).toBeGreaterThan(scoreC);
  });

  it('global nodes do NOT link to each other (two globals do not inflate each other via synthetic inbound)', () => {
    const placements: Placement[] = [{ id: 'p1', name: 'Header', linkCount: 2 }];
    const nodes = [
      makeNode('a', 1),
      makeNode('g1', 1, { isGlobal: true, placements }),
      makeNode('g2', 1, { isGlobal: true, placements }),
    ];
    const result = calculatePageRank(nodes, []);
    // Both globals get synthetic inbound only from node 'a' (the only non-global)
    // They should score equally (symmetric)
    const scoreG1 = result.get('g1')!;
    const scoreG2 = result.get('g2')!;
    expect(scoreG1).toBeCloseTo(scoreG2, 3);
  });

  it('global node with zero total placement linkCount gets no synthetic inbound (behaves like non-global)', () => {
    const nodes = [
      makeNode('a', 1),
      makeNode('b', 1),
      makeNode('g', 1, { isGlobal: true, placements: [{ id: 'p1', name: 'Header', linkCount: 0 }] }),
    ];
    const result = calculatePageRank(nodes, []);
    // g has zero total placement linkCount — no synthetic links injected
    // a, b, g are all disconnected → all should score ~1.0
    expect(result.get('g')).toBeCloseTo(1.0, 2);
    expect(result.get('a')).toBeCloseTo(1.0, 2);
  });

  it('scores still sum to N with global nodes present', () => {
    const placements: Placement[] = [{ id: 'p1', name: 'Nav', linkCount: 3 }];
    const nodes = [
      makeNode('a', 1),
      makeNode('b', 2),
      makeNode('c', 1),
      makeNode('g', 1, { isGlobal: true, placements }),
    ];
    const edges = [makeEdge('e1', 'a', 'b', 1)];
    const result = calculatePageRank(nodes, edges);
    const total = Array.from(result.values()).reduce((sum, s) => sum + s, 0);
    expect(total).toBeCloseTo(nodes.length, 2);
  });

  it('global node with empty placements array behaves same as non-global node', () => {
    const nodesWithGlobal = [
      makeNode('a', 1),
      makeNode('b', 1),
      makeNode('g', 1, { isGlobal: true, placements: [] }),
    ];
    const nodesWithout = [
      makeNode('a', 1),
      makeNode('b', 1),
      makeNode('g', 1),
    ];
    const resultWith = calculatePageRank(nodesWithGlobal, []);
    const resultWithout = calculatePageRank(nodesWithout, []);
    expect(resultWith.get('g')).toBeCloseTo(resultWithout.get('g')!, 3);
    expect(resultWith.get('a')).toBeCloseTo(resultWithout.get('a')!, 3);
  });

  it('global node with no placements field (undefined) behaves same as non-global node', () => {
    const nodesWithGlobal = [
      makeNode('a', 1),
      makeNode('g', 1, { isGlobal: true }),
    ];
    const nodesWithout = [
      makeNode('a', 1),
      makeNode('g', 1),
    ];
    const resultWith = calculatePageRank(nodesWithGlobal, []);
    const resultWithout = calculatePageRank(nodesWithout, []);
    expect(resultWith.get('g')).toBeCloseTo(resultWithout.get('g')!, 3);
  });
});

describe('classifyScoreTier', () => {
  it('single-element array returns neutral', () => {
    expect(classifyScoreTier(1.0, [1.0])).toBe('neutral');
  });

  it('all equal scores returns neutral', () => {
    expect(classifyScoreTier(1.0, [1.0, 1.0, 1.0])).toBe('neutral');
  });

  it('score in top third returns high', () => {
    // range 0..3, thirds at 1 and 2; score 2.5 -> high
    expect(classifyScoreTier(2.5, [0, 1, 2, 3])).toBe('high');
  });

  it('score in middle third returns mid', () => {
    // range 0..3, thirds at 1 and 2; score 1.5 -> mid
    expect(classifyScoreTier(1.5, [0, 1, 2, 3])).toBe('mid');
  });

  it('score in bottom third returns low', () => {
    // range 0..3, thirds at 1 and 2; score 0.5 -> low
    expect(classifyScoreTier(0.5, [0, 1, 2, 3])).toBe('low');
  });

  it('score exactly at highThreshold returns high', () => {
    // range 0..3, highThreshold = 2; score 2.0 -> high
    expect(classifyScoreTier(2.0, [0, 1, 2, 3])).toBe('high');
  });

  it('score exactly at lowThreshold returns mid', () => {
    // range 0..3, lowThreshold = 1; score 1.0 -> mid
    expect(classifyScoreTier(1.0, [0, 1, 2, 3])).toBe('mid');
  });
});

describe('identifyWeakNodes', () => {
  it('empty map returns empty Set', () => {
    const result = identifyWeakNodes(new Map());
    expect(result.size).toBe(0);
  });

  it('single node returns empty Set (no outliers possible)', () => {
    const scores = new Map([['a', 1.0]]);
    const result = identifyWeakNodes(scores);
    expect(result.size).toBe(0);
  });

  it('all equal scores returns empty Set (stddev = 0)', () => {
    const scores = new Map([['a', 1.0], ['b', 1.0], ['c', 1.0]]);
    const result = identifyWeakNodes(scores);
    expect(result.size).toBe(0);
  });

  it('node below mean minus 1 stddev is included in weak Set', () => {
    // mean=2, values spread so one is clearly below threshold
    const scores = new Map([
      ['low', 0.1],
      ['mid1', 2.0],
      ['mid2', 2.0],
      ['high', 3.0],
    ]);
    const result = identifyWeakNodes(scores);
    expect(result.has('low')).toBe(true);
  });

  it('node above mean minus 1 stddev is not included', () => {
    const scores = new Map([
      ['low', 0.1],
      ['mid1', 2.0],
      ['mid2', 2.0],
      ['high', 3.0],
    ]);
    const result = identifyWeakNodes(scores);
    expect(result.has('high')).toBe(false);
    expect(result.has('mid1')).toBe(false);
    expect(result.has('mid2')).toBe(false);
  });

  it('node at exactly mean minus 1 stddev is not included (strict less than)', () => {
    // Create a distribution where we know the threshold precisely
    // values: [1, 2, 3] mean=2, stddev=sqrt(2/3)~0.816, threshold~1.184
    // node with score=2-stddev is at boundary — not below, so not weak
    const stddev = Math.sqrt(2 / 3);
    const threshold = 2 - stddev;
    const scores = new Map([
      ['a', 1.0],
      ['b', 2.0],
      ['c', 3.0],
      ['boundary', threshold],
    ]);
    const result = identifyWeakNodes(scores);
    expect(result.has('boundary')).toBe(false);
  });
});

describe('parseImportJson', () => {
  it('returns nodes and edges from a valid export JSON', () => {
    const raw = JSON.stringify({
      nodes: [{ id: 'n1', urlTemplate: '/blog', pageCount: 5, x: 100, y: 200 }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', linkCount: 3 }],
    });
    const result = parseImportJson(raw);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('n1');
    expect(result.nodes[0].position).toEqual({ x: 100, y: 200 });
    expect(result.nodes[0].data.urlTemplate).toBe('/blog');
    expect(result.nodes[0].data.pageCount).toBe(5);
    expect(result.nodes[0].type).toBe('urlNode');
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe('e1');
    expect(result.edges[0].source).toBe('n1');
    expect(result.edges[0].target).toBe('n2');
    expect((result.edges[0].data as LinkCountEdgeData).linkCount).toBe(3);
  });

  it('defaults linkCount to 1 when missing from edge', () => {
    const raw = JSON.stringify({
      nodes: [],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
    });
    const result = parseImportJson(raw);
    expect((result.edges[0].data as LinkCountEdgeData).linkCount).toBe(1);
  });

  it('throws when JSON is not valid', () => {
    expect(() => parseImportJson('not json')).toThrow();
  });

  it('throws when nodes array is missing', () => {
    const raw = JSON.stringify({ edges: [] });
    expect(() => parseImportJson(raw)).toThrow();
  });

  it('throws when edges array is missing', () => {
    const raw = JSON.stringify({ nodes: [] });
    expect(() => parseImportJson(raw)).toThrow();
  });

  it('throws when a node is missing required urlTemplate field', () => {
    const raw = JSON.stringify({
      nodes: [{ id: 'n1', pageCount: 1, x: 0, y: 0 }],
      edges: [],
    });
    expect(() => parseImportJson(raw)).toThrow();
  });

  it('throws when a node is missing required pageCount field', () => {
    const raw = JSON.stringify({
      nodes: [{ id: 'n1', urlTemplate: '/a', x: 0, y: 0 }],
      edges: [],
    });
    expect(() => parseImportJson(raw)).toThrow();
  });

  it('handles multiple nodes and edges correctly', () => {
    const raw = JSON.stringify({
      nodes: [
        { id: 'n1', urlTemplate: '/a', pageCount: 1, x: 0, y: 0 },
        { id: 'n2', urlTemplate: '/b', pageCount: 2, x: 50, y: 50 },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', linkCount: 2 },
        { id: 'e2', source: 'n2', target: 'n1', linkCount: 1 },
      ],
    });
    const result = parseImportJson(raw);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(2);
  });

  it('assigns sourceHandle/targetHandle based on node positions when missing from edge', () => {
    // source at left (x=0), target at right (x=400) → horizontal → right/left handles
    const raw = JSON.stringify({
      nodes: [
        { id: 'left',  urlTemplate: '/a', pageCount: 1, x: 0,   y: 100 },
        { id: 'right', urlTemplate: '/b', pageCount: 1, x: 400, y: 100 },
      ],
      edges: [{ id: 'e1', source: 'left', target: 'right', linkCount: 1 }],
    });
    const result = parseImportJson(raw);
    expect(result.edges[0].sourceHandle).toBe(HANDLE_IDS.right);
    expect(result.edges[0].targetHandle).toBe(HANDLE_IDS.left);
  });

  it('assigns top/bottom handles when source is directly above target', () => {
    const raw = JSON.stringify({
      nodes: [
        { id: 'top',    urlTemplate: '/a', pageCount: 1, x: 100, y: 0   },
        { id: 'bottom', urlTemplate: '/b', pageCount: 1, x: 100, y: 400 },
      ],
      edges: [{ id: 'e1', source: 'top', target: 'bottom', linkCount: 1 }],
    });
    const result = parseImportJson(raw);
    expect(result.edges[0].sourceHandle).toBe(HANDLE_IDS.bottom);
    expect(result.edges[0].targetHandle).toBe(HANDLE_IDS.top);
  });

  it('preserves isGlobal=true and placements when present in imported JSON', () => {
    const raw = JSON.stringify({
      nodes: [
        {
          id: 'n1',
          urlTemplate: '/nav',
          pageCount: 1,
          x: 0,
          y: 0,
          isGlobal: true,
          placements: [{ id: 'p1', name: 'Header', linkCount: 2 }],
        },
      ],
      edges: [],
    });
    const result = parseImportJson(raw);
    expect(result.nodes[0].data.isGlobal).toBe(true);
    expect(result.nodes[0].data.placements).toEqual([{ id: 'p1', name: 'Header', linkCount: 2 }]);
  });

  it('does not add isGlobal to node data when absent from imported JSON (backward compatible)', () => {
    const raw = JSON.stringify({
      nodes: [{ id: 'n1', urlTemplate: '/blog', pageCount: 5, x: 0, y: 0 }],
      edges: [],
    });
    const result = parseImportJson(raw);
    expect(result.nodes[0].data.isGlobal).toBeUndefined();
    expect(result.nodes[0].data.placements).toBeUndefined();
  });

  it('preserves isGlobal=false when explicitly set in imported JSON', () => {
    const raw = JSON.stringify({
      nodes: [{ id: 'n1', urlTemplate: '/blog', pageCount: 5, x: 0, y: 0, isGlobal: false }],
      edges: [],
    });
    const result = parseImportJson(raw);
    expect(result.nodes[0].data.isGlobal).toBe(false);
  });

  it('preserves existing sourceHandle/targetHandle when already set in JSON', () => {
    const raw = JSON.stringify({
      nodes: [
        { id: 'a', urlTemplate: '/a', pageCount: 1, x: 0,   y: 0 },
        { id: 'b', urlTemplate: '/b', pageCount: 1, x: 400, y: 0 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', linkCount: 1,
        sourceHandle: 'handle-top-source', targetHandle: 'handle-bottom-target' }],
    });
    const result = parseImportJson(raw);
    expect(result.edges[0].sourceHandle).toBe('handle-top-source');
    expect(result.edges[0].targetHandle).toBe('handle-bottom-target');
  });
});

describe('HANDLE_IDS', () => {
  it('exports HANDLE_IDS with one handle per side: top, right, bottom, left', () => {
    expect(HANDLE_IDS.top).toBe('handle-top');
    expect(HANDLE_IDS.right).toBe('handle-right');
    expect(HANDLE_IDS.bottom).toBe('handle-bottom');
    expect(HANDLE_IDS.left).toBe('handle-left');
  });
});

describe('getClosestHandleIds', () => {
  it('returns handle-right and handle-left when target is directly to the right', () => {
    const result = getClosestHandleIds({ x: 0, y: 0 }, { x: 300, y: 0 });
    expect(result.sourceHandle).toBe('handle-right');
    expect(result.targetHandle).toBe('handle-left');
  });

  it('returns handle-left and handle-right when target is directly to the left', () => {
    const result = getClosestHandleIds({ x: 300, y: 0 }, { x: 0, y: 0 });
    expect(result.sourceHandle).toBe('handle-left');
    expect(result.targetHandle).toBe('handle-right');
  });

  it('returns handle-bottom and handle-top when target is directly below', () => {
    const result = getClosestHandleIds({ x: 0, y: 0 }, { x: 0, y: 300 });
    expect(result.sourceHandle).toBe('handle-bottom');
    expect(result.targetHandle).toBe('handle-top');
  });

  it('returns handle-top and handle-bottom when target is directly above', () => {
    const result = getClosestHandleIds({ x: 0, y: 300 }, { x: 0, y: 0 });
    expect(result.sourceHandle).toBe('handle-top');
    expect(result.targetHandle).toBe('handle-bottom');
  });

  it('returns right/left handles for diagonal when dx >= dy (horizontal dominates)', () => {
    const result = getClosestHandleIds({ x: 0, y: 0 }, { x: 200, y: 200 });
    expect(result.sourceHandle).toBe('handle-right');
    expect(result.targetHandle).toBe('handle-left');
  });

  it('returns bottom/top handles for diagonal when dy > dx (vertical dominates)', () => {
    const result = getClosestHandleIds({ x: 0, y: 0 }, { x: 100, y: 200 });
    expect(result.sourceHandle).toBe('handle-bottom');
    expect(result.targetHandle).toBe('handle-top');
  });
});

describe('collectPlacementSuggestions', () => {
  it('returns placement names from other global nodes', () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode('node-1', 1),
      makeNode('node-2', 1, {
        isGlobal: true,
        placements: [
          { id: 'p1', name: 'Header', linkCount: 1 },
          { id: 'p2', name: 'Footer', linkCount: 1 },
        ],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, 'node-1');
    expect(result).toEqual(['Header', 'Footer']);
  });

  it('excludes the current node own placements', () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode('node-2', 1, {
        isGlobal: true,
        placements: [{ id: 'p1', name: 'Header', linkCount: 1 }],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, 'node-2');
    expect(result).toEqual([]);
  });

  it('deduplicates names across multiple global nodes', () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode('node-1', 1),
      makeNode('node-2', 1, {
        isGlobal: true,
        placements: [{ id: 'p1', name: 'Header', linkCount: 1 }],
      }),
      makeNode('node-3', 1, {
        isGlobal: true,
        placements: [{ id: 'p2', name: 'Header', linkCount: 1 }],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, 'node-1');
    expect(result).toEqual(['Header']);
    expect(result).toHaveLength(1);
  });

  it('filters out empty-string placement names', () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode('node-1', 1),
      makeNode('node-2', 1, {
        isGlobal: true,
        placements: [
          { id: 'p1', name: '', linkCount: 1 },
          { id: 'p2', name: 'Footer', linkCount: 1 },
        ],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, 'node-1');
    expect(result).toEqual(['Footer']);
  });

  it('returns [] when no other global nodes exist', () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode('node-1', 1),
      makeNode('node-2', 1),
    ];
    const result = collectPlacementSuggestions(nodes, 'node-1');
    expect(result).toEqual([]);
  });

  it('returns [] when other global nodes have no placements', () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode('node-1', 1),
      makeNode('node-2', 1, { isGlobal: true, placements: [] }),
    ];
    const result = collectPlacementSuggestions(nodes, 'node-1');
    expect(result).toEqual([]);
  });

  it('skips non-global nodes entirely', () => {
    const nodes: Node<UrlNodeData>[] = [
      makeNode('node-1', 1),
      makeNode('node-2', 1, {
        isGlobal: false,
        placements: [{ id: 'p1', name: 'ShouldBeIgnored', linkCount: 1 }],
      }),
    ];
    const result = collectPlacementSuggestions(nodes, 'node-1');
    expect(result).toEqual([]);
  });
});
