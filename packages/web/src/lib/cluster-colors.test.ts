import { describe, it, expect } from 'vitest';
import { CLUSTER_PALETTE, getClusterColor } from './cluster-colors';

describe('CLUSTER_PALETTE', () => {
  it('has at least 8 distinct colors', () => {
    expect(CLUSTER_PALETTE.length).toBeGreaterThanOrEqual(8);
  });

  it('avoids colors used by existing UI (green/amber/red/indigo/blue/violet)', () => {
    const reservedPatterns = /\b(red|amber|indigo|blue|violet|green)-\d/;
    for (const color of CLUSTER_PALETTE) {
      expect(color.dot).not.toMatch(reservedPatterns);
    }
  });

  it('matches palette snapshot (locks color order — reorder requires approval)', () => {
    expect(CLUSTER_PALETTE).toMatchSnapshot();
  });
});

describe('getClusterColor', () => {
  it('returns same color for same tag across calls (deterministic)', () => {
    const c1 = getClusterColor('food');
    const c2 = getClusterColor('food');
    expect(c1).toEqual(c2);
  });

  it('returns consistent mapping snapshot for canonical tags', () => {
    expect({
      food: getClusterColor('food'),
      hotel: getClusterColor('hotel'),
      taipei: getClusterColor('taipei'),
    }).toMatchSnapshot();
  });

  it('handles empty string gracefully (returns a palette entry)', () => {
    const c = getClusterColor('');
    expect(c.dot).toBeDefined();
  });

  it('returns dot property', () => {
    const c = getClusterColor('food');
    expect(c).toHaveProperty('dot');
  });
});
