---
phase: 09-scenario-comparison
verified: 2026-04-16T22:35:00Z
status: passed
score: 10/10 must-haves verified
gaps: []
human_verification:
  - test: "Full end-to-end scenario management flow in browser"
    expected: "Tab bar visible, scenarios persist across refresh, switching does not corrupt data, clone produces independent graph"
    why_human: "Visual rendering, multi-scenario state integrity, and localStorage round-trip correctness cannot be fully asserted programmatically"
---

# Phase 9: Scenario Comparison Verification Report

**Phase Goal (adjusted per CONTEXT.md D-06):** Users can create/switch/rename/delete named scenarios with independent graph state, persisted in localStorage. SCENE-04 and SCENE-05 (side-by-side comparison diff) were explicitly deferred from Phase 9 scope.
**Verified:** 2026-04-16T22:35:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Requirements Coverage Note

The PLAN frontmatter for 09-01 lists `requirements: [SCENE-01, SCENE-02, SCENE-03, SCENE-04, SCENE-05]`. Per CONTEXT.md D-06 (and confirmed in both CONTEXT.md `<deferred>` section and REQUIREMENTS.md where SCENE-04/SCENE-05 remain unchecked), SCENE-04 and SCENE-05 were explicitly deferred from Phase 9. No tasks implement them and their deferral is the correct outcome.

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | useScenarios hook returns active scenario's nodes/edges on init | VERIFIED | `loadOrMigrate()` in `useScenarios.ts` initializes `useState` with the active scenario; 13 unit tests cover all init paths including fresh start, migration, and existing key |
| 2 | createScenario('blank') adds an empty scenario | VERIFIED | `createScenario` in `useScenarios.ts` sets `nodes: []`, `edges: []` for blank mode; test at line 109 asserts this |
| 3 | createScenario('clone') adds a deep-copied scenario | VERIFIED | Uses `structuredClone(serializedNodes/Edges)`; test at line 148 verifies mutation of original does not affect clone |
| 4 | switchScenario serializes current graph into old slot and restores target | VERIFIED | `switchScenario` in `useScenarios.ts` serializes via `serializeNodes/serializeEdges` then sets `activeScenarioId`; test at line 166 asserts slot update |
| 5 | renameScenario updates only the name, not graph data | VERIFIED | `renameScenario` maps over scenarios updating only `name` field; test at line 193 asserts nodes/edges unchanged |
| 6 | deleteScenario removes scenario, falls back to another; disabled when only one | VERIFIED | Returns `null` when `scenarios.length <= 1` (D-03); test at line 224 confirms no-op with null return; test at 207 confirms fallback to first remaining |
| 7 | Auto-migration converts seo-planner-graph to seo-planner-scenarios on first load | VERIFIED | `loadOrMigrate()` checks `SCENARIOS_KEY` first, then migrates from `OLD_STORAGE_KEY`, calling `localStorage.removeItem(OLD_STORAGE_KEY)` after success; migration test at line 50 asserts old key deleted and scenario named 'Default' with original nodes |
| 8 | Fresh start with no localStorage creates a single 'Scenario 1' entry | VERIFIED | Branch 3 in `loadOrMigrate()` creates `{ id, name: 'Scenario 1', nodes: [], edges: [] }`; test at line 41 asserts this |
| 9 | Tab bar renders below toolbar with tabs, gear popover, and [+] button | VERIFIED | `ScenarioTabBar.tsx` renders `<div className="flex items-center border-b border-border bg-white px-4 h-9 text-sm gap-1 shrink-0">` with tabs, gear buttons, and `aria-label="New scenario"` [+] button; 12 unit tests pass |
| 10 | ScenarioTabBar wired into App.tsx between Toolbar and canvas div, replacing single-graph persistence | VERIFIED | `App.tsx` imports `useScenarios` and `ScenarioTabBar`; `isSwitchingRef` guard suppresses save during switch; `STORAGE_KEY` is absent from `App.tsx`; `<ScenarioTabBar>` inserted between `<Toolbar>` and `<div className="flex flex-1 overflow-hidden">` |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/scenario-types.ts` | ScenarioRecord, ScenariosStore, SCENARIOS_KEY, OLD_STORAGE_KEY | VERIFIED | All four exports present; interfaces fully typed with SerializedNode/SerializedEdge |
| `src/hooks/useScenarios.ts` | useScenarios hook + loadOrMigrate function | VERIFIED | Both exported; hook returns store, createScenario, switchScenario, renameScenario, deleteScenario, persist, updateActiveGraph |
| `src/hooks/useScenarios.test.ts` | TDD tests for all hook behaviors (min 80 lines) | VERIFIED | 265 lines; 13 test cases covering all behaviors per plan spec |
| `src/components/ScenarioTabBar.tsx` | Tab bar UI with per-tab popover, [+] button, blank/clone prompt (min 80 lines) | VERIFIED | 220 lines; ScenarioTab with inline rename, gear popover with Rename/Delete, [+] prompt with Blank/Clone |
| `src/components/ScenarioTabBar.test.tsx` | Unit tests for tab rendering, click handlers, delete disable (min 40 lines) | VERIFIED | 141 lines; 12 test cases |
| `src/App.tsx` | Wired useScenarios, ScenarioTabBar, isSwitchingRef, updated save/restore | VERIFIED | All 5 required patterns confirmed: import useScenarios, import ScenarioTabBar, isSwitchingRef ref, isSwitchingRef.current guard in save effect, `<ScenarioTabBar>` in JSX |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useScenarios.ts` | `localStorage` | `getItem/setItem` with `SCENARIOS_KEY` | VERIFIED | `loadOrMigrate` reads `SCENARIOS_KEY`; `persist()` writes via `localStorage.setItem(SCENARIOS_KEY, ...)` inside `setStore` functional update |
| `src/hooks/useScenarios.ts` | `src/lib/scenario-types.ts` | import ScenarioRecord, ScenariosStore | VERIFIED | Line 2-9: `import { SCENARIOS_KEY, OLD_STORAGE_KEY, type ScenarioRecord, type ScenariosStore, type SerializedNode, type SerializedEdge } from '../lib/scenario-types'` |
| `src/App.tsx` | `src/hooks/useScenarios.ts` | import useScenarios | VERIFIED | Line 27: `import { useScenarios } from './hooks/useScenarios'` |
| `src/App.tsx` | `src/components/ScenarioTabBar.tsx` | JSX render between Toolbar and canvas div | VERIFIED | Line 546: `<ScenarioTabBar` positioned between `<Toolbar>` (line 545) and `<div className="flex flex-1 overflow-hidden">` (line 554) |
| `src/App.tsx` | `localStorage` (via useScenarios) | `persist()` called in save effect | VERIFIED | Line 540: `persist()` called inside save effect after `updateActiveGraph`; no direct localStorage access in App.tsx |

---

## Data-Flow Trace (Level 4)

Not applicable — Phase 9 artifacts are state management and UI component layers, not data-fetching pipelines with DB queries. Data originates from `localStorage` via `loadOrMigrate()` and flows through `useState` → `store.scenarios` → `ScenarioTabBar` props → rendered tabs. This flow is verified via the key links above and unit tests.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 200 tests pass (scenarios + all prior phases) | `pnpm test -- --run` | 200/200 tests passing in 10 test files | PASS |
| TypeScript compiles with no errors | `pnpm tsc --noEmit` | Exit 0, no output | PASS |
| Documented commits exist in git log | `git log --oneline` grep | `03d1e7f`, `4449ff8`, `3bfcbab` all present | PASS |
| STORAGE_KEY (old single-graph key) absent from App.tsx | grep `STORAGE_KEY` in App.tsx | No matches found | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCENE-01 | 09-01, 09-02 | User can create multiple named scenarios | SATISFIED | `createScenario` in useScenarios; `[+]` button with blank/clone in ScenarioTabBar; wired in App.tsx |
| SCENE-02 | 09-01, 09-02 | User can switch between scenarios; each has independent graph state | SATISFIED | `switchScenario` serializes current slot, restores target; `isSwitchingRef` prevents corruption; `handleSwitchScenario` in App.tsx |
| SCENE-03 | 09-01, 09-02 | Scenarios persist in localStorage independently | SATISFIED | `persist()` writes full `ScenariosStore` under `seo-planner-scenarios`; migration from `seo-planner-graph` on first load |
| SCENE-04 | 09-01 (declared, not implemented) | Side-by-side score delta per node | DEFERRED | Explicitly deferred per D-06 in CONTEXT.md; noted in PLAN frontmatter comment; not a gap for Phase 9 |
| SCENE-05 | 09-01 (declared, not implemented) | Score delta highlights improvements/regressions | DEFERRED | Explicitly deferred per D-06 in CONTEXT.md; not a gap for Phase 9 |

---

## Anti-Patterns Found

No anti-patterns found. Checks performed on all Phase 9 files:

- No TODO/FIXME/HACK/PLACEHOLDER comments in any created/modified files
- No hollow `return null`, `return {}`, or `return []` in rendering paths (blank scenario intentionally creates empty arrays, not a stub — the save effect repopulates from real graph state)
- No hardcoded empty props passed to ScenarioTabBar — receives live `store.scenarios` and `store.activeScenarioId`
- `App.tsx` `handleClearCanvas` correctly clears only active scenario via setNodes/setEdges → save effect chain (no `localStorage.removeItem` call)
- No direct `localStorage` access in App.tsx — fully delegated to `useScenarios`

---

## Human Verification Required

### 1. End-to-End Scenario Management Flow

**Test:** Run `pnpm dev`, open http://localhost:5173, and exercise the full scenario flow:
1. Verify "Scenario 1" tab appears below the toolbar
2. Add 2-3 nodes; click [+] → Clone Current → verify "Scenario 2" tab with same graph
3. Modify Scenario 2; click Scenario 1 tab → verify original graph intact
4. Click [+] → Blank → verify "Scenario 3" tab with empty canvas
5. Gear-click a tab → verify Rename and Delete appear in popover
6. Rename "Scenario 3" to "Proposal A" → verify tab label updates
7. Delete "Proposal A" → verify tab disappears and canvas switches to another scenario
8. Verify Delete is grayed-out (disabled) when only one scenario remains
9. Refresh page → verify all scenarios and their graphs persist
10. If old seo-planner-graph data exists: verify it auto-migrated to a "Default" tab

**Expected:** All 10 steps succeed with no data corruption or unexpected behavior
**Why human:** Visual rendering quality, multi-tab interaction fidelity, localStorage round-trip correctness under real ReactFlow state transitions, and the isSwitchingRef corruption-prevention guarantee all require browser-level verification

---

## Gaps Summary

No gaps. All in-scope requirements (SCENE-01, SCENE-02, SCENE-03) are fully implemented and verified. SCENE-04 and SCENE-05 were explicitly deferred from Phase 9 scope per CONTEXT.md D-06 and are correctly left unimplemented. The automated test suite shows 200/200 tests passing and TypeScript compiles clean.

---

_Verified: 2026-04-16T22:35:00Z_
_Verifier: Claude (gsd-verifier)_
