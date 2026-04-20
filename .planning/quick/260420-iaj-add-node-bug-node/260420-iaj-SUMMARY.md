---
phase: quick-260420-iaj
plan: 01
subsystem: graph-utils, add-node, scenario-handlers
tags: [bug-fix, id-collision, add-node, tdd]
dependency_graph:
  requires: []
  provides: [syncNodeIdCounter, collision-proof-createDefaultNode]
  affects: [App.tsx, useScenarioHandlers, useCanvasHandlers, useNodeCallbacks]
tech_stack:
  added: []
  patterns: [monotonic counter seed, belt-and-braces collision guard]
key_files:
  created: []
  modified:
    - packages/web/src/lib/graph-utils.ts
    - packages/web/src/lib/graph-utils.test.ts
    - packages/web/src/App.tsx
    - packages/web/src/hooks/useScenarioHandlers.ts
    - packages/web/src/hooks/useCanvasHandlers.ts
    - packages/web/src/hooks/useNodeCallbacks.ts
decisions:
  - syncNodeIdCounter is monotonically non-decreasing — calling with fewer nodes after a higher set cannot reset progress
  - createDefaultNode optional existingNodes param added without breaking signature — backward compatible
  - addNode passes live nds inside setNodes updater for belt-and-braces safety even if sync was missed
metrics:
  duration: 12
  completed: 2026-04-20
---

# Quick Task 260420-iaj: Fix Add Node Graph Explosion Bug

**One-liner:** Seed `nodeIdCounter` from restored nodes via `syncNodeIdCounter` so new ids never collide with existing `node-N` ids after page reload, import, or scenario switch.

## Root Cause

`nodeIdCounter` is a module-level variable that resets to 0 on every page load. Restored/imported graphs carry serialized ids like `node-1`, `node-2`, etc. The first `addNode()` call after restore emits `node-1` — which collides with the existing node. React Flow reuses the internal record for that id, bleeding the new position onto the existing node and causing cascading layout chaos ("graph explosion").

## Fix Surface

### Task 1: syncNodeIdCounter + hardened createDefaultNode (`graph-utils.ts`)

- **New export `syncNodeIdCounter(nodes)`**: scans all `node-<N>` ids, advances `nodeIdCounter` to the maximum found. Monotonically non-decreasing (never lowers counter).
- **Hardened `createDefaultNode`**: accepts optional `existingNodes` second parameter. When provided, calls `syncNodeIdCounter` then loops forward past any still-colliding id.
- `resetNodeIdCounter` and default behavior unchanged — fully backward compatible.

### Task 2: Wiring (`App.tsx`, `useScenarioHandlers`, `useCanvasHandlers`, `useNodeCallbacks`)

- `App.tsx` restore effect: `syncNodeIdCounter(wiredNodes)` called before `setNodes`.
- `useScenarioHandlers`: `syncNodeIdCounter(wiredNodes)` added before `setNodes` in all 4 paths: switch, create (blank/clone), delete, import-from-dialog.
- `useCanvasHandlers` JSON drop path: `syncNodeIdCounter(wiredNodes)` added before `setNodes`.
- `useNodeCallbacks.addNode`: refactored to pass live `nds` to `createDefaultNode(position, nds)` inside the `setNodes` updater — collision-proof even if sync was missed on a code path.

## Tests Added

New tests in `graph-utils.test.ts`:

**`describe("syncNodeIdCounter")`**
- Empty array leaves counter at 0
- Advances counter to max+1 (node-5 + node-2 → next is node-6)
- Ignores non-matching ids (custom-abc, global-xyz)
- NEVER lowers counter (monotonic guarantee)
- Regression: after sync([node-1]), next createDefaultNode yields node-2 not node-1

**`describe("createDefaultNode — collision-proof")`**
- Skips colliding id when existingNodes contains the would-be id
- Backward compatible without existingNodes

All 193 graph-utils.test.ts tests pass. No new failures introduced (6 pre-existing failures in EditPopover/ScoreSidebar/HealthPanel tracked by backlog 999.12 are out of scope and unchanged).

## Commits

| Hash | Message |
|------|---------|
| 451eeb1 | test(graph-utils): add failing tests for syncNodeIdCounter and collision-proof createDefaultNode |
| bd28223 | feat(graph-utils): add syncNodeIdCounter and harden createDefaultNode with collision guard |
| fbef292 | feat(add-node): wire syncNodeIdCounter into every graph-load path |

## Checkpoint: Human Verify (Pending)

The automated implementation is complete. Manual browser verification is required:

1. Seed a canvas with 3+ nodes, reload the page — click Add Node, verify no graph explosion.
2. Drag a URL Node from sidebar onto a restored graph — verify nothing else moves.
3. Switch scenario, then Add Node — verify no collision.
4. Import JSON with highest id `node-10`, Add Node — verify new node gets `node-11`.
5. Clear Canvas, Add Node — verify unique id (monotonic counter means first post-clear node is node-N+1, not node-1).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- packages/web/src/lib/graph-utils.ts — modified (syncNodeIdCounter + hardened createDefaultNode)
- packages/web/src/lib/graph-utils.test.ts — modified (syncNodeIdCounter + collision tests added)
- packages/web/src/App.tsx — modified (syncNodeIdCounter wired)
- packages/web/src/hooks/useScenarioHandlers.ts — modified (syncNodeIdCounter wired in all 4 paths)
- packages/web/src/hooks/useCanvasHandlers.ts — modified (syncNodeIdCounter wired in JSON drop)
- packages/web/src/hooks/useNodeCallbacks.ts — modified (addNode passes live nds)
- Commits 451eeb1, bd28223, fbef292 exist in git log
