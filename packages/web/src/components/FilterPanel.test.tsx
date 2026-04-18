import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import type { Node } from '@xyflow/react';
import type { UrlNodeData } from '../lib/graph-utils';

const makeNode = (
  id: string,
  urlTemplate: string,
  isGlobal?: boolean,
  placements?: UrlNodeData['placements'],
  tags?: string[],
): Node<UrlNodeData> => ({
  id,
  type: 'urlNode',
  position: { x: 0, y: 0 },
  data: { urlTemplate, pageCount: 1, isGlobal, placements, tags },
});

const defaultProps = {
  nodes: [] as Node<UrlNodeData>[],
  activeFilters: new Set<string>(),
  onToggle: vi.fn(),
  onClear: vi.fn(),
};

describe('FilterPanel (placement-centric)', () => {
  it('Test 1: renders "No placement filters" when nodes array is empty', () => {
    render(<FilterPanel {...defaultProps} nodes={[]} />);
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    const empty = screen.getByTestId('filter-empty');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent('No placement filters');
  });

  it('Test 2: renders "No placement filters" when global nodes have no placements', () => {
    const nodes = [
      makeNode('n1', '/header', true, []),
      makeNode('n2', '/footer', true),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.getByTestId('filter-empty')).toHaveTextContent('No placement filters');
  });

  it('Test 3: renders one top-level checkbox for each unique placement name', () => {
    const nodes = [
      makeNode('n1', '/header', true, [
        { id: 'p1', name: 'Header Nav', linkCount: 1 },
        { id: 'p2', name: 'Footer', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.getByRole('checkbox', { name: 'Header Nav' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Footer' })).toBeInTheDocument();
  });

  it('Test 4: each placement name checkbox shows the placement name as its label', () => {
    const nodes = [
      makeNode('n1', '/header', true, [
        { id: 'p1', name: 'Sidebar', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.getByRole('checkbox', { name: 'Sidebar' })).toBeInTheDocument();
  });

  it('Test 5: checking a placement name checkbox calls onToggle with key "placement-name:{name}"', () => {
    const onToggle = vi.fn();
    const nodes = [
      makeNode('n1', '/header', true, [
        { id: 'p1', name: 'Header Nav', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Header Nav' }));
    expect(onToggle).toHaveBeenCalledWith('placement-name:Header Nav');
  });

  it('Test 6: sub-items show the urlTemplate of global nodes that carry that placement', () => {
    const nodes = [
      makeNode('n1', '/global-header', true, [
        { id: 'p1', name: 'Header', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.getByText('/global-header')).toBeInTheDocument();
  });

  it('Test 7: activeFilters controls checked state of top-level placement checkboxes', () => {
    const activeFilters = new Set(['placement-name:Header Nav']);
    const nodes = [
      makeNode('n1', '/header', true, [
        { id: 'p1', name: 'Header Nav', linkCount: 1 },
        { id: 'p2', name: 'Footer', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} activeFilters={activeFilters} />);
    expect(screen.getByRole('checkbox', { name: 'Header Nav' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Footer' })).not.toBeChecked();
  });

  it('Test 8: "Clear all" button appears when activeFilters is non-empty and calls onClear when clicked', () => {
    const onClear = vi.fn();
    const activeFilters = new Set(['placement-name:Header']);
    const nodes = [
      makeNode('n1', '/header', true, [
        { id: 'p1', name: 'Header', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} activeFilters={activeFilters} onClear={onClear} />);
    const btn = screen.getByRole('button', { name: /clear all/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('Test 9: "Clear all" button absent when activeFilters is empty', () => {
    const nodes = [
      makeNode('n1', '/header', true, [
        { id: 'p1', name: 'Header', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} activeFilters={new Set()} />);
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
  });

  it('Test 10: two global nodes sharing "Header" → one "Header" group with two sub-items', () => {
    const nodes = [
      makeNode('n1', '/global-1', true, [
        { id: 'p1', name: 'Header', linkCount: 1 },
      ]),
      makeNode('n2', '/global-2', true, [
        { id: 'p2', name: 'Header', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    const checkboxes = screen.getAllByRole('checkbox', { name: 'Header' });
    expect(checkboxes).toHaveLength(1);
    expect(screen.getByText('/global-1')).toBeInTheDocument();
    expect(screen.getByText('/global-2')).toBeInTheDocument();
  });

  it('renders By placement section header', () => {
    render(<FilterPanel {...defaultProps} nodes={[]} />);
    expect(screen.getByText(/by placement/i)).toBeInTheDocument();
  });
});

describe('FilterPanel (cluster section)', () => {
  it('renders By cluster section when at least one node has tags', () => {
    const nodes = [makeNode('n1', '/food/ramen', false, undefined, ['food'])];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.getByTestId('cluster-filter-list')).toBeInTheDocument();
    expect(screen.getByText(/by cluster/i)).toBeInTheDocument();
  });

  it('hides By cluster section when no node has tags', () => {
    const nodes = [makeNode('n1', '/page', false, undefined, undefined)];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.queryByTestId('cluster-filter-list')).toBeNull();
  });

  it('calls onToggle with cluster:{name} key when cluster checkbox is clicked', () => {
    const onToggle = vi.fn();
    const nodes = [makeNode('n1', '/food/ramen', false, undefined, ['food'])];
    render(<FilterPanel {...defaultProps} nodes={nodes} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'food' }));
    expect(onToggle).toHaveBeenCalledWith('cluster:food');
  });
});
