---
phase: 04-global-nodes
verified: 2026-04-14T23:05:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 04: Global Nodes — Verification Report

**Phase Goal:** Users can designate any node as "global" — meaning every other node automatically links to it — and configure named placements with per-placement link counts that feed the PageRank calculation
**Verified:** 2026-04-14T23:05:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Combined must-haves from Plan 01 and Plan 02.

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | A global node with placements scores higher than an equivalent non-global node with no real inbound edges | ✓ VERIFIED | `calculatePageRank` injects synthetic inbound before `totalWeightedOut`; test at graph-utils.test.ts line 288 confirms higher score |
| 2  | Importing a JSON file with isGlobal=true preserves global state on the node | ✓ VERIFIED | `parseImportJson` reads `node.isGlobal` and `node.placements` (graph-utils.ts line 451-460); test at line 597 confirms |
| 3  | Global nodes do not inflate each other's scores (only non-global nodes contribute synthetic inbound) | ✓ VERIFIED | Filter on line 158: `nonGlobalNodes = nodes.filter(n => !n.data.isGlobal)`; test at line 326 confirms |
| 4  | Scores still sum to N even with global synthetic injection | ✓ VERIFIED | Test at graph-utils.test.ts line 354 confirms |
| 5  | A global node with zero placement linkCount behaves identically to a non-global node | ✓ VERIFIED | `if (totalPlacementLinks <= 0) continue;` at line 164; test at line 341 confirms |
| 6  | User can toggle any node as global via a checkbox in the EditPopover | ✓ VERIFIED | `role="switch"` button in EditPopover.tsx line 102; EditPopover.test.tsx test at line 17 passes |
| 7  | Global nodes show a blue Globe badge on the canvas node | ✓ VERIFIED | `Globe` imported from lucide-react, rendered when `data.isGlobal` (UrlNode.tsx lines 84-98); UrlNode.test.tsx test passes |
| 8  | User can add named placements with link counts when a node is global | ✓ VERIFIED | Placement CRUD UI in EditPopover.tsx lines 111-165; test at EditPopover.test.tsx line 44 passes |
| 9  | User can rename and delete placements on a global node | ✓ VERIFIED | Rename: onChange updates `localPlacements`; Delete: filter on button click; tests at lines 51, 59 pass |
| 10 | serializeGraph preserves isGlobal and placements to localStorage | ✓ VERIFIED | App.tsx line 64: conditional spread `...(isGlobal && { isGlobal }), ...(placements?.length && { placements })`; storage triggered on every nodes change (line 342) |
| 11 | Restore from localStorage wires isGlobal and placements back into node data | ✓ VERIFIED | App.tsx lines 311-312: `...(n.data.isGlobal != null && { isGlobal }), ...(n.data.placements != null && { placements })` |
| 12 | JSON export includes isGlobal and placements fields | ✓ VERIFIED | App.tsx lines 264-265 in `onExportJson` |
| 13 | Scores and sidebar update immediately when a node is toggled global or placements change | ✓ VERIFIED | `onUpdate` → `onNodeDataUpdate` → `setNodes` → `useMemo(calculatePageRank, [nodes, edges])` — scores recalculate on every nodes change (App.tsx line 226) |
| 14 | Editing a node as global and adding placements shows a Globe badge on the canvas | ✓ VERIFIED | UrlNode renders Globe badge when `data.isGlobal`; data flows EditPopover → handleSave → onUpdate → setNodes → re-render |

**Score:** 14/14 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/graph-utils.ts` | Placement interface, extended UrlNodeData, updated calculatePageRank, updated parseImportJson | ✓ VERIFIED | `export interface Placement` at line 3; `isGlobal?: boolean` and `placements?: Placement[]` in UrlNodeData; synthetic injection at lines 156-176 before `totalWeightedOut` at line 179; `parseImportJson` reads global fields at lines 451-460 |
| `src/lib/graph-utils.test.ts` | Tests for global node PageRank behavior | ✓ VERIFIED | `describe('calculatePageRank with global nodes')` at line 287 with 7 test cases; 3 parseImportJson global tests at lines 597-633 |
| `src/components/UrlNode.test.tsx` | Tests for Globe badge rendering | ✓ VERIFIED | 2 behavioral tests (not todos) for `isGlobal=true` and `isGlobal=false`; both pass |
| `src/components/EditPopover.test.tsx` | Tests for placement CRUD | ✓ VERIFIED | 7 behavioral tests covering toggle, visibility, add/rename/delete, onSave call signature; all pass |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/EditPopover.tsx` | Global toggle checkbox and placement CRUD UI | ✓ VERIFIED | `isGlobal` and `placements` props; `localIsGlobal`/`localPlacements` state; `role="switch"` toggle; placement add/rename/delete; `+ Add Placement` button |
| `src/components/UrlNode.tsx` | Globe badge for global nodes | ✓ VERIFIED | `Globe` imported; badge renders in flex wrapper with tier badge when `data.isGlobal`; `bg-blue-100 text-blue-700` styling |
| `src/App.tsx` | serializeGraph, restore, export with global fields | ✓ VERIFIED | `Placement` imported; all three paths (serialize, restore, export) handle `isGlobal` and `placements` via conditional spread |

---

## Key Link Verification

### Plan 01

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/graph-utils.ts` | `calculatePageRank` | synthetic inbound injection before totalWeightedOut | ✓ WIRED | `globalNodes.filter(n => n.data.isGlobal)` at line 157; `totalWeightedOut` computed at line 179, which is after the injection loop ending at line 176 |

### Plan 02

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `EditPopover.tsx` | `UrlNode.tsx` | `onSave(urlTemplate, pageCount, isGlobal, placements)` callback | ✓ WIRED | `handleSave` in UrlNode.tsx line 48 receives all 4 params; pattern `onSave.*isGlobal.*placements` confirmed |
| `UrlNode.tsx` | `graph-utils.ts` | `data.onUpdate(id, { isGlobal, placements })` | ✓ WIRED | `data.onUpdate(id, { urlTemplate, pageCount, isGlobal, placements })` at line 50; pattern `onUpdate.*isGlobal` confirmed |
| `App.tsx` | localStorage | `serializeGraph` includes `isGlobal` and `placements` | ✓ WIRED | Conditional spread at line 64; `localStorage.setItem` at line 342 triggered on every nodes change |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `UrlNode.tsx` (Globe badge) | `data.isGlobal` | `onNodeDataUpdate` → `setNodes` in App.tsx, fed from `EditPopover.onSave` | Yes — user action sets flag, propagates through React state | ✓ FLOWING |
| `EditPopover.tsx` (placements list) | `localPlacements` | `useState(placements)` initialized from `data.placements ?? []` in UrlNode | Yes — node data carries placements from App state | ✓ FLOWING |
| `calculatePageRank` (scores) | `scores` useMemo | `nodes` React state including `isGlobal`/`placements` on each node | Yes — `useMemo([nodes, edges])` recomputes on every change; ScoreSidebar receives live `scores` Map | ✓ FLOWING |
| `App.tsx` restore path | `n.data.isGlobal`, `n.data.placements` | localStorage JSON parsed on mount | Yes — `JSON.parse(localStorage.getItem(STORAGE_KEY))` with type-checked spread | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Check | Status |
|----------|-------|--------|
| All 125 tests pass | `npm test` — 7 test files, 125 tests, 0 failures | ✓ PASS |
| TypeScript compiles with no errors | `npx tsc --noEmit` — exits 0 | ✓ PASS |
| Global injection precedes totalWeightedOut | grep line numbers confirm injection loop ends at line 176; totalWeightedOut starts at line 179 | ✓ PASS |
| Graph-utils global tests (10 cases) | `npm test -- graph-utils` — 76 tests passing including `calculatePageRank with global nodes` block | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GLOB-01 | 04-01, 04-02 | User can mark any node as "global" via the node edit popover | ✓ SATISFIED | `role="switch"` toggle in EditPopover; `isGlobal` flows through to node data and PageRank |
| GLOB-02 | 04-02 | Global nodes display a visible indicator distinguishing them from regular nodes | ✓ SATISFIED | Globe badge (`bg-blue-100 text-blue-700`) rendered when `data.isGlobal`; UrlNode.test.tsx confirms |
| GLOB-03 | 04-01 | A global node has one or more named placements, each with its own link count | ✓ SATISFIED | `Placement` interface (`id`, `name`, `linkCount`) exported; placements stored on UrlNodeData |
| GLOB-04 | 04-02 | User can add, edit, and delete placements on a global node | ✓ SATISFIED | Placement CRUD in EditPopover; all 3 operations tested in EditPopover.test.tsx |
| GLOB-05 | 04-01 | PageRank treats every non-global node as implicitly linking to all global nodes; effective inbound per page equals sum of placement link counts | ✓ SATISFIED | Synthetic injection in calculatePageRank; `totalPlacementLinks = sum(placements[*].linkCount)`; 7 tests confirm behavior including edge cases |

**All 5 requirements satisfied. No orphaned requirements.**

---

## Anti-Patterns Found

No blockers or warnings found. The following matches were checked and cleared as false positives:

- `placeholder=` attribute values in EditPopover.tsx and `--color-placeholder` CSS variable references in UrlNode.tsx — these are HTML input placeholder text and design token names, not stub implementations.

---

## Human Verification Required

The following items require manual testing in the browser (not automatically verifiable):

### 1. Globe Badge Visual Appearance

**Test:** Add a node, open its edit popover, toggle "Global Node" on, close popover.
**Expected:** A blue "Global" badge with a globe icon appears on the canvas node, clearly distinguishable from the tier badge.
**Why human:** Visual styling and icon rendering cannot be asserted programmatically without a browser.

### 2. Placement CRUD Round-Trip

**Test:** Add a node, open edit popover, toggle global on, add placements "Header Nav" (linkCount 2) and "Footer" (linkCount 1), save. Verify score sidebar updates. Refresh page and reopen popover.
**Expected:** Placements persist across refresh; scores reflect synthetic injection (global node should rank higher than isolated non-global nodes); reopening the popover shows the saved placements.
**Why human:** localStorage round-trip and score sidebar visual update need browser observation.

### 3. Popover Width Transition

**Test:** Open edit popover on a non-global node (should be 280px wide), then toggle global on.
**Expected:** Popover widens to 320px to accommodate the placements section.
**Why human:** CSS width transition is a visual check.

---

## Gaps Summary

No gaps. All 14 observable truths are verified, all 5 requirement IDs (GLOB-01 through GLOB-05) are satisfied, all artifacts exist and are substantive, all key links are wired, and data flows end-to-end from user interaction through the PageRank calculation.

---

_Verified: 2026-04-14T23:05:00Z_
_Verifier: Claude (gsd-verifier)_
