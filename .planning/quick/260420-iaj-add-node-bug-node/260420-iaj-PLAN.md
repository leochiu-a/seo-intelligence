---
phase: quick-260420-iaj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/web/src/lib/graph-utils.ts
  - packages/web/src/lib/graph-utils.test.ts
  - packages/web/src/App.tsx
autonomous: false
requirements:
  - BUG-ADD-NODE-01
must_haves:
  truths:
    - "Clicking Add Node after reload inserts a new node without moving existing nodes"
    - "The new node appears with a unique id that does not collide with any existing node id"
    - "Dragging a URL Node from the sidebar onto a restored graph does not reshuffle positions"
    - "Creating/cloning a scenario and then adding a node works without collisions"
  artifacts:
    - path: "packages/web/src/lib/graph-utils.ts"
      provides: "createDefaultNode + ID generator seeded from existing nodes"
      contains: "syncNodeIdCounter"
    - path: "packages/web/src/App.tsx"
      provides: "Seeds the id counter after restoring/switching/importing a graph"
      contains: "syncNodeIdCounter"
    - path: "packages/web/src/lib/graph-utils.test.ts"
      provides: "Regression tests proving no id collision after restore"
      contains: "syncNodeIdCounter"
  key_links:
    - from: "packages/web/src/App.tsx (restore useEffect)"
      to: "syncNodeIdCounter(restoredNodes)"
      via: "called before/after setNodes(wiredNodes) on mount"
      pattern: "syncNodeIdCounter\\("
    - from: "packages/web/src/hooks/useScenarioHandlers.ts (switch/import)"
      to: "syncNodeIdCounter(wiredNodes)"
      via: "called when loading a different scenario or imported graph"
      pattern: "syncNodeIdCounter\\("
---

<objective>
Fix the "Add Node explodes the graph" bug. Adding a new node after a page reload currently causes every node in the canvas to jump/reposition chaotically. Root cause: `nodeIdCounter` in `packages/web/src/lib/graph-utils.ts` is a module-level counter that starts at 0 on every page load, while the graph is restored from localStorage carrying ids like `node-1`, `node-2`, .... The first `addNode()` call then emits `node-1`, which collides with an existing node — React Flow applies the "change" to whichever node it matches first, and the spread/ordering of `nds.concat(...)` plus React Flow's internal reconciliation produces the cascading layout chaos the user reported.

Fix strategy: seed the counter from the restored nodes so new ids are always greater than any existing id. Also harden `createDefaultNode` to loop forward if a collision would still occur (defence in depth for import/scenario-switch paths).

Purpose: Make Add Node usable again after reload/import/scenario switch — the #1 way users interact with the canvas.
Output: A seeded `nodeIdCounter` with `syncNodeIdCounter(nodes)`, wired into App restore + scenario handlers + import, plus regression tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@packages/web/src/lib/graph-utils.ts
@packages/web/src/hooks/useNodeCallbacks.ts
@packages/web/src/hooks/useCanvasHandlers.ts
@packages/web/src/hooks/useScenarioHandlers.ts
@packages/web/src/App.tsx
@packages/web/src/lib/graph-utils.test.ts

<interfaces>
<!-- Current surface area (before fix) -->

From packages/web/src/lib/graph-utils.ts:
```ts
let nodeIdCounter = 0;
export function resetNodeIdCounter(): void;
export function createDefaultNode(position: { x: number; y: number }): Node<UrlNodeData>;
```

From packages/web/src/hooks/useNodeCallbacks.ts:
```ts
const addNode = useCallback((position) => {
  const newNode = createDefaultNode(position);
  setNodes((nds) => nds.concat({ ...newNode, data: { ... } }));
}, [...]);
```

From packages/web/src/App.tsx (restore effect, runs once on mount):
```tsx
useEffect(() => {
  if (activeScenario.nodes.length === 0 && activeScenario.edges.length === 0) return;
  const { wiredNodes, wiredEdges } = wireCallbacks(activeScenario.nodes, activeScenario.edges);
  setNodes(wiredNodes);
  setEdges(wiredEdges);
}, []);
```

From packages/web/src/hooks/useScenarioHandlers.ts: handlers for switch/create/delete/import that call `setNodes(wiredNodes)`.
</interfaces>

<root_cause_notes>
- `nodeIdCounter` is module-scope and starts at 0 each page load.
- `createDefaultNode` returns `node-${++counter}`.
- Restored/imported nodes keep their serialized ids (`node-1`, `node-2`, ...).
- First post-restore Add Node therefore emits a duplicate id.
- React Flow does NOT throw on duplicate ids; it reuses the existing internal node record for that id, which bleeds the new position onto the existing node and causes the cascading "everything moved" visual. `nds.concat(newNode)` also appends a second entry with the same id, further confusing React Flow's diffing.
</root_cause_notes>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Seed node id counter from existing nodes + collision-proof createDefaultNode</name>
  <files>
    packages/web/src/lib/graph-utils.ts,
    packages/web/src/lib/graph-utils.test.ts
  </files>
  <behavior>
    Tests to add in `graph-utils.test.ts` (under a new `describe("syncNodeIdCounter")` block and extend `describe("createDefaultNode")`):
    - `syncNodeIdCounter([])` leaves the counter at 0 — next `createDefaultNode` yields `node-1`.
    - `syncNodeIdCounter([{ id: "node-5" }, { id: "node-2" }])` advances counter so next `createDefaultNode` yields `node-6`.
    - `syncNodeIdCounter` ignores ids that do not match the `node-\d+` pattern (e.g. `custom-abc`) — counter unchanged.
    - `syncNodeIdCounter` NEVER lowers the counter (calling it with fewer nodes after a higher one must not reset progress).
    - `createDefaultNode` loops forward if the generated id already exists in the provided existing-id set (new optional `existingIds?: Set<string>` parameter OR post-sync collision guard). Must be backward compatible — calls without a set still work.
    - Regression: after `syncNodeIdCounter([{ id: "node-1" }])`, calling `createDefaultNode({x:0,y:0})` returns id `node-2` (NOT `node-1`).
    - `resetNodeIdCounter()` still zeroes the counter (existing test must keep passing).
  </behavior>
  <action>
    In `packages/web/src/lib/graph-utils.ts`:

    1. Add and export a new function:
       ```ts
       /**
        * Advances the internal id counter so future createDefaultNode() calls
        * produce ids strictly greater than every `node-<N>` id already present.
        * Safe to call repeatedly (monotonically non-decreasing).
        * Non-matching ids (e.g. "custom-abc") are ignored.
        */
       export function syncNodeIdCounter(
         nodes: ReadonlyArray<{ id: string }>,
       ): void {
         let max = nodeIdCounter;
         for (const n of nodes) {
           const m = /^node-(\d+)$/.exec(n.id);
           if (m) {
             const v = Number(m[1]);
             if (Number.isFinite(v) && v > max) max = v;
           }
         }
         nodeIdCounter = max;
       }
       ```

    2. Harden `createDefaultNode` — do NOT change its signature's first argument, but accept an optional second argument so `addNode` callers can also pass live nodes as extra safety:
       ```ts
       export function createDefaultNode(
         position: { x: number; y: number },
         existingNodes?: ReadonlyArray<{ id: string }>,
       ): Node<UrlNodeData> {
         if (existingNodes && existingNodes.length) syncNodeIdCounter(existingNodes);
         nodeIdCounter += 1;
         return { id: `node-${nodeIdCounter}`, /* ...unchanged... */ };
       }
       ```

    3. Keep `resetNodeIdCounter` and current default behaviour intact so existing tests pass.

    In `packages/web/src/lib/graph-utils.test.ts`:
    - Import `syncNodeIdCounter`.
    - Add `describe("syncNodeIdCounter", ...)` with the tests listed in <behavior>.
    - Extend `describe("createDefaultNode")` with the "collision-proof after sync" test.
    - All new tests must call `resetNodeIdCounter()` in a `beforeEach` for determinism.

    Why a separate sync function AND an optional param on createDefaultNode: sync covers the one-shot restore/switch/import paths cleanly; the optional param makes the single-node Add Node path defensive against any future path that forgets to call sync.
  </action>
  <verify>
    <automated>pnpm --filter @seo-intelligence/web test -- graph-utils.test.ts</automated>
  </verify>
  <done>
    - `syncNodeIdCounter` exported and tested (all new tests green).
    - Existing `createDefaultNode` + `resetNodeIdCounter` tests still green.
    - `pnpm --filter @seo-intelligence/web type-check` passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire syncNodeIdCounter into every graph-load path in App.tsx + addNode</name>
  <files>
    packages/web/src/App.tsx,
    packages/web/src/hooks/useNodeCallbacks.ts,
    packages/web/src/hooks/useScenarioHandlers.ts
  </files>
  <action>
    Call `syncNodeIdCounter` at every point where the nodes array is replaced with a restored/imported/switched set, and pass live nodes into `createDefaultNode` for belt-and-braces safety.

    1. In `packages/web/src/App.tsx` restore effect (around line 227-232):
       ```tsx
       useEffect(() => {
         if (activeScenario.nodes.length === 0 && activeScenario.edges.length === 0) return;
         const { wiredNodes, wiredEdges } = wireCallbacks(activeScenario.nodes, activeScenario.edges);
         syncNodeIdCounter(wiredNodes);   // ADD
         setNodes(wiredNodes);
         setEdges(wiredEdges);
       }, []);
       ```
       Import `syncNodeIdCounter` from `./lib/graph-utils`.

    2. In `packages/web/src/hooks/useScenarioHandlers.ts`, find every place that calls `setNodes(wiredNodes)` (switch scenario, create scenario with clone, import-from-dialog). Before each `setNodes`, call `syncNodeIdCounter(wiredNodes)`. Import from `../lib/graph-utils`. If a path clears the graph (`setNodes([])`), leave it alone — an empty graph is fine (counter just keeps its current monotonic value, which is still correct).

    3. In `packages/web/src/hooks/useNodeCallbacks.ts`, update `addNode` to pass the current nodes list as a defensive extra:
       - Either (a) read nodes from a new arg plumbed through `useNodeCallbacks` args, or (b) simpler: inside `setNodes((nds) => { ... })`, call `createDefaultNode(position, nds)` so the existing-ids set is built from the live `nds` closure — this is the preferred option because it needs no signature change.
       Example:
       ```ts
       const addNode = useCallback((position) => {
         setNodes((nds) => {
           const newNode = createDefaultNode(position, nds);
           return nds.concat({ ...newNode, data: { ...newNode.data, onUpdate: onNodeDataUpdate, onRootToggle, onZIndexChange: onNodeZIndexChange } });
         });
       }, [onNodeDataUpdate, onRootToggle, onNodeZIndexChange, setNodes]);
       ```

    4. Do NOT touch the `drop JSON file` path in `useCanvasHandlers.onDrop`: it already funnels through `wireCallbacks` + `setNodes` via the same mechanism (if it does not, also add a `syncNodeIdCounter(wiredNodes)` call directly before `setNodes(wiredNodes)` in that branch of `onDrop`). Check the file — if yes, add it there too.

    Keep every other piece of behaviour unchanged. No formatting churn on untouched lines.
  </action>
  <verify>
    <automated>pnpm --filter @seo-intelligence/web test && pnpm --filter @seo-intelligence/web type-check</automated>
  </verify>
  <done>
    - `syncNodeIdCounter` is called before `setNodes(wiredNodes)` in: App.tsx restore effect, every branch of useScenarioHandlers, and the JSON-drop branch of useCanvasHandlers.
    - `addNode` uses `createDefaultNode(position, nds)` so even without sync it cannot emit a colliding id.
    - Full `pnpm --filter @seo-intelligence/web test` suite passes (including the 6 pre-existing broken tests from backlog 999.12 if they were unrelated — do NOT attempt to fix those here; only our new tests + regressions must be green).
    - `pnpm --filter @seo-intelligence/web type-check` passes.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Add Node is now collision-safe:
    - `syncNodeIdCounter` seeds the id generator from any restored/imported/switched graph.
    - `createDefaultNode` accepts an optional `existingNodes` set and will skip past any conflicting id.
    - `addNode` passes live nodes so duplicates are impossible even without explicit sync.
    - Wired into: App.tsx restore effect, useScenarioHandlers switch/create/import paths, useCanvasHandlers JSON-drop, and useNodeCallbacks.addNode.
  </what-built>
  <how-to-verify>
    Run `pnpm dev` and, in the browser:
    1. Seed a canvas with 3+ nodes, connect them, then reload the page.
    2. Click the "Add Node" toolbar button. Expected: a new node appears near canvas center; every existing node stays in place. No graph "explosion."
    3. Drag a URL Node chip from the sidebar onto the canvas. Expected: node lands at the drop position; nothing else moves.
    4. Switch to a different scenario, then Add Node. Expected: no collision, no jump.
    5. Use Import JSON to load a graph whose highest id is `node-10`. Then Add Node. Expected: new node gets id `node-11` (you can verify by exporting JSON or opening DevTools).
    6. Clear Canvas, Add Node. Expected: first new node after clear still has a unique id (ok if it's `node-<N+1>` not `node-1`; non-regression on monotonic counter).
  </how-to-verify>
  <resume-signal>Type "approved" or describe any remaining positioning/id issues.</resume-signal>
</task>

</tasks>

<verification>
- Unit tests: `pnpm --filter @seo-intelligence/web test -- graph-utils` green; new `syncNodeIdCounter` tests green.
- Full suite: `pnpm --filter @seo-intelligence/web test` does not regress (pre-existing failures tracked by backlog 999.12 are out of scope; new code must not introduce any new failures).
- Type-check: `pnpm --filter @seo-intelligence/web type-check` passes.
- Manual: the 6 browser checks in the checkpoint above all pass.
</verification>

<success_criteria>
- Clicking Add Node after a reload inserts one new node without moving any existing node.
- No duplicate node ids are ever emitted, regardless of reload / import / scenario switch / JSON drop order.
- All existing tests in `graph-utils.test.ts` and `useNodeCallbacks.test.ts` still pass.
- New regression tests in `graph-utils.test.ts` cover: sync-from-existing-ids, sync-never-decreases, sync-ignores-non-matching, createDefaultNode-skips-collisions.
</success_criteria>

<output>
After completion, create `.planning/quick/260420-iaj-add-node-bug-node/260420-iaj-SUMMARY.md` summarizing:
- Root cause (`nodeIdCounter` reset on reload → id collision on first Add Node).
- Fix surface (new `syncNodeIdCounter`, hardened `createDefaultNode`, wiring in App.tsx + scenario/canvas handlers + addNode).
- Tests added.
- Commit hash(es).
</output>
