---
phase: quick
plan: 260418-gy5
type: quick-task
tags: [ux, editpopover, placements, cluster-tags, isGlobal]
key-files:
  modified:
    - packages/web/src/components/EditPopover.tsx
    - packages/web/src/components/EditPopover.test.tsx
decisions:
  - isGlobal is now fully derived as localPlacements.length > 0 at save time — no local state needed
  - Placements section is always rendered unconditionally — promoting a node to global happens implicitly when first placement is added
  - isGlobal prop kept in EditPopoverProps interface (still consumed by UrlNode and App.tsx serialization) but renamed to _isGlobal in destructuring to signal it is unused locally
  - Tag input row restructured from full-width solo input to flex row with input (flex-1) + "+ Add Tag" button
metrics:
  completed: "2026-04-18"
  tasks: 2
  files: 2
---

# Quick Task 260418-gy5: Unify Placement and Cluster UX — Derive isGlobal

One-liner: Removed Global Node toggle so isGlobal derives from `placements.length > 0`, made Placements always visible, and added an explicit "+ Add Tag" button alongside the cluster tag input.

## What Changed

### Task 1: Remove Global Node toggle, derive isGlobal from placements

**File:** `packages/web/src/components/EditPopover.tsx`

- Deleted `const [localIsGlobal, setLocalIsGlobal] = useState(isGlobal)` state
- Deleted the "Global Node" toggle button row from JSX
- Removed the `{localIsGlobal && (` conditional gate around the Placements section — Placements now renders unconditionally
- Both save paths (handleConfirm and mousedown handler) now pass `localPlacements.length > 0` as the isGlobal argument instead of `localIsGlobal`
- Removed `localIsGlobal` from both useEffect dependency arrays
- Width class simplified from `${localIsGlobal ? 'w-[320px]' : 'w-[280px]'}` to `w-[320px]` always
- The `isGlobal` prop in EditPopoverProps is kept (UrlNode passes it, App.tsx serialization reads it) but destructured as `_isGlobal` since it is no longer used to initialize local state

### Task 2: Replace Enter-only tag UX with "+ Add Tag" button

**File:** `packages/web/src/components/EditPopover.tsx`

- Cluster Tags input section restructured: outer `<div className="flex items-center gap-1.5">` now wraps both the input (or Autocomplete) and the new "+ Add Tag" button
- Input class changed from `w-full` to `flex-1` so button sits on the same row
- Autocomplete.Input class also changed from `w-full` to `flex-1`
- `+ Add Tag` button calls `addTag()` on click — same function as the Enter key handler
- Autocomplete.Empty text changed from `Press Enter to add "{tagDraft}"` to `No matches` since the button is now the explicit add action
- Enter key in the tag input still calls `addTag()` (keyboard shortcut preserved)
- `data-testid="cluster-tag-input"` preserved on the plain input branch

### Test updates

**File:** `packages/web/src/components/EditPopover.test.tsx`

- Replaced "shows global toggle switch" with "shows only the Root toggle switch (no Global Node toggle)" — now expects 1 switch instead of 2
- Replaced "shows placements section when global is toggled on" with "shows placements section always" — Placements is always present
- Removed "hides placements section when global is toggled off" — no longer applicable
- Updated remaining placement tests to not pass `isGlobal={true}` (the prop is accepted but unused for visibility)
- Added "onSave derives isGlobal=false when no placements" test
- Added two new "+ Add Tag" button tests: presence check and click-to-add behavior

## Deviations from Plan

None — plan executed exactly as specified. The `isGlobal` prop rename to `_isGlobal` in destructuring was added as a minor clarity improvement to signal the prop is no longer used locally; it does not change any observable behavior.

## Verification

- TypeScript: clean (0 errors)
- Tests: 271/271 passed
- Grep checks:
  - `localIsGlobal` and `Global Node` — no matches in EditPopover.tsx
  - `localPlacements.length > 0` — 2 matches (handleConfirm + mousedown handler)
  - `+ Add Tag` — present in EditPopover.tsx

## Self-Check: PASSED

- `/Users/leochiu/Desktop/seo-intelligence/packages/web/src/components/EditPopover.tsx` — exists, modified
- `/Users/leochiu/Desktop/seo-intelligence/packages/web/src/components/EditPopover.test.tsx` — exists, modified
- Commit db2f17d — present in git log
