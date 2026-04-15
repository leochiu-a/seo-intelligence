import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditPopover } from './EditPopover';
import type { Placement } from '../lib/graph-utils';

const defaultProps = {
  nodeId: 'node-1',
  urlTemplate: '/page/<id>',
  pageCount: 5,
  isGlobal: false,
  placements: [] as Placement[],
  placementSuggestions: [] as string[],
  onSave: vi.fn(),
  onClose: vi.fn(),
};

describe('EditPopover', () => {
  it('shows global toggle switch', () => {
    render(<EditPopover {...defaultProps} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('shows placements section when global is toggled on', () => {
    render(<EditPopover {...defaultProps} />);
    // Placements section not visible initially
    expect(screen.queryByText('Placements')).not.toBeInTheDocument();
    // Toggle global on
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(screen.getByText('Placements')).toBeInTheDocument();
    expect(screen.getByText('+ Add Placement')).toBeInTheDocument();
  });

  it('hides placements section when global is toggled off', () => {
    render(<EditPopover {...defaultProps} isGlobal={true} />);
    expect(screen.getByText('Placements')).toBeInTheDocument();
    // Toggle off
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
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
    expect(onSave).toHaveBeenCalledWith('/page/<id>', 5, true, [existingPlacement]);
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
    );
  });
});
