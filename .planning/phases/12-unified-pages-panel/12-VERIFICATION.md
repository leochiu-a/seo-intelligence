---
phase: 12-unified-pages-panel
verified: 2026-04-21T14:30:00Z
status: passed
score: 24/24 must-haves verified
re_verification:
  previous_status: null
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 12: Unified Pages Panel Verification Report

**Phase Goal:** PMs can see every page's score, depth, inbound, outbound, and health warnings in one ranked list — no more switching between Score and Health tabs to hunt for weak pages.

**Verified:** 2026-04-21
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### ROADMAP Success Criteria (primary contract)

| # | Success Criterion | Status | Evidence |
| - | ----------------- | ------ | -------- |
| SC-1 | Single "Pages" panel replaces Score+Health; each row shows URL template, score, depth, inbound, outbound, warning badges | verified | `SidePanel.tsx:24` `type Tab = "filter" \| "pages"`; `PagesPanel.tsx:290-312` row renders cluster dots + URL + warning badge on line 1, `{score.toFixed(4)} · Depth {n} · in {x} · out {y}` + ScoreTierBadge on line 2; warning badge covers orphan/unreachable/weak/general (links/depth/tags) via `renderWarningBadge` (`PagesPanel.tsx:232-281`) |
| SC-2 | Default sort surfaces weakest first: orphan + unreachable at top, then low score with multiple warnings | verified | `PagesPanel.tsx:147-153` issueGroup assigns orphan=0, unreachable-only=1, warning=2, clean=3; `PagesPanel.tsx:84-88` comparator `a.issueGroup - b.issueGroup \|\| a.score - b.score \|\| a.urlTemplate.localeCompare`; test `default sort orders orphan → unreachable-only → warning → clean, with score ascending` asserts exact order `["c","d","b","e","a"]` |
| SC-3 | PM can switch sort to any column and filter to show only pages with warnings | verified | `PagesPanel.tsx:338-353` `<select data-testid="pages-sort">` with 7 options (issue-tier, score-hi, score-lo, depth-deep, outbound-hi, inbound-lo, url-asc); `PagesPanel.tsx:355-362` warnings-only Checkbox; `PagesPanel.tsx:364-380` tier filter pills; tests `switching sort to 'score-hi'`, `warnings-only checkbox hides clean rows`, `tier filter hides excluded tiers` all pass |
| SC-4 | Clicking a row highlights and pans to the node on canvas (preserves current behavior) | verified | `PagesPanel.tsx:210-216` handler: `setNodes((nds) => nds.map(n => ({...n, selected: n.id === nodeId})))`, `setTimeout(() => fitView({nodes: [{id: nodeId}], duration: 300, padding: 0.5}), 50)`, `onNodeHighlight?.(nodeId)` — matches legacy ScorePanel pattern verbatim (D-10); test `clicking a row calls setNodes, schedules fitView after 50ms, and calls onNodeHighlight` verifies |

**SC Score:** 4/4 verified

### Must-Have Coverage (derived from CONTEXT D-01..D-24)

| D# | Decision | Status | Evidence |
| -- | -------- | ------ | -------- |
| D-01 | Delete ScorePanel + HealthPanel; SidePanel = Filter \| Pages (2 tabs) | verified | `ls packages/web/src/components/ScorePanel.tsx` → No such file; `ls packages/web/src/components/HealthPanel.tsx` → No such file; `SidePanel.tsx:24` declares `Tab = "filter" \| "pages"`, renders exactly 2 tab buttons (lines 53-70) |
| D-02 | New `packages/web/src/components/PagesPanel.tsx`, consumes same props + `inboundMap` | verified | File exists (14371 bytes); props interface `PagesPanel.tsx:19-31` includes nodes, scores, weakNodes, orphanNodes, unreachableNodes, depthMap, outboundMap, inboundMap, rootId, allScoreValues, onNodeHighlight |
| D-03 | Default sort = issue-tier: orphan → unreachable → warning → clean, score asc, URL tie-break | verified | `PagesPanel.tsx:84-88` comparator; test line 81-112 asserts `["c","d","b","e","a"]` order |
| D-04 | buildUrlTree tree-hierarchy removed; depth shown as text | verified | Grep `buildUrlTree` in `packages/web/src/components/` returns zero matches; `PagesPanel.tsx:300` renders `Depth {r.depth}` inline |
| D-05 | 7-option sort dropdown, not persisted | verified | `PagesPanel.tsx:338-353` contains exactly 7 `<option>` entries (issue-tier, score-hi, score-lo, depth-deep, outbound-hi, inbound-lo, url-asc); `PagesPanel.tsx:127` local useState initializes to "issue-tier" — resets on mount |
| D-06 | Warnings-only checkbox + 3 tier pills (Low/Mid/High) above list | verified | `PagesPanel.tsx:355-380`: Checkbox with testid `pages-warnings-only`, three pill buttons with testid `pages-tier-low/mid/high` and aria-pressed state; initial state: `warningsOnly=false`, `tierFilter=Set(["low","mid","high"])` (line 128-131) |
| D-07 | Filters AND together | verified | `PagesPanel.tsx:187-196` `visibleRows` filter: tier exclusion check THEN warnings-only check — both must pass |
| D-08 | Filters local-state, reset on mount | verified | Both `warningsOnly` and `tierFilter` use `useState` with inline initializers (line 128, 129-131) — re-mount resets them |
| D-09 | Per-warning-type filter deferred | verified | No per-warning filter UI in component (no Orphan-only, Depth-only, etc.) |
| D-10 | Two-line compact row layout; cluster dots + URL + warning on line 1, `score · Depth · in · out` + tier badge on line 2 | verified | `PagesPanel.tsx:290-312` exact structure; test `row meta shows Depth/in/out and highlights outbound > 150 + depth > 3` verifies |
| D-11 | Single TriangleAlert with combined tooltip; Unplug (red) for orphan/unreachable; specific tooltip copy | verified | `PagesPanel.tsx:232-281` `renderWarningBadge`: orphan → Unplug + "Orphan — no inbound links"; unreachable (not orphan) → Unplug + "Unreachable — no path from root"; else single `TriangleAlert` + combined tooltip from `buildTooltipContent(r.status)` + "Weak page (low PageRank)" when weak |
| D-12 | ScoreTierBadge at sm sizing on line 2 | verified | `PagesPanel.tsx:310` `<ScoreTierBadge tier={r.tier} testId="pages-tier-badge" />` — existing component reused |
| D-13 | When rootId == null, skip Depth segment (don't render "Depth —") | verified | `PagesPanel.tsx:297` `{rootId !== null && r.depth !== undefined && (... Depth ...)}` conditional; test `Depth segment is NOT rendered when rootId is null` verifies |
| D-14 | Inbound `in {count}` always renders (even 0) | verified | `PagesPanel.tsx:304` always renders `<span>in {r.inbound}</span>`; test `inbound count always renders, including zero` verifies |
| D-15 | Outbound > 150 → `text-red-500`; Depth > 3 → `text-amber-500` | verified | `PagesPanel.tsx:300` `className={r.depth > 3 ? "text-amber-500" : ""}`; `PagesPanel.tsx:306` `className={r.outbound > OUTBOUND_WARNING_THRESHOLD ? "text-red-500" : ""}`; test `row meta shows ... highlights outbound > 150 + depth > 3` verifies both |
| D-16 | Single-line tier summary `X Low · Y Mid · Z High` above sort dropdown, omitted when allScoreValues empty | verified | `PagesPanel.tsx:328-335` renders `pages-tier-summary` conditionally on `allScoreValues.length > 0`; tests `tier summary shows ...` and `tier summary is omitted when allScoreValues is empty` verify |
| D-17 | Both summary + per-row tier badge | verified | Tier summary at line 328-335 AND per-row `<ScoreTierBadge>` at line 310 |
| D-18 | Red section banners (Orphan/Unreachable) render in default-sort mode only | verified | `PagesPanel.tsx:230` `showBanners = sortMode === "issue-tier"`; `PagesPanel.tsx:390-417` banners conditionally render `data-testid="pages-banner-orphan"` / `pages-banner-unreachable`; test `orphan and unreachable section banners render when sort is default` verifies |
| D-19 | Non-default sort drops banners (red icon still distinguishes rows) | verified | `PagesPanel.tsx:418-424` when `!showBanners` the rendered list is flat `visibleRows`; test `section banners do NOT render when sort is not issue-tier` verifies |
| D-20 | `inboundMap: Map<string, number>` added to `useGraphAnalytics` return | verified | `useGraphAnalytics.ts:27` field in `GraphAnalyticsResult`; `useGraphAnalytics.ts:69` `useMemo(() => calculateInboundLinks(nodes, edges), [nodes, edges])`; `useGraphAnalytics.ts:129` returned |
| D-21 | `identifyOrphanNodes` refactor OPTIONAL, skipped | verified | `graph-analysis.ts` `identifyOrphanNodes` unchanged; `calculateInboundLinks` added as independent helper (line 257) |
| D-22 | ScorePanel.test.tsx + HealthPanel.test.tsx deleted; PagesPanel.test.tsx covers sort grouping, sort switching, warnings-only, tier filter, click-to-highlight, empty state | verified | ScorePanel.test.tsx never existed (documented in 12-03-PLAN); HealthPanel.test.tsx deleted (ls → No such file); PagesPanel.test.tsx has 18 tests covering all required behaviors (see below) |
| D-23 | Keep graph-analysis health helpers; no lib tests deleted | verified | `getHealthStatus`, `hasAnyWarning`, `buildTooltipContent` still exported from graph-analysis.ts; tests still pass |
| D-24 | inboundMap implicit global contribution covered by unit test | verified | `graph-utils.test.ts:1341` `describe("calculateInboundLinks", ...)` with 8 tests covering: empty, every-node-present, edge count (not linkCount), implicit global add = nonGlobalCount, global-to-global excluded, explicit+implicit combined, linkCount-independence, unknown-target guard |

**D-Score:** 24/24 verified

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/web/src/components/PagesPanel.tsx` | verified | EXISTS (14371 bytes); exports `PagesPanel`; implements issue-tier comparator, 7-option sort select, warnings-only checkbox, 3 tier pills, two-line row layout, click-to-highlight, banners gated by default sort, empty + filtered-empty states |
| `packages/web/src/components/PagesPanel.test.tsx` | verified | EXISTS (12389 bytes); 18 tests covering row-per-node, default sort grouping, sort switching (score-hi, url-asc), warnings-only, tier filter, click-to-highlight (with fake timers for 50ms setTimeout → fitView), empty state, filtered-empty state, banner visibility by sort, row meta (depth/in/out + warn colors), rootId-null depth skip, tier summary counts, tier summary omission, inbound zero, rootId-missing banner, weak-page general warning trigger, orphan trigger exclusion |
| `packages/web/src/components/ScorePanel.tsx` | verified | DELETED (ls → No such file) |
| `packages/web/src/components/HealthPanel.tsx` | verified | DELETED (ls → No such file) |
| `packages/web/src/components/HealthPanel.test.tsx` | verified | DELETED (ls → No such file) |
| `packages/web/src/components/SidePanel.tsx` | verified | Tabs reduced to filter \| pages (default = pages on line 42); imports `PagesPanel` (line 5); declares `inboundMap: Map<string, number>` prop (line 16); forwards to `<PagesPanel>` (line 91) |
| `packages/web/src/App.tsx` | verified | Destructures `inboundMap` from `useGraphAnalytics` (line 155); passes `inboundMap={inboundMap}` to `<SidePanel>` (line 278) |
| `packages/web/src/hooks/useGraphAnalytics.ts` | verified | Imports `calculateInboundLinks` (line 12); interface `GraphAnalyticsResult` has `inboundMap: Map<string, number>` (line 27); `useMemo` wired (line 69); returned (line 129) |
| `packages/web/src/lib/graph-analysis.ts` | verified | Exports `calculateInboundLinks(nodes, edges): Map<string, number>` (line 257); implements edge-count explicit + nonGlobalCount implicit contribution with globals-skip-implicit guard (line 277 `if (!n.data.isGlobal) continue`) |
| `packages/web/src/lib/graph-utils.test.ts` | verified | Contains `describe("calculateInboundLinks", ...)` at line 1341 (8 tests) AND re-homed `describe("buildTooltipContent", ...)` at line 2336 (6 tests) |

### Key Link Verification (Wiring)

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| App.tsx | useGraphAnalytics.inboundMap | destructure + `<SidePanel inboundMap={inboundMap}>` | wired | Lines 155 + 278 |
| SidePanel.tsx | PagesPanel.tsx | `import { PagesPanel }` + `<PagesPanel inboundMap={inboundMap} ... />` | wired | Lines 5 + 82-94 |
| PagesPanel.tsx | graph-analysis.ts | `import { getHealthStatus, hasAnyWarning, buildTooltipContent, OUTBOUND_WARNING_THRESHOLD, HealthStatus }` | wired | Lines 6-12 |
| PagesPanel.tsx | graph-pagerank.ts | `import { classifyScoreTier, ScoreTier }` | wired | Line 13 |
| PagesPanel.tsx | ScoreTierBadge.tsx | `import { ScoreTierBadge }` | wired | Line 17 |
| PagesPanel.tsx | @xyflow/react useReactFlow | `setNodes(...)` + `setTimeout(() => fitView({... duration: 300, padding: 0.5}), 50)` + `onNodeHighlight?.(id)` | wired | Lines 125, 210-216 |
| useGraphAnalytics.ts | graph-analysis.calculateInboundLinks | `import { calculateInboundLinks }` + `useMemo(() => calculateInboundLinks(nodes, edges), [nodes, edges])` | wired | Lines 12 + 69 |
| graph-utils.test.ts | graph-analysis.ts | `import { buildTooltipContent, calculateInboundLinks } from "./graph-analysis"` | wired | Import present; both describe blocks exercise imports |

All 8 key links wired.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| PagesPanel.tsx | `rows` (PageRow[]) | `nodes.map(...)` using real `scores`, `orphanNodes`, `unreachableNodes`, `weakNodes`, `depthMap`, `outboundMap`, `inboundMap`, `allScoreValues` props | yes | All props originate from `useGraphAnalytics(nodes, edges)` which executes live PageRank/BFS/inbound/outbound computations — not stubs |
| PagesPanel.tsx | `inbound` per row | `inboundMap.get(n.id)` | yes | `inboundMap` is the memoized result of `calculateInboundLinks(nodes, edges)` which enumerates edges + implicit globals — pure compute, no static return |
| PagesPanel.tsx | `tierCounts` | reduces over real `rows` with `classifyScoreTier(score, allScoreValues)` | yes | Counts drive the summary line; verified by `tier summary shows '2 Low · 2 Mid · 2 High' counts` test |
| SidePanel → PagesPanel props | `inboundMap` | App.tsx destructures from `useGraphAnalytics(nodes, edges)` — real hook | yes | Threaded end-to-end; no hardcoded empty `new Map()` at the call site |

All 4 traces flow real data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| TypeScript compilation clean | `cd packages/web && pnpm exec tsc --noEmit` | exit 0 | pass |
| Full vitest suite passes | `cd packages/web && pnpm exec vitest run` | 20 files / 394 tests / all passed, exit 0, duration 3.20s | pass |
| No residual ScorePanel/HealthPanel references | `grep -r "ScorePanel\|HealthPanel" packages/web/src/` | No matches found | pass |
| `calculateInboundLinks` is exported and importable | `grep -c "calculateInboundLinks" graph-analysis.ts` = 1 (export) | 1 export + 2 import sites + 10 test-file refs = full wire | pass |

All 4 spot-checks pass.

### Requirements Coverage

Phase 12 requirements are marked TBD in ROADMAP.md. Plans use placeholder IDs `TBD-12-INBOUND-MAP`, `TBD-12-PAGES-PANEL`, `TBD-12-CLEANUP`. Coverage is instead validated via the 4 ROADMAP Success Criteria and CONTEXT D-01..D-24 decisions above. No orphaned REQ-IDs exist (REQUIREMENTS.md has no Phase-12-specific entries).

### Anti-Patterns Found

Scanned `packages/web/src/components/PagesPanel.tsx`, `PagesPanel.test.tsx`, `SidePanel.tsx`, `App.tsx`, `hooks/useGraphAnalytics.ts`, `lib/graph-analysis.ts`, `lib/graph-utils.test.ts` for TODO/FIXME/XXX/HACK/PLACEHOLDER, empty returns, hardcoded empty data flowing to render, console.log-only impls, hardcoded empty props at call sites.

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | — | — | No anti-patterns found in Phase 12 surface area |

Note: `new Map()` / `new Set()` initializers appear in `PagesPanel.test.tsx:49-66` as default-prop fallbacks for the test render helper — this is a test fixture scaffold, not a production stub. Classified as not-a-stub per the skill rules (test helpers are exempt).

### Human Verification Required

None mandatory. All automated checks pass. Optional visual/UX spot-checks a PM could perform:

1. **240px side-panel width readability** — `renderPanel` default width is 240px; Line 1 cluster dots + truncated URL + warning icon should not clip at this width, and Line 2 `{score} · Depth n · in x · out y` + tier badge should remain on a single line. Unit tests assert structure but not visual layout.
2. **Warning badge hover tooltip copy** — orphan renders "Orphan — no inbound links", unreachable renders "Unreachable — no path from root", general renders combined `buildTooltipContent` output plus optional "Weak page (low PageRank)". Copy correctness is verified in unit tests; visual tooltip positioning is not.
3. **Click-to-highlight smoothness** — 300ms duration `fitView` should animate the canvas pan without jank; the 50ms setTimeout delay ensures React has applied the `selected` node update before the pan starts. Functional behavior verified; animation feel is not.

### Gaps Summary

No gaps found. All 24 derived must-haves (4 ROADMAP success criteria + 20 D-01..D-24 decisions with an implementation surface; D-23 is non-additive but confirmed) are verified in the codebase. The phase goal — "PMs can see every page's score, depth, inbound, outbound, and health warnings in one ranked list — no more switching between Score and Health tabs" — is achieved:

- Single Pages panel replaces both Score and Health tabs (D-01)
- Default sort puts weakest pages first via 4-tier issueGroup + score ascending (D-03, SC-2)
- 7 sort options + 2 filter controls (warnings-only + tier pills) give PMs query flexibility (D-05, D-06, SC-3)
- Click-to-highlight preserves legacy ScorePanel canvas-pan behavior verbatim (D-10, SC-4)
- `inboundMap` data plumbed end-to-end App → SidePanel → PagesPanel with 8 unit tests on the pure helper and 18 component tests

---

_Verified: 2026-04-21_
_Verifier: Claude (gsd-verifier)_
