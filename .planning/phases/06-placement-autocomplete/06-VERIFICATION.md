---
phase: 06-placement-autocomplete
verified: 2026-04-15T17:30:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 6: Placement Autocomplete Verification Report

**Phase Goal:** Users typing a placement name in the edit popover see suggestions drawn from placement names already used across other global nodes, reducing typos and enforcing naming consistency
**Verified:** 2026-04-15T17:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                    | Status     | Evidence                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | When a global node's placement name input is focused and other global nodes have placements, a dropdown appears         | ✓ VERIFIED | `Autocomplete.Root` with `openOnInputClick` rendered when `placementSuggestions.length > 0`; test `shows autocomplete input (combobox role)` passes |
| 2   | User can click a suggestion to pre-fill the placement name without further typing                                       | ✓ VERIFIED | `onValueChange` on `Autocomplete.Root` updates `localPlacements` state; `Autocomplete.Item` renders each suggestion as selectable     |
| 3   | User can ignore suggestions and type a freeform name not in the list                                                    | ✓ VERIFIED | `Autocomplete.Input` accepts freeform input; test `allows freeform text input not in suggestions list (PLACE-03)` passes              |
| 4   | When no other global nodes have placements defined, no dropdown appears (plain `<input>` rendered)                      | ✓ VERIFIED | Conditional: `placementSuggestions.length > 0` guards `Autocomplete.Root`; test `renders plain input when placementSuggestions is empty (PLACE-04)` passes |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                              | Expected                                     | Status     | Details                                                                                                                  |
| ------------------------------------- | -------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/graph-utils.ts`              | `collectPlacementSuggestions` pure function  | ✓ VERIFIED | `export function collectPlacementSuggestions(` present at line 291; filters by isGlobal, excludes current node, deduplicates, filters empty strings |
| `src/components/EditPopover.tsx`      | Autocomplete-powered placement name inputs   | ✓ VERIFIED | `import { Autocomplete } from '@base-ui/react/autocomplete'`; `Autocomplete.Root`, `Autocomplete.Input`, `Autocomplete.Item`, `Autocomplete.Positioner`, `Autocomplete.Popup` all present |
| `src/components/UrlNode.tsx`          | `placementSuggestions` derivation + prop     | ✓ VERIFIED | `useMemo(() => collectPlacementSuggestions(getNodes() as Node<UrlNodeData>[], id), [id, getNodes])` at lines 53-56; passed via `placementSuggestions={placementSuggestions}` to EditPopover |

### Key Link Verification

| From                              | To                              | Via                                           | Status     | Details                                                                         |
| --------------------------------- | ------------------------------- | --------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `src/components/UrlNode.tsx`      | `src/lib/graph-utils.ts`        | `import { collectPlacementSuggestions }`      | ✓ WIRED    | Combined import at line 5: `collectPlacementSuggestions` included in named imports from `'../lib/graph-utils'` |
| `src/components/UrlNode.tsx`      | `src/components/EditPopover.tsx` | `placementSuggestions={placementSuggestions}` | ✓ WIRED    | `placementSuggestions={placementSuggestions}` present at EditPopover call site (line 150) |
| `src/components/EditPopover.tsx`  | `@base-ui/react/autocomplete`   | `Autocomplete.Root` component                 | ✓ WIRED    | `<Autocomplete.Root` at line 122; `Autocomplete` imported at line 3            |

### Data-Flow Trace (Level 4)

| Artifact                         | Data Variable           | Source                                      | Produces Real Data                                 | Status      |
| -------------------------------- | ----------------------- | ------------------------------------------- | -------------------------------------------------- | ----------- |
| `src/components/EditPopover.tsx` | `placementSuggestions`  | `useReactFlow().getNodes()` in `UrlNode.tsx` | Yes — reads live React Flow node graph state via `getNodes()`, filtered through pure function | ✓ FLOWING   |
| `src/components/EditPopover.tsx` | `localPlacements`       | `onValueChange` updates from Autocomplete.Root | Yes — user selection or freeform input updates `localPlacements` state | ✓ FLOWING   |

### Behavioral Spot-Checks

| Behavior                                      | Command                                                                             | Result        | Status   |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | ------------- | -------- |
| All graph-utils tests pass (incl. 7 new)      | `npx vitest run src/lib/graph-utils.test.ts`                                       | 83 tests pass | ✓ PASS   |
| All EditPopover tests pass (incl. 3 new)      | `npx vitest run src/components/EditPopover.test.tsx`                               | 10 tests pass | ✓ PASS   |
| Full test suite passes                        | `npm test`                                                                          | 144/144 pass  | ✓ PASS   |
| Autocomplete sub-components present           | `grep -c 'Autocomplete' src/components/EditPopover.tsx`                            | 14            | ✓ PASS   |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                      | Status       | Evidence                                                                            |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------- |
| PLACE-01    | 06-01-PLAN  | User sees dropdown of existing placement names from other global nodes when adding a placement   | ✓ SATISFIED  | `Autocomplete.Root` with `items={placementSuggestions}` + `openOnInputClick`; test confirms combobox role rendered |
| PLACE-02    | 06-01-PLAN  | User can select a suggested name from the dropdown to pre-fill the placement name field           | ✓ SATISFIED  | `onValueChange` on `Autocomplete.Root` updates `localPlacements` state; `Autocomplete.Item` renders clickable items |
| PLACE-03    | 06-01-PLAN  | User can still type a freeform name not in the suggestions list                                   | ✓ SATISFIED  | `Autocomplete.Input` (combobox mode) accepts freeform typing; test `allows freeform text input (PLACE-03)` passes |
| PLACE-04    | 06-01-PLAN  | Suggestions only appear when other global nodes have placements; no dropdown shown otherwise      | ✓ SATISFIED  | Conditional rendering: plain `<input>` when `placementSuggestions.length === 0`; test `renders plain input (PLACE-04)` passes |

All 4 requirement IDs from PLAN frontmatter are accounted for. No orphaned requirements found for Phase 6 in REQUIREMENTS.md.

### Anti-Patterns Found

| File                                      | Pattern                                     | Severity | Impact                                                                                           |
| ----------------------------------------- | ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `src/components/EditPopover.tsx` line 133 | `Autocomplete.Portal` present (plan said avoid) | ℹ️ Info  | Plan's Pitfall 2 said avoid Portal. Implementation uses `container={popoverRef}` which routes Portal output into the popoverRef element, preserving `popoverRef.current.contains(e.target)` click-outside correctness. This is the correct fix documented in SUMMARY as a deliberate deviation — Base UI's Positioner throws without Portal context. Not a blocker. |

**Deviation assessment:** The `Autocomplete.Portal container={popoverRef}` pattern satisfies both the library requirement (Portal context must exist for Positioner) and the click-outside constraint (dropdown DOM remains inside popoverRef). Tests confirm the fix works correctly. The SUMMARY documents the reasoning and the plan's Pitfall 2 concern is resolved — not violated.

### Human Verification Required

#### 1. Dropdown visual appearance and positioning

**Test:** Open a canvas with two global nodes, each with at least one placement. Open the edit popover on one global node and click the placement name input (or type).
**Expected:** A dropdown list appears below/near the input showing the placement names from the other global node. Dropdown is visually contained within or properly adjacent to the popover (not clipped behind it).
**Why human:** Visual positioning of the Autocomplete dropdown relative to the popover container cannot be verified programmatically. The `container={popoverRef}` approach may produce z-index or overflow clipping issues that only manifest visually.

#### 2. Click-a-suggestion closes dropdown and fills input

**Test:** With suggestions showing, click on a suggestion name.
**Expected:** The placement name input is pre-filled with the clicked suggestion, and the dropdown closes. The popover itself remains open.
**Why human:** Verifying that the mousedown-outside handler does not prematurely close the popover when clicking inside the dropdown (the `container={popoverRef}` fix) requires actual browser interaction.

### Gaps Summary

No gaps. All 4 must-have truths are verified, all 3 required artifacts are substantive and wired, all 4 key links are confirmed, all 4 requirement IDs are satisfied, and the full test suite (144 tests) passes.

The single notable finding — use of `Autocomplete.Portal container={popoverRef}` contrary to the plan's "DO NOT use Portal" instruction — is a legitimate deviation: Base UI throws without Portal context, and the `container` prop routes output into the popoverRef so click-outside behavior is preserved. The executor documented this reasoning in the SUMMARY and the tests confirm correct behavior.

---

_Verified: 2026-04-15T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
