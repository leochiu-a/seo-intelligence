import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { UrlNode } from './UrlNode';
import type { UrlNodeData } from '../lib/graph-utils';

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
});
