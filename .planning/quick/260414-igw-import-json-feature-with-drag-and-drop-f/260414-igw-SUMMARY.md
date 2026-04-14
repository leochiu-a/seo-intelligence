# Quick Task 260414-igw Summary

**Task:** Import JSON feature: top-right toolbar button with drag-and-drop/file-select dialog
**Date:** 2026-04-14
**Status:** Complete

## Commits

| Commit | Description |
|--------|-------------|
| `a061d8b` | test(import-dialog): add failing tests for ImportDialog (TDD RED) |
| `ac3526a` | feat(import-dialog): implement ImportDialog component (TDD GREEN) |
| `e9aa714` | feat(import-dialog): wire ImportDialog into Toolbar and App |
| `3d1304a` | fix(test): exclude worktrees from vitest glob to prevent duplicate test runs |

## What Was Built

- **`src/components/ImportDialog.tsx`** — Modal dialog with drag-and-drop zone and file-select button. Supports Escape key and overlay-click to close. Reuses `parseImportJson` from graph-utils.
- **`src/components/ImportDialog.test.tsx`** — 6 TDD tests: open/close, DnD valid/invalid, file select, overlay click (written before implementation)
- **`src/test-setup.ts`** — `@testing-library/jest-dom` setup
- **`src/components/Toolbar.tsx`** — Added "Import JSON" button with Upload icon before Export JSON
- **`src/App.tsx`** — Added `showImportDialog` state, `handleImportFromDialog` callback, `<ImportDialog>` render

## Test Results

62 tests pass (56 pre-existing + 6 new ImportDialog tests).

## Deviations

- Cherry-pick merge conflicts resolved manually (worktree had diverged from main due to prior styling commits)
- Added vitest `exclude` for `.claude/worktrees/` to prevent worktree test files from being picked up in main project's test run
