import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDefaultNode,
  updateNodeData,
  updateEdgeLinkCount,
  validateNodeData,
  validateLinkCount,
  formatPageCount,
  resetNodeIdCounter,
} from './graph-utils';

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
