---
phase: 09-scenario-comparison
plan: 01
subsystem: state-management
tags: [react, hooks, localStorage, vitest, tdd, scenario-management]

# Dependency graph
requires:
  - phase: 08-crawl-depth-orphan-detection
    provides: isRoot field in node data must persist per scenario independently
  - phase: 03-scenarios-export
    provides: serializeGraph pattern and single-graph localStorage approach now superseded

provides:
  - ScenarioRecord and ScenariosStore TypeScript interfaces in scenario-types.ts
  - SCENARIOS_KEY ('seo-planner-scenarios') and OLD_STORAGE_KEY constants
  - loadOrMigrate() pure function handling fresh/migration/existing localStorage cases
  - useScenarios hook with create, switch, rename, delete, persist, updateActiveGraph methods
  - Auto-migration from seo-planner-graph to seo-planner-scenarios on first load

affects:
  - 09-scenario-comparison (plans 02+: UI wiring of useScenarios into App.tsx + ScenarioTabBar)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function loadOrMigrate exported separately for direct unit testing without React harness
    - useScenarios hook uses setStore functional updates to ensure fresh state in all callbacks
    - structuredClone for deep copy in clone mode (no JSON round-trip overhead)
    - Serialization helpers inline in hook file to avoid ReactFlow import dependency

key-files:
  created:
    - src/lib/scenario-types.ts
    - src/hooks/useScenarios.ts
    - src/hooks/useScenarios.test.ts
  modified: []

key-decisions:
  - "loadOrMigrate checks seo-planner-scenarios before seo-planner-graph to implement D-09 migration priority"
  - "loadOrMigrate exported as named pure function to enable direct Vitest testing without renderHook"
  - "serializeNodes/serializeEdges inlined in useScenarios.ts to keep hook free of ReactFlow Node<AppNodeData> types"
  - "structuredClone used for clone mode — faster than JSON round-trip, no shared references"
  - "deleteScenario returns null when scenarios.length <= 1 implementing D-03 guard"

patterns-established:
  - "Pure data layer: useScenarios manages ScenariosStore only; never calls setNodes/setEdges (App.tsx responsibility)"
  - "Functional setStore updates in all callbacks ensure correct state in async contexts"
  - "Scenarios serialization strips runtime callbacks (onUpdate, onRootToggle, etc.) same pattern as App.tsx serializeGraph"

requirements-completed: [SCENE-01, SCENE-02, SCENE-03]

# Metrics
duration: 8min
completed: 2026-04-16
---

# Phase 9 Plan 01: Scenario Types and useScenarios Hook Summary

**useScenarios hook with full CRUD, localStorage persistence, and auto-migration from single-graph format — tested with 13 Vitest cases**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-16T22:20:00Z
- **Completed:** 2026-04-16T22:28:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3 created

## Accomplishments

- ScenarioRecord and ScenariosStore types defined in scenario-types.ts with SCENARIOS_KEY and OLD_STORAGE_KEY constants
- loadOrMigrate() handles all three initialization paths: fresh start, migration from old key, existing new key
- useScenarios hook exposes createScenario, switchScenario, renameScenario, deleteScenario, persist, updateActiveGraph
- 13 tests written covering all behaviors per D-01 through D-09 — all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Define scenario types and implement useScenarios hook with TDD** - `03d1e7f` (feat)

**Plan metadata:** see final commit

_Note: TDD task committed after GREEN phase (tests + implementation together)_

## Files Created/Modified

- `src/lib/scenario-types.ts` - ScenarioRecord, ScenariosStore interfaces; SCENARIOS_KEY, OLD_STORAGE_KEY constants; SerializedNode, SerializedEdge types
- `src/hooks/useScenarios.ts` - loadOrMigrate() pure function + useScenarios hook with full CRUD
- `src/hooks/useScenarios.test.ts` - 13 test cases covering all behaviors per plan spec

## Decisions Made

- `loadOrMigrate` exported as a standalone named function so tests can call it directly without React harness — keeps migration logic fully unit-testable
- Serialization helpers (`serializeNodes`/`serializeEdges`) inlined in hook to avoid importing ReactFlow's `Node<AppNodeData>` generic type into a non-ReactFlow file — accepts `object[]` and uses `any` casts internally
- `structuredClone` chosen for clone mode over JSON round-trip — faster, produces cleaner deep copies, available in all target browsers
- Functional `setStore` updates used in all callbacks to avoid stale closure issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Known Stubs

None — this is a pure data/logic layer with no UI rendering. No stub values flow to any UI.

## Next Phase Readiness

- useScenarios hook ready for integration into App.tsx
- ScenarioTabBar.tsx component can consume useScenarios for tab UI
- loadOrMigrate handles all localStorage edge cases — App.tsx can simply call useScenarios() on mount
- Next plan (09-02) should wire useScenarios into App.tsx replacing STORAGE_KEY single-graph effects

---
*Phase: 09-scenario-comparison*
*Completed: 2026-04-16*
