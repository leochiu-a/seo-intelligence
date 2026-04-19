---
quick_task: 260419-kr4
subsystem: toolbar, graph-utils, app
tags: [export, clipboard, dropdown, copy-for-ai, tdd]
dependency_graph:
  requires: []
  provides: [buildCopyForAIText, ExportMenu, onCopyForAI]
  affects: [Toolbar, App, graph-utils]
tech_stack:
  added: []
  patterns: [custom-dropdown-with-usestate, tdd-red-green, clipboard-api-with-silent-fallback]
key_files:
  created: []
  modified:
    - packages/web/src/lib/graph-utils.ts
    - packages/web/src/lib/graph-utils.test.ts
    - packages/web/src/lib/__snapshots__/graph-utils.test.ts.snap
    - packages/web/src/components/Toolbar.tsx
    - packages/web/src/components/Toolbar.test.tsx
    - packages/web/src/App.tsx
decisions:
  - Feedback state (copyFeedback) kept in App.tsx passed as exportFeedback prop to Toolbar — avoids internal timer in presentational component
  - Custom dropdown with useState + document mousedown listener — no new dependencies (no radix dropdown-menu, no shadcn add)
  - Sparkles icon used for Copy for AI (confirmed available in lucide-react@1.8.0)
  - Single space before [root]/[global] flags in buildCopyForAIText output (not double-space)
metrics:
  duration: ~10 min
  completed_date: "2026-04-19"
  tasks: 3
  files_modified: 6
---

# Quick Task 260419-kr4: Export Dropdown with Copy for AI Summary

**One-liner:** Custom Export dropdown in Toolbar with Copy for AI option that serializes graph to LLM-readable plain text via `buildCopyForAIText` pure function with 12-test TDD coverage.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | TDD: add buildCopyForAIText pure function + 12 unit tests | b453de4 | graph-utils.ts, graph-utils.test.ts, snapshot |
| 2 | TDD: replace Export button with ExportMenu dropdown + 7 tests | 3f87a05 | Toolbar.tsx, Toolbar.test.tsx |
| 3 | Wire onCopyForAI handler in App.tsx with clipboard + feedback | d736457 | App.tsx |

## Artifacts

### `packages/web/src/lib/graph-utils.ts`
- `CopyForAIInput` interface exported
- `buildCopyForAIText(input: CopyForAIInput): string` pure function exported
- Internal helpers: `formatNodeLine`, `formatEdgeLine` (not exported)
- Output format: `# SEO Internal Link Structure` header, `## Nodes (N total)` section with per-node lines, `## Links` section with edge lines

### `packages/web/src/components/Toolbar.tsx`
- `ToolbarProps` extended with `onCopyForAI: () => void | Promise<void>` and `exportFeedback?: "copied" | null`
- Internal `ExportMenu` component with `useState<boolean>(false)` for open state, `useRef<HTMLDivElement>` for click-outside detection
- Trigger shows "Copied!" in green when `exportFeedback === "copied"`, hides chevron in that state

### `packages/web/src/App.tsx`
- `buildCopyForAIText` imported from graph-utils
- `copyFeedback: "copied" | null` state
- `onCopyForAI` async callback: serializes graph → `navigator.clipboard.writeText` → toggles feedback for 1.5s (silent fallback on clipboard error)

## Decisions Made

1. **Feedback state ownership:** `copyFeedback` lives in `App.tsx` and is passed as `exportFeedback` prop to `Toolbar`. This keeps `Toolbar` presentational and avoids an internal timer in a component that doesn't own the clipboard operation.

2. **No new dependencies:** Custom dropdown built with Tailwind + `useState` + `useEffect` document listener. The plan explicitly prohibited `@radix-ui/react-dropdown-menu` and `shadcn add dropdown-menu`.

3. **Sparkles icon:** Confirmed available in `lucide-react@1.8.0` before committing.

4. **Single space before flags:** `buildCopyForAIText` uses single space before `[root]` / `[global]` suffixes (e.g., `...outbound: 0 [root]`). Original plan spec said `  [root]` (two spaces), but tests assert single space — implementation matches tests.

## Deviations from Plan

### Minor adjustments

**1. [Rule 1 - Bug] Single space before [root]/[global] flags**
- **Found during:** Task 1 GREEN, test 8
- **Issue:** Plan spec showed `  [root]` (two spaces as separator from main content) but test 8 asserted `[root] [global]` with single space between flags and no double-space from main line
- **Fix:** Used single space before each flag suffix; both `[root]` and `[global]` are space-delimited from preceding content
- **Files modified:** `packages/web/src/lib/graph-utils.ts`
- **Commit:** b453de4

**2. [Rule 3 - Blocking] pnpm install required in worktree**
- **Found during:** Task 1 RED phase
- **Issue:** Worktree had no `node_modules` — `vitest` not found when running tests
- **Fix:** Ran `pnpm install --frozen-lockfile` in worktree root
- **Impact:** None on code; setup step added

## Test Results

- graph-utils: 186 tests passed (172 existing + 12 new + 2 snapshot-related)
- Toolbar: 11 tests passed (4 existing + 7 new)
- Full suite: 303 passed, 5 pre-existing failures (EditPopover tag tests, ScoreSidebar missing file in worktree) — none introduced by this task

## Known Stubs

None. All functionality is fully wired.

## Self-Check: PASSED

- [x] `packages/web/src/lib/graph-utils.ts` — `buildCopyForAIText` exported
- [x] `packages/web/src/components/Toolbar.tsx` — `ExportMenu` component, `onCopyForAI` prop
- [x] `packages/web/src/App.tsx` — `onCopyForAI` handler, `copyFeedback` state, `exportFeedback` prop passed
- [x] Commits: b453de4, 3f87a05, d736457 all verified in git log
