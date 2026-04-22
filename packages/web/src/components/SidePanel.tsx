import { useState } from "react";
import type { Node } from "@xyflow/react";
import type { UrlNodeData } from "../lib/graph-utils";
import { FilterPanel } from "./FilterPanel";
import { PagesPanel } from "./PagesPanel";

interface SidePanelProps {
  nodes: Node<UrlNodeData>[];
  scores: Map<string, number>;
  allScoreValues: number[];
  weakNodes: Set<string>;
  orphanNodes: Set<string>;
  unreachableNodes: Set<string>;
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
  inboundMap: Map<string, number>;
  rootId: string | null;
  onNodeHighlight?: (id: string | null) => void;
  activeFilters: Set<string>;
  onFilterToggle: (key: string) => void;
  onFilterClear: () => void;
}

type Tab = "filter" | "pages";

export function SidePanel({
  nodes,
  scores,
  allScoreValues,
  weakNodes,
  orphanNodes,
  unreachableNodes,
  depthMap,
  outboundMap,
  inboundMap,
  rootId,
  onNodeHighlight,
  activeFilters,
  onFilterToggle,
  onFilterClear,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("pages");

  const tabClass = (tab: Tab) =>
    `flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
      activeTab === tab
        ? "text-dark border-b-2 border-dark -mb-px"
        : "text-muted-fg hover:text-dark"
    }`;

  return (
    <aside className="relative border-r border-border bg-white flex flex-col h-full">
      <div className="flex border-b border-border flex-shrink-0" data-testid="sidebar-tabs">
        <button
          type="button"
          data-testid="tab-filter"
          onClick={() => setActiveTab("filter")}
          className={tabClass("filter")}
        >
          Filter
        </button>
        <button
          type="button"
          data-testid="tab-pages"
          onClick={() => setActiveTab("pages")}
          className={tabClass("pages")}
        >
          Pages
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "filter" && (
          <FilterPanel
            nodes={nodes}
            activeFilters={activeFilters}
            onToggle={onFilterToggle}
            onClear={onFilterClear}
          />
        )}
        {activeTab === "pages" && (
          <PagesPanel
            nodes={nodes}
            scores={scores}
            allScoreValues={allScoreValues}
            weakNodes={weakNodes}
            orphanNodes={orphanNodes}
            unreachableNodes={unreachableNodes}
            depthMap={depthMap}
            outboundMap={outboundMap}
            inboundMap={inboundMap}
            rootId={rootId}
            onNodeHighlight={onNodeHighlight}
          />
        )}
      </div>
    </aside>
  );
}
