---
phase: quick
plan: 260414-tkz
subsystem: canvas-editor
tags: [reactflow, handles, graph, routing, tdd]
dependency_graph:
  requires: []
  provides: [multi-handle-routing, getClosestHandleIds]
  affects: [UrlNode, App.tsx, graph-utils]
tech_stack:
  added: []
  patterns: [TDD red-green-refactor, HANDLE_IDS constant, handle-pair routing]
key_files:
  created: []
  modified:
    - src/lib/graph-utils.ts
    - src/lib/graph-utils.test.ts
    - src/components/UrlNode.tsx
    - src/App.tsx
decisions:
  - "8 handles per node (source+target per side) rather than 4 bidirectional handles — ReactFlow requires explicit type prop; dual handles at same position allow both source and target connections without fighting ReactFlow's internal handle-type validation"
  - "getClosestHandleIds uses abs(dx) >= abs(dy) threshold so exact diagonals favor horizontal routing (aligns with left-to-right reading direction)"
  - "onConnect only computes handles when sourceHandle is not already set — preserves user intent when dragging from a specific handle"
metrics:
  duration: 5min
  completed_date: "2026-04-14"
  tasks_completed: 2
  files_modified: 4
---

# Quick Task 260414-tkz: Add Multiple Handles to UrlNode for Graph Summary

**One-liner:** Multi-handle UrlNode with 8 connection points (source+target per side) and `getClosestHandleIds` helper that routes edges to the geometrically nearest handle pair.

## What Was Built

### HANDLE_IDS constant (`src/lib/graph-utils.ts`)

Exported constant with 8 IDs: `handle-top-source`, `handle-top-target`, `handle-right-source`, `handle-right-target`, `handle-bottom-source`, `handle-bottom-target`, `handle-left-source`, `handle-left-target`.

### getClosestHandleIds helper (`src/lib/graph-utils.ts`)

Pure function: given two `{x, y}` positions, returns `{ sourceHandle, targetHandle }` by comparing `|dx|` vs `|dy|`. When horizontal dominates: right/left. When vertical dominates: bottom/top. Uses `-source`/`-target` suffixes so the returned IDs match the typed handles in UrlNode.

### UrlNode 8-handle layout (`src/components/UrlNode.tsx`)

Replaced 2 handles (left target + right source) with 8 handles: one `type="source"` and one `type="target"` at each of the 4 sides. All handles share the same visual style as before (12x12, white fill, placeholder border).

### onConnect handle assignment (`src/App.tsx`)

`onConnect` now calls `getClosestHandleIds(sourceNode.position, targetNode.position)` when `connection.sourceHandle` is not set (i.e., user connected by clicking the node body rather than a specific handle). When the user drags from a specific handle, ReactFlow sets `sourceHandle` on the connection object — that path is preserved unchanged.

### Serialization persistence (`src/App.tsx`)

`serializeGraph` now includes `sourceHandle` and `targetHandle` in the serialized edge shape. The localStorage restore effect rehydrates both fields when present.

## TDD Cycle

| Phase | Status |
|-------|--------|
| RED — 7 failing tests written | Confirmed failing (TypeError: not a function) |
| GREEN — HANDLE_IDS + getClosestHandleIds implemented | All 63 tests pass |
| UrlNode handles (UI layout — not TDD per plan) | Applied after GREEN |
| App.tsx wiring (glue code — not TDD per plan) | All 98 tests pass |

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 778ff71 | feat(260414-tkz): add HANDLE_IDS, getClosestHandleIds, and 8 handles to UrlNode |
| Task 2 | 7cde4b7 | feat(260414-tkz): wire onConnect to use getClosestHandleIds and persist handles in serialization |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- [x] `src/lib/graph-utils.ts` — HANDLE_IDS and getClosestHandleIds exported
- [x] `src/lib/graph-utils.test.ts` — 7 new tests (HANDLE_IDS + 6 getClosestHandleIds cases)
- [x] `src/components/UrlNode.tsx` — 8 handles rendered
- [x] `src/App.tsx` — onConnect + serializeGraph updated
- [x] Commits 778ff71 and 7cde4b7 exist
- [x] All 98 tests pass, 0 TypeScript errors
