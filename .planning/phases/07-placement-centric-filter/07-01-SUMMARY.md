---
phase: 07-placement-centric-filter
plan: 01
subsystem: filter-panel
tags: [filter, placement, graph-utils, app]
dependency_graph:
  requires:
    - "06-01: collectPlacementSuggestions pattern and graph-utils.ts structure"
    - "05-01: FilterPanel props interface (nodes, activeFilters, onToggle, onClear)"
  provides:
    - "PlacementGroup interface in graph-utils.ts"
    - "collectPlacementGroups pure function"
    - "Placement-centric FilterPanel with placement-name key format"
    - "Updated highlightedNodeIds in App.tsx for placement-name keys"
  affects:
    - "src/App.tsx (highlightedNodeIds useMemo, styledNodes memo)"
    - "src/components/FilterPanel.tsx (full replacement)"
tech_stack:
  added: []
  patterns:
    - "TDD: RED (failing tests) → GREEN (implementation) → verify per task"
    - "placement-name:{name} as the single filter key format"
    - "collectPlacementGroups pure function following collectPlacementSuggestions pattern"
key_files:
  created: []
  modified:
    - src/lib/graph-utils.ts
    - src/lib/graph-utils.test.ts
    - src/components/FilterPanel.tsx
    - src/components/FilterPanel.test.tsx
    - src/App.tsx
decisions:
  - "placement-name:{name} key format (not per-node or per-placement-id) — one checkbox per unique name across all global nodes"
  - "collectPlacementGroups follows same pure-function pattern as collectPlacementSuggestions for isolated testability"
  - "Sub-items in FilterPanel are read-only labels (not checkboxes) — clicking placement name highlights all nodes at once"
  - "nodes added to highlightedNodeIds useMemo dependency array to enable placement data lookup"
metrics:
  duration: "~5 min"
  completed: "2026-04-15"
  tasks: 3
  files: 5
---

# Phase 7 Plan 1: Placement-Centric Filter Summary

**One-liner:** Replaced node-centric filter panel with placement-name grouped checkboxes using collectPlacementGroups pure function and placement-name:{name} key format throughout.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add PlacementGroup interface + collectPlacementGroups to graph-utils.ts with 7 TDD tests | 9e1a9e3 |
| 2 | Redesign FilterPanel to placement-centric layout with 10 TDD behavioral tests | c5c571a |
| 3 | Update App.tsx highlightedNodeIds to resolve placement-name keys by scanning node.data.placements | fca70c9 |

## What Was Built

**collectPlacementGroups** (`src/lib/graph-utils.ts`): Pure function that takes all nodes, filters to global nodes, groups by unique placement name, deduplicates names per node, and returns `PlacementGroup[]` sorted alphabetically. Exports the `PlacementGroup` interface (`placementName`, `nodeIds`, `nodeLabels`).

**FilterPanel redesign** (`src/components/FilterPanel.tsx`): Replaced the node-centric tree (global nodes as parents, placements as checkboxes under each) with a placement-centric layout. Each unique placement name is a top-level checkbox emitting `placement-name:{name}` on toggle. Under each placement, the URL templates of all global nodes carrying it appear as read-only sub-items. Header changed from "Global Filters" to "Placement Filters". Empty state changed from "No global nodes" to "No placement filters".

**App.tsx update** (`src/App.tsx`): The `highlightedNodeIds` useMemo now parses `placement-name:` keys, scans `node.data.placements` for matching names, and collects all global node IDs carrying that placement. Added `nodes` to the dependency array. Removed the old `node:` and `placement:` key branches.

## Verification Results

- `npx vitest run` — 154 tests pass (all suites including 7 new graph-utils + 10 new FilterPanel)
- `npx tsc --noEmit` — exits 0, no TypeScript errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/lib/graph-utils.ts` — contains `PlacementGroup` interface and `collectPlacementGroups` export
- `src/components/FilterPanel.tsx` — contains `collectPlacementGroups`, `placement-name:`, `Placement Filters`, `No placement filters`
- `src/components/FilterPanel.test.tsx` — contains `placement-name:` key assertions
- `src/App.tsx` — contains `placement-name:` and `activeFilters, nodes` dependency array
- Commits 9e1a9e3, c5c571a, fca70c9 — all present in git log
