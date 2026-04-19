import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { Node } from "@xyflow/react";
import type { UrlNodeData } from "../lib/graph-utils";
import { buildTooltipContent } from "../lib/graph-utils";
import { HealthPanel } from "./HealthPanel";

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

describe("HealthPanel", () => {
  it('renders summary line with "X / N pages have warnings"', () => {
    const nodes = [
      makeNode("a", "/a", { tags: ["food"] }),
      makeNode("b", "/b"),
      makeNode("c", "/c"),
    ];
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    expect(screen.getByTestId("health-summary")).toHaveTextContent("2 / 3 pages have warnings");
  });

  it('renders "0 / 0 pages have warnings" when no nodes', () => {
    render(
      <HealthPanel
        nodes={[]}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    expect(screen.getByTestId("health-summary")).toHaveTextContent("0 / 0 pages have warnings");
  });

  it("defaults to showing warnings only (warningsOnly starts true)", () => {
    const nodes = [makeNode("a", "/ok", { tags: ["t"] }), makeNode("b", "/warn")];
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    const rows = screen.getAllByTestId("health-row");
    expect(rows).toHaveLength(1);
    expect(screen.getByText("/warn")).toBeInTheDocument();
    expect(screen.queryByText("/ok")).toBeNull();
  });

  it("shows all rows when Show warnings only is unchecked", () => {
    const nodes = [makeNode("a", "/ok", { tags: ["t"] }), makeNode("b", "/warn")];
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    fireEvent.click(screen.getByTestId("warnings-only-toggle"));
    expect(screen.getAllByTestId("health-row")).toHaveLength(2);
  });

  it("shows warning icon for rows with any warning", () => {
    const nodes = [makeNode("a", "/a")]; // no tags → warn
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    fireEvent.click(screen.getByTestId("warnings-only-toggle")); // show all
    expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
  });

  it("does not show warning icon for healthy rows", () => {
    const nodes = [makeNode("a", "/a", { tags: ["food"] })];
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    fireEvent.click(screen.getByTestId("warnings-only-toggle")); // show all
    expect(screen.queryByTestId("warning-icon")).toBeNull();
  });

  it("sorts warnings-first, then alphabetical by urlTemplate", () => {
    const nodes = [
      makeNode("a", "/z-ok", { tags: ["t"] }),
      makeNode("b", "/a-ok", { tags: ["t"] }),
      makeNode("c", "/z-warn"),
      makeNode("d", "/a-warn"),
    ];
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    fireEvent.click(screen.getByTestId("warnings-only-toggle")); // show all
    const rows = screen.getAllByTestId("health-row");
    const templates = rows.map((r) => within(r).getByText(/\/.*/).textContent);
    expect(templates).toEqual(["/a-warn", "/z-warn", "/a-ok", "/z-ok"]);
  });

  it("rows do NOT respond to click (read-only)", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    fireEvent.click(screen.getByTestId("warnings-only-toggle")); // show all
    const row = screen.getByTestId("health-row");
    fireEvent.click(row);
    expect(row.className).not.toMatch(/cursor-pointer/);
  });

  it("shows empty state when nodes is empty", () => {
    render(
      <HealthPanel
        nodes={[]}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    expect(screen.getByText(/No nodes to check/i)).toBeInTheDocument();
  });
});

describe("HealthPanel — Score Tier section", () => {
  // Build 6 nodes with distinct synthetic scores so classifyScoreTier produces
  // 2 high / 2 mid / 2 low (n=6 → highFirstIdx=4, midFirstIdx=2).
  // Ascending sort [1,2,3,4,5,6] → low=[1,2], mid=[3,4], high=[5,6]
  function makeSixNodeFixture() {
    const nodes = [
      makeNode("n1", "/low-b", { tags: ["t"] }),
      makeNode("n2", "/low-a", { tags: ["t"] }),
      makeNode("n3", "/mid-b", { tags: ["t"] }),
      makeNode("n4", "/mid-a", { tags: ["t"] }),
      makeNode("n5", "/high-b", { tags: ["t"] }),
      makeNode("n6", "/high-a", { tags: ["t"] }),
    ];
    const scores = new Map<string, number>([
      ["n1", 1], // low
      ["n2", 2], // low
      ["n3", 3], // mid
      ["n4", 4], // mid
      ["n5", 5], // high
      ["n6", 6], // high
    ]);
    const allScoreValues = [...scores.values()];
    return { nodes, scores, allScoreValues };
  }

  it("renders a Score Tier section listing Low and Mid pages in addition to warnings", () => {
    const { nodes, scores, allScoreValues } = makeSixNodeFixture();
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={scores}
        allScoreValues={allScoreValues}
      />,
    );
    expect(screen.getByTestId("score-tier-section")).toBeInTheDocument();
    const tierRows = screen.getAllByTestId("score-tier-row");
    expect(tierRows).toHaveLength(4);
    const tiers = tierRows.map((r) => r.getAttribute("data-tier"));
    expect(tiers.filter((t) => t === "low")).toHaveLength(2);
    expect(tiers.filter((t) => t === "mid")).toHaveLength(2);
    // High tier pages must not appear in Score Tier section
    expect(tiers.filter((t) => t === "high")).toHaveLength(0);
  });

  it("Score Tier section hides when allScoreValues is empty (no scoring computed yet)", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={new Map()}
        allScoreValues={[]}
      />,
    );
    expect(screen.queryByTestId("score-tier-section")).toBeNull();
  });

  it("Score Tier section hides when all nodes classify as 'neutral' (single node)", () => {
    const nodes = [makeNode("a", "/a", { tags: ["t"] })];
    const scores = new Map<string, number>([["a", 1.0]]);
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={scores}
        allScoreValues={[1.0]}
      />,
    );
    expect(screen.queryByTestId("score-tier-section")).toBeNull();
  });

  it("Score Tier section is NOT affected by the 'Show warnings only' checkbox", () => {
    const { nodes, scores, allScoreValues } = makeSixNodeFixture();
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={scores}
        allScoreValues={allScoreValues}
      />,
    );
    expect(screen.getAllByTestId("score-tier-row")).toHaveLength(4);
    fireEvent.click(screen.getByTestId("warnings-only-toggle"));
    expect(screen.getAllByTestId("score-tier-row")).toHaveLength(4);
  });

  it("Score Tier rows are sorted: low tier before mid tier, then alphabetical by urlTemplate", () => {
    const { nodes, scores, allScoreValues } = makeSixNodeFixture();
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={scores}
        allScoreValues={allScoreValues}
      />,
    );
    const tierRows = screen.getAllByTestId("score-tier-row");
    const templates = tierRows.map((r) => within(r).getByText(/\/.*/).textContent);
    // Low first (alphabetical): /low-a, /low-b ; then Mid (alphabetical): /mid-a, /mid-b
    expect(templates).toEqual(["/low-a", "/low-b", "/mid-a", "/mid-b"]);
  });

  it("Score Tier header shows count like 'N pages need attention'", () => {
    const { nodes, scores, allScoreValues } = makeSixNodeFixture();
    render(
      <HealthPanel
        nodes={nodes}
        depthMap={new Map()}
        outboundMap={new Map()}
        scores={scores}
        allScoreValues={allScoreValues}
      />,
    );
    expect(screen.getByTestId("score-tier-summary")).toHaveTextContent("4 pages need attention");
  });
});

describe("buildTooltipContent", () => {
  it('returns "Outbound links > 150" for links warn', () => {
    expect(buildTooltipContent({ links: "warn", depth: "ok", tags: "ok" })).toBe(
      "Outbound links > 150",
    );
  });

  it('returns "Crawl depth > 3" for depth warn', () => {
    expect(buildTooltipContent({ links: "ok", depth: "warn", tags: "ok" })).toBe("Crawl depth > 3");
  });

  it('returns "No tags assigned" for tags warn', () => {
    expect(buildTooltipContent({ links: "ok", depth: "ok", tags: "warn" })).toBe(
      "No tags assigned",
    );
  });

  it("joins multiple issues with newline", () => {
    expect(buildTooltipContent({ links: "warn", depth: "warn", tags: "warn" })).toBe(
      "Outbound links > 150\nCrawl depth > 3\nNo tags assigned",
    );
  });

  it("returns empty string when all ok", () => {
    expect(buildTooltipContent({ links: "ok", depth: "ok", tags: "ok" })).toBe("");
  });

  it("depth na does not produce a warning line", () => {
    expect(buildTooltipContent({ links: "ok", depth: "na", tags: "ok" })).toBe("");
  });
});
