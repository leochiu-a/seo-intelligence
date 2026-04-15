import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { UrlNode } from './UrlNode';
import type { UrlNodeData } from '../lib/graph-utils';

// Capture setNodes calls so we can verify zIndex mutations
const mockSetNodes = vi.fn();
const mockGetNodes = vi.fn(() => []);
vi.mock('reactflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('reactflow')>();
  return {
    ...actual,
    useReactFlow: () => ({ setNodes: mockSetNodes, getNodes: mockGetNodes }),
  };
});

// UrlNodeExtendedData mirror for test props
interface TestNodeData extends UrlNodeData {
  onUpdate?: (id: string, data: Partial<UrlNodeData>) => void;
  scoreTier?: 'high' | 'mid' | 'low' | 'neutral';
  isWeak?: boolean;
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
      <UrlNode {...(props as NodeProps<UrlNodeData & { onUpdate?: (id: string, data: Partial<UrlNodeData>) => void; scoreTier?: 'high' | 'mid' | 'low' | 'neutral'; isWeak?: boolean }>)} />
    </ReactFlowProvider>,
  );
}

describe('UrlNode', () => {
  beforeEach(() => mockSetNodes.mockClear());

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

  it('elevates node zIndex to 1000 when edit popover opens', async () => {
    const user = userEvent.setup();
    renderNode({ urlTemplate: '/blog', pageCount: 1, onUpdate: vi.fn() });

    mockSetNodes.mockClear();
    await user.click(screen.getByRole('button', { name: 'Edit node' }));

    // setNodes should have been called; find the call that sets zIndex 1000
    const elevateCall = mockSetNodes.mock.calls.find(([updater]) => {
      const result = updater([{ id: 'node-1', zIndex: 0 }]);
      return result[0].zIndex === 1000;
    });
    expect(elevateCall).toBeDefined();
  });

  it('resets node zIndex to 0 when edit popover closes', async () => {
    const user = userEvent.setup();
    renderNode({ urlTemplate: '/blog', pageCount: 1, onUpdate: vi.fn() });

    await user.click(screen.getByRole('button', { name: 'Edit node' }));
    mockSetNodes.mockClear();
    await user.keyboard('{Escape}');

    const resetCall = mockSetNodes.mock.calls.find(([updater]) => {
      const result = updater([{ id: 'node-1', zIndex: 1000 }]);
      return result[0].zIndex === 0;
    });
    expect(resetCall).toBeDefined();
  });
});
