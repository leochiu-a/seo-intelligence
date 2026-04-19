---
phase: quick-260419-riw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/web/src/components/ui/alert-dialog.tsx
  - packages/web/src/components/Toolbar.tsx
  - packages/web/src/components/Toolbar.test.tsx
  - packages/web/package.json
  - packages/web/pnpm-lock.yaml
autonomous: true
requirements:
  - RIW-01

must_haves:
  truths:
    - "Clicking Clear Canvas opens a confirmation Alert Dialog (it does NOT immediately clear the canvas)"
    - "Confirming (clicking the destructive Continue/Clear action in the dialog) clears all nodes and edges"
    - "Cancelling (clicking Cancel or pressing Esc) closes the dialog and leaves the canvas untouched"
    - "Clear Canvas button remains disabled when canvas is empty (existing behavior preserved)"
    - "Toolbar tests still pass and cover the new confirm/cancel branches"
  artifacts:
    - path: "packages/web/src/components/ui/alert-dialog.tsx"
      provides: "shadcn Alert Dialog primitives (Root, Trigger, Content, Title, Description, Action, Cancel, etc.)"
      contains: "AlertDialog"
    - path: "packages/web/src/components/Toolbar.tsx"
      provides: "Clear Canvas trigger wrapped in AlertDialog with Cancel + destructive Continue actions"
      contains: "AlertDialog"
    - path: "packages/web/src/components/Toolbar.test.tsx"
      provides: "Tests that clicking Clear Canvas opens dialog, Cancel does NOT call onClearCanvas, Continue DOES call onClearCanvas"
      contains: "alert dialog"
  key_links:
    - from: "packages/web/src/components/Toolbar.tsx"
      to: "packages/web/src/components/ui/alert-dialog.tsx"
      via: "import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogAction, AlertDialogCancel, ... }"
      pattern: "from \"@/components/ui/alert-dialog\""
    - from: "AlertDialogAction onClick in Toolbar"
      to: "onClearCanvas prop"
      via: "Confirm button click handler"
      pattern: "onClick=\\{.*onClearCanvas"
---

<objective>
Gate the destructive "Clear Canvas" toolbar action behind a shadcn Alert Dialog confirmation so a single accidental click cannot wipe the user's graph.

Purpose: Clear Canvas currently wipes nodes + edges + active-scenario graph immediately on click (see `handleClearCanvas` in `App.tsx:219`). An accidental click destroys the user's work with no undo. Adding a confirmation dialog is the standard guard for destructive actions.

Output: shadcn `alert-dialog` component installed locally; `Toolbar.tsx` Clear Canvas button now opens an AlertDialog; `onClearCanvas` is only invoked after the user confirms in the dialog. Tests updated to cover the confirm/cancel branches.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/web/src/components/Toolbar.tsx
@packages/web/src/components/Toolbar.test.tsx
@packages/web/src/components/ui/dialog.tsx
@packages/web/components.json
@packages/web/package.json

<interfaces>
<!-- Existing props that the AlertDialog wiring must preserve. Extracted from Toolbar.tsx. -->

From packages/web/src/components/Toolbar.tsx:
```typescript
interface ToolbarProps {
  onAddNode: () => void;
  onImportJson: () => void;
  onExportJson: () => void;
  onCopyForAI: () => void | Promise<void>;
  onClearCanvas: () => void;   // MUST remain a plain () => void — App.tsx calls it synchronously
  isEmpty: boolean;
  onLegendOpen?: () => void;
}
```

From packages/web/src/App.tsx (caller — do NOT modify):
```typescript
const handleClearCanvas = useCallback(() => {
  setNodes([]);
  setEdges([]);
}, [setNodes, setEdges]);
// ...
<Toolbar onClearCanvas={handleClearCanvas} isEmpty={nodes.length === 0} ... />
```

Project shadcn setup (from components.json):
- style: "base-nova" (Base UI variant, NOT Radix) — `pnpm dlx shadcn@latest add alert-dialog` will install the Base UI version and use `@base-ui/react/alert-dialog`
- alias `@/components/ui` → `packages/web/src/components/ui`
- alias `@/lib/utils` → `packages/web/src/lib/utils`
- Existing `ui/dialog.tsx` confirms Base UI pattern (imports from `@base-ui/react/dialog`)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install shadcn alert-dialog component</name>
  <files>packages/web/src/components/ui/alert-dialog.tsx, packages/web/package.json, packages/web/pnpm-lock.yaml</files>
  <action>
    From the `packages/web` directory, run exactly:

    ```
    cd packages/web && pnpm dlx shadcn@latest add alert-dialog
    ```

    This is the command the user specified. It will:
    1. Use the `components.json` config (style: "base-nova", so it installs the Base UI variant that matches the existing `dialog.tsx`)
    2. Create `packages/web/src/components/ui/alert-dialog.tsx` exporting `AlertDialog`, `AlertDialogTrigger`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`
    3. Add any missing peer deps (likely none — `@base-ui/react` is already a dep per `package.json`)

    If the CLI prompts interactively (e.g. "overwrite?"), accept defaults. Do NOT hand-write this file — the CLI-generated output must match the project's existing shadcn conventions (see `ui/dialog.tsx` for the base-nova pattern).

    After the command finishes, open `packages/web/src/components/ui/alert-dialog.tsx` and verify:
    - It imports from `@base-ui/react/alert-dialog` (NOT `@radix-ui/...`)
    - It uses `cn` from `@/lib/utils`
    - It exports the component set listed above

    Do NOT modify the generated file. If it imports from `@radix-ui/*`, the wrong registry was used — stop and re-check `components.json` before retrying.
  </action>
  <verify>
    <automated>cd packages/web && test -f src/components/ui/alert-dialog.tsx && grep -q "AlertDialog" src/components/ui/alert-dialog.tsx && grep -q "@base-ui/react" src/components/ui/alert-dialog.tsx && pnpm type-check</automated>
  </verify>
  <done>`packages/web/src/components/ui/alert-dialog.tsx` exists, exports the AlertDialog primitive set, imports from `@base-ui/react/alert-dialog`, and `pnpm type-check` passes with no new errors.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wrap Clear Canvas button in AlertDialog</name>
  <files>packages/web/src/components/Toolbar.tsx, packages/web/src/components/Toolbar.test.tsx</files>
  <behavior>
    Update `Toolbar.test.tsx` FIRST (RED) with three new cases, then make them pass (GREEN):

    1. Test "clicking Clear Canvas opens a confirmation dialog and does NOT call onClearCanvas":
       - Render `<Toolbar {...defaultProps} onClearCanvas={vi.fn()} />`
       - `fireEvent.click(screen.getByRole("button", { name: /clear canvas/i }))`
       - Expect a dialog to appear: `screen.getByRole("alertdialog")` (or `screen.getByText(/are you sure/i)` — use whichever matches the final copy)
       - Expect `onClearCanvas` to have been called 0 times

    2. Test "clicking Cancel in the dialog closes it without calling onClearCanvas":
       - Open the dialog as above
       - `fireEvent.click(screen.getByRole("button", { name: /cancel/i }))`
       - Expect `onClearCanvas` to have been called 0 times
       - Expect the dialog to no longer be in the document

    3. Test "clicking the destructive confirm action calls onClearCanvas exactly once":
       - Open the dialog as above
       - `fireEvent.click(screen.getByRole("button", { name: /continue|clear/i }))` (match whichever label the implementation uses)
       - Expect `onClearCanvas` to have been called exactly 1 time

    Also UPDATE the existing test "calls onClearCanvas when Clear Canvas is clicked" (currently at line 20-25) — the old behavior (single click → onClearCanvas) is no longer correct. Rewrite it to match new flow: click Clear Canvas → click confirm → `onClearCanvas` called once. Keep the other existing tests (renders button, disabled when empty, enabled when not empty) unchanged.
  </behavior>
  <action>
    Modify `packages/web/src/components/Toolbar.tsx`:

    1. Add imports at the top:
       ```ts
       import {
         AlertDialog,
         AlertDialogTrigger,
         AlertDialogContent,
         AlertDialogHeader,
         AlertDialogFooter,
         AlertDialogTitle,
         AlertDialogDescription,
         AlertDialogAction,
         AlertDialogCancel,
       } from "@/components/ui/alert-dialog";
       ```
       (Use only the subset the generated file actually exports — trim to match.)

    2. Replace the existing Clear Canvas `<button ...>...</button>` block (currently lines 81-88) with:
       ```tsx
       <AlertDialog>
         <AlertDialogTrigger
           disabled={isEmpty}
           className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
         >
           <Trash2 size={14} />
           Clear Canvas
         </AlertDialogTrigger>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Clear canvas?</AlertDialogTitle>
             <AlertDialogDescription>
               This will remove all nodes and edges from the current scenario. This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={onClearCanvas}>Continue</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
       ```

       Preserve the exact className on the trigger so the button still looks identical (red-200 border, red-600 text, red-50 hover, disabled opacity). Preserve `disabled={isEmpty}` on the trigger so the empty-state test still passes.

       Do NOT change `onClearCanvas` prop signature. Do NOT pass a new prop from `App.tsx`. The dialog is pure UI inside `Toolbar` — `App.tsx` stays untouched (this is why we keep the prop as `() => void`).

    3. Update `packages/web/src/components/Toolbar.test.tsx` per the `<behavior>` block above. Specifically rewrite the existing "calls onClearCanvas when Clear Canvas is clicked" test so it clicks the trigger, then clicks Continue, and asserts `onClearCanvas` was called exactly once.

    Run `pnpm test` inside `packages/web` until all Toolbar tests pass.

    Commit using commitlint convention (per user's global CLAUDE.md):
    - `feat(web): confirm clear canvas with alert dialog`
  </action>
  <verify>
    <automated>cd packages/web && pnpm test -- Toolbar && pnpm type-check && pnpm lint</automated>
  </verify>
  <done>
    - All Toolbar tests pass (existing + 3 new confirm/cancel/open tests)
    - `pnpm type-check` passes
    - `pnpm lint` passes
    - Manually: clicking Clear Canvas opens a dialog; Cancel closes it without clearing; Continue clears all nodes and edges
    - Clear Canvas trigger still visually matches (red border/text, same hover, disabled when empty)
    - `App.tsx` has NOT been modified — `handleClearCanvas` and the `<Toolbar onClearCanvas={...} />` call site are untouched
  </done>
</task>

</tasks>

<verification>
From `packages/web`:

1. `pnpm type-check` — no TypeScript errors
2. `pnpm lint` — no oxlint errors
3. `pnpm test` — all tests pass, including 3 new Toolbar alert dialog tests
4. Manual smoke test in `pnpm dev`:
   - Load the app with at least one node on the canvas
   - Click "Clear Canvas" → an Alert Dialog appears with title "Clear canvas?" and Cancel / Continue buttons
   - Click Cancel → dialog closes, nodes remain
   - Re-open dialog, press Esc → dialog closes, nodes remain
   - Re-open dialog, click Continue → dialog closes, canvas is empty, localStorage persists empty graph (existing save effect behavior)
   - Canvas is now empty → Clear Canvas button is disabled (cannot reopen dialog)
</verification>

<success_criteria>
- shadcn `alert-dialog` installed as `packages/web/src/components/ui/alert-dialog.tsx` using the Base UI (base-nova) style, matching existing `ui/dialog.tsx` conventions
- Clear Canvas in `Toolbar.tsx` is wrapped in an AlertDialog; `onClearCanvas` only fires after explicit confirmation
- Cancel and Esc both dismiss the dialog without clearing the canvas
- Button visual appearance (red styling, Trash2 icon, disabled-when-empty) is preserved
- `App.tsx` is NOT modified — the `onClearCanvas` prop contract is preserved
- All existing Toolbar tests pass and 3 new tests cover the open/cancel/confirm flow
- Commit message follows commitlint convention (e.g. `feat(web): confirm clear canvas with alert dialog`)
</success_criteria>

<output>
After completion, create `.planning/quick/260419-riw-clear-canvas-alert-dialog/260419-riw-SUMMARY.md` documenting:
- What shipped (alert-dialog component installed, Toolbar wrapped)
- Any deviations (e.g. if the shadcn CLI generated different export names, what was adapted)
- Test coverage added
- Commit SHA(s)
</output>
