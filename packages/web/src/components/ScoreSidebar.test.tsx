import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { buildUrlTree } from '../lib/graph-utils';
import type { UrlNodeData } from '../lib/graph-utils';
import { ScoreSidebar } from './ScoreSidebar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, urlTemplate: string): Node<UrlNodeData> {
  return {
    id,
    type: 'urlNode',
    position: { x: 0, y: 0 },
    data: { urlTemplate, pageCount: 1 },
  };
}

// ---------------------------------------------------------------------------
// Wave 1 (RED 1): buildUrlTree — pure function tests (no React)
// ---------------------------------------------------------------------------

describe('buildUrlTree', () => {
  it('returns [] for empty nodes', () => {
    expect(buildUrlTree([], new Map())).toEqual([]);
  });

  it('single "/" node → depth 0, no children', () => {
    const node = makeNode('n1', '/');
    const scores = new Map([['n1', 0.5]]);
    const result = buildUrlTree([node], scores);
    expect(result).toHaveLength(1);
    expect(result[0].depth).toBe(0);
    expect(result[0].children).toHaveLength(0);
  });

  it('single "/about" node → depth 0, no children', () => {
    const node = makeNode('n1', '/about');
    const scores = new Map([['n1', 0.5]]);
    const result = buildUrlTree([node], scores);
    expect(result).toHaveLength(1);
    expect(result[0].depth).toBe(0);
    expect(result[0].children).toHaveLength(0);
  });

  it('"/blog" is parent of "/blog/category"', () => {
    const blog = makeNode('n1', '/blog');
    const cat = makeNode('n2', '/blog/category');
    const scores = new Map([['n1', 0.8], ['n2', 0.3]]);
    const result = buildUrlTree([blog, cat], scores);
    expect(result).toHaveLength(1);
    expect(result[0].urlTemplate).toBe('/blog');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].urlTemplate).toBe('/blog/category');
    expect(result[0].children[0].depth).toBe(1);
  });

  it('"/blog" is parent of "/blog/<id>" (template segments count)', () => {
    const blog = makeNode('n1', '/blog');
    const post = makeNode('n2', '/blog/<id>');
    const scores = new Map([['n1', 0.8], ['n2', 0.3]]);
    const result = buildUrlTree([blog, post], scores);
    expect(result).toHaveLength(1);
    expect(result[0].urlTemplate).toBe('/blog');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].urlTemplate).toBe('/blog/<id>');
  });

  it('"/blog/<id>" and "/blog/category" are siblings (both direct children of "/blog")', () => {
    const blog = makeNode('n1', '/blog');
    const post = makeNode('n2', '/blog/<id>');
    const cat = makeNode('n3', '/blog/category');
    const scores = new Map([['n1', 0.9], ['n2', 0.5], ['n3', 0.3]]);
    const result = buildUrlTree([blog, post, cat], scores);
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(2);
    const childTemplates = result[0].children.map((c) => c.urlTemplate);
    expect(childTemplates).toContain('/blog/<id>');
    expect(childTemplates).toContain('/blog/category');
  });

  it('depth 2 assigned to "/blog/category/<id>" when "/blog/category" exists', () => {
    const blog = makeNode('n1', '/blog');
    const cat = makeNode('n2', '/blog/category');
    const item = makeNode('n3', '/blog/category/<id>');
    const scores = new Map([['n1', 0.9], ['n2', 0.5], ['n3', 0.2]]);
    const result = buildUrlTree([blog, cat, item], scores);
    const catNode = result[0].children[0];
    expect(catNode.urlTemplate).toBe('/blog/category');
    expect(catNode.children).toHaveLength(1);
    expect(catNode.children[0].depth).toBe(2);
  });

  it('"/" is NOT parent of "/about" (empty segments cannot be prefix)', () => {
    const root = makeNode('n1', '/');
    const about = makeNode('n2', '/about');
    const scores = new Map([['n1', 0.9], ['n2', 0.5]]);
    const result = buildUrlTree([root, about], scores);
    expect(result).toHaveLength(2);
    const rootNode = result.find((n) => n.urlTemplate === '/');
    expect(rootNode?.children).toHaveLength(0);
  });

  it('roots are sorted by score descending', () => {
    const about = makeNode('n1', '/about');
    const root = makeNode('n2', '/');
    const contact = makeNode('n3', '/contact');
    const scores = new Map([['n1', 0.2], ['n2', 0.9], ['n3', 0.5]]);
    const result = buildUrlTree([about, root, contact], scores);
    expect(result[0].score).toBe(0.9);
    expect(result[1].score).toBe(0.5);
    expect(result[2].score).toBe(0.2);
  });

  it('children within a parent are sorted by score descending', () => {
    const blog = makeNode('n1', '/blog');
    const cat = makeNode('n2', '/blog/category');
    const post = makeNode('n3', '/blog/<id>');
    const scores = new Map([['n1', 0.9], ['n2', 0.1], ['n3', 0.7]]);
    const result = buildUrlTree([blog, cat, post], scores);
    expect(result[0].children[0].score).toBe(0.7);
    expect(result[0].children[1].score).toBe(0.1);
  });

  it('per-level sorting is independent', () => {
    const blog = makeNode('n1', '/blog');
    const about = makeNode('n2', '/about');
    const post = makeNode('n3', '/blog/<id>');
    const scores = new Map([['n1', 0.1], ['n2', 0.9], ['n3', 0.99]]);
    const result = buildUrlTree([blog, about, post], scores);
    // Roots: /about (0.9) first, /blog (0.1) second
    expect(result[0].urlTemplate).toBe('/about');
    expect(result[1].urlTemplate).toBe('/blog');
    // /blog/<id> is child of /blog, not a root
    expect(result).toHaveLength(2);
    expect(result[1].children).toHaveLength(1);
  });

  it('each UrlTreeNode carries the correct score from the Map', () => {
    const node = makeNode('n1', '/blog');
    const scores = new Map([['n1', 0.42]]);
    const result = buildUrlTree([node], scores);
    expect(result[0].score).toBe(0.42);
  });

  it('nodes absent from scores Map default to score 0', () => {
    const node = makeNode('n1', '/blog');
    const result = buildUrlTree([node], new Map());
    expect(result[0].score).toBe(0);
  });

  it('tree node id matches original node id', () => {
    const node = makeNode('abc-123', '/blog');
    const result = buildUrlTree([node], new Map([['abc-123', 0.5]]));
    expect(result[0].id).toBe('abc-123');
  });
});

// ---------------------------------------------------------------------------
// Wave 3 (RED 2): ScoreSidebar hierarchy rendering
// ---------------------------------------------------------------------------

// vi.mock for reactflow so we can spy on setNodes/fitView
const mockSetNodes = vi.fn();
const mockFitView = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    useReactFlow: () => ({
      setNodes: mockSetNodes,
      fitView: mockFitView,
    }),
  };
});

function renderSidebar(
  nodes: Node<UrlNodeData>[],
  scores: Map<string, number>,
  weakNodes: Set<string> = new Set(),
  orphanNodes: Set<string> = new Set(),
  unreachableNodes: Set<string> = new Set(),
  depthMap: Map<string, number> = new Map(),
  rootId: string | null = null,
  outboundMap: Map<string, number> = new Map(),
) {
  return render(
    <ReactFlowProvider>
      <ScoreSidebar
        nodes={nodes}
        scores={scores}
        weakNodes={weakNodes}
        orphanNodes={orphanNodes}
        unreachableNodes={unreachableNodes}
        depthMap={depthMap}
        outboundMap={outboundMap}
        rootId={rootId}
      />
    </ReactFlowProvider>,
  );
}

describe('ScoreSidebar hierarchy rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parents appear before children in DOM order', () => {
    const blog = makeNode('n1', '/blog');
    const cat = makeNode('n2', '/blog/category');
    const scores = new Map([['n1', 0.8], ['n2', 0.3]]);
    renderSidebar([blog, cat], scores);
    const buttons = screen.getAllByRole('button');
    const blogIdx = buttons.findIndex((b) => b.textContent?.includes('/blog'));
    const catIdx = buttons.findIndex((b) => b.textContent?.includes('/blog/category'));
    expect(blogIdx).toBeLessThan(catIdx);
  });

  it('child buttons have deeper left padding vs root', () => {
    const blog = makeNode('n1', '/blog');
    const cat = makeNode('n2', '/blog/category');
    const scores = new Map([['n1', 0.8], ['n2', 0.3]]);
    renderSidebar([blog, cat], scores);
    const buttons = screen.getAllByRole('button');
    const blogBtn = buttons.find((b) => b.textContent?.includes('/blog') && !b.textContent?.includes('/blog/category'))!;
    const catBtn = buttons.find((b) => b.textContent?.includes('/blog/category'))!;
    const blogPadding = parseInt(blogBtn.style.paddingLeft || '0', 10);
    const catPadding = parseInt(catBtn.style.paddingLeft || '0', 10);
    expect(catPadding).toBeGreaterThan(blogPadding);
  });

  it('root node button has 12px base left padding', () => {
    const about = makeNode('n1', '/about');
    const scores = new Map([['n1', 0.5]]);
    renderSidebar([about], scores);
    // Find the score-row button (not the tab buttons) by matching the URL template text
    const btn = screen.getAllByRole('button').find((b) => b.textContent?.includes('/about'))!;
    expect(btn.style.paddingLeft).toBe('12px');
  });

  it('weak node icon appears on child nodes too', () => {
    const blog = makeNode('n1', '/blog');
    const cat = makeNode('n2', '/blog/category');
    const scores = new Map([['n1', 0.8], ['n2', 0.3]]);
    const weakNodes = new Set(['n2']);
    renderSidebar([blog, cat], scores, weakNodes);
    expect(screen.getByLabelText('Weak page')).toBeTruthy();
  });

  it('weak node renders tooltip trigger with explanatory content', async () => {
    const blog = makeNode('n1', '/blog');
    const cat = makeNode('n2', '/blog/category');
    const scores = new Map([['n1', 0.8], ['n2', 0.3]]);
    const weakNodes = new Set(['n2']);
    renderSidebar([blog, cat], scores, weakNodes);
    const trigger = screen.getByTestId('score-weak-warning');
    await userEvent.hover(trigger);
    expect(await screen.findByText(/below average/i)).toBeTruthy();
  });

  it('non-weak nodes do NOT render the tooltip trigger', () => {
    const blog = makeNode('n1', '/blog');
    const scores = new Map([['n1', 0.8]]);
    renderSidebar([blog], scores, new Set());
    expect(screen.queryByTestId('score-weak-warning')).toBeNull();
  });

  it('clicking a child node calls setNodes and fitView with correct id', async () => {
    const blog = makeNode('n1', '/blog');
    const cat = makeNode('n2', '/blog/category');
    const scores = new Map([['n1', 0.8], ['n2', 0.3]]);
    renderSidebar([blog, cat], scores);
    const catBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('/blog/category'))!;
    fireEvent.click(catBtn);
    expect(mockSetNodes).toHaveBeenCalled();
    // fitView is called in a setTimeout — advance timers
    await vi.waitFor(() => expect(mockFitView).toHaveBeenCalledWith(
      expect.objectContaining({ nodes: [{ id: 'n2' }] }),
    ));
  });

  it('renders empty state message when nodes = []', () => {
    renderSidebar([], new Map());
    expect(screen.getByText('Add nodes to see scores')).toBeTruthy();
  });

  it('renders `{count} links` inline on the score line when outboundMap has a value under threshold', () => {
    const about = makeNode('n1', '/about');
    const scores = new Map([['n1', 0.5]]);
    const outboundMap = new Map([['n1', 50]]);
    renderSidebar([about], scores, new Set(), new Set(), new Set(), new Map(), null, outboundMap);
    const span = screen.getByText('50 links');
    expect(span).toBeTruthy();
    expect(span.className).not.toMatch(/text-red-500/);
  });

  it('renders `{count} links` in text-red-500 when count exceeds OUTBOUND_WARNING_THRESHOLD (150)', () => {
    const about = makeNode('n1', '/about');
    const scores = new Map([['n1', 0.5]]);
    const outboundMap = new Map([['n1', 200]]);
    renderSidebar([about], scores, new Set(), new Set(), new Set(), new Map(), null, outboundMap);
    const span = screen.getByText('200 links');
    expect(span).toBeTruthy();
    expect(span.className).toMatch(/text-red-500/);
  });
});

// ---------------------------------------------------------------------------
// Wave 6 (RED 4): ScoreSidebar cluster dots
// ---------------------------------------------------------------------------

function makeNodeWithTags(id: string, urlTemplate: string, tags: string[]): Node<UrlNodeData> {
  return {
    id,
    type: 'urlNode',
    position: { x: 0, y: 0 },
    data: { urlTemplate, pageCount: 1, tags },
  };
}

describe('ScoreSidebar cluster dots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders up to 3 cluster dots before URL template when node has tags', () => {
    const node = makeNodeWithTags('n1', '/about', ['travel', 'hotels', 'flights']);
    const scores = new Map([['n1', 0.5]]);
    const { container } = renderSidebar([node], scores);
    const dotsWrapper = container.querySelector('[data-testid="cluster-dots"]');
    expect(dotsWrapper).toBeTruthy();
    const dots = container.querySelectorAll('[data-testid="cluster-dots"] > span');
    expect(dots.length).toBe(3);
  });

  it('renders no dots when node has no tags', () => {
    const node = makeNode('n1', '/about');
    const scores = new Map([['n1', 0.5]]);
    const { container } = renderSidebar([node], scores);
    const dotsWrapper = container.querySelector('[data-testid="cluster-dots"]');
    expect(dotsWrapper).toBeNull();
  });

  it('caps at 3 dots for nodes with 4 or more tags', () => {
    const node = makeNodeWithTags('n1', '/about', ['a', 'b', 'c', 'd']);
    const scores = new Map([['n1', 0.5]]);
    const { container } = renderSidebar([node], scores);
    const dots = container.querySelectorAll('[data-testid="cluster-dots"] > span');
    expect(dots.length).toBe(3);
  });

  it('dot span has rounded-full and correct palette color class', () => {
    const node = makeNodeWithTags('n1', '/about', ['travel']);
    const scores = new Map([['n1', 0.5]]);
    const { container } = renderSidebar([node], scores);
    const dot = container.querySelector('[data-testid="cluster-dots"] > span')!;
    expect(dot.className).toMatch(/rounded-full/);
    expect(dot.className).toMatch(/bg-\w+-400/);
  });

  it('orphan section rows also render dots when node has tags', () => {
    const node = makeNodeWithTags('n1', '/orphan', ['travel', 'hotels']);
    const scores = new Map([['n1', 0.1]]);
    const orphanNodes = new Set(['n1']);
    const { container } = renderSidebar([node], scores, new Set(), orphanNodes);
    const dotsWrapper = container.querySelector('[data-testid="cluster-dots"]');
    expect(dotsWrapper).toBeTruthy();
    const dots = container.querySelectorAll('[data-testid="cluster-dots"] > span');
    expect(dots.length).toBe(2);
  });

  it('orphan section rows render no dots when node has no tags', () => {
    const node = makeNode('n1', '/orphan');
    const scores = new Map([['n1', 0.1]]);
    const orphanNodes = new Set(['n1']);
    const { container } = renderSidebar([node], scores, new Set(), orphanNodes);
    const dotsWrapper = container.querySelector('[data-testid="cluster-dots"]');
    expect(dotsWrapper).toBeNull();
  });

  it('unreachable section rows render dots when node has tags', () => {
    const node = makeNodeWithTags('n1', '/unreachable', ['travel']);
    const scores = new Map([['n1', 0.0]]);
    const unreachableNodes = new Set(['n1']);
    const { container } = renderSidebar([node], scores, new Set(), new Set(), unreachableNodes);
    const dotsWrapper = container.querySelector('[data-testid="cluster-dots"]');
    expect(dotsWrapper).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Phase 11.1: ScoreSidebar [Score|Health] tabs
// ---------------------------------------------------------------------------

describe('ScoreSidebar [Score|Health] tabs', () => {
  function renderSidebar(nodes: Node<UrlNodeData>[] = []) {
    return render(
      <ReactFlowProvider>
        <ScoreSidebar
          nodes={nodes}
          scores={new Map()}
          weakNodes={new Set()}
          orphanNodes={new Set()}
          unreachableNodes={new Set()}
          depthMap={new Map()}
          outboundMap={new Map()}
          rootId={null}
        />
      </ReactFlowProvider>,
    );
  }

  it('renders both tab buttons', () => {
    renderSidebar();
    expect(screen.getByTestId('tab-score')).toBeInTheDocument();
    expect(screen.getByTestId('tab-health')).toBeInTheDocument();
  });

  it('defaults to Score tab — Score Ranking header visible, HealthPanel hidden', () => {
    renderSidebar([makeNode('a', '/a')]);
    expect(screen.getByText(/Score Ranking/i)).toBeInTheDocument();
    expect(screen.queryByTestId('health-panel')).toBeNull();
  });

  it('clicking Health tab shows HealthPanel and hides Score Ranking', () => {
    renderSidebar([makeNode('a', '/a')]);
    fireEvent.click(screen.getByTestId('tab-health'));
    expect(screen.getByTestId('health-panel')).toBeInTheDocument();
    expect(screen.queryByText(/Score Ranking/i)).toBeNull();
  });

  it('clicking Score tab after Health returns to Score view', () => {
    renderSidebar([makeNode('a', '/a')]);
    fireEvent.click(screen.getByTestId('tab-health'));
    fireEvent.click(screen.getByTestId('tab-score'));
    expect(screen.getByText(/Score Ranking/i)).toBeInTheDocument();
    expect(screen.queryByTestId('health-panel')).toBeNull();
  });
});

