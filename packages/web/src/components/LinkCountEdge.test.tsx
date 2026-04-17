import { describe, it, expect } from 'vitest';
import { getClusterColor } from '../lib/cluster-colors';
import { computeEdgeStroke } from './LinkCountEdge';

/**
 * Tests for the pure `computeEdgeStroke` helper exported from LinkCountEdge.
 *
 * Stroke is read via the pure helper (not DOM attribute / inline style) because
 * BaseEdge + EdgeLabelRenderer require a React Flow zustand provider in tests.
 * The helper is the exact same logic used in the component's BaseEdge style prop,
 * so these tests provide full coverage of the stroke decision.
 */
describe('computeEdgeStroke', () => {
  it('uses default gray when neither node has tags', () => {
    expect(computeEdgeStroke(undefined, undefined, false)).toBe('#9CA3AF');
  });

  it('uses default gray when source has empty tags', () => {
    expect(computeEdgeStroke([], ['food'], false)).toBe('#9CA3AF');
  });

  it('uses default gray when target has empty tags', () => {
    expect(computeEdgeStroke(['food'], [], false)).toBe('#9CA3AF');
  });

  it('uses cluster color when source and target share a tag', () => {
    const stroke = computeEdgeStroke(['food'], ['food'], false);
    expect(stroke).toBe(getClusterColor('food').edge);
  });

  it('picks first shared tag alphabetically when multiple overlap', () => {
    // shared = ['food', 'taipei'] after sort → first = 'food'
    const stroke = computeEdgeStroke(['taipei', 'food'], ['food', 'taipei'], false);
    expect(stroke).toBe(getClusterColor('food').edge);
  });

  it('selected edge uses indigo, overriding cluster color', () => {
    const stroke = computeEdgeStroke(['food'], ['food'], true);
    expect(stroke).toBe('#6366F1');
  });

  it('falls back to gray when there are no shared tags', () => {
    const stroke = computeEdgeStroke(['food'], ['travel'], false);
    expect(stroke).toBe('#9CA3AF');
  });
});
