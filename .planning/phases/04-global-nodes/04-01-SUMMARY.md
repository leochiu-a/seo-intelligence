---
phase: 04-global-nodes
plan: 01
subsystem: scoring
tags: [pagerank, graph-utils, typescript, vitest, tdd]

requires:
  - phase: 03-scenarios-export
    provides: parseImportJson and graph-utils baseline with Node/Edge types

provides:
  - Placement interface exported from graph-utils.ts
  - UrlNodeData extended with optional isGlobal and placements fields
  - calculatePageRank updated with global synthetic inbound injection
  - parseImportJson updated to preserve isGlobal and placements from JSON
  - Wave 0 test stubs for UrlNode and EditPopover (Plan 02 will implement)

affects: [04-global-nodes Plan 02, any future plan referencing UrlNodeData or calculatePageRank]

tech-stack:
  added: []
  patterns:
    - "Global node synthetic injection: injected before totalWeightedOut computation so outbound links are counted correctly"
    - "Conditional spread pattern for optional fields: ...(field != null && { field }) keeps undefined absent rather than explicit undefined"

key-files:
  created:
    - src/components/UrlNode.test.tsx
    - src/components/EditPopover.test.tsx
  modified:
    - src/lib/graph-utils.ts
    - src/lib/graph-utils.test.ts

key-decisions:
  - "Global nodes do NOT receive synthetic inbound from other global nodes — only non-global nodes are synthetic sources"
  - "Placements are preserved in node data even when isGlobal=false — algorithm checks isGlobal before processing placements"
  - "totalWeightedOut computed AFTER global synthetic injection so outbound from each non-global node to global is counted in denominator"

patterns-established:
  - "TDD RED/GREEN for algorithm changes: write failing tests first, then implement minimal code to pass"
  - "Wave 0 stubs: create it.todo() test files before Plan 02 component implementation to satisfy Nyquist requirement"

requirements-completed: [GLOB-01, GLOB-03, GLOB-05]

duration: 2min
completed: 2026-04-14
---

# Phase 04 Plan 01: Global Nodes — Data Layer Summary

**Placement interface, extended UrlNodeData with isGlobal/placements, and calculatePageRank synthetic inbound injection for global nodes with full TDD coverage**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T22:44:32Z
- **Completed:** 2026-04-14T22:46:30Z
- **Tasks:** 3 (Task 0, Task 1 TDD, Task 2)
- **Files modified:** 4

## Accomplishments

- Wave 0 test stubs created for UrlNode.test.tsx and EditPopover.test.tsx (Plan 02 will flesh out)
- `Placement` interface (`id`, `name`, `linkCount`) exported from graph-utils.ts
- `UrlNodeData` extended with optional `isGlobal?: boolean` and `placements?: Placement[]`
- `calculatePageRank` injects synthetic inbound links from every non-global node to each global node (totalPlacementLinks = sum of all placement linkCounts) — injection placed before `totalWeightedOut` computation so denominator is correct
- `parseImportJson` reads `isGlobal` and `placements` from imported JSON, backward-compatible with old JSON lacking those fields
- 76 graph-utils tests passing (10 new global node tests, 3 new parseImportJson tests)

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 test stubs** - `bb99d43` (test)
2. **Task 1 RED: Failing global node tests** - `525b32d` (test)
3. **Task 1 GREEN: Placement interface + calculatePageRank injection** - `750fd59` (feat)
4. **Task 2: parseImportJson + tests** - `13c0655` (feat)

_Note: Task 1 used TDD with separate RED and GREEN commits._

## Files Created/Modified

- `src/components/UrlNode.test.tsx` - Wave 0 stub: 2 todo tests for GLOB-02 global badge
- `src/components/EditPopover.test.tsx` - Wave 0 stub: 6 todo tests for GLOB-04 placement CRUD
- `src/lib/graph-utils.ts` - Added Placement interface, extended UrlNodeData, updated calculatePageRank with synthetic injection, updated parseImportJson
- `src/lib/graph-utils.test.ts` - Updated makeNode helper with opts, imported Placement type, added 13 new tests across two describe blocks

## Decisions Made

- **Global-to-global exclusion:** Global nodes do NOT receive synthetic inbound from other global nodes. Only non-global nodes are synthetic sources. This prevents globals from inflating each other's scores beyond real edges.
- **isGlobal=false preserves placements:** Placement data stored in node even when `isGlobal` is false. Algorithm checks the flag before processing.
- **Injection position:** Synthetic links injected BEFORE `totalWeightedOut` computation. This ensures non-global nodes' outbound denominator includes synthetic links to globals, correctly distributing rank.
- **Backward-compatible import:** `isGlobal` and `placements` absent from old JSON → field stays `undefined` (not explicitly set to `undefined`), using conditional spread.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (04-02) can now build the UI: Globe badge on UrlNode, global toggle in EditPopover, placement CRUD — all backed by the correct data types and algorithm
- Wave 0 test stubs are in place; Plan 02 tasks will implement the test bodies
- All 116 existing tests continue to pass (no regression)

---
*Phase: 04-global-nodes*
*Completed: 2026-04-14*
