import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import type { Node } from 'reactflow';
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

vi.mock('reactflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('reactflow')>();
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
    const [btn] = screen.getAllByRole('button');
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
});

// ---------------------------------------------------------------------------
// Wave 5 (RED 3): ScoreSidebar resize handle
// ---------------------------------------------------------------------------

describe('ScoreSidebar resize handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aside has default width of 240px via inline style', () => {
    const { container } = renderSidebar([], new Map());
    const aside = container.querySelector('aside')!;
    expect(aside.style.width).toBe('240px');
  });

  it('resize-handle div is present with col-resize cursor', () => {
    const { container } = renderSidebar([], new Map());
    const handle = container.querySelector('[data-testid="resize-handle"]')!;
    expect(handle).toBeTruthy();
    expect(handle.className).toMatch(/cursor-col-resize/);
  });

  it('dragging handle left increases width', () => {
    const { container } = renderSidebar([], new Map());
    const aside = container.querySelector('aside')!;
    const handle = container.querySelector('[data-testid="resize-handle"]')!;
    fireEvent.mouseDown(handle, { clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 440 });
    // delta = 500 - 440 = 60, width = 240 + 60 = 300
    expect(aside.style.width).toBe('300px');
  });

  it('dragging handle right decreases width', () => {
    const { container } = renderSidebar([], new Map());
    const aside = container.querySelector('aside')!;
    const handle = container.querySelector('[data-testid="resize-handle"]')!;
    fireEvent.mouseDown(handle, { clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 560 });
    // delta = 500 - 560 = -60, width = 240 - 60 = 180
    expect(aside.style.width).toBe('180px');
  });

  it('width is clamped to minimum 160px', () => {
    const { container } = renderSidebar([], new Map());
    const aside = container.querySelector('aside')!;
    const handle = container.querySelector('[data-testid="resize-handle"]')!;
    fireEvent.mouseDown(handle, { clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 900 }); // delta = -400
    expect(aside.style.width).toBe('160px');
  });

  it('width is clamped to maximum 480px', () => {
    const { container } = renderSidebar([], new Map());
    const aside = container.querySelector('aside')!;
    const handle = container.querySelector('[data-testid="resize-handle"]')!;
    fireEvent.mouseDown(handle, { clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 0 }); // delta = +500
    expect(aside.style.width).toBe('480px');
  });

  it('mouseup stops the drag — further mousemove has no effect', () => {
    const { container } = renderSidebar([], new Map());
    const aside = container.querySelector('aside')!;
    const handle = container.querySelector('[data-testid="resize-handle"]')!;
    fireEvent.mouseDown(handle, { clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 440 }); // width → 300
    fireEvent.mouseUp(document);
    fireEvent.mouseMove(document, { clientX: 300 }); // should not change
    expect(aside.style.width).toBe('300px');
  });

  it('w-60 class is NOT present on the aside element', () => {
    const { container } = renderSidebar([], new Map());
    const aside = container.querySelector('aside')!;
    expect(aside.className).not.toMatch(/\bw-60\b/);
  });

  it('unmounting removes document event listeners', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { container, unmount } = renderSidebar([], new Map());
    const handle = container.querySelector('[data-testid="resize-handle"]')!;
    // Start a drag so listeners are attached
    fireEvent.mouseDown(handle, { clientX: 500 });
    unmount();
    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('mousemove');
    expect(removedEvents).toContain('mouseup');
    removeSpy.mockRestore();
  });
});
