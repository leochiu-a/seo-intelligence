import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import type { Node } from 'reactflow';
import type { UrlNodeData } from '../lib/graph-utils';

const makeNode = (id: string, urlTemplate: string, isGlobal?: boolean, placements?: UrlNodeData['placements']): Node<UrlNodeData> => ({
  id,
  type: 'urlNode',
  position: { x: 0, y: 0 },
  data: { urlTemplate, pageCount: 1, isGlobal, placements },
});

const defaultProps = {
  nodes: [] as Node<UrlNodeData>[],
  activeFilters: new Set<string>(),
  onToggle: vi.fn(),
  onClear: vi.fn(),
};

describe('FilterPanel', () => {
  it('Test 1: renders nothing (empty) when no nodes exist', () => {
    render(<FilterPanel {...defaultProps} nodes={[]} />);
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    expect(screen.getByTestId('filter-empty')).toBeInTheDocument();
  });

  it('Test 2: renders a checkbox for each global node showing its urlTemplate', () => {
    const nodes = [
      makeNode('n1', '/header', true),
      makeNode('n2', '/footer', true),
      makeNode('n3', '/page', false),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.getByLabelText('/header')).toBeInTheDocument();
    expect(screen.getByLabelText('/footer')).toBeInTheDocument();
    expect(screen.queryByLabelText('/page')).not.toBeInTheDocument();
  });

  it('Test 3: renders nested checkboxes for each placement under a global node', () => {
    const nodes = [
      makeNode('n1', '/header', true, [
        { id: 'p1', name: 'Header Nav', linkCount: 3 },
        { id: 'p2', name: 'Hero CTA', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.getByLabelText('Header Nav')).toBeInTheDocument();
    expect(screen.getByLabelText('Hero CTA')).toBeInTheDocument();
  });

  it('Test 4: clicking a global node checkbox calls onToggle with key "node:{nodeId}"', () => {
    const onToggle = vi.fn();
    const nodes = [makeNode('n1', '/header', true)];
    render(<FilterPanel {...defaultProps} nodes={nodes} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('/header'));
    expect(onToggle).toHaveBeenCalledWith('node:n1');
  });

  it('Test 5: clicking a placement checkbox calls onToggle with key "placement:{nodeId}:{placementId}"', () => {
    const onToggle = vi.fn();
    const nodes = [
      makeNode('n1', '/header', true, [{ id: 'p1', name: 'Header Nav', linkCount: 3 }]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Header Nav'));
    expect(onToggle).toHaveBeenCalledWith('placement:n1:p1');
  });

  it('Test 6: checkboxes reflect checked state from activeFilters Set', () => {
    const activeFilters = new Set(['node:n1', 'placement:n1:p1']);
    const nodes = [
      makeNode('n1', '/header', true, [
        { id: 'p1', name: 'Header Nav', linkCount: 3 },
        { id: 'p2', name: 'Hero CTA', linkCount: 1 },
      ]),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} activeFilters={activeFilters} />);
    expect(screen.getByLabelText('/header')).toBeChecked();
    expect(screen.getByLabelText('Header Nav')).toBeChecked();
    expect(screen.getByLabelText('Hero CTA')).not.toBeChecked();
  });

  it('Test 7: shows "No global nodes" message when nodes exist but none are global', () => {
    const nodes = [
      makeNode('n1', '/page', false),
      makeNode('n2', '/category', undefined),
    ];
    render(<FilterPanel {...defaultProps} nodes={nodes} />);
    expect(screen.getByTestId('filter-empty')).toBeInTheDocument();
    expect(screen.getByTestId('filter-empty')).toHaveTextContent('No global nodes');
  });
});
