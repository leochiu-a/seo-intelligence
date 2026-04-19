---
id: 260419-etx
title: Node Highlight Route Feature
type: quick
autonomous: true
---

# Quick Task: Node Highlight Route Feature

## Objective

When the user clicks a node in the ScoreSidebar, highlight that node together with all its directly connected neighbours and the edges between them on the canvas. Everything else dims. Clicking the same node again (or clicking the canvas background) clears the highlight.

## Context

- `App.tsx` already manages filter-based dimming via `highlightedNodeIds` + `styledNodes` memos
- `ScoreSidebar.tsx` has a `handleClick` that selects the node and fits the view
- `LinkCountEdge.tsx` receives a `style` prop and uses `selected` for colour
- `graph-utils.ts` has full node/edge data; no route-traversal helper exists yet

## Tasks

### Task 1: Add `getConnectedElements` helper to graph-utils.ts (auto)

Add a pure function `getConnectedElements(nodeId, edges)` that returns `{ nodeIds: Set<string>, edgeIds: Set<string> }` containing the focal node plus all directly adjacent nodes and the edges between them.

**Done criteria:** function is exported, handles empty edge arrays, includes both source and target neighbours.

---

### Task 2: Wire route-highlight state through App → ScoreSidebar → Edges (auto)

1. In `App.tsx`:
   - Add `highlightedRouteNodeId: string | null` state
   - Add `routeElements` memo using `getConnectedElements` when a route node is set
   - In `styledNodes` memo, if `routeElements` is active: highlight route nodes (`isRouteHighlighted: true`) and dim non-route nodes (`isDimmed: true`); otherwise fall back to filter dimming as before
   - Apply `isRouteHighlighted` to edges via `setEdges`-style memo producing `styledEdges`
   - Pass `onNodeHighlight` callback + `highlightedRouteNodeId` to `ScoreSidebar`

2. In `ScoreSidebar.tsx`:
   - Accept `onNodeHighlight?: (id: string | null) => void` and `highlightedRouteNodeId?: string | null` props
   - In `handleClick`, after selecting + fitView, also call `onNodeHighlight(nodeId)` if provided
   - Add a "Clear highlight" affordance (small ✕ button or click-again toggle)

3. In `LinkCountEdge.tsx`:
   - Accept optional `isRouteHighlighted?: boolean` from edge data
   - Use a distinct highlight colour (indigo/blue) when `isRouteHighlighted` is true

4. In `UrlNode.tsx`:
   - When `data.isRouteHighlighted` is true, apply a distinct ring/glow style (separate from `selected`)

**Done criteria:**
- Clicking a sidebar row dims unrelated nodes and edges; focal node + neighbours + connecting edges are visually distinct
- Second click on the same row clears the highlight (toggle)
- Canvas background click (`onPaneClick` handler in ReactFlow) clears the highlight

---

### Task 3: Visual verification (checkpoint:human-verify)

Verify the feature works end-to-end in the browser.

**Steps:**
1. `pnpm --filter web dev`  
2. Add 4+ nodes and connect them
3. Click a node row in the Score Ranking panel → connected neighbours + edges should highlight; everything else dims
4. Click the same row again → highlight clears
5. Click anywhere on the canvas background → highlight clears

**Expected:** Smooth, readable visual distinction between highlighted route and dimmed rest.
