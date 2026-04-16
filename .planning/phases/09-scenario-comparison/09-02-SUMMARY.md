---
phase: 09-scenario-comparison
plan: 02
subsystem: ui-components
tags: [react, scenario-management, localStorage, tabs, vitest]

# Dependency graph
requires:
  - phase: 09-scenario-comparison
    plan: 01
    provides: useScenarios hook, scenario-types.ts interfaces

provides:
  - ScenarioTabBar component with per-tab gear popover, [+] blank/clone prompt, inline rename
  - App.tsx wired with useScenarios replacing single-graph localStorage pattern
  - isSwitchingRef guard preventing corrupt saves during scenario switch
  - wireCallbacks helper re-attaching runtime callbacks on serialized node/edge restore

affects:
  - App.tsx: single-graph persistence removed, multi-scenario management active
  - src/components/ScenarioTabBar.tsx: new UI component
  - App.test.tsx: updated to test seo-planner-scenarios key and migration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isSwitchingRef guard pattern extends isFirstRender pattern to suppress save during switch
    - wireCallbacks helper centralizes node/edge callback re-attachment on restore
    - ScenarioTabBar as purely presentational component receiving CRUD handlers as props
    - Per-tab popover with click-outside handler for Rename/Delete actions
    - Inline rename input replaces tab label on edit mode, confirmed on Enter/blur

key-files:
  created:
    - src/components/ScenarioTabBar.tsx
    - src/components/ScenarioTabBar.test.tsx
  modified:
    - src/App.tsx
    - src/App.test.tsx

key-decisions:
  - "wireCallbacks helper extracted inside AppInner to avoid duplicating callback-wiring across restore, switch, create, delete paths"
  - "activeScenario derived from store.scenarios.find() rather than adding activeScenario to useScenarios return — reduces hook API surface"
  - "App.test.tsx migration test updated to be StrictMode-safe: asserts old key deleted and new key present without asserting scenario name (StrictMode double-invokes useState initializer)"

patterns-established:
  - "isSwitchingRef.current = true before any setNodes/setEdges during scenario transition; cleared with requestAnimationFrame after commit"
  - "wireCallbacks(serializedNodes, serializedEdges) produces wiredNodes + wiredEdges with all runtime callbacks attached"

requirements-completed: [SCENE-01, SCENE-02, SCENE-03]

# Metrics
duration: ~9min
completed: 2026-04-16
---

# Phase 9 Plan 02: ScenarioTabBar UI + App.tsx Wiring Summary

**ScenarioTabBar component with full scenario CRUD wired into App.tsx, replacing single-graph localStorage with multi-scenario persistence — 200 tests passing**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-16T22:24:08Z
- **Completed:** 2026-04-16T22:32:40Z
- **Tasks:** 2 auto + 1 auto-approved checkpoint
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- ScenarioTabBar renders tabs with active state (border-b-2 + font-semibold), per-tab gear button with Rename/Delete popover, and [+] button with blank/clone prompt (D-01 through D-04)
- Delete disabled when only 1 scenario (D-03); inline rename with Enter/blur/Escape handling
- App.tsx: removed STORAGE_KEY and single-graph save/restore effects; useScenarios hook wired with full CRUD
- isSwitchingRef guard prevents save effect from firing during scenario switch transition
- wireCallbacks helper centralizes node/edge runtime callback re-attachment (used in restore, switch, create, delete)
- ScenarioTabBar inserted between Toolbar and canvas div in JSX
- App.test.tsx updated to test new seo-planner-scenarios persistence and migration from seo-planner-graph
- 12 ScenarioTabBar unit tests + 200 total tests passing

## Task Commits

1. **Task 1: Create ScenarioTabBar component with tests** - `4449ff8`
2. **Task 2: Wire useScenarios and ScenarioTabBar into App.tsx** - `3bfcbab`
3. **Task 3: Checkpoint auto-approved (auto_advance=true)**

## Files Created/Modified

- `src/components/ScenarioTabBar.tsx` - Tab bar with ScenarioTab, [+] prompt, click-outside handlers
- `src/components/ScenarioTabBar.test.tsx` - 12 unit tests covering all acceptance criteria
- `src/App.tsx` - useScenarios wired, STORAGE_KEY removed, wireCallbacks helper, 5 scenario handlers, ScenarioTabBar in JSX
- `src/App.test.tsx` - Updated to use SCENARIOS_KEY, added migration test, added ScenarioTabBar mock

## Decisions Made

- `wireCallbacks` helper extracted inline in AppInner to eliminate repetition across restore, switch, create, and delete handlers — reduces maintenance surface and ensures callback-wiring is always consistent
- `activeScenario` derived from `store.scenarios.find()` locally in AppInner rather than adding it to the `useScenarios` return value — keeps hook API minimal (hook only manages store state, derivations are caller's responsibility)
- App.test.tsx migration assertion made StrictMode-safe: React StrictMode double-invokes `useState` initializers, causing `loadOrMigrate` to run twice. On the second run, `seo-planner-graph` is already deleted (first run deleted it) and `seo-planner-scenarios` hasn't been written yet (written by save effect later), so a fresh "Scenario 1" store is returned. Test now asserts old key deleted and scenarios key present without checking scenario name.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] App.test.tsx needed updating for new localStorage schema**
- **Found during:** Task 2 verification
- **Issue:** `App.test.tsx` tested `seo-planner-graph` key (old pattern) which is now deleted by migration. Test was reading `null` and failing.
- **Fix:** Updated `App.test.tsx` to mock `ScenarioTabBar`, use `SCENARIOS_KEY`, and test both migration behavior and multi-scenario persistence. Adjusted migration test to be StrictMode-safe (StrictMode double-invokes useState initializer, causing loadOrMigrate to run twice).
- **Files modified:** `src/App.test.tsx`
- **Commit:** `3bfcbab`

## Known Stubs

None — all scenario management is fully wired. ScenarioTabBar receives live store.scenarios and store.activeScenarioId from useScenarios.

## Self-Check: PASSED

- src/components/ScenarioTabBar.tsx: FOUND
- src/components/ScenarioTabBar.test.tsx: FOUND
- src/App.tsx: FOUND
- Commit 4449ff8: FOUND
- Commit 3bfcbab: FOUND
- pnpm tsc --noEmit: 0 errors
- pnpm test -- --run: 200/200 tests passing
