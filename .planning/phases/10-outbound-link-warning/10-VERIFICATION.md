---
phase: 10-outbound-link-warning
verified: 2026-04-17T15:27:00Z
status: passed
score: 6/6 must-haves verified
re_verification: null
---

# Phase 10: Outbound Link Warning Verification Report

**Phase Goal:** Users are warned when any node carries more outbound links than the recommended SEO threshold (150), so over-linked pages can be identified and corrected before deployment.

**Verified:** 2026-04-17T15:27:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                                                            | Status     | Evidence                                                                                                                                                                                                                                        |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | `calculateOutboundLinks` returns correct per-node totals per D-01/D-02/D-03 (explicit edges + implicit global for non-global; 0 implicit for global; no pageCount mul) | VERIFIED   | graph-utils.ts lines 260-296 — exported function; result map initialised to 0; loops explicit edges adding `e.data?.linkCount ?? 1`; pre-computes `globalPlacementSum` once; applies to every non-global source; `if (n.data.isGlobal) continue` guard on line 290 |
| 2  | `OUTBOUND_WARNING_THRESHOLD = 150` exists and is used by both canvas + sidebar                                                                    | VERIFIED   | graph-utils.ts line 122 `export const OUTBOUND_WARNING_THRESHOLD = 150`; App.tsx line 40 + line 434 import-and-use; ScoreSidebar.tsx line 6 + line 204 import-and-use                                                                                                        |
| 3  | UrlNode renders red `TriangleAlert` + `{count} links` when over threshold, in correct coexistence order (after orphan/unreachable/weak/depth)     | VERIFIED   | UrlNode.tsx lines 165-171 — subtitle branch placed LAST in chain (after depth on 158-164); uses `text-red-500` on both icon and label span; `aria-label="Over-linked page"`; no mutually-exclusive guards (coexists with other indicators)                                 |
| 4  | ScoreSidebar main ranked list shows `{count} links` inline on every score line; span is `text-red-500` only when over threshold                    | VERIFIED   | ScoreSidebar.tsx lines 201-213 — IIFE appended AFTER existing depth IIFE inside the `<p>` score-line block; `className={isOver ? 'text-red-500' : ''}` flips red only when `outbound > OUTBOUND_WARNING_THRESHOLD`                                                      |
| 5  | Node with outbound ≤ 150: no canvas warning; sidebar count still renders in muted color                                                           | VERIFIED   | UrlNode.tsx guard `{data.isOverLinked && ...}` is false when count ≤150 (App.tsx line 434 sets `isOverLinked = outboundCount > THRESHOLD`); ScoreSidebar.tsx `className={isOver ? 'text-red-500' : ''}` returns empty class → muted default; UrlNode.test.tsx line 112 covers "does NOT render"; ScoreSidebar.test.tsx line 272 covers under-threshold no-red |
| 6  | Global source node outbound excludes implicit global-to-global contribution (Phase 4 D-01 parity)                                                  | VERIFIED   | graph-utils.ts line 290 `if (n.data.isGlobal) continue`; graph-utils.test.ts lines 1092-1100 test case 4 "global source node contributes 0 implicit" passes — two globals with placements, `calculateOutboundLinks` returns 0 for both                                                       |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact                                                     | Expected                                                                 | Status     | Details                                                                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/web/src/lib/graph-utils.ts`                        | `calculateOutboundLinks` + `OUTBOUND_WARNING_THRESHOLD` exported         | VERIFIED   | Line 122 `export const OUTBOUND_WARNING_THRESHOLD = 150`; line 260 `export function calculateOutboundLinks`; formula matches D-01/D-02/D-03 verbatim                              |
| `packages/web/src/lib/graph-utils.test.ts`                   | 6 enumerated cases + threshold assertion                                 | VERIFIED   | Lines 1055-1059 threshold check; lines 1061-1151 describe block with all 6 enumerated cases; runs green in `pnpm test --run`                                                      |
| `packages/web/src/App.tsx`                                   | `outboundMap` useMemo + enrichedNodes extension + ScoreSidebar prop     | VERIFIED   | Lines 39-40 imports; lines 419-422 useMemo; lines 433-434 compute outboundCount/isOverLinked; line 442-443 equality-check; lines 456-457 enriched payload; line 530 JSON export; line 647 sidebar prop |
| `packages/web/src/components/UrlNode.tsx`                    | Red subtitle indicator with correct coexistence order                    | VERIFIED   | Lines 18-19 interface fields; lines 165-171 JSX branch appended LAST (after depth); reuses existing `TriangleAlert` import (line 3); `text-red-500` on icon + label              |
| `packages/web/src/components/ScoreSidebar.tsx`               | Inline `{count} links` span with conditional red                         | VERIFIED   | Line 6 imports `OUTBOUND_WARNING_THRESHOLD`; line 15 required prop; line 33 destructured; lines 201-213 IIFE in main ranked list with threshold-gated `text-red-500`             |

### Key Link Verification

| From                      | To                                                         | Via                                             | Status | Details                                                                                                                              |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| graph-utils.ts            | PageRank global-injection pattern                           | non-global source iterates globals adding sum  | WIRED  | Line 278-286 `nodes.filter(isGlobal).reduce(... placements.reduce((sum, p) => sum + p.linkCount, 0))` — mirrors calculatePageRank   |
| App.tsx                   | graph-utils.ts `calculateOutboundLinks`                     | `useMemo` producing `outboundMap`               | WIRED  | Lines 419-422 `useMemo(() => calculateOutboundLinks(nodes, edges), [nodes, edges])`                                                   |
| App.tsx                   | ScoreSidebar.tsx                                            | `outboundMap` prop                              | WIRED  | Line 647 `outboundMap={outboundMap}`; ScoreSidebar.tsx line 15 declares required prop, line 33 destructured                         |
| App.tsx enrichedNodes     | UrlNode.tsx subtitle                                        | `data.outboundCount` + `data.isOverLinked`      | WIRED  | App.tsx lines 456-457 spread into enrichedNodes.data; UrlNode.tsx lines 18-19 read in interface; lines 165-171 branch consumes them |

### Data-Flow Trace (Level 4)

| Artifact            | Data Variable              | Source                                                                 | Produces Real Data | Status   |
| ------------------- | -------------------------- | ---------------------------------------------------------------------- | ------------------ | -------- |
| UrlNode.tsx         | `data.outboundCount`, `data.isOverLinked` | App.tsx enrichedNodes spread from outboundMap (pure fn of nodes/edges) | Yes                | FLOWING  |
| ScoreSidebar.tsx    | `outboundMap.get(item.id)` | App.tsx useMemo result — not a static map                              | Yes                | FLOWING  |

The outbound values are computed by a pure function over the live nodes/edges ReactFlow state; neither a hardcoded empty Map nor a static fallback is present. Threshold comparisons in both UrlNode and ScoreSidebar react to the same recomputed map.

### Behavioral Spot-Checks

| Behavior                                       | Command                                                      | Result                                    | Status |
| ---------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------- | ------ |
| Full test suite passes                          | `cd packages/web && pnpm test --run`                         | 10 test files, 211/211 tests passed       | PASS   |
| TypeScript typecheck clean                      | `cd packages/web && pnpm tsc --noEmit`                       | Exit 0, no errors                         | PASS   |
| 6 enumerated cases + threshold assertion exist  | `grep describe\\('calculateOutboundLinks\\|OUTBOUND_WARNING_THRESHOLD graph-utils.test.ts` | 7 cases present, all green    | PASS   |
| UrlNode over-linked coexistence order verified  | Line position of `Over-linked page` (line 168) > position of `Layers` depth (line 161) | Order correct (depth → over-linked) | PASS   |
| ScoreSidebar IIFE appended after depth IIFE     | Line position of outbound IIFE (line 201) > depth IIFE (line 188) | Order correct                             | PASS   |

### Requirements Coverage

| Requirement   | Source Plan         | Description                                                                                       | Status     | Evidence                                                                                                          |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| OUTBOUND-01   | 10-01-PLAN.md       | Calculate total outbound per node combining explicit edges + global placements                    | SATISFIED  | graph-utils.ts lines 260-296; 6 enumerated Vitest cases verify formula correctness                                 |
| OUTBOUND-02   | 10-02-PLAN.md       | Nodes >150 display red warning on canvas                                                           | SATISFIED  | UrlNode.tsx lines 165-171 red `TriangleAlert` + count; UrlNode.test.tsx lines 100-122 cover true/false branches   |
| OUTBOUND-03   | 10-02-PLAN.md       | Sidebar shows outbound count with warning-threshold highlight                                      | SATISFIED  | ScoreSidebar.tsx lines 201-213 inline count; ScoreSidebar.test.tsx lines 272-289 cover muted / red branches       |

All three phase-10 requirement IDs satisfied. No orphaned requirements — REQUIREMENTS.md traceability table maps OUTBOUND-01..03 to Phase 10, and both plans' `requirements` frontmatter collectively covers the full set.

### Anti-Patterns Found

| File                                        | Line | Pattern                 | Severity | Impact                                                                                                                                                                      |
| ------------------------------------------- | ---- | ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none)                                      | —    | —                       | —        | No TODO/FIXME/PLACEHOLDER comments, no empty returns, no stub handlers in any phase-10 modified files. `[]` / `{}` initialisations present are genuine empty-state defaults populated by live fetches/useMemo output — not stubs. |

### Human Verification Required

None. Automated checks cover all truths:
- Formula correctness is TDD-verified (6 enumerated cases).
- Visual rendering is unit-tested with Testing Library (red-class assertion via `className` regex).
- Coexistence order is verified by source-line position.

Optional manual sanity (not gating): run `pnpm dev`, add a global node with placements summing to 160, observe red TriangleAlert on non-global subtitle and red count in sidebar; drop to 100 and observe warning disappears on canvas, sidebar stays muted. This reproduces the design intent and can be done by the PM if desired.

### Gaps Summary

No gaps. Phase 10 fully delivers on its goal:

- **OUTBOUND-01** — formula implemented as pure function with TDD coverage, including the global-source-contributes-zero edge case that mirrors Phase 4 D-01.
- **OUTBOUND-02** — canvas red indicator positioned correctly at end of subtitle chain, coexisting with orphan/unreachable/weak/depth per D-09.
- **OUTBOUND-03** — sidebar inline count always visible with conditional red styling only above the 150 threshold, matching the D-11 "always-visible with threshold-gated color" spec and D-12 "no dedicated section" rule.

Five atomic commits form a clean TDD history: RED test commit `3934e34` → GREEN implementation commit `7a485cb` → three UI wiring commits (`dd03dc3` App, `e71fa9e` UrlNode, `5f4285c` ScoreSidebar). Full suite green at 211/211, TypeScript clean.

---

_Verified: 2026-04-17T15:27:00Z_
_Verifier: Claude (gsd-verifier)_
