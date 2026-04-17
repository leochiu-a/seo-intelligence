import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { UrlNode } from './UrlNode';
import type { UrlNodeData } from '../lib/graph-utils';

const mockGetNodes = vi.fn(() => []);
vi.mock('reactflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('reactflow')>();
  return {
    ...actual,
    useReactFlow: () => ({ getNodes: mockGetNodes }),
  };
});

// UrlNodeExtendedData mirror for test props
interface TestNodeData extends UrlNodeData {
  onUpdate?: (id: string, data: Partial<UrlNodeData>) => void;
  onZIndexChange?: (id: string, zIndex: number) => void;
  scoreTier?: 'high' | 'mid' | 'low' | 'neutral';
  isWeak?: boolean;
  outboundCount?: number;
  isOverLinked?: boolean;
  isDimmed?: boolean;
}

function makeNodeProps(data: TestNodeData): NodeProps<TestNodeData> {
  return {
    id: 'node-1',
    data,
    selected: false,
    type: 'urlNode',
    dragging: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    sourcePosition: undefined,
    targetPosition: undefined,
    dragHandle: undefined,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as NodeProps<TestNodeData>;
}

function renderNode(data: TestNodeData) {
  const props = makeNodeProps(data);
  return render(
    <ReactFlowProvider>
      <UrlNode {...(props as NodeProps<UrlNodeData & { onUpdate?: (id: string, data: Partial<UrlNodeData>) => void; onZIndexChange?: (id: string, zIndex: number) => void; scoreTier?: 'high' | 'mid' | 'low' | 'neutral'; isWeak?: boolean; outboundCount?: number; isOverLinked?: boolean }>)} />
    </ReactFlowProvider>,
  );
}

describe('UrlNode', () => {
  it('renders Globe badge when isGlobal=true', () => {
    renderNode({
      urlTemplate: '/nav',
      pageCount: 1,
      isGlobal: true,
      onUpdate: vi.fn(),
    });
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('does not render Globe badge when isGlobal is false or undefined', () => {
    renderNode({
      urlTemplate: '/page/<id>',
      pageCount: 5,
      isGlobal: false,
      onUpdate: vi.fn(),
    });
    expect(screen.queryByText('Global')).not.toBeInTheDocument();
  });

  it('elevates node zIndex to 1000 via onZIndexChange when edit popover opens', async () => {
    const user = userEvent.setup();
    const onZIndexChange = vi.fn();
    renderNode({ urlTemplate: '/blog', pageCount: 1, onUpdate: vi.fn(), onZIndexChange });

    onZIndexChange.mockClear();
    await user.click(screen.getByRole('button', { name: 'Edit node' }));

    expect(onZIndexChange).toHaveBeenCalledWith('node-1', 1000);
  });

  it('resets node zIndex to 0 via onZIndexChange when edit popover closes', async () => {
    const user = userEvent.setup();
    const onZIndexChange = vi.fn();
    renderNode({ urlTemplate: '/blog', pageCount: 1, onUpdate: vi.fn(), onZIndexChange });

    await user.click(screen.getByRole('button', { name: 'Edit node' }));
    onZIndexChange.mockClear();
    await user.keyboard('{Escape}');

    expect(onZIndexChange).toHaveBeenCalledWith('node-1', 0);
  });

  it('renders red TriangleAlert with `{count} links` label when isOverLinked is true', () => {
    renderNode({
      urlTemplate: '/page/<id>',
      pageCount: 5,
      outboundCount: 167,
      isOverLinked: true,
      onUpdate: vi.fn(),
    });
    expect(screen.getByLabelText('Over-linked page')).toBeInTheDocument();
    expect(screen.getByText('167 links')).toBeInTheDocument();
  });

  it('does NOT render the over-linked indicator when isOverLinked is false', () => {
    renderNode({
      urlTemplate: '/page/<id>',
      pageCount: 5,
      outboundCount: 120,
      isOverLinked: false,
      onUpdate: vi.fn(),
    });
    expect(screen.queryByLabelText('Over-linked page')).not.toBeInTheDocument();
    expect(screen.queryByText('120 links')).not.toBeInTheDocument();
  });

  it('card-content has opacity 0.2 when isDimmed is true', () => {
    renderNode({
      urlTemplate: '/page/<id>',
      pageCount: 1,
      isDimmed: true,
      onUpdate: vi.fn(),
    });
    const content = screen.getByTestId('card-content');
    expect(content).toHaveStyle({ opacity: '0.2' });
  });

  it('card-content has opacity 1 when isDimmed is false or undefined', () => {
    renderNode({
      urlTemplate: '/page/<id>',
      pageCount: 1,
      isDimmed: false,
      onUpdate: vi.fn(),
    });
    const content = screen.getByTestId('card-content');
    expect(content).toHaveStyle({ opacity: '1' });
  });

  it('stripe and card-content are siblings (neither contains the other)', () => {
    renderNode({
      urlTemplate: '/page/<id>',
      pageCount: 1,
      tags: ['food'],
      onUpdate: vi.fn(),
    });
    const stripe = screen.getByTestId('cluster-stripe');
    const content = screen.getByTestId('card-content');
    expect(stripe.contains(content)).toBe(false);
    expect(content.contains(stripe)).toBe(false);
    expect(stripe.parentElement).toBe(content.parentElement);
  });
});
