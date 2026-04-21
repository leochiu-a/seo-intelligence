import { useState } from "react";
import type { Node } from "@xyflow/react";
import type { UrlNodeData } from "../lib/graph-utils";
import { HealthPanel } from "./HealthPanel";
import { FilterPanel } from "./FilterPanel";
import { ScorePanel } from "./ScorePanel";

interface SidePanelProps {
  nodes: Node<UrlNodeData>[];
  scores: Map<string, number>;
  allScoreValues: number[];
  weakNodes: Set<string>;
  orphanNodes: Set<string>;
  unreachableNodes: Set<string>;
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
  rootId: string | null;
  onNodeHighlight?: (id: string | null) => void;
  activeFilters: Set<string>;
  onFilterToggle: (key: string) => void;
  onFilterClear: () => void;
}

export function SidePanel({
  nodes,
  scores,
  allScoreValues,
  weakNodes,
  orphanNodes,
  unreachableNodes,
  depthMap,
  outboundMap,
  rootId,
  onNodeHighlight,
  activeFilters,
  onFilterToggle,
  onFilterClear,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<"filter" | "score" | "health">("filter");

  const tabClass = (tab: "filter" | "score" | "health") =>
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
          data-testid="tab-score"
          onClick={() => setActiveTab("score")}
          className={tabClass("score")}
        >
          Score
        </button>
        <button
          type="button"
          data-testid="tab-health"
          onClick={() => setActiveTab("health")}
          className={tabClass("health")}
        >
          Health
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
        {activeTab === "score" && (
          <ScorePanel
            nodes={nodes}
            scores={scores}
            weakNodes={weakNodes}
            orphanNodes={orphanNodes}
            unreachableNodes={unreachableNodes}
            depthMap={depthMap}
            outboundMap={outboundMap}
            rootId={rootId}
            onNodeHighlight={onNodeHighlight}
          />
        )}
        {activeTab === "health" && (
          <HealthPanel
            nodes={nodes}
            depthMap={depthMap}
            outboundMap={outboundMap}
            scores={scores}
            allScoreValues={allScoreValues}
          />
        )}
      </div>
    </aside>
  );
}
