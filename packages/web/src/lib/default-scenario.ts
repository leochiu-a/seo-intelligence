import type { SerializedNode, SerializedEdge } from "./scenario-types";

export const DEFAULT_SCENARIO_NODES: SerializedNode[] = [
  {
    id: "node-1",
    type: "urlNode",
    position: { x: 400, y: 50 },
    data: {
      urlTemplate: "/",
      pageCount: 1,
      isRoot: true,
      isGlobal: true,
    },
  },
  {
    id: "node-2",
    type: "urlNode",
    position: { x: 100, y: 280 },
    data: {
      urlTemplate: "/category/{slug}",
      pageCount: 8,
      isGlobal: true,
    },
  },
  {
    id: "node-3",
    type: "urlNode",
    position: { x: 700, y: 280 },
    data: {
      urlTemplate: "/blog",
      pageCount: 1,
      isGlobal: true,
    },
  },
  {
    id: "node-4",
    type: "urlNode",
    position: { x: 100, y: 510 },
    data: {
      urlTemplate: "/product/{slug}",
      pageCount: 200,
    },
  },
  {
    id: "node-5",
    type: "urlNode",
    position: { x: 700, y: 510 },
    data: {
      urlTemplate: "/blog/{slug}",
      pageCount: 50,
    },
  },
];

export const DEFAULT_SCENARIO_EDGES: SerializedEdge[] = [
  {
    id: "edge-1",
    source: "node-1",
    target: "node-2",
    sourceHandle: "handle-left",
    targetHandle: "handle-top",
    type: "linkCountEdge",
    data: { linkCount: 3 },
  },
  {
    id: "edge-2",
    source: "node-1",
    target: "node-3",
    sourceHandle: "handle-right",
    targetHandle: "handle-top",
    type: "linkCountEdge",
    data: { linkCount: 1 },
  },
  {
    id: "edge-3",
    source: "node-2",
    target: "node-4",
    sourceHandle: "handle-bottom",
    targetHandle: "handle-top",
    type: "linkCountEdge",
    data: { linkCount: 10 },
  },
  {
    id: "edge-4",
    source: "node-3",
    target: "node-5",
    sourceHandle: "handle-bottom",
    targetHandle: "handle-top",
    type: "linkCountEdge",
    data: { linkCount: 5 },
  },
  {
    id: "edge-5",
    source: "node-5",
    target: "node-4",
    sourceHandle: "handle-left",
    targetHandle: "handle-right",
    type: "linkCountEdge",
    data: { linkCount: 2 },
  },
];
