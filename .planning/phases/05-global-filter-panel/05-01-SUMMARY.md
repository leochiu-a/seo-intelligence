---
phase: 05-global-filter-panel
plan: 01
subsystem: ui
tags: [react, vitest, testing-library, filter-panel, canvas-dimming, global-nodes]

requires:
  - phase: 04-global-nodes
    plan: 02
    provides: EditPopover global toggle, isGlobal/placements on UrlNodeData, Globe badge on UrlNode

provides:
  - useFilterState hook: Set<string> filter state with toggle/clear
  - FilterPanel component: collapsible left panel with global node checkboxes and nested placement checkboxes
  - Canvas dimming: styledNodes memo sets opacity 0.2 on non-highlighted nodes and blue drop-shadow on highlighted
  - FilterPanel.test.tsx: 7 behavioral tests

affects: [App.tsx enrichedNodes pipeline, ReactFlow nodes prop, layout flex row]

tech-stack:
  added: []
  patterns:
    - "Filter keys use prefixed format: 'node:{id}' and 'placement:{nodeId}:{placementId}' for unambiguous key space"
    - "highlightedNodeIds returns null (not empty Set) when no filters active — avoids opacity stripping on every render"
    - "styledNodes wraps enrichedNodes: only applies style when highlightedNodeIds is non-null"
    - "FilterPanel accepts raw nodes (not enrichedNodes) and filters internally to find isGlobal===true nodes"

key-files:
  created:
    - src/hooks/useFilterState.ts
    - src/components/FilterPanel.tsx
    - src/components/FilterPanel.test.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "null vs empty Set for highlightedNodeIds: null signals 'no filter active' so styledNodes can strip styles without iterating; empty Set would trigger opacity stripping on all nodes even when semantically inactive"
  - "FilterPanel positioned between Sidebar and canvas: left-side placement keeps filter context near canvas interaction area without displacing the ScoreSidebar result view"
  - "styledNodes as separate memo from enrichedNodes: keeps scoring concerns separate from UI dimming concerns; each updates independently"

metrics:
  duration: "2 min"
  completed: "2026-04-14"
  tasks: 2
  files_modified: 4
---

# Phase 05 Plan 01: Global Filter Panel Summary

**useFilterState hook and FilterPanel component with canvas dimming — users can isolate global navigation nodes on the canvas by checking/unchecking filter checkboxes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T15:07:48Z
- **Completed:** 2026-04-14T15:09:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `src/hooks/useFilterState.ts` created: `useFilterState()` returns `{ activeFilters: Set<string>, toggle, clear }`
- Filter key format: `node:{nodeId}` for global nodes, `placement:{nodeId}:{placementId}` for placements
- `src/components/FilterPanel.tsx` created: fixed-width `w-[200px]` left panel with header "Global Filters"
- FilterPanel filters input `nodes` to find `isGlobal === true` entries and renders checkboxes
- Nested placement checkboxes indented under each global node
- Empty state `data-testid="filter-empty"` shown when no global nodes present
- "Clear all" button appears only when `activeFilters.size > 0`
- `FilterPanel.test.tsx`: 7 behavioral tests — empty state, global node checkboxes, placement checkboxes, onToggle keys, checked state from Set, non-global nodes not shown
- `App.tsx` wired: `useFilterState` initialized in `AppInner`
- `highlightedNodeIds` memo: returns `null` when no filters active, otherwise `Set<string>` of matched node IDs (both `node:` and `placement:` keys resolve to the global node ID)
- `styledNodes` memo wraps `enrichedNodes`: applies `opacity: 0.2` to dimmed nodes and `filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))` to highlighted nodes
- `ReactFlow` now receives `styledNodes` instead of `enrichedNodes`
- `FilterPanel` rendered between `Sidebar` and canvas `div` in the flex layout
- All 132 tests pass (existing 125 + 7 new), TypeScript compiles with no errors

## Task Commits

Each task committed atomically:

1. **Task 1 RED: FilterPanel failing tests** — `288749e`
2. **Task 1 GREEN: useFilterState hook + FilterPanel component** — `ab14109`
3. **Task 2: Wire FilterPanel into App.tsx** — `214b683`

## Files Created/Modified

- `src/hooks/useFilterState.ts` — Filter state hook with Set<string>, toggle, clear
- `src/components/FilterPanel.tsx` — Left-panel filter UI with global node and placement checkboxes
- `src/components/FilterPanel.test.tsx` — 7 behavioral tests for FilterPanel
- `src/App.tsx` — useFilterState wiring, highlightedNodeIds memo, styledNodes memo, FilterPanel in layout

## Decisions Made

- **null sentinel for no-filter state:** `highlightedNodeIds` returns `null` (not empty Set) when no filters are active. This lets `styledNodes` quickly return `enrichedNodes` without iterating to strip styles, and avoids incorrectly setting `opacity: undefined` on every re-render when inactive.
- **FilterPanel left of canvas:** Placed between `Sidebar` (drag source) and canvas flex child. Keeps filter controls near canvas interaction without pushing the ScoreSidebar result ranking.
- **styledNodes as separate memo:** Opacity styling is a UI concern separate from PageRank enrichment. Keeping them in separate memos means score changes don't recalculate styles and vice versa.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — FilterPanel is fully wired: nodes flow from AppInner state → FilterPanel props → checkbox rendering. activeFilters flows back through toggle → styledNodes → ReactFlow. No placeholder data.

## Self-Check: PASSED

- `src/hooks/useFilterState.ts` — FOUND
- `src/components/FilterPanel.tsx` — FOUND
- `src/components/FilterPanel.test.tsx` — FOUND
- `src/App.tsx` — FOUND (modified)
- Commit `288749e` (test RED) — FOUND
- Commit `ab14109` (feat Task 1) — FOUND
- Commit `214b683` (feat Task 2) — FOUND
- 132 tests passing

---
*Phase: 05-global-filter-panel*
*Completed: 2026-04-14*
