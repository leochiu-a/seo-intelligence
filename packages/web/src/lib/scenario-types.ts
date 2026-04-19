export const SCENARIOS_KEY = "seo-planner-scenarios";
export const OLD_STORAGE_KEY = "seo-planner-graph";

export interface SerializedNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    urlTemplate: string;
    pageCount: number;
    isGlobal?: boolean;
    placements?: { id: string; name: string; linkCount: number }[];
    isRoot?: boolean;
  };
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  markerEnd?: unknown;
  data: { linkCount: number };
}

export interface ScenarioRecord {
  id: string;
  name: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

export interface ScenariosStore {
  activeScenarioId: string;
  scenarios: ScenarioRecord[];
}
