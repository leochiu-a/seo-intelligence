---
phase: 01-canvas-editor
plan: "03"
subsystem: graph-utils
tags: [tdd, vitest, utilities, typescript]
dependency_graph:
  requires: []
  provides: [graph-utils]
  affects: [UrlNode, LinkCountEdge, App]
tech_stack:
  added: [vitest@4.1.4]
  patterns: [TDD RED-GREEN-REFACTOR, pure functions, immutable updates, JSDoc]
key_files:
  created:
    - src/lib/graph-utils.ts
    - src/lib/graph-utils.test.ts
  modified:
    - vite.config.ts
    - package.json
key_decisions:
  - "resetNodeIdCounter exported alongside createDefaultNode to allow deterministic test ordering"
  - "updateNodeData and updateEdgeLinkCount use map-with-spread for immutable updates, preserving referential equality for unchanged nodes"
  - "validateLinkCount floors decimals (Math.floor) rather than rounding, since link counts are whole numbers"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-13T13:48:04Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 1 Plan 3: Graph Utility Functions Summary

**One-liner:** Vitest TDD suite for six pure utility functions (node factory, immutable node/edge mutation, input validation, display formatting) that define data contracts consumed by UrlNode and App.

## What Was Built

`src/lib/graph-utils.ts` — a pure TypeScript utility module exporting:

- `createDefaultNode(position)` — factory returning a `Node<UrlNodeData>` with auto-incremented id (`node-1`, `node-2`...), type `urlNode`, default `urlTemplate: '/page/<id>'`, and `pageCount: 1`
- `updateNodeData(nodes, nodeId, newData)` — immutable partial merge onto matching node; non-matching nodes returned by reference
- `updateEdgeLinkCount(edges, edgeId, linkCount)` — immutable linkCount update on matching edge
- `validateNodeData(data)` — returns error string for empty/whitespace urlTemplate or pageCount < 1; null when valid
- `validateLinkCount(count)` — clamps NaN/negative/zero to 1, floors decimals
- `formatPageCount(n)` — `"1 page"` singular, `"{n} pages"` plural
- `resetNodeIdCounter()` — test helper to reset module-level counter for deterministic ids

`src/lib/graph-utils.test.ts` — 25 test cases in 6 describe blocks covering: happy path, edge cases (NaN, negative, whitespace, zero, not-found ids), immutability (referential equality for unchanged items), and counter determinism.

Also exported: `UrlNodeData` and `LinkCountEdgeData` interfaces that Plans 01-01 and 01-02 will consume.

## TDD Cycle

| Phase | Commit | Status |
|-------|--------|--------|
| RED | 0945e34 | All tests failed with "Cannot find module" |
| GREEN | 4743acb | All 25 tests passed, tsc --noEmit clean |
| REFACTOR | 8677e8e | Added JSDoc, tests still all pass |

## Test Coverage

| Function | Cases | Edge Cases Covered |
|----------|-------|--------------------|
| createDefaultNode | 5 | unique ids, position passthrough, defaults |
| updateNodeData | 4 | partial merge, referential equality, not-found |
| updateEdgeLinkCount | 3 | update, referential equality, not-found |
| validateNodeData | 5 | empty, whitespace-only, zero, negative, valid |
| validateLinkCount | 5 | valid pass-through, 0, negative, NaN, decimal |
| formatPageCount | 3 | singular (1), plural (0), plural (>1) |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functions are fully implemented with no placeholder behavior.

## Self-Check: PASSED

- [x] `src/lib/graph-utils.ts` exists
- [x] `src/lib/graph-utils.test.ts` exists  
- [x] Commit 0945e34 (RED) exists
- [x] Commit 4743acb (GREEN) exists
- [x] Commit 8677e8e (REFACTOR) exists
- [x] `npm test` exits 0 with 25 passing tests
- [x] `npx tsc --noEmit` exits 0
