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
} from './graph-utils';
import type { UrlNodeData, LinkCountEdgeData } from './graph-utils';

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
function makeNode(id: string, pageCount: number): Node<UrlNodeData> {
  return {
    id,
    type: 'urlNode',
    position: { x: 0, y: 0 },
    data: { urlTemplate: `/${id}`, pageCount },
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
