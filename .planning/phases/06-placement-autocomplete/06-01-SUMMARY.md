---
phase: 06-placement-autocomplete
plan: 01
subsystem: canvas-editor
tags: [autocomplete, ui, graph-utils, EditPopover, UrlNode]
dependency_graph:
  requires: [05-01]
  provides: [placement-autocomplete]
  affects: [src/components/EditPopover.tsx, src/components/UrlNode.tsx, src/lib/graph-utils.ts]
tech_stack:
  added: []
  patterns: [Base UI Autocomplete with controlled Portal, pure function extraction to graph-utils, useMemo for suggestion derivation in UrlNode]
key_files:
  created: []
  modified:
    - src/lib/graph-utils.ts
    - src/lib/graph-utils.test.ts
    - src/components/UrlNode.tsx
    - src/components/UrlNode.test.tsx
    - src/components/EditPopover.tsx
    - src/components/EditPopover.test.tsx
decisions:
  - "Used Autocomplete.Portal with container=popoverRef to satisfy Base UI API requirement while preserving click-outside handler correctness"
  - "collectPlacementSuggestions extracted as pure function in graph-utils.ts for isolated unit testing"
  - "Conditional rendering: Autocomplete.Root when suggestions available, plain input when empty (PLACE-04)"
metrics:
  duration: 5 min
  completed: 2026-04-15
  tasks_completed: 2
  files_modified: 6
---

# Phase 6 Plan 1: Placement Autocomplete Summary

**One-liner:** Placement name autocomplete using Base UI Autocomplete with Portal(container=popoverRef) to satisfy both library API requirements and click-outside conflict avoidance.

## Tasks Completed

| Task | Commit | Files |
|------|--------|-------|
| Task 1: collectPlacementSuggestions pure function with TDD | 8f118f6 | graph-utils.ts, graph-utils.test.ts |
| Task 2: Wire autocomplete UI into UrlNode and EditPopover | d1a04f8 | UrlNode.tsx, UrlNode.test.tsx, EditPopover.tsx, EditPopover.test.tsx |

## Decisions Made

1. **Portal with container=popoverRef (not Portal-less):** The plan instructed to avoid `Autocomplete.Portal` due to click-outside conflict (Pitfall 2). However, Base UI's `Positioner` throws at runtime if `Portal` context is absent. Resolution: use `Autocomplete.Portal container={popoverRef}` so the dropdown DOM renders inside the popover ref — `popoverRef.current.contains(e.target)` returns true for dropdown clicks. This satisfies both the library requirement and the click-outside fix.

2. **collectPlacementSuggestions as pure function:** Extracted suggestion derivation to `graph-utils.ts` for isolated unit testing without mounting components. This follows existing pattern of pure functions in graph-utils.

3. **Conditional rendering (Pattern 3):** When `placementSuggestions.length === 0`, render plain `<input>` (no autocomplete). This is simpler and more explicit than passing empty `items` array (PLACE-04 satisfied).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Base UI Positioner requires Portal context**
- **Found during:** Task 2 — `Autocomplete.Positioner` threw `Base UI: <Combobox.Portal> is missing.` in tests
- **Issue:** The plan said to avoid Portal (Pitfall 2), but `Autocomplete.Positioner` internally calls `useComboboxPortalContext()` which throws if Portal is not in tree
- **Fix:** Added `<Autocomplete.Portal container={popoverRef}>` wrapping the Positioner. The `container` prop routes portal output into `popoverRef.current` instead of `<body>`, keeping dropdown DOM inside `popoverRef` so click-outside handler's `contains()` check still works
- **Files modified:** src/components/EditPopover.tsx
- **Commit:** d1a04f8

**2. [Rule 1 - Bug] UrlNode.test.tsx mock missing getNodes**
- **Found during:** Task 2 — UrlNode tests failed with `TypeError: getNodes is not a function` after adding `getNodes` to useReactFlow destructure
- **Fix:** Added `getNodes: vi.fn(() => [])` to the useReactFlow mock in UrlNode.test.tsx
- **Files modified:** src/components/UrlNode.test.tsx
- **Commit:** d1a04f8

## Verification

- `npm test`: 144 tests pass (8 test files)
- `npx vitest run src/lib/graph-utils.test.ts`: 83 tests pass (includes 7 new collectPlacementSuggestions tests)
- `npx vitest run src/components/EditPopover.test.tsx`: 10 tests pass (includes 3 new autocomplete tests)
- `grep -c 'collectPlacementSuggestions' src/lib/graph-utils.ts`: 2 (export + function def + filter usage)
- `grep -c 'Autocomplete' src/components/EditPopover.tsx`: 14

## Known Stubs

None — all data flows are wired. Suggestions derive from live graph state via `useReactFlow().getNodes()`.

## Self-Check: PASSED

- src/lib/graph-utils.ts: modified with collectPlacementSuggestions
- src/components/EditPopover.tsx: modified with Autocomplete integration
- src/components/UrlNode.tsx: modified with placementSuggestions derivation
- Commits 8f118f6 and d1a04f8 exist in git log
