---
id: 260419-etx
title: Node Highlight Route Feature
type: quick
date: 2026-04-19
duration: ~12 min
tasks_completed: 2
tasks_total: 3
commits:
  - 673eaba
  - ae1295e
files_created:
  - .planning/quick/260419-etx-node-highlight-route-feature/260419-etx-PLAN.md
files_modified:
  - packages/web/src/lib/graph-utils.ts
  - packages/web/src/App.tsx
  - packages/web/src/components/ScoreSidebar.tsx
  - packages/web/src/components/UrlNode.tsx
  - packages/web/src/components/LinkCountEdge.tsx
---

# Quick Task 260419-etx: Node Highlight Route Feature Summary

**One-liner:** Click-to-highlight route feature: clicking a score sidebar row dims all unrelated nodes/edges and visually highlights the focal node, its direct neighbours, and connecting edges with an indigo ring/stroke.

## What Was Built

### Task 1 — `getConnectedElements` helper (graph-utils.ts)
A pure function that takes a `nodeId` and `edges` array and returns `{ nodeIds: Set<string>, edgeIds: Set<string> }` containing the focal node, all directly adjacent nodes, and all edges connecting them. Handles empty inputs gracefully.

### Task 2 — Route-highlight wiring (App, ScoreSidebar, UrlNode, LinkCountEdge)

**App.tsx changes:**
- `highlightedRouteNodeId: string | null` state — tracks the focal node; toggled via `handleNodeHighlight` (same ID clears, new ID switches)
- `routeElements` memo — calls `getConnectedElements` when a focal node is set
- `styledNodes` memo extended: in route mode, sets `isRouteHighlighted: true` on route nodes and `isDimmed: true` on others; clears both flags when inactive
- `styledEdges` memo — maps `isRouteHighlighted` onto edges from `routeElements.edgeIds`; non-route edges get `isRouteHighlighted: false` (dimmed); undefined (no route) gives full opacity
- `onPaneClick` on ReactFlow → `clearRouteHighlight` clears route state
- `ScoreSidebar` receives `highlightedRouteNodeId` and `onNodeHighlight` props

**ScoreSidebar.tsx changes:**
- Accepts `highlightedRouteNodeId?` and `onNodeHighlight?` props
- `handleClick` now also calls `onNodeHighlight?.(nodeId)` after select + fitView
- Shows an indigo banner "Route highlighted" with a "Clear" button when active

**UrlNode.tsx changes:**
- Applies `ring-2 ring-indigo-400 ring-offset-1` when `data.isRouteHighlighted` is true

**LinkCountEdge.tsx changes:**
- `LinkCountEdgeData` interface gains optional `isRouteHighlighted?: boolean`
- Highlighted edges: indigo stroke (`#6366F1`), strokeWidth 3
- Non-route edges (when route is active): opacity 0.2
- No route active (undefined): full opacity, grey stroke (unchanged)

## Deviations from Plan

None — plan executed as written. Task 3 is a checkpoint for human visual verification (not yet executed per constraints).

## Known Stubs

None.

## Self-Check

- [x] `packages/web/src/lib/graph-utils.ts` modified — exists
- [x] `packages/web/src/App.tsx` modified — exists
- [x] `packages/web/src/components/ScoreSidebar.tsx` modified — exists
- [x] `packages/web/src/components/UrlNode.tsx` modified — exists
- [x] `packages/web/src/components/LinkCountEdge.tsx` modified — exists
- [x] Commit `673eaba` exists (graph-utils helper)
- [x] Commit `ae1295e` exists (full wiring)
- [x] Vite build passes (`vite build` succeeds in 1.81s)
- [x] No new TypeScript errors (pre-existing TS2344/TS2304 are unrelated)

## Self-Check: PASSED
