import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import type { UrlNodeData } from '../lib/graph-utils';
import { buildTooltipContent } from '../lib/graph-utils';
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
      makeNode('a', '/a', { tags: ['food'] }),
      makeNode('b', '/b'),
      makeNode('c', '/c'),
    ];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getByTestId('health-summary')).toHaveTextContent('2 / 3 pages have warnings');
  });

  it('renders "0 / 0 pages have warnings" when no nodes', () => {
    render(<HealthPanel nodes={[]} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getByTestId('health-summary')).toHaveTextContent('0 / 0 pages have warnings');
  });

  it('defaults to showing warnings only (warningsOnly starts true)', () => {
    const nodes = [
      makeNode('a', '/ok', { tags: ['t'] }),
      makeNode('b', '/warn'),
    ];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    const rows = screen.getAllByTestId('health-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('/warn')).toBeInTheDocument();
    expect(screen.queryByText('/ok')).toBeNull();
  });

  it('shows all rows when Show warnings only is unchecked', () => {
    const nodes = [
      makeNode('a', '/ok', { tags: ['t'] }),
      makeNode('b', '/warn'),
    ];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    fireEvent.click(screen.getByTestId('warnings-only-toggle'));
    expect(screen.getAllByTestId('health-row')).toHaveLength(2);
  });

  it('shows warning icon for rows with any warning', () => {
    const nodes = [makeNode('a', '/a')]; // no tags → warn
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    fireEvent.click(screen.getByTestId('warnings-only-toggle')); // show all
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
  });

  it('does not show warning icon for healthy rows', () => {
    const nodes = [makeNode('a', '/a', { tags: ['food'] })];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    fireEvent.click(screen.getByTestId('warnings-only-toggle')); // show all
    expect(screen.queryByTestId('warning-icon')).toBeNull();
  });

  it('sorts warnings-first, then alphabetical by urlTemplate', () => {
    const nodes = [
      makeNode('a', '/z-ok', { tags: ['t'] }),
      makeNode('b', '/a-ok', { tags: ['t'] }),
      makeNode('c', '/z-warn'),
      makeNode('d', '/a-warn'),
    ];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    fireEvent.click(screen.getByTestId('warnings-only-toggle')); // show all
    const rows = screen.getAllByTestId('health-row');
    const templates = rows.map((r) => within(r).getByText(/\/.*/).textContent);
    expect(templates).toEqual(['/a-warn', '/z-warn', '/a-ok', '/z-ok']);
  });

  it('rows do NOT respond to click (read-only)', () => {
    const nodes = [makeNode('a', '/a', { tags: ['t'] })];
    render(<HealthPanel nodes={nodes} depthMap={new Map()} outboundMap={new Map()} />);
    fireEvent.click(screen.getByTestId('warnings-only-toggle')); // show all
    const row = screen.getByTestId('health-row');
    fireEvent.click(row);
    expect(row.className).not.toMatch(/cursor-pointer/);
  });

  it('shows empty state when nodes is empty', () => {
    render(<HealthPanel nodes={[]} depthMap={new Map()} outboundMap={new Map()} />);
    expect(screen.getByText(/No nodes to check/i)).toBeInTheDocument();
  });
});

describe('buildTooltipContent', () => {
  it('returns "Outbound links > 150" for links warn', () => {
    expect(buildTooltipContent({ links: 'warn', depth: 'ok', tags: 'ok' })).toBe('Outbound links > 150');
  });

  it('returns "Crawl depth > 3" for depth warn', () => {
    expect(buildTooltipContent({ links: 'ok', depth: 'warn', tags: 'ok' })).toBe('Crawl depth > 3');
  });

  it('returns "No tags assigned" for tags warn', () => {
    expect(buildTooltipContent({ links: 'ok', depth: 'ok', tags: 'warn' })).toBe('No tags assigned');
  });

  it('joins multiple issues with newline', () => {
    expect(buildTooltipContent({ links: 'warn', depth: 'warn', tags: 'warn' })).toBe(
      'Outbound links > 150\nCrawl depth > 3\nNo tags assigned'
    );
  });

  it('returns empty string when all ok', () => {
    expect(buildTooltipContent({ links: 'ok', depth: 'ok', tags: 'ok' })).toBe('');
  });

  it('depth na does not produce a warning line', () => {
    expect(buildTooltipContent({ links: 'ok', depth: 'na', tags: 'ok' })).toBe('');
  });
});
