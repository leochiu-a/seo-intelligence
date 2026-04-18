import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { Node } from 'reactflow';
import type { UrlNodeData } from '../lib/graph-utils';
import { HealthPanel } from './HealthPanel';

function makeNode(
  id: string,
  urlTemplate: string,
  overrides: Partial<UrlNodeData> = {},
): Node<UrlNodeData> {
  return {
    id,
    type: 'urlNode',
    position: { x: 0, y: 0 },
    data: { urlTemplate, pageCount: 1, ...overrides },
  };
}

describe('HealthPanel', () => {
  it('renders summary line with "X / N pages have warnings"', () => {
    const nodes = [
      makeNode('a', '/a', { tags: ['food'] }),              // ok
      makeNode('b', '/b'),                                    // warn (no tags)
      makeNode('c', '/c'),                                    // warn (no tags)
    ];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getByTestId('health-summary')).toHaveTextContent('2 / 3 pages have warnings');
  });

  it('renders "0 / 0 pages have warnings" when no nodes', () => {
    render(<HealthPanel nodes={[]} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getByTestId('health-summary')).toHaveTextContent('0 / 0 pages have warnings');
  });

  it('renders one row per node via data-testid="health-row"', () => {
    const nodes = [makeNode('a', '/a', { tags: ['t'] }), makeNode('b', '/b', { tags: ['t'] })];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getAllByTestId('health-row')).toHaveLength(2);
  });

  it('renders Links badge with text-red-500 when outbound > 150', () => {
    const nodes = [makeNode('a', '/a', { tags: ['t'] })];
    const outboundMap = new Map([['a', 200]]);
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={outboundMap} />);
    expect(screen.getByTestId('badge-links').className).toMatch(/text-red-500/);
  });

  it('renders Links badge with text-muted-fg when outbound <= 150', () => {
    const nodes = [makeNode('a', '/a', { tags: ['t'] })];
    const outboundMap = new Map([['a', 100]]);
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={outboundMap} />);
    expect(screen.getByTestId('badge-links').className).toMatch(/text-muted-fg/);
  });

  it('hides Depth badge entirely when depthMap is empty', () => {
    const nodes = [makeNode('a', '/a', { tags: ['t'] })];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.queryByTestId('badge-depth')).toBeNull();
  });

  it('renders Depth badge red when depth > 3', () => {
    const nodes = [makeNode('a', '/a', { tags: ['t'] })];
    const depthMap = new Map([['a', 5]]);
    render(<HealthPanel nodes={nodes} depthMap={depthMap} outboundMap={new Map()} />);
    expect(screen.getByTestId('badge-depth').className).toMatch(/text-red-500/);
  });

  it('renders Depth badge red when depth === Infinity (unreachable)', () => {
    const nodes = [makeNode('a', '/a', { tags: ['t'] })];
    const depthMap = new Map([['a', Infinity]]);
    render(<HealthPanel nodes={nodes} depthMap={depthMap} outboundMap={new Map()} />);
    expect(screen.getByTestId('badge-depth').className).toMatch(/text-red-500/);
  });

  it('renders Tags badge red when node has no tags', () => {
    const nodes = [makeNode('a', '/a')]; // no tags
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getByTestId('badge-tags').className).toMatch(/text-red-500/);
  });

  it('renders Tags badge muted when node has tags', () => {
    const nodes = [makeNode('a', '/a', { tags: ['food'] })];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getByTestId('badge-tags').className).toMatch(/text-muted-fg/);
  });

  it('sorts warnings-first, then alphabetical by urlTemplate', () => {
    const nodes = [
      makeNode('a', '/z-ok', { tags: ['t'] }),    // all ok
      makeNode('b', '/a-ok', { tags: ['t'] }),    // all ok
      makeNode('c', '/z-warn'),                   // warn (no tags)
      makeNode('d', '/a-warn'),                   // warn (no tags)
    ];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    const rows = screen.getAllByTestId('health-row');
    const templates = rows.map((r) => within(r).getByText(/\/.*/).textContent);
    expect(templates).toEqual(['/a-warn', '/z-warn', '/a-ok', '/z-ok']);
  });

  it('hides all-ok rows when Show warnings only is checked', () => {
    const nodes = [
      makeNode('a', '/ok', { tags: ['t'] }),
      makeNode('b', '/warn'),  // no tags → warn
    ];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getAllByTestId('health-row')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('warnings-only-toggle'));
    expect(screen.getAllByTestId('health-row')).toHaveLength(1);
    expect(screen.getByText('/warn')).toBeInTheDocument();
  });

  it('rows do NOT respond to click (read-only)', () => {
    const nodes = [makeNode('a', '/a', { tags: ['t'] })];
    render(
      <HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />,
    );
    const row = screen.getByTestId('health-row');
    // li has no onClick handler — clicking should not throw and no callback exists
    fireEvent.click(row);
    // Just assert render is stable — no cursor-pointer class on <li>
    expect(row.className).not.toMatch(/cursor-pointer/);
  });

  it('shows empty state when nodes is empty', () => {
    render(<HealthPanel nodes={[]} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getByText(/No nodes to check/i)).toBeInTheDocument();
  });
});
