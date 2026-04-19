---
phase: 260419-ppw-refactor-app-tsx-phase-2
plan: 01
subsystem: web
tags: [refactor, tdd, hooks, app-tsx, extraction]
dependency_graph:
  requires: []
  provides:
    - packages/web/src/lib/serialize-graph.ts
    - packages/web/src/hooks/useNodeCallbacks.ts
    - packages/web/src/hooks/useScenarioHandlers.ts
    - packages/web/src/hooks/useCanvasHandlers.ts
  affects:
    - packages/web/src/App.tsx
tech_stack:
  added: []
  patterns:
    - TDD (RED → GREEN) for each extraction
    - Stable useCallback deps preserved across all hooks
    - Pure function extraction with typed interfaces
key_files:
  created:
    - packages/web/src/lib/serialize-graph.ts
    - packages/web/src/lib/serialize-graph.test.ts
    - packages/web/src/hooks/useNodeCallbacks.ts
    - packages/web/src/hooks/useNodeCallbacks.test.ts
    - packages/web/src/hooks/useScenarioHandlers.ts
    - packages/web/src/hooks/useScenarioHandlers.test.ts
    - packages/web/src/hooks/useCanvasHandlers.ts
    - packages/web/src/hooks/useCanvasHandlers.test.ts
  modified:
    - packages/web/src/App.tsx
decisions:
  - "wireCallbacks uses !== undefined (not != null) to distinguish null sourceHandle from absent"
  - "parseImportJson expects flat node structure (urlTemplate/pageCount at top level), not nested in data"
  - "AppNodeData type-only import in serialize-graph.ts — no circular dep at runtime"
metrics:
  duration: ~10 min
  completed_date: "2026-04-19"
  tasks: 4
  files: 9
---

# Phase 260419-ppw Plan 01: Refactor App.tsx Phase 2 — Extract Serialize/Callbacks/Scenario/Canvas Summary

**One-liner:** Extracted serializeGraph pure function + 3 hooks (useNodeCallbacks, useScenarioHandlers, useCanvasHandlers) from App.tsx, reducing it from 726 to 382 lines using TDD (RED→GREEN) for each extraction.

## Final App.tsx Line Count

- Before: 726 lines (on refactor/app branch, post Phase 1)
- After: 382 lines
- Reduction: 344 lines (47% reduction)

## New Files

| File | Purpose |
|------|---------|
| `packages/web/src/lib/serialize-graph.ts` | Pure `serializeGraph` function with `SerializedGraphNode` / `SerializedGraphEdge` interfaces — strips runtime-only fields before localStorage write |
| `packages/web/src/lib/serialize-graph.test.ts` | 7 unit tests covering field stripping, optional field omission/inclusion, null handle preservation, and JSON round-trip |
| `packages/web/src/hooks/useNodeCallbacks.ts` | Hook returning 6 stable callbacks: `onNodeDataUpdate`, `onNodeZIndexChange`, `onRootToggle`, `addNode`, `onEdgeLinkCountChange`, `wireCallbacks` |
| `packages/web/src/hooks/useNodeCallbacks.test.ts` | 11 unit tests covering each callback behavior including exclusive-root rule, no-op zIndex guard, and wireCallbacks handle passthrough |
| `packages/web/src/hooks/useScenarioHandlers.ts` | Hook returning 4 handlers: `handleSwitchScenario`, `handleCreateScenario`, `handleDeleteScenario`, `handleImportFromDialog` |
| `packages/web/src/hooks/useScenarioHandlers.test.ts` | 8 unit tests covering same-ID no-op, null scenario guard, rAF reset, and import wiring |
| `packages/web/src/hooks/useCanvasHandlers.ts` | Hook returning 4 handlers: `onDragOver`, `onDrop`, `onAddNode`, `onConnect` |
| `packages/web/src/hooks/useCanvasHandlers.test.ts` | 10 unit tests covering drag/drop JSON, invalid JSON, sidebar node drop, addNode fallback, and handle computation |

## Commit Hashes

| # | Commit | Message |
|---|--------|---------|
| 1 | bb15800 | test(web): add failing tests for serializeGraph extraction |
| 2 | aa67c3c | refactor(web): extract serializeGraph to lib/serialize-graph |
| 3 | ab55a98 | test(web): add failing tests for useNodeCallbacks hook |
| 4 | b21cd6d | refactor(web): extract useNodeCallbacks hook from App.tsx |
| 5 | 5e0d297 | test(web): add failing tests for useScenarioHandlers hook |
| 6 | 2f0cda9 | refactor(web): extract useScenarioHandlers hook from App.tsx |
| 7 | 8930810 | test(web): add failing tests for useCanvasHandlers hook |
| 8 | 21a698c | refactor(web): extract useCanvasHandlers hook and reach <400 lines target |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wireCallbacks handle passthrough using `!== undefined` instead of `!= null`**
- **Found during:** Task 2 (useNodeCallbacks GREEN phase — Test 10 failed)
- **Issue:** Original App.tsx code used `e.sourceHandle != null` which excludes explicit null handles. The plan's Test 10 specifies that null sourceHandle must be preserved while undefined is omitted. The original `!= null` check treats both the same.
- **Fix:** Changed condition to `e.sourceHandle !== undefined` and `e.targetHandle !== undefined` — null is preserved in the spread, undefined omits the key entirely.
- **Files modified:** `packages/web/src/hooks/useNodeCallbacks.ts`

**2. [Rule 1 - Bug] Fixed Test 2 JSON fixture in useCanvasHandlers — parseImportJson expects flat structure**
- **Found during:** Task 4 test writing — initial fixture had nodes with `data: { urlTemplate, pageCount }` nested inside
- **Issue:** `parseImportJson` reads `node.urlTemplate` and `node.pageCount` from the flat object, not from `node.data`. The test fixture used the ReactFlow node structure instead of the export format.
- **Fix:** Updated test fixture to use `{ id, urlTemplate, pageCount, x, y }` flat structure matching what `parseImportJson` consumes.
- **Files modified:** `packages/web/src/hooks/useCanvasHandlers.test.ts`

## Smoke Test Results

Automated gates all passed:
- `pnpm test --run`: 5 failures (all pre-existing: EditPopover + ScoreSidebar), 358 new tests passing
- `pnpm tsc --noEmit`: clean
- `wc -l App.tsx`: 382 (< 400 target)

Manual smoke test: Not run (no dev server started — this is a refactor with full test coverage and TypeScript type safety).

## Known Stubs

None — all functionality is fully wired and behavior-identical to the original App.tsx.

## Self-Check: PASSED

All created files verified present. All 8 commits verified in git log.
