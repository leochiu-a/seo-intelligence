import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditPopover } from './EditPopover';
import type { Placement } from '../lib/graph-utils';

const defaultProps = {
  nodeId: 'node-1',
  urlTemplate: '/page/<id>',
  pageCount: 5,
  isGlobal: false,
  isRoot: false,
  placements: [] as Placement[],
  placementSuggestions: [] as string[],
  tags: [] as string[],
  clusterSuggestions: [] as string[],
  onSave: vi.fn(),
  onRootToggle: vi.fn(),
  onClose: vi.fn(),
};

describe('EditPopover', () => {
  it('shows global toggle switch', () => {
    render(<EditPopover {...defaultProps} />);
    const toggles = screen.getAllByRole('switch');
    // There are two switches: Root and Global Node
    expect(toggles).toHaveLength(2);
    const globalToggle = toggles.find((t) => t.getAttribute('aria-checked') === 'false');
    expect(globalToggle).toBeInTheDocument();
  });

  it('shows placements section when global is toggled on', () => {
    render(<EditPopover {...defaultProps} />);
    // Placements section not visible initially
    expect(screen.queryByText('Placements')).not.toBeInTheDocument();
    // Toggle global on — Global Node toggle is the second switch (after Root)
    const toggles = screen.getAllByRole('switch');
    const globalToggle = toggles[1];
    fireEvent.click(globalToggle);
    expect(screen.getByText('Placements')).toBeInTheDocument();
    expect(screen.getByText('+ Add Placement')).toBeInTheDocument();
  });

  it('hides placements section when global is toggled off', () => {
    render(<EditPopover {...defaultProps} isGlobal={true} />);
    expect(screen.getByText('Placements')).toBeInTheDocument();
    // Toggle off — Global Node toggle is the second switch (after Root)
    const toggles = screen.getAllByRole('switch');
    const globalToggle = toggles[1];
    fireEvent.click(globalToggle);
    expect(screen.queryByText('Placements')).not.toBeInTheDocument();
  });

  it('adds a new placement when "+ Add Placement" is clicked', () => {
    render(<EditPopover {...defaultProps} isGlobal={true} />);
    expect(screen.queryAllByPlaceholderText('e.g. Header Nav')).toHaveLength(0);
    fireEvent.click(screen.getByText('+ Add Placement'));
    expect(screen.getAllByPlaceholderText('e.g. Header Nav')).toHaveLength(1);
  });

  it('renames a placement via inline text input', () => {
    const existingPlacement: Placement = { id: 'p-1', name: 'Footer', linkCount: 2 };
    render(<EditPopover {...defaultProps} isGlobal={true} placements={[existingPlacement]} />);
    const nameInput = screen.getByDisplayValue('Footer');
    fireEvent.change(nameInput, { target: { value: 'Header Nav' } });
    expect(screen.getByDisplayValue('Header Nav')).toBeInTheDocument();
  });

  it('deletes a placement via the X button', () => {
    const existingPlacement: Placement = { id: 'p-1', name: 'Footer', linkCount: 2 };
    render(<EditPopover {...defaultProps} isGlobal={true} placements={[existingPlacement]} />);
    expect(screen.getByDisplayValue('Footer')).toBeInTheDocument();
    const deleteBtn = screen.getByRole('button', { name: 'Delete placement Footer' });
    fireEvent.click(deleteBtn);
    expect(screen.queryByDisplayValue('Footer')).not.toBeInTheDocument();
  });

  it('onSave receives isGlobal and placements when confirmed', () => {
    const onSave = vi.fn();
    const existingPlacement: Placement = { id: 'p-1', name: 'Header Nav', linkCount: 3 };
    render(
      <EditPopover
        {...defaultProps}
        isGlobal={true}
        placements={[existingPlacement]}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onSave).toHaveBeenCalledWith('/page/<id>', 5, true, [existingPlacement], []);
  });

  it('shows autocomplete input (combobox role) when placementSuggestions is non-empty', () => {
    const placement: Placement = { id: 'p-1', name: '', linkCount: 1 };
    render(
      <EditPopover
        {...defaultProps}
        isGlobal={true}
        placements={[placement]}
        placementSuggestions={['Header Nav', 'Footer']}
      />,
    );
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
  });

  it('renders plain input when placementSuggestions is empty (PLACE-04)', () => {
    const placement: Placement = { id: 'p-1', name: 'Footer', linkCount: 1 };
    render(
      <EditPopover
        {...defaultProps}
        isGlobal={true}
        placements={[placement]}
        placementSuggestions={[]}
      />,
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Footer')).toBeInTheDocument();
  });

  it('allows freeform text input not in suggestions list (PLACE-03)', () => {
    const placement: Placement = { id: 'p-1', name: '', linkCount: 1 };
    render(
      <EditPopover
        {...defaultProps}
        isGlobal={true}
        placements={[placement]}
        placementSuggestions={['Header Nav', 'Footer']}
      />,
    );
    const combobox = screen.getByRole('combobox');
    fireEvent.change(combobox, { target: { value: 'Custom Name' } });
    expect(combobox).toHaveValue('Custom Name');
  });

  it('saves freeform-typed placement name on Confirm when suggestions exist (PLACE-05)', () => {
    const onSave = vi.fn();
    const placement: Placement = { id: 'p-1', name: '', linkCount: 1 };
    render(
      <EditPopover
        {...defaultProps}
        isGlobal={true}
        placements={[placement]}
        placementSuggestions={['Header Nav', 'Footer']}
        onSave={onSave}
      />,
    );
    const combobox = screen.getByRole('combobox');
    fireEvent.change(combobox, { target: { value: 'home' } });
    fireEvent.click(screen.getByText('Confirm'));
    expect(onSave).toHaveBeenCalledWith(
      '/page/<id>',
      5,
      true,
      [{ id: 'p-1', name: 'home', linkCount: 1 }],
      [],
    );
  });

  // ---- Cluster Tags tests ----

  it('renders cluster tags section for any node (global or not)', () => {
    render(<EditPopover {...defaultProps} />);
    expect(screen.getByText('Cluster Tags')).toBeInTheDocument();
  });

  it('renders cluster tags section for global nodes too', () => {
    render(<EditPopover {...defaultProps} isGlobal={true} />);
    expect(screen.getByText('Cluster Tags')).toBeInTheDocument();
  });

  it('typing a tag and pressing Enter adds it to the visible chip list', () => {
    render(<EditPopover {...defaultProps} />);
    const input = screen.getByTestId('cluster-tag-input');
    fireEvent.change(input, { target: { value: 'food' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('food')).toBeInTheDocument();
  });

  it('clicking X on a tag chip removes it from local state', () => {
    render(<EditPopover {...defaultProps} tags={['food']} />);
    expect(screen.getByText('food')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: 'Remove tag food' });
    fireEvent.click(removeBtn);
    expect(screen.queryByText('food')).not.toBeInTheDocument();
  });

  it('onSave receives tags array as 5th positional argument', () => {
    const onSave = vi.fn();
    render(
      <EditPopover
        {...defaultProps}
        tags={['food', 'taipei']}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onSave).toHaveBeenCalledWith('/page/<id>', 5, false, [], ['food', 'taipei']);
  });

  it('when clusterSuggestions is empty, renders a plain input (no Autocomplete)', () => {
    render(<EditPopover {...defaultProps} clusterSuggestions={[]} />);
    // No combobox role when suggestions are empty
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    // But the plain cluster tag input should exist
    expect(screen.getByTestId('cluster-tag-input')).toBeInTheDocument();
  });

  it('empty/whitespace-only tag strings are filtered out on save', () => {
    const onSave = vi.fn();
    render(
      <EditPopover
        {...defaultProps}
        tags={['food', '  ']}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText('Confirm'));
    // Whitespace-only tag should be filtered
    expect(onSave).toHaveBeenCalledWith('/page/<id>', 5, false, [], ['food']);
  });

  it('duplicate tags are not added', () => {
    render(<EditPopover {...defaultProps} tags={['food']} />);
    const input = screen.getByTestId('cluster-tag-input');
    // Try to add 'food' again
    fireEvent.change(input, { target: { value: 'food' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Should still only have one 'food' chip
    const foodChips = screen.getAllByText('food');
    expect(foodChips).toHaveLength(1);
  });
});
