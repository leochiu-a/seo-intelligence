import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { UrlNodeData } from "../lib/graph-utils";
import { PagesPanel } from "./PagesPanel";

const mockSetNodes = vi.fn();
const mockFitView = vi.fn();
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useReactFlow: () => ({
      setNodes: mockSetNodes,
      fitView: mockFitView,
      getNodes: () => [],
    }),
  };
});

function makeNode(
  id: string,
  urlTemplate: string,
  overrides: Partial<UrlNodeData> = {},
): Node<UrlNodeData> {
  return {
    id,
    type: "urlNode",
    position: { x: 0, y: 0 },
    data: { urlTemplate, pageCount: 1, ...overrides },
  };
}

interface RenderOpts {
  nodes?: Node<UrlNodeData>[];
  scores?: Map<string, number>;
  allScoreValues?: number[];
  weakNodes?: Set<string>;
  orphanNodes?: Set<string>;
  unreachableNodes?: Set<string>;
  depthMap?: Map<string, number>;
  outboundMap?: Map<string, number>;
  inboundMap?: Map<string, number>;
  rootId?: string | null;
  onNodeHighlight?: (id: string | null) => void;
}

function renderPanel(opts: RenderOpts = {}) {
  return render(
    <ReactFlowProvider>
      <PagesPanel
        nodes={opts.nodes ?? []}
        scores={opts.scores ?? new Map()}
        allScoreValues={opts.allScoreValues ?? []}
        weakNodes={opts.weakNodes ?? new Set()}
        orphanNodes={opts.orphanNodes ?? new Set()}
        unreachableNodes={opts.unreachableNodes ?? new Set()}
        depthMap={opts.depthMap ?? new Map()}
        outboundMap={opts.outboundMap ?? new Map()}
        inboundMap={opts.inboundMap ?? new Map()}
        rootId={opts.rootId ?? null}
        onNodeHighlight={opts.onNodeHighlight}
      />
    </ReactFlowProvider>,
  );
}

async function selectSortOption(value: string) {
  const user = userEvent.setup({ pointerEventsCheck: 0, delay: null });
  const trigger = screen.getByTestId("pages-sort");
  await user.click(trigger);
  const item = await screen.findByTestId(`pages-sort-option-${value}`);
  // Base UI SelectItem's onClick bails early unless the item is highlighted
  // OR the pointer type is "touch". Highlight relies on Floating UI's
  // list-navigation hover tracking, which was flaky on GitHub Actions (fine
  // locally). Seed pointerType=touch via a synthetic pointerdown so the
  // click path commits regardless of highlight state.
  fireEvent.pointerDown(item, { button: 0, pointerType: "touch" });
  fireEvent.pointerUp(item, { button: 0, pointerType: "touch" });
  fireEvent.click(item);
}

beforeEach(() => {
  mockSetNodes.mockReset();
  mockFitView.mockReset();
});

afterEach(() => {
  // Base UI Select renders its popup into document.body via a portal. RTL's
  // automatic cleanup unmounts the React tree but leftover popup nodes can
  // linger; explicitly cleanup then clear body.
  cleanup();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("PagesPanel", () => {
  it("renders one row per node", () => {
    const nodes = [makeNode("a", "/a"), makeNode("b", "/b"), makeNode("c", "/c")];
    renderPanel({ nodes });
    expect(screen.getAllByTestId("pages-row")).toHaveLength(3);
  });

  it("default sort orders orphan → unreachable-only → warning → clean; every group sorts score ascending so LOW-tier surfaces first", () => {
    // clean-a (tier ok, tags set) score 5; warning-b (no tags) score 2;
    // orphan-c score 1; unreachable-d score 3; warning-e (no tags) score 4;
    // clean-f (tier ok, tags set) score 6.
    const nodes = [
      makeNode("a", "/clean-a", { tags: ["t"] }),
      makeNode("b", "/warn-b"), // no tags → health warning
      makeNode("c", "/orphan-c", { tags: ["t"] }),
      makeNode("d", "/unreach-d", { tags: ["t"] }),
      makeNode("e", "/warn-e"), // no tags → health warning
      makeNode("f", "/clean-f", { tags: ["t"] }),
    ];
    const scores = new Map<string, number>([
      ["a", 5],
      ["b", 2],
      ["c", 1],
      ["d", 3],
      ["e", 4],
      ["f", 6],
    ]);
    renderPanel({
      nodes,
      scores,
      orphanNodes: new Set(["c"]),
      unreachableNodes: new Set(["d"]),
    });
    const rows = screen.getAllByTestId("pages-row");
    const templates = rows.map((r) => r.getAttribute("data-node-id"));
    // Expected order:
    //  group 0 orphan: c
    //  group 1 unreachable-only: d
    //  group 2 warning: b (score 2) then e (score 4)
    //  group 3 clean: a (score 5) then f (score 6) — ascending so LOW tier appears first
    expect(templates).toEqual(["c", "d", "b", "e", "a", "f"]);
  });

  it("switching sort to 'score-hi' reorders rows by score descending", async () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] }), makeNode("b", "/b", { tags: ["t"] })];
    const scores = new Map<string, number>([
      ["a", 1],
      ["b", 9],
    ]);
    renderPanel({ nodes, scores });
    await selectSortOption("score-hi");
    const ids = screen.getAllByTestId("pages-row").map((r) => r.getAttribute("data-node-id"));
    expect(ids).toEqual(["b", "a"]);
  });

  it("switching sort to 'url-asc' sorts by URL template alphabetically", async () => {
    // Scores chosen so default issue-tier sort differs from url-asc: default
    // ties on clean status then sorts by score asc → [a (/z, 1), b (/a, 9)];
    // url-asc must re-sort to [b (/a), a (/z)] to pass.
    const nodes = [makeNode("a", "/z", { tags: ["t"] }), makeNode("b", "/a", { tags: ["t"] })];
    const scores = new Map<string, number>([
      ["a", 1],
      ["b", 9],
    ]);
    renderPanel({ nodes, scores });
    await selectSortOption("url-asc");
    const ids = screen.getAllByTestId("pages-row").map((r) => r.getAttribute("data-node-id"));
    expect(ids).toEqual(["b", "a"]);
  });

  it("clicking a row calls setNodes, schedules fitView after 50ms, and calls onNodeHighlight", () => {
    vi.useFakeTimers();
    const onNodeHighlight = vi.fn();
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    renderPanel({ nodes, onNodeHighlight });
    fireEvent.click(screen.getByTestId("pages-row").querySelector("button")!);
    expect(mockSetNodes).toHaveBeenCalledTimes(1);
    expect(mockSetNodes.mock.calls[0][0]).toBeInstanceOf(Function);
    expect(onNodeHighlight).toHaveBeenCalledWith("a");
    // fitView is wrapped in setTimeout(..., 50) — not called yet.
    expect(mockFitView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: "a" }],
      duration: 300,
      padding: 0.5,
    });
    vi.useRealTimers();
  });

  it("empty state: 'Add nodes to see pages' when nodes is empty", () => {
    renderPanel({ nodes: [] });
    expect(screen.getByText(/Add nodes to see pages/)).toBeInTheDocument();
    expect(screen.queryAllByTestId("pages-row")).toHaveLength(0);
  });

  it("orphan and unreachable section banners render when sort is default", () => {
    const nodes = [
      makeNode("a", "/orphan", { tags: ["t"] }),
      makeNode("b", "/unreach", { tags: ["t"] }),
      makeNode("c", "/clean", { tags: ["t"] }),
    ];
    renderPanel({
      nodes,
      orphanNodes: new Set(["a"]),
      unreachableNodes: new Set(["b"]),
    });
    expect(screen.getByTestId("pages-banner-orphan")).toHaveTextContent("Orphan Pages (1)");
    expect(screen.getByTestId("pages-banner-unreachable")).toHaveTextContent("Unreachable (1)");
  });

  it("section banners do NOT render when sort is not issue-tier", async () => {
    const nodes = [
      makeNode("a", "/orphan", { tags: ["t"] }),
      makeNode("b", "/unreach", { tags: ["t"] }),
    ];
    renderPanel({
      nodes,
      orphanNodes: new Set(["a"]),
      unreachableNodes: new Set(["b"]),
    });
    await selectSortOption("score-hi");
    expect(screen.queryByTestId("pages-banner-orphan")).toBeNull();
    expect(screen.queryByTestId("pages-banner-unreachable")).toBeNull();
  });

  it("row meta shows Depth/in/out and highlights outbound > 150 + depth > 3", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    const rootId = "r";
    renderPanel({
      nodes,
      rootId,
      depthMap: new Map([["a", 5]]),
      outboundMap: new Map([["a", 200]]),
      inboundMap: new Map([["a", 3]]),
    });
    const row = screen.getByTestId("pages-row");
    expect(within(row).getByText(/Depth 5/)).toBeInTheDocument();
    expect(within(row).getByText(/in 3/)).toBeInTheDocument();
    const outSegment = within(row).getByText(/out 200/);
    expect(outSegment.className).toMatch(/text-red-500/);
    const depthSegment = within(row).getByText(/Depth 5/);
    expect(depthSegment.className).toMatch(/text-amber-500/);
  });

  it("Depth segment is NOT rendered when rootId is null", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    renderPanel({ nodes, rootId: null });
    const row = screen.getByTestId("pages-row");
    expect(within(row).queryByText(/Depth /)).toBeNull();
    expect(within(row).getByText(/in 0/)).toBeInTheDocument();
    expect(within(row).getByText(/out 0/)).toBeInTheDocument();
  });

  it("inbound count always renders, including zero", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    renderPanel({ nodes, inboundMap: new Map([["a", 0]]) });
    expect(screen.getByText(/in 0/)).toBeInTheDocument();
  });

  it("rootId-missing amber banner renders only when rootId is null and nodes.length > 0", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    const { rerender } = renderPanel({ nodes, rootId: null });
    expect(screen.getByText(/Set a root node to see crawl depth/)).toBeInTheDocument();
    rerender(
      <ReactFlowProvider>
        <PagesPanel
          nodes={nodes}
          scores={new Map()}
          allScoreValues={[]}
          weakNodes={new Set()}
          orphanNodes={new Set()}
          unreachableNodes={new Set()}
          depthMap={new Map()}
          outboundMap={new Map()}
          inboundMap={new Map()}
          rootId={"a"}
        />
      </ReactFlowProvider>,
    );
    expect(screen.queryByText(/Set a root node to see crawl depth/)).toBeNull();
  });

  it("weak page row shows general warning trigger (pages-warn-general)", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    renderPanel({ nodes, weakNodes: new Set(["a"]) });
    expect(screen.getByTestId("pages-warn-general")).toBeInTheDocument();
  });

  it("orphan page row shows orphan trigger and NOT the general trigger", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    renderPanel({ nodes, orphanNodes: new Set(["a"]) });
    expect(screen.getByTestId("pages-warn-orphan")).toBeInTheDocument();
    expect(screen.queryByTestId("pages-warn-general")).toBeNull();
  });
});
