---
phase: 260419-ppw-refactor-app-tsx-phase-2
plan: 01
type: tdd
wave: 1
depends_on: []
files_modified:
  - packages/web/src/lib/serialize-graph.ts
  - packages/web/src/lib/serialize-graph.test.ts
  - packages/web/src/hooks/useNodeCallbacks.ts
  - packages/web/src/hooks/useNodeCallbacks.test.ts
  - packages/web/src/hooks/useScenarioHandlers.ts
  - packages/web/src/hooks/useScenarioHandlers.test.ts
  - packages/web/src/hooks/useCanvasHandlers.ts
  - packages/web/src/hooks/useCanvasHandlers.test.ts
  - packages/web/src/App.tsx
autonomous: true
requirements:
  - REFACTOR-P2-01  # Extract serializeGraph to lib
  - REFACTOR-P2-02  # Extract useNodeCallbacks hook
  - REFACTOR-P2-03  # Extract useScenarioHandlers hook
  - REFACTOR-P2-04  # Extract useCanvasHandlers hook
  - REFACTOR-P2-05  # App.tsx < 400 lines

must_haves:
  truths:
    - "serializeGraph is importable from lib/serialize-graph and returns the same shape as before"
    - "useNodeCallbacks returns the six callbacks with stable references when inputs don't change"
    - "useScenarioHandlers returns four handlers that serialize, switch, wire, and persist correctly"
    - "useCanvasHandlers returns onDragOver/onDrop/onAddNode/onConnect with original behavior"
    - "App.tsx is under 400 lines after all four extractions"
    - "All existing tests still pass; new tests cover each extracted unit"
    - "TypeScript compiles with no errors (pnpm tsc --noEmit clean)"
  artifacts:
    - path: "packages/web/src/lib/serialize-graph.ts"
      provides: "Pure serializeGraph function + re-exported AppNodeData/Placement types"
      exports: ["serializeGraph"]
    - path: "packages/web/src/lib/serialize-graph.test.ts"
      provides: "Unit tests for serializeGraph shape + runtime-field stripping"
    - path: "packages/web/src/hooks/useNodeCallbacks.ts"
      provides: "Hook returning onNodeDataUpdate, onNodeZIndexChange, onRootToggle, addNode, onEdgeLinkCountChange, wireCallbacks"
      exports: ["useNodeCallbacks"]
    - path: "packages/web/src/hooks/useNodeCallbacks.test.ts"
      provides: "Tests for each callback's setNodes/setEdges interaction"
    - path: "packages/web/src/hooks/useScenarioHandlers.ts"
      provides: "Hook returning handleSwitchScenario, handleCreateScenario, handleDeleteScenario, handleImportFromDialog"
      exports: ["useScenarioHandlers"]
    - path: "packages/web/src/hooks/useScenarioHandlers.test.ts"
      provides: "Tests for scenario lifecycle + import wiring"
    - path: "packages/web/src/hooks/useCanvasHandlers.ts"
      provides: "Hook returning onDragOver, onDrop, onAddNode, onConnect"
      exports: ["useCanvasHandlers"]
    - path: "packages/web/src/hooks/useCanvasHandlers.test.ts"
      provides: "Tests for drag/drop JSON import, sidebar node drop, center add, and handle picking on connect"
    - path: "packages/web/src/App.tsx"
      provides: "Thin composition layer wiring all four extracted units"
      max_lines: 400
  key_links:
    - from: "packages/web/src/App.tsx"
      to: "packages/web/src/lib/serialize-graph.ts"
      via: "import { serializeGraph } from './lib/serialize-graph'"
      pattern: "from\\s+['\"]\\./lib/serialize-graph['\"]"
    - from: "packages/web/src/App.tsx"
      to: "packages/web/src/hooks/useNodeCallbacks.ts"
      via: "import { useNodeCallbacks } from './hooks/useNodeCallbacks'"
      pattern: "useNodeCallbacks\\("
    - from: "packages/web/src/App.tsx"
      to: "packages/web/src/hooks/useScenarioHandlers.ts"
      via: "import { useScenarioHandlers } from './hooks/useScenarioHandlers'"
      pattern: "useScenarioHandlers\\("
    - from: "packages/web/src/App.tsx"
      to: "packages/web/src/hooks/useCanvasHandlers.ts"
      via: "import { useCanvasHandlers } from './hooks/useCanvasHandlers'"
      pattern: "useCanvasHandlers\\("
    - from: "packages/web/src/hooks/useScenarioHandlers.ts"
      to: "wireCallbacks from useNodeCallbacks"
      via: "prop passed from App.tsx"
      pattern: "wireCallbacks"
    - from: "packages/web/src/hooks/useCanvasHandlers.ts"
      to: "addNode + edge/node callbacks from useNodeCallbacks"
      via: "props passed from App.tsx"
      pattern: "addNode|onNodeDataUpdate|onRootToggle|onNodeZIndexChange|onEdgeLinkCountChange"
---

<objective>
Phase 2 of App.tsx refactor: reduce App.tsx from 726 → <400 lines by extracting one pure lib util and three domain-focused hooks, using TDD (RED → GREEN → REFACTOR) for each extraction.

Purpose: App.tsx currently mixes graph serialization, node/edge callback wiring, scenario lifecycle, and canvas drag/drop/connect logic. Splitting these lets each concern be tested in isolation, shrinks App.tsx to composition-only, and matches the extraction pattern set by phase 1 (useGraphAnalytics / useHighlightedNodes / useDialogState).

Output:
- `packages/web/src/lib/serialize-graph.ts` + test
- `packages/web/src/hooks/useNodeCallbacks.ts` + test
- `packages/web/src/hooks/useScenarioHandlers.ts` + test
- `packages/web/src/hooks/useCanvasHandlers.ts` + test
- `packages/web/src/App.tsx` reduced to <400 lines, behavior-identical
</objective>

<context>
@packages/web/src/App.tsx
@packages/web/src/hooks/useScenarios.ts
@packages/web/src/hooks/useGraphAnalytics.ts
@packages/web/src/lib/graph-utils.ts

<interfaces>
<!-- Key contracts extracted from the codebase. Use these directly — no exploration needed. -->

From packages/web/src/lib/graph-utils.ts:
```ts
export interface Placement { id: string; name: string; linkCount: number; }
export type UrlNodeData = {
  urlTemplate: string;
  pageCount: number;
  isGlobal?: boolean;
  placements?: Placement[];
  isRoot?: boolean;
  tags?: string[];
};
export type LinkCountEdgeData = {
  linkCount: number;
  onLinkCountChange?: (edgeId: string, linkCount: number) => void;
};
export function createDefaultNode(position: { x: number; y: number }): Node<UrlNodeData>;
export function updateNodeData(nodes, nodeId, newData): Node<UrlNodeData>[];
export function updateEdgeLinkCount(edges, edgeId, linkCount): Edge<LinkCountEdgeData>[];
export function parseImportJson(raw: string): { nodes, edges };
export function getClosestHandleIds(src, tgt): { sourceHandle, targetHandle };
```

From packages/web/src/App.tsx (must remain importable from here):
```ts
export type AppNodeData = UrlNodeData & {
  onUpdate: (id: string, data: Partial<UrlNodeData>) => void;
  onRootToggle: (id: string) => void;
  onZIndexChange: (id: string, zIndex: number) => void;
  scoreTier?: ScoreTier;
  isWeak?: boolean;
  isOrphan?: boolean;
  isUnreachable?: boolean;
  crawlDepth?: number;
  outboundCount?: number;
  isOverLinked?: boolean;
  isDimmed?: boolean;
};
```

From packages/web/src/hooks/useScenarios.ts:
```ts
export interface UseScenariosResult {
  store: ScenariosStore;
  createScenario(mode: "blank" | "clone", nodes, edges): ScenarioRecord;
  switchScenario(targetId, nodes, edges): ScenarioRecord | null;
  renameScenario(id, name): void;
  deleteScenario(id): ScenarioRecord | null;
  persist(): void;
  updateActiveGraph(serializedNodes, serializedEdges): void;
}
```

Contracts this plan introduces (target signatures — executor implements against these):

```ts
// packages/web/src/lib/serialize-graph.ts
import type { Node, Edge } from "@xyflow/react";
import type { AppNodeData } from "../App";
import type { Placement } from "./graph-utils";

export interface SerializedGraphNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    urlTemplate: string;
    pageCount: number;
    isGlobal?: boolean;
    placements?: Placement[];
    isRoot?: boolean;
    tags?: string[];
  };
}
export interface SerializedGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  markerEnd?: unknown;
  data: { linkCount: number };
}
export function serializeGraph(
  nodes: Node<AppNodeData>[],
  edges: Edge[],
): { nodes: SerializedGraphNode[]; edges: SerializedGraphEdge[] };
```

```ts
// packages/web/src/hooks/useNodeCallbacks.ts
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { AppNodeData } from "../App";
import type { LinkCountEdgeData, Placement } from "../lib/graph-utils";

export interface UseNodeCallbacksArgs {
  setNodes: Dispatch<SetStateAction<Node<AppNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge<LinkCountEdgeData>[]>>;
}
export interface UseNodeCallbacksResult {
  onNodeDataUpdate: (nodeId: string, newData: Partial<AppNodeData>) => void;
  onNodeZIndexChange: (nodeId: string, zIndex: number) => void;
  onRootToggle: (nodeId: string) => void;
  addNode: (position: { x: number; y: number }) => void;
  onEdgeLinkCountChange: (edgeId: string, linkCount: number) => void;
  wireCallbacks: (
    serializedNodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: {
      urlTemplate: string; pageCount: number; isGlobal?: boolean; placements?: Placement[]; isRoot?: boolean; tags?: string[];
    } }>,
    serializedEdges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null;
      targetHandle?: string | null; type?: string; markerEnd?: unknown; data: { linkCount: number } }>,
  ) => { wiredNodes: Node<AppNodeData>[]; wiredEdges: Edge<LinkCountEdgeData>[] };
}
export function useNodeCallbacks(args: UseNodeCallbacksArgs): UseNodeCallbacksResult;
```

```ts
// packages/web/src/hooks/useScenarioHandlers.ts
import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { AppNodeData } from "../App";
import type { UrlNodeData, LinkCountEdgeData } from "../lib/graph-utils";
import type { UseScenariosResult } from "./useScenarios";

export interface UseScenarioHandlersArgs {
  store: UseScenariosResult["store"];
  nodes: Node<AppNodeData>[];
  edges: Edge<LinkCountEdgeData>[];
  setNodes: Dispatch<SetStateAction<Node<AppNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge<LinkCountEdgeData>[]>>;
  switchScenario: UseScenariosResult["switchScenario"];
  createScenario: UseScenariosResult["createScenario"];
  deleteScenario: UseScenariosResult["deleteScenario"];
  persist: UseScenariosResult["persist"];
  wireCallbacks: ReturnType<typeof import("./useNodeCallbacks").useNodeCallbacks>["wireCallbacks"];
  onNodeDataUpdate: (id: string, data: Partial<UrlNodeData>) => void;
  onRootToggle: (id: string) => void;
  onNodeZIndexChange: (id: string, z: number) => void;
  onEdgeLinkCountChange: (id: string, c: number) => void;
  isSwitchingRef: MutableRefObject<boolean>;
}
export interface UseScenarioHandlersResult {
  handleSwitchScenario: (targetId: string) => void;
  handleCreateScenario: (mode: "blank" | "clone") => void;
  handleDeleteScenario: (id: string) => void;
  handleImportFromDialog: (nodes: Node<UrlNodeData>[], edges: Edge<LinkCountEdgeData>[]) => void;
}
export function useScenarioHandlers(args: UseScenarioHandlersArgs): UseScenarioHandlersResult;
```

```ts
// packages/web/src/hooks/useCanvasHandlers.ts
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge, Connection, ReactFlowInstance } from "@xyflow/react";
import type { AppNodeData } from "../App";
import type { UrlNodeData, LinkCountEdgeData } from "../lib/graph-utils";

export interface UseCanvasHandlersArgs {
  reactFlowInstance: ReactFlowInstance<Node<AppNodeData>, Edge<LinkCountEdgeData>> | null;
  addNode: (pos: { x: number; y: number }) => void;
  nodes: Node<AppNodeData>[];
  setNodes: Dispatch<SetStateAction<Node<AppNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge<LinkCountEdgeData>[]>>;
  onNodeDataUpdate: (id: string, data: Partial<UrlNodeData>) => void;
  onRootToggle: (id: string) => void;
  onNodeZIndexChange: (id: string, z: number) => void;
  onEdgeLinkCountChange: (id: string, c: number) => void;
}
export interface UseCanvasHandlersResult {
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAddNode: () => void;
  onConnect: (c: Connection) => void;
}
export function useCanvasHandlers(args: UseCanvasHandlersArgs): UseCanvasHandlersResult;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extract serializeGraph to lib/serialize-graph.ts (RED → GREEN → REFACTOR)</name>
  <files>
    packages/web/src/lib/serialize-graph.ts (new),
    packages/web/src/lib/serialize-graph.test.ts (new),
    packages/web/src/App.tsx (modify — remove inline serializeGraph, import from new lib)
  </files>
  <behavior>
    serializeGraph(nodes, edges) must:
    - Test 1: Strip runtime-only fields (onUpdate, onRootToggle, onZIndexChange, scoreTier, isWeak, isOrphan, isUnreachable, crawlDepth, outboundCount, isOverLinked, isDimmed) from node.data, keeping only {urlTemplate, pageCount, isGlobal?, placements?, isRoot?, tags?}.
    - Test 2: Omit optional fields when falsy (isGlobal=false/undefined → absent, placements=[] → absent, isRoot=false/undefined → absent, tags=[] → absent) — mirrors current conditional spread.
    - Test 3: Include optional fields when truthy (isGlobal=true present, placements=[{...}] present, isRoot=true present, tags=["x"] present).
    - Test 4: Pass through node.id, node.type, node.position verbatim.
    - Test 5: Map edges to {id, source, target, sourceHandle, targetHandle, type, markerEnd, data:{linkCount}}, defaulting linkCount to 1 when edge.data.linkCount is undefined.
    - Test 6: Preserve null sourceHandle/targetHandle (don't convert to undefined).
    - Test 7 (integration): Round-trip through serializeGraph → JSON.stringify → JSON.parse produces equivalent object shape (no function refs surviving).
  </behavior>
  <action>
    RED phase:
      1. Create `packages/web/src/lib/serialize-graph.test.ts` with the 7 cases above using vitest `describe`/`it`/`expect`. Import `serializeGraph` from `./serialize-graph` (file does not exist yet → compile error, which counts as RED).
      2. Run `cd packages/web && pnpm test --run src/lib/serialize-graph.test.ts` — MUST fail (module not found).
      3. Commit: `test(web): add failing tests for serializeGraph extraction` (commitlint format, one commit).

    GREEN phase:
      1. Create `packages/web/src/lib/serialize-graph.ts`. Copy the serializeGraph body from App.tsx lines 70–132 verbatim (it is already pure).
      2. Import types: `import type { Node, Edge } from "@xyflow/react"; import type { AppNodeData } from "../App"; import type { Placement } from "./graph-utils";` — note `AppNodeData` lives in App.tsx as an export; keep the dependency direction (lib → App for a type-only import is acceptable short-term because AppNodeData itself extends UrlNodeData from graph-utils; do NOT move AppNodeData yet to avoid scope creep).
      3. Export the `SerializedGraphNode` and `SerializedGraphEdge` interfaces (see <interfaces> block) and export `serializeGraph` with that signature.
      4. In `App.tsx`: delete the inline `serializeGraph` function (lines 70–132 of the old file). Add `import { serializeGraph } from "./lib/serialize-graph";` to the import block near the other lib imports.
      5. Run `cd packages/web && pnpm test --run src/lib/serialize-graph.test.ts` — MUST pass.
      6. Run `cd packages/web && pnpm test --run` to ensure no other tests regressed.
      7. Run `cd packages/web && pnpm tsc --noEmit` — MUST be clean.
      8. Commit: `refactor(web): extract serializeGraph to lib/serialize-graph` (commitlint format).

    REFACTOR phase (only if needed):
      - If circular-import warnings appear for `AppNodeData`, downgrade to `import type` (already recommended above) — this is TS-only and erases at compile.
      - Do NOT extract `AppNodeData` in this task; that is a separate concern.
  </action>
  <verify>
    <automated>cd packages/web && pnpm test --run src/lib/serialize-graph.test.ts && pnpm test --run && pnpm tsc --noEmit</automated>
  </verify>
  <done>
    - `packages/web/src/lib/serialize-graph.ts` exists, exports `serializeGraph` + the two Serialized* interfaces.
    - `packages/web/src/lib/serialize-graph.test.ts` passes all 7 cases.
    - App.tsx no longer defines `serializeGraph`; imports it from the new module.
    - Full `pnpm test --run` still green.
    - `pnpm tsc --noEmit` clean.
    - 2 commits made (test + refactor).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Extract useNodeCallbacks hook (RED → GREEN → REFACTOR)</name>
  <files>
    packages/web/src/hooks/useNodeCallbacks.ts (new),
    packages/web/src/hooks/useNodeCallbacks.test.ts (new),
    packages/web/src/App.tsx (modify — remove onNodeDataUpdate, onNodeZIndexChange, onRootToggle, addNode, onEdgeLinkCountChange, wireCallbacks; call useNodeCallbacks instead)
  </files>
  <behavior>
    useNodeCallbacks({ setNodes, setEdges }) must return 6 stable callbacks:
    - Test 1 (onNodeDataUpdate): Calling `onNodeDataUpdate("n1", { urlTemplate: "/x" })` invokes `setNodes` with an updater that, when run over `[{id:"n1",data:{urlTemplate:"/a",pageCount:1}}]`, produces the node with urlTemplate "/x" and preserves pageCount.
    - Test 2 (onNodeZIndexChange): Calling `onNodeZIndexChange("n1", 5)` makes the setNodes updater set zIndex=5 on the matching node only; unchanged nodes returned by reference.
    - Test 3 (onNodeZIndexChange no-op): If node already has `zIndex === 5`, updater returns the same reference for that node (preserves the "no-op guard" from lines 203–205).
    - Test 4 (onRootToggle): Toggling on a node that wasn't root sets its `isRoot=true` AND clears isRoot from every other node that had it (exclusive-root rule — mirrors lines 211–229).
    - Test 5 (onRootToggle off): Toggling a currently-root node sets isRoot=false on it.
    - Test 6 (addNode): addNode({x:10,y:20}) calls setNodes with an updater that appends a new node whose data includes `onUpdate`, `onRootToggle`, `onZIndexChange` wired to the hook's callbacks, urlTemplate "/page/<id>", pageCount 1 (via createDefaultNode).
    - Test 7 (onEdgeLinkCountChange): Calls setEdges with an updater that applies `updateEdgeLinkCount` from graph-utils.
    - Test 8 (wireCallbacks nodes): Given serialized nodes, returns wiredNodes whose data has onUpdate/onRootToggle/onZIndexChange attached, default type "urlNode" when missing, optional fields (isGlobal/placements/isRoot/tags) preserved only when present.
    - Test 9 (wireCallbacks edges): Given serialized edges, returns wiredEdges with default type "linkCountEdge" when missing, default markerEnd {type: MarkerType.ArrowClosed, color: "#9CA3AF"} when missing, data.linkCount defaulting to 1, and data.onLinkCountChange wired to the hook's onEdgeLinkCountChange.
    - Test 10 (sourceHandle passthrough): wireCallbacks preserves explicit null sourceHandle/targetHandle vs omits them when undefined — mirrors spread pattern at lines 302–303.
    - Test 11 (reference stability): Rerendering the hook with the same setNodes/setEdges returns referentially-equal callbacks (useCallback dependencies correct).
  </behavior>
  <action>
    RED phase:
      1. Create `packages/web/src/hooks/useNodeCallbacks.test.ts` using `@testing-library/react`'s `renderHook` (already a workspace dep — verify with `grep '@testing-library/react' packages/web/package.json`; if missing, use the pattern already used by any existing hook test in the repo — check `packages/web/src/hooks/*.test.ts` first for precedent before adding deps).
      2. For setNodes/setEdges, use `vi.fn()` spies. Capture the updater function passed to the spy and invoke it manually over a fixture array to assert behavior — this isolates the hook from ReactFlow's state machinery.
      3. Write the 11 cases above. Import `useNodeCallbacks` from `./useNodeCallbacks` (does not yet exist → RED).
      4. Run `cd packages/web && pnpm test --run src/hooks/useNodeCallbacks.test.ts` — MUST fail.
      5. Commit: `test(web): add failing tests for useNodeCallbacks hook`.

    GREEN phase:
      1. Create `packages/web/src/hooks/useNodeCallbacks.ts`. Copy the bodies of the 6 functions from App.tsx (lines 186–314) into a single hook. Preserve existing useCallback dependency arrays exactly.
      2. Imports at top:
         `import { useCallback } from "react";`
         `import { MarkerType, type Node, type Edge, type EdgeMarkerType } from "@xyflow/react";`
         `import { createDefaultNode, updateNodeData, updateEdgeLinkCount, type UrlNodeData, type LinkCountEdgeData, type Placement } from "../lib/graph-utils";`
         `import type { AppNodeData } from "../App";`
      3. Export interfaces `UseNodeCallbacksArgs`, `UseNodeCallbacksResult`, and function `useNodeCallbacks` per <interfaces>.
      4. In App.tsx: delete lines 186–314 (6 callbacks) and replace with:
         `const { onNodeDataUpdate, onNodeZIndexChange, onRootToggle, addNode, onEdgeLinkCountChange, wireCallbacks } = useNodeCallbacks({ setNodes, setEdges });`
         Add `import { useNodeCallbacks } from "./hooks/useNodeCallbacks";`.
      5. Run `cd packages/web && pnpm test --run` — MUST be green.
      6. Run `cd packages/web && pnpm tsc --noEmit` — MUST be clean.
      7. Commit: `refactor(web): extract useNodeCallbacks hook from App.tsx`.

    REFACTOR phase (only if needed):
      - If `@testing-library/react` is not available, fall back to direct invocation: call the hook inside a tiny wrapper component and read return value via a ref, OR temporarily bypass by exporting an internal factory function alongside the hook for unit-only consumption. PREFER renderHook if it exists — do not add deps unilaterally.
  </action>
  <verify>
    <automated>cd packages/web && pnpm test --run src/hooks/useNodeCallbacks.test.ts && pnpm test --run && pnpm tsc --noEmit</automated>
  </verify>
  <done>
    - `useNodeCallbacks.ts` exports the hook with the six named returns.
    - `useNodeCallbacks.test.ts` passes all 11 cases.
    - App.tsx no longer defines the 6 callbacks directly; sources them from the hook.
    - App.tsx line count strictly lower than before (expected drop ~120 lines).
    - `pnpm test --run` green; `pnpm tsc --noEmit` clean.
    - 2 commits made (test + refactor).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Extract useScenarioHandlers hook (RED → GREEN → REFACTOR)</name>
  <files>
    packages/web/src/hooks/useScenarioHandlers.ts (new),
    packages/web/src/hooks/useScenarioHandlers.test.ts (new),
    packages/web/src/App.tsx (modify — remove handleSwitchScenario, handleCreateScenario, handleDeleteScenario, handleImportFromDialog; call useScenarioHandlers instead)
  </files>
  <behavior>
    useScenarioHandlers must return 4 handlers with these behaviors:
    - Test 1 (handleSwitchScenario same ID): When `targetId === store.activeScenarioId`, calls nothing — no setNodes/setEdges/persist/switchScenario invocation.
    - Test 2 (handleSwitchScenario different ID): Sets isSwitchingRef.current=true, calls switchScenario(targetId, nodes, edges), pipes result through wireCallbacks, calls setNodes(wiredNodes), setEdges(wiredEdges), persist(). Uses requestAnimationFrame to reset isSwitchingRef.current=false (mock rAF).
    - Test 3 (handleSwitchScenario null target): If switchScenario returns null, early-returns without calling setNodes/setEdges/persist.
    - Test 4 (handleCreateScenario): Sets isSwitchingRef, calls createScenario(mode, nodes, edges), wires result, applies setNodes/setEdges, persist, rAF reset. Tests both mode="blank" and mode="clone".
    - Test 5 (handleDeleteScenario only-one scenario): If deleteScenario returns null (D-03 guard), early-returns; isSwitchingRef NOT touched.
    - Test 6 (handleDeleteScenario normal): deleteScenario returns {nodes, edges}; wireCallbacks + setNodes + setEdges + persist + rAF reset.
    - Test 7 (handleImportFromDialog): Given importedNodes and importedEdges, returns wiredNodes with onUpdate/onRootToggle/onZIndexChange attached, and wiredEdges with markerEnd default + data.linkCount default 1 + onLinkCountChange wired. Calls setNodes + setEdges.
  </behavior>
  <action>
    RED phase:
      1. Create `packages/web/src/hooks/useScenarioHandlers.test.ts` using `renderHook` (same pattern as task 2).
      2. Mock inputs with `vi.fn()` for setNodes/setEdges/switchScenario/createScenario/deleteScenario/persist/wireCallbacks/onNodeDataUpdate/onRootToggle/onNodeZIndexChange/onEdgeLinkCountChange. Use `vi.stubGlobal("requestAnimationFrame", (cb) => cb())` to synchronously flush rAF.
      3. Write the 7 cases. Import `useScenarioHandlers` from `./useScenarioHandlers` (RED — missing).
      4. Run `cd packages/web && pnpm test --run src/hooks/useScenarioHandlers.test.ts` — MUST fail.
      5. Commit: `test(web): add failing tests for useScenarioHandlers hook`.

    GREEN phase:
      1. Create `packages/web/src/hooks/useScenarioHandlers.ts`. Copy the bodies of the 4 handlers from App.tsx (lines 316–397) into a single hook. Preserve existing useCallback dep arrays exactly (they already reference all the props required).
      2. Type the args with `UseScenarioHandlersArgs` per <interfaces>. Import `MarkerType` from `@xyflow/react` and `UrlNodeData`, `LinkCountEdgeData` from `../lib/graph-utils` (handleImportFromDialog needs MarkerType for the default markerEnd).
      3. In App.tsx: delete lines 316–397 and replace with a single call:
         ```
         const { handleSwitchScenario, handleCreateScenario, handleDeleteScenario, handleImportFromDialog } = useScenarioHandlers({
           store, nodes, edges, setNodes, setEdges,
           switchScenario, createScenario, deleteScenario, persist,
           wireCallbacks,
           onNodeDataUpdate, onRootToggle, onNodeZIndexChange, onEdgeLinkCountChange,
           isSwitchingRef,
         });
         ```
         Add `import { useScenarioHandlers } from "./hooks/useScenarioHandlers";`.
      4. Run `cd packages/web && pnpm test --run` — MUST pass.
      5. Run `cd packages/web && pnpm tsc --noEmit` — MUST be clean.
      6. Commit: `refactor(web): extract useScenarioHandlers hook from App.tsx`.

    REFACTOR phase (only if needed):
      - The args object is large (14 fields). That's acceptable here; do NOT try to shrink by wiring useScenarios inside this hook — callers (tests, future contexts) benefit from explicit deps.
  </action>
  <verify>
    <automated>cd packages/web && pnpm test --run src/hooks/useScenarioHandlers.test.ts && pnpm test --run && pnpm tsc --noEmit</automated>
  </verify>
  <done>
    - `useScenarioHandlers.ts` exports the hook returning 4 handlers.
    - `useScenarioHandlers.test.ts` passes all 7 cases.
    - App.tsx no longer defines the 4 scenario handlers directly.
    - Expected App.tsx line drop of ~80 lines this task.
    - `pnpm test --run` green; `pnpm tsc --noEmit` clean.
    - 2 commits made (test + refactor).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Extract useCanvasHandlers hook + verify App.tsx &lt; 400 lines (RED → GREEN → REFACTOR)</name>
  <files>
    packages/web/src/hooks/useCanvasHandlers.ts (new),
    packages/web/src/hooks/useCanvasHandlers.test.ts (new),
    packages/web/src/App.tsx (modify — remove onDragOver, onDrop, onAddNode, onConnect; call useCanvasHandlers instead)
  </files>
  <behavior>
    useCanvasHandlers must return 4 handlers:
    - Test 1 (onDragOver): Calls event.preventDefault() and sets event.dataTransfer.dropEffect="move".
    - Test 2 (onDrop JSON file): If the DataTransfer contains a file with `.json` extension, reads it with FileReader, parses with parseImportJson, wires edges (markerEnd default, onLinkCountChange wired) and nodes (onUpdate/onRootToggle/onZIndexChange wired), calls setNodes + setEdges. (Use vi.stubGlobal("FileReader", ...) or a minimal mock.)
    - Test 3 (onDrop JSON file invalid): On JSON parse failure, silently returns (no setNodes/setEdges call).
    - Test 4 (onDrop sidebar node): When `event.dataTransfer.getData("application/reactflow") === "urlNode"` AND reactFlowInstance exists, calls reactFlowInstance.screenToFlowPosition with event.clientX/Y and calls addNode with result.
    - Test 5 (onDrop sidebar node no instance): If reactFlowInstance is null, does NOT call addNode.
    - Test 6 (onAddNode with instance): Calls reactFlowInstance.screenToFlowPosition({x: window.innerWidth/2, y: window.innerHeight/2}), then addNode with result.
    - Test 7 (onAddNode without instance): Calls addNode with {x:250, y:250} fallback.
    - Test 8 (onConnect with sourceHandle): Passes connection through unmodified into setEdges(addEdge-style updater); do NOT re-run getClosestHandleIds.
    - Test 9 (onConnect without sourceHandle): Looks up source/target nodes from `nodes`, computes handles with getClosestHandleIds, merges into connection, then applies addEdge with type "linkCountEdge", default markerEnd, data.linkCount=1, onLinkCountChange wired.
    - Test 10 (onConnect missing node): If source/target node not found in `nodes`, still passes the (un-handled) connection through — mirrors existing behavior at lines 481–487.
  </behavior>
  <action>
    RED phase:
      1. Create `packages/web/src/hooks/useCanvasHandlers.test.ts` using `renderHook`.
      2. Mock React.DragEvent shape: `{ preventDefault: vi.fn(), dataTransfer: { dropEffect: "", files: [...], getData: vi.fn() }, clientX, clientY }`. Mock reactFlowInstance with `{ screenToFlowPosition: vi.fn().mockReturnValue({x:1,y:2}) }`. Mock `window.innerWidth`/`innerHeight` with vi.stubGlobal.
      3. For FileReader test, stub global FileReader with a constructor that exposes `.readAsText(file)` → invokes `onload({ target: { result: fixture } })` synchronously.
      4. Write the 10 cases. Import `useCanvasHandlers` from `./useCanvasHandlers` (RED).
      5. Run `cd packages/web && pnpm test --run src/hooks/useCanvasHandlers.test.ts` — MUST fail.
      6. Commit: `test(web): add failing tests for useCanvasHandlers hook`.

    GREEN phase:
      1. Create `packages/web/src/hooks/useCanvasHandlers.ts`. Copy bodies of onDragOver, onDrop, onAddNode, onConnect from App.tsx (lines 399–501) into a single hook. Preserve existing useCallback dep arrays.
      2. Imports:
         `import { useCallback } from "react";`
         `import { MarkerType, addEdge, type Node, type Edge, type Connection, type ReactFlowInstance } from "@xyflow/react";`
         `import { parseImportJson, getClosestHandleIds, type UrlNodeData, type LinkCountEdgeData } from "../lib/graph-utils";`
         `import type { AppNodeData } from "../App";`
      3. Type args with `UseCanvasHandlersArgs` per <interfaces>. Return `UseCanvasHandlersResult`.
      4. In App.tsx: delete lines 399–501 and replace with:
         ```
         const { onDragOver, onDrop, onAddNode, onConnect } = useCanvasHandlers({
           reactFlowInstance, addNode, nodes, setNodes, setEdges,
           onNodeDataUpdate, onRootToggle, onNodeZIndexChange, onEdgeLinkCountChange,
         });
         ```
         Add `import { useCanvasHandlers } from "./hooks/useCanvasHandlers";`.
      5. Measure App.tsx line count: `wc -l packages/web/src/App.tsx`. MUST be < 400. If not, identify the slack (e.g., leftover imports of addEdge/MarkerType/ReactFlowInstance/Connection that only the hook now needs — remove them from App.tsx; the hook owns them).
      6. Run `cd packages/web && pnpm test --run` — MUST be green.
      7. Run `cd packages/web && pnpm tsc --noEmit` — MUST be clean.
      8. Commit: `refactor(web): extract useCanvasHandlers hook and reach &lt;400 lines target`.

    REFACTOR phase (only if needed):
      - If App.tsx is still ≥400 lines after removing now-unused imports (`addEdge`, `Connection`, `getClosestHandleIds`, `parseImportJson`, `MarkerType` — confirm each is unreferenced before removal), consider also inlining the `buildCopyForAIText` call OR leaving this task's commit at the measured count and noting the remaining slack in SUMMARY (but line count MUST be < 400 to satisfy the constraint).
  </action>
  <verify>
    <automated>cd packages/web && pnpm test --run src/hooks/useCanvasHandlers.test.ts && pnpm test --run && pnpm tsc --noEmit && test $(wc -l &lt; packages/web/src/App.tsx) -lt 400</automated>
  </verify>
  <done>
    - `useCanvasHandlers.ts` exports the hook returning 4 handlers.
    - `useCanvasHandlers.test.ts` passes all 10 cases.
    - App.tsx no longer defines the 4 canvas handlers.
    - `wc -l packages/web/src/App.tsx` reports < 400 lines.
    - Unused imports removed from App.tsx (addEdge, Connection, getClosestHandleIds, parseImportJson, MarkerType if no longer referenced).
    - `pnpm test --run` green; `pnpm tsc --noEmit` clean.
    - 2 commits made (test + refactor).
  </done>
</task>

</tasks>

<verification>
Phase-level gates (run after all 4 tasks complete):

1. Unit test suite:
   `cd packages/web && pnpm test --run`
   → all tests green, including 4 new test files.

2. Type safety:
   `cd packages/web && pnpm tsc --noEmit`
   → zero errors.

3. Line budget:
   `wc -l packages/web/src/App.tsx`
   → strictly less than 400.

4. Behavior equivalence (manual smoke, 2 min):
   `cd packages/web && pnpm dev`, open the app, then:
   - Drag a URL node from sidebar onto canvas → new node appears.
   - Drop a valid exported JSON file on canvas → graph loads.
   - Click Add Node → node at center.
   - Connect two nodes → edge renders with arrow marker.
   - Edit a node's URL template via popover → change persists after refresh.
   - Toggle a node as root → previous root clears.
   - Switch scenarios → graph swaps; switch back preserves edits.
   - Create scenario (blank + clone) → works.
   - Delete a non-last scenario → works; delete-last is refused.
   - Import JSON via dialog → nodes/edges render with wired callbacks (click to edit works).

5. Git log hygiene:
   `git log --oneline main..HEAD` → 8 commits total (test+refactor × 4 tasks), each matching `^(test|refactor)\\(web\\): ` commitlint prefix.
</verification>

<success_criteria>
- All 4 extractions complete with dedicated test files.
- App.tsx strictly under 400 lines (target achieved).
- `pnpm test --run` all green; `pnpm tsc --noEmit` clean.
- No behavior regressions in manual smoke test.
- 8 commits total on `refactor/app` branch, commitlint-compliant.
- No updates to `.planning/ROADMAP.md` (per constraint).
- Ready to open PR from `refactor/app` → `main`.
</success_criteria>

<output>
After completion, create `.planning/quick/260419-ppw-refactor-app-tsx-phase-2-extract-seriali/260419-ppw-SUMMARY.md` documenting:
- Final App.tsx line count (before / after).
- List of new files with brief purpose.
- Commit hashes for each of the 8 commits.
- Any deviations from the plan (especially in the REFACTOR phases).
- Smoke-test results.
</output>
