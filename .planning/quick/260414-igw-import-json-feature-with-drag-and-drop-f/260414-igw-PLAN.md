---
id: 260414-igw
type: quick
title: Import JSON feature with drag-and-drop dialog
files_modified:
  - vite.config.ts
  - src/test-setup.ts
  - src/components/ImportDialog.tsx
  - src/components/ImportDialog.test.tsx
  - src/components/Toolbar.tsx
  - src/App.tsx
autonomous: true
must_haves:
  truths:
    - "Import JSON button visible in toolbar"
    - "Clicking Import JSON opens a modal dialog"
    - "User can drag-and-drop a .json file onto the dialog to import"
    - "User can click a file-select button to browse and import a .json file"
    - "Invalid JSON shows an error message in the dialog"
    - "Escape key or overlay click closes the dialog"
    - "Imported nodes and edges appear on canvas with correct data"
  artifacts:
    - path: "src/components/ImportDialog.tsx"
      provides: "Modal dialog with DnD zone and file select"
    - path: "src/components/ImportDialog.test.tsx"
      provides: "6 test cases for ImportDialog behavior"
    - path: "src/test-setup.ts"
      provides: "Testing library DOM matchers setup"
  key_links:
    - from: "src/components/Toolbar.tsx"
      to: "src/App.tsx"
      via: "onImportJson callback prop"
    - from: "src/components/ImportDialog.tsx"
      to: "src/lib/graph-utils.ts"
      via: "parseImportJson(rawJson)"
    - from: "src/App.tsx"
      to: "src/components/ImportDialog.tsx"
      via: "showImportDialog state, handleImportFromDialog callback"
---

<objective>
Add an Import JSON feature to the SEO Intelligence toolbar. A button opens a modal dialog where users can drag-and-drop or file-select a .json file to import nodes and edges onto the canvas. Uses TDD approach — tests written first.

Purpose: Complete the import/export round-trip so users can load saved graph configurations.
Output: ImportDialog component with tests, wired into Toolbar and App.
</objective>

<execution_context>
@.claude/skills/fix-pr-comment/SKILL.md
</execution_context>

<context>
@src/App.tsx
@src/components/Toolbar.tsx
@src/lib/graph-utils.ts
@vite.config.ts

<interfaces>
From src/lib/graph-utils.ts:
```typescript
export function parseImportJson(raw: string): {
  nodes: Node<UrlNodeData>[];
  edges: Edge<LinkCountEdgeData>[];
}
// Throws if JSON is malformed or missing required fields (nodes/edges arrays, urlTemplate, pageCount)
```

From src/components/Toolbar.tsx:
```typescript
interface ToolbarProps {
  onAddNode: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  isEmpty: boolean;
}
```

From src/App.tsx (AppNodeData):
```typescript
interface AppNodeData extends UrlNodeData {
  onUpdate: (id: string, data: Partial<UrlNodeData>) => void;
  scoreTier?: ScoreTier;
  isWeak?: boolean;
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install test deps, configure jsdom, write failing tests (TDD RED)</name>
  <files>package.json, vite.config.ts, src/test-setup.ts, src/components/ImportDialog.test.tsx</files>
  <behavior>
    - Test 1: renders nothing when open=false
    - Test 2: renders dialog when open=true (dialog heading, DnD zone, file select button visible)
    - Test 3: clicking close button (X) calls onClose
    - Test 4: dropping a valid .json file onto DnD zone calls onImport with parsed nodes and edges
    - Test 5: dropping an invalid .json file shows error message in dialog
    - Test 6: clicking file select button and choosing a file calls onImport with parsed nodes and edges
  </behavior>
  <action>
    1. Install test dependencies:
       `npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`

    2. Update `vite.config.ts` test section — change environment from 'node' to 'jsdom' and add setupFiles:
       ```
       test: {
         globals: true,
         environment: 'jsdom',
         setupFiles: ['./src/test-setup.ts'],
       }
       ```

    3. Create `src/test-setup.ts`:
       ```typescript
       import '@testing-library/jest-dom';
       ```

    4. Create `src/components/ImportDialog.test.tsx` with these 6 tests:

       - Use `render()` from @testing-library/react, `screen`, `fireEvent`, `waitFor`.
       - Import `ImportDialog` from './ImportDialog' (will not exist yet — tests should fail).
       - Props shape: `{ open: boolean; onClose: () => void; onImport: (nodes: Node[], edges: Edge[]) => void }`.
       - Test "renders nothing when open=false": render with open=false, expect `screen.queryByRole('dialog')` to be null.
       - Test "renders dialog when open=true": render with open=true, expect heading "Import JSON", a DnD zone with text containing "Drag & drop", and a button with text "Browse files".
       - Test "close button calls onClose": render open=true, click the button with accessible name close (or aria-label="Close"), expect onClose mock called once.
       - Test "valid file drop calls onImport": create a valid JSON File (`{"nodes":[{"id":"n1","urlTemplate":"/test","pageCount":1,"x":0,"y":0}],"edges":[]}`), fire `drop` event on the DnD zone (role="button" or data-testid="dropzone"), await onImport to be called with arrays containing the parsed node and empty edges.
       - Test "invalid JSON drop shows error": drop a file with content `{bad json}`, await `screen.findByText(/invalid/i)` to appear.
       - Test "file select calls onImport": find the hidden file input, fire change event with a valid JSON file, await onImport called.

    5. Run `npx vitest run --reporter=verbose` — ALL 6 tests should FAIL (RED) because ImportDialog.tsx does not exist yet. This confirms the test harness works and tests are properly structured.

    IMPORTANT: Do NOT create ImportDialog.tsx in this task. Tests must fail.
  </action>
  <verify>
    <automated>cd /Users/leochiu.chiu/Desktop/seo-intelligence && npx vitest run src/components/ImportDialog.test.tsx 2>&1 | tail -20</automated>
    Expect: 6 failing tests (cannot find module ImportDialog or similar). Zero passes.
  </verify>
  <done>6 test cases written and confirmed failing. Test infrastructure (jsdom, testing-library) configured and working.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement ImportDialog component (TDD GREEN)</name>
  <files>src/components/ImportDialog.tsx</files>
  <action>
    Create `src/components/ImportDialog.tsx`:

    ```typescript
    import { useState, useRef, useEffect, useCallback } from 'react';
    import { X, Upload, FileUp } from 'lucide-react';
    import { parseImportJson } from '../lib/graph-utils';
    import type { Node, Edge } from 'reactflow';
    import type { UrlNodeData, LinkCountEdgeData } from '../lib/graph-utils';
    ```

    Props interface:
    ```typescript
    interface ImportDialogProps {
      open: boolean;
      onClose: () => void;
      onImport: (nodes: Node<UrlNodeData>[], edges: Edge<LinkCountEdgeData>[]) => void;
    }
    ```

    Component structure:
    - If `!open`, return null.
    - Render a fixed overlay (inset-0, bg-black/40, z-50) that calls `onClose` on click.
    - Centered card (bg-white, rounded-xl, shadow-lg, max-w-md, w-full, mx-4) with `onClick={e => e.stopPropagation()}` to prevent overlay close.
    - Add `role="dialog"` and `aria-modal="true"` on the card.
    - Header: h2 "Import JSON" + X button with `aria-label="Close"`.
    - DnD zone: `data-testid="dropzone"`, dashed border (border-2 border-dashed border-border), rounded-lg, p-8, text-center. Icon: `<Upload />`. Text: "Drag & drop a .json file here". On dragover: `e.preventDefault()`, change border to `border-pink` and bg to `bg-pink/5`. On dragleave: revert. On drop: read file, parse with `parseImportJson`, call `onImport`, call `onClose`. Use `useState<boolean>` for `isDragOver`.
    - Separator: "or" text with horizontal lines on both sides (flex items-center gap-3, hr flex-1).
    - File select: button "Browse files" with `<FileUp />` icon. Styled like Toolbar secondary buttons. Clicks a hidden `<input type="file" accept=".json" />` via ref. On change: read selected file, parse, call onImport, call onClose.
    - Error display: if `error` state is set, show a red text below DnD zone (`text-sm text-red-500 mt-2`). Clear error on new drag/file select attempt.
    - Escape key listener: `useEffect` with keydown handler that calls `onClose` when `event.key === 'Escape'`. Cleanup on unmount. Only active when `open` is true.

    File reading helper (internal to component):
    ```typescript
    const handleFile = useCallback((file: File) => {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { nodes, edges } = parseImportJson(e.target?.result as string);
          onImport(nodes, edges);
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }, [onImport, onClose]);
    ```

    Use project color vars: `--color-border`, `--color-pink`, `--color-muted-fg`. Use Tailwind classes consistent with Toolbar.tsx styling.

    Run tests after implementation — all 6 should pass (GREEN).
  </action>
  <verify>
    <automated>cd /Users/leochiu.chiu/Desktop/seo-intelligence && npx vitest run src/components/ImportDialog.test.tsx --reporter=verbose 2>&1 | tail -20</automated>
    Expect: 6 passing tests, 0 failures.
  </verify>
  <done>ImportDialog component renders modal with DnD zone, file select, error handling, Escape/overlay close. All 6 tests pass.</done>
</task>

<task type="auto">
  <name>Task 3: Wire ImportDialog into Toolbar and App</name>
  <files>src/components/Toolbar.tsx, src/App.tsx</files>
  <action>
    **Toolbar.tsx changes:**
    1. Add `Upload` to lucide-react imports (alongside existing `Plus`, `Download`).
    2. Add `onImportJson: () => void` to `ToolbarProps` interface.
    3. Add Import JSON button BEFORE the Export JSON button in the button group:
       ```tsx
       <button
         onClick={onImportJson}
         className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface transition-colors"
       >
         <Upload size={14} />
         Import JSON
       </button>
       ```
       Note: No `disabled` state — import is always available (even on empty canvas, you can import).
    4. Destructure `onImportJson` from props.

    **App.tsx changes:**
    1. Add import: `import { ImportDialog } from './components/ImportDialog';`
    2. In `AppInner`, add state: `const [showImportDialog, setShowImportDialog] = useState(false);`
    3. Create `handleImportFromDialog` callback:
       ```typescript
       const handleImportFromDialog = useCallback(
         (importedNodes: Node<UrlNodeData>[], importedEdges: Edge<LinkCountEdgeData>[]) => {
           // Wire runtime callbacks into imported data (same pattern as onDrop handler)
           const wiredNodes = importedNodes.map((n) => ({
             ...n,
             data: { ...n.data, onUpdate: onNodeDataUpdate },
           }));
           const wiredEdges = importedEdges.map((edge) => ({
             ...edge,
             markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
             data: { ...edge.data, onLinkCountChange: onEdgeLinkCountChange },
           }));
           setNodes(wiredNodes);
           setEdges(wiredEdges);
         },
         [onNodeDataUpdate, onEdgeLinkCountChange, setNodes, setEdges],
       );
       ```
    4. Pass `onImportJson={() => setShowImportDialog(true)}` to `<Toolbar>`.
    5. Render `<ImportDialog>` at end of return JSX (after the ScoreSidebar closing div, inside the outermost div):
       ```tsx
       <ImportDialog
         open={showImportDialog}
         onClose={() => setShowImportDialog(false)}
         onImport={handleImportFromDialog}
       />
       ```
    6. Add `LinkCountEdgeData` to the graph-utils import if not already there (it IS already imported at line 32).

    **Verify the build compiles cleanly** with `npx tsc -b && npx vite build`.
  </action>
  <verify>
    <automated>cd /Users/leochiu.chiu/Desktop/seo-intelligence && npx tsc -b && npx vitest run --reporter=verbose 2>&1 | tail -30</automated>
    Expect: TypeScript compiles with no errors. All tests pass.
  </verify>
  <done>Import JSON button in toolbar opens ImportDialog. Imported nodes/edges wired with runtime callbacks and rendered on canvas. Build passes. All tests green.</done>
</task>

</tasks>

<verification>
1. `npx tsc -b` — zero type errors
2. `npx vitest run` — all tests pass (including ImportDialog 6 tests)
3. `npx vite build` — production build succeeds
4. Manual: click Import JSON in toolbar, dialog opens with DnD zone and Browse button, Escape closes it, dropping a valid export JSON loads the graph
</verification>

<success_criteria>
- Import JSON button visible in top-right toolbar between Add Node and Export JSON
- Dialog opens on click with drag-and-drop zone and file select button
- Valid .json file (from Export JSON) imports successfully, nodes/edges appear on canvas
- Invalid JSON shows error message in dialog
- Escape key and overlay click close the dialog
- All 6 ImportDialog tests pass
- TypeScript and build pass cleanly
</success_criteria>
