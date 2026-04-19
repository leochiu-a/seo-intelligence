import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { UrlNode } from "./UrlNode";
import type { UrlNodeData } from "../lib/graph-utils";
import { getClusterColor } from "../lib/cluster-colors";

const mockGetNodes = vi.fn((): Node[] => []);
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useReactFlow: () => ({ getNodes: mockGetNodes }),
  };
});

// UrlNodeExtendedData mirror for test props
type TestNodeData = UrlNodeData & {
  onUpdate?: (id: string, data: Partial<UrlNodeData>) => void;
  onZIndexChange?: (id: string, zIndex: number) => void;
  scoreTier?: "high" | "mid" | "low" | "neutral";
  isWeak?: boolean;
  outboundCount?: number;
  isOverLinked?: boolean;
  tags?: string[];
  isDimmed?: boolean;
};

function makeNodeProps(data: TestNodeData): NodeProps<Node<TestNodeData>> {
  return {
    id: "node-1",
    data,
    selected: false,
    type: "urlNode",
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
    width: undefined,
    height: undefined,
    parentId: undefined,
  } as unknown as NodeProps<Node<TestNodeData>>;
}

function renderNode(data: TestNodeData) {
  const props = makeNodeProps(data);
  return render(
    <ReactFlowProvider>
      <UrlNode {...(props as unknown as NodeProps<Node<TestNodeData>>)} />
    </ReactFlowProvider>,
  );
}

describe("UrlNode", () => {
  it("renders Globe badge when isGlobal=true", () => {
    renderNode({
      urlTemplate: "/nav",
      pageCount: 1,
      isGlobal: true,
      onUpdate: vi.fn(),
    });
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("does not render Globe badge when isGlobal is false or undefined", () => {
    renderNode({
      urlTemplate: "/page/<id>",
      pageCount: 5,
      isGlobal: false,
      onUpdate: vi.fn(),
    });
    expect(screen.queryByText("Global")).not.toBeInTheDocument();
  });

  it("elevates node zIndex to 1000 via onZIndexChange when edit popover opens", async () => {
    const user = userEvent.setup();
    const onZIndexChange = vi.fn();
    renderNode({ urlTemplate: "/blog", pageCount: 1, onUpdate: vi.fn(), onZIndexChange });

    onZIndexChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Edit node" }));

    expect(onZIndexChange).toHaveBeenCalledWith("node-1", 1000);
  });

  it("resets node zIndex to 0 via onZIndexChange when edit popover closes", async () => {
    const user = userEvent.setup();
    const onZIndexChange = vi.fn();
    renderNode({ urlTemplate: "/blog", pageCount: 1, onUpdate: vi.fn(), onZIndexChange });

    await user.click(screen.getByRole("button", { name: "Edit node" }));
    onZIndexChange.mockClear();
    await user.keyboard("{Escape}");

    expect(onZIndexChange).toHaveBeenCalledWith("node-1", 0);
  });

  it("renders red TriangleAlert with `{count} links` label when isOverLinked is true", () => {
    renderNode({
      urlTemplate: "/page/<id>",
      pageCount: 5,
      outboundCount: 167,
      isOverLinked: true,
      onUpdate: vi.fn(),
    });
    expect(screen.getByLabelText("Over-linked page")).toBeInTheDocument();
    expect(screen.getByText("167 links")).toBeInTheDocument();
  });

  it("does NOT render the over-linked indicator when isOverLinked is false", () => {
    renderNode({
      urlTemplate: "/page/<id>",
      pageCount: 5,
      outboundCount: 120,
      isOverLinked: false,
      onUpdate: vi.fn(),
    });
    expect(screen.queryByLabelText("Over-linked page")).not.toBeInTheDocument();
    expect(screen.queryByText("120 links")).not.toBeInTheDocument();
  });

  it("passes clusterSuggestions from other nodes with tags into EditPopover", async () => {
    const user = userEvent.setup();
    mockGetNodes.mockReturnValue([
      {
        id: "node-2",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/other", pageCount: 1, tags: ["food", "taipei"] },
      },
      {
        id: "node-3",
        type: "urlNode",
        position: { x: 0, y: 0 },
        data: { urlTemplate: "/another", pageCount: 1, tags: ["food"] },
      },
    ]);

    renderNode({ urlTemplate: "/blog", pageCount: 1, onUpdate: vi.fn() });
    await user.click(screen.getByRole("button", { name: "Edit node" }));

    expect(screen.getByText("Cluster Tags")).toBeInTheDocument();
  });

  it("passes data.tags to EditPopover as initial tags", async () => {
    const user = userEvent.setup();
    mockGetNodes.mockReturnValue([]);

    renderNode({ urlTemplate: "/blog", pageCount: 1, tags: ["travel"], onUpdate: vi.fn() });
    await user.click(screen.getByRole("button", { name: "Edit node" }));

    expect(screen.getAllByText("travel").length).toBeGreaterThanOrEqual(1);
  });

  it("card-content has opacity 0.2 when isDimmed is true", () => {
    renderNode({
      urlTemplate: "/page/<id>",
      pageCount: 1,
      isDimmed: true,
      onUpdate: vi.fn(),
    });
    const content = screen.getByTestId("card-content");
    expect(content).toHaveStyle({ opacity: "0.2" });
  });

  it("card-content has opacity 1 when isDimmed is false or undefined", () => {
    renderNode({
      urlTemplate: "/page/<id>",
      pageCount: 1,
      isDimmed: false,
      onUpdate: vi.fn(),
    });
    const content = screen.getByTestId("card-content");
    expect(content).toHaveStyle({ opacity: "1" });
  });

  describe("cluster chips", () => {
    it("renders tag chips in subtitle row", () => {
      renderNode({
        urlTemplate: "/page",
        pageCount: 1,
        onUpdate: vi.fn(),
        tags: ["food", "taipei"],
      });
      const chips = screen.getAllByTestId("cluster-chip");
      expect(chips).toHaveLength(2);
      expect(chips[0]).toHaveTextContent("food");
      expect(chips[1]).toHaveTextContent("taipei");
    });

    it("tag chips use getClusterColor for the dot background class", () => {
      renderNode({ urlTemplate: "/page", pageCount: 1, onUpdate: vi.fn(), tags: ["food"] });
      const chip = screen.getByTestId("cluster-chip");
      const dot = chip.querySelector("span[aria-hidden]")!;
      const color = getClusterColor("food");
      expect(dot.className).toContain(color.dot);
    });
  });

  describe("tier badge tooltip", () => {
    it("renders tooltip trigger with data-tier='low' when scoreTier is low", () => {
      renderNode({
        urlTemplate: "/a",
        pageCount: 1,
        scoreTier: "low",
        onUpdate: vi.fn(),
      });
      const trigger = screen.getByTestId("badge-tooltip-trigger");
      expect(trigger).toHaveAttribute("data-tier", "low");
      expect(trigger).toHaveTextContent("Low");
      expect(trigger.tagName).toBe("SPAN");
    });

    it("renders tooltip trigger with data-tier='mid' when scoreTier is mid", () => {
      renderNode({
        urlTemplate: "/a",
        pageCount: 1,
        scoreTier: "mid",
        onUpdate: vi.fn(),
      });
      const trigger = screen.getByTestId("badge-tooltip-trigger");
      expect(trigger).toHaveAttribute("data-tier", "mid");
      expect(trigger).toHaveTextContent("Mid");
      expect(trigger.tagName).toBe("SPAN");
    });

    it("renders tooltip trigger with data-tier='high' when scoreTier is high", () => {
      renderNode({
        urlTemplate: "/a",
        pageCount: 1,
        scoreTier: "high",
        onUpdate: vi.fn(),
      });
      const trigger = screen.getByTestId("badge-tooltip-trigger");
      expect(trigger).toHaveAttribute("data-tier", "high");
      expect(trigger).toHaveTextContent("High");
      expect(trigger.tagName).toBe("SPAN");
    });

    it("does NOT render tooltip trigger when scoreTier is neutral", () => {
      renderNode({
        urlTemplate: "/a",
        pageCount: 1,
        scoreTier: "neutral",
        onUpdate: vi.fn(),
      });
      expect(screen.queryByTestId("badge-tooltip-trigger")).toBeNull();
    });

    it("does NOT render tooltip trigger when scoreTier is undefined", () => {
      renderNode({ urlTemplate: "/a", pageCount: 1, onUpdate: vi.fn() });
      expect(screen.queryByTestId("badge-tooltip-trigger")).toBeNull();
    });
  });
});
