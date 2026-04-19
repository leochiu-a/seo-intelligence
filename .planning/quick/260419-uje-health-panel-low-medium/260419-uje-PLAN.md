---
phase: quick-260419-uje
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/web/src/components/HealthPanel.tsx
  - packages/web/src/components/HealthPanel.test.tsx
  - packages/web/src/components/SidePanel.tsx
autonomous: true
requirements:
  - UJE-01  # Surface Low & Mid (percentile) pages in the Health tab so PMs can see attention-worthy pages beyond hasWarn rows
user_setup: []

must_haves:
  truths:
    - "User opens the Health tab and, in addition to the existing warnings list, sees a section listing every page whose score tier is Low or Mid"
    - "Each Low/Mid row shows the URL template and its tier (Low / Mid) using the existing tier color tokens"
    - "If no scores are computed yet (empty graph or allScoreValues produces only 'neutral'), the Low/Mid section is hidden — no empty-state clutter"
    - "The existing 'Show warnings only' checkbox continues to filter the warnings list only; it does NOT hide the Low/Mid section"
    - "Clicking nothing is fine — this section is read-only, matching the existing HealthPanel row behavior"
  artifacts:
    - path: "packages/web/src/components/HealthPanel.tsx"
      provides: "Score Tier section (Low + Mid) rendered alongside existing warnings list"
      contains: "scoreTier"
    - path: "packages/web/src/components/HealthPanel.test.tsx"
      provides: "Tests covering Low/Mid section visibility, hiding when all neutral, interaction with Show-warnings-only checkbox"
      contains: "score-tier-row"
    - path: "packages/web/src/components/SidePanel.tsx"
      provides: "Passes scores + allScoreValues down to HealthPanel so it can classify tiers"
      contains: "allScoreValues"
  key_links:
    - from: "packages/web/src/components/SidePanel.tsx"
      to: "packages/web/src/components/HealthPanel.tsx"
      via: "props scores={scores} allScoreValues={allScoreValues}"
      pattern: "<HealthPanel[\\s\\S]*allScoreValues"
    - from: "packages/web/src/components/HealthPanel.tsx"
      to: "packages/web/src/lib/graph-utils.ts"
      via: "import { classifyScoreTier }"
      pattern: "classifyScoreTier\\("
---

<objective>
Extend the Health Panel to surface pages ranked Low or Mid by the percentile score tier classifier, not just pages that trigger `hasAnyWarning`. Low/Mid pages are the PM's primary attention list — high-tier pages are already strong and can be safely ignored.

Purpose: Today, a PM opening the Health tab only sees pages that tripped the 3-metric warning (outbound > 150, depth > 3, no tags). That misses a large swath of weak pages whose PageRank sits in the bottom two-thirds of the graph. The user explicitly wants the Health Panel to show these.

Output: `HealthPanel` renders a new "Score Tier" section listing every Low/Mid page under the existing warnings list. Wired with `scores` and `allScoreValues` propagated through `SidePanel` from the existing `useGraphAnalytics` hook. Test coverage added.

Design decision (planner discretion — per constraints):
Chose **add a separate "Score Tier" section** inside HealthPanel rather than a tier filter or a whole new panel, for three reasons:
1. The user's warnings list and the Low/Mid list answer different questions ("what is broken" vs "what is weak"). Merging them with a filter would conflate them.
2. The "Show warnings only" checkbox already exists and scopes the warnings list — adding a tier filter would create two overlapping filter UIs. A separate section keeps each concern atomic.
3. Minimal disruption: the warnings list keeps its exact current behavior (per constraints — "Keep existing 'Show warnings only' behavior working"). The Score Tier section is purely additive.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Existing HealthPanel + its test — authoritative starting point
@packages/web/src/components/HealthPanel.tsx
@packages/web/src/components/HealthPanel.test.tsx

# SidePanel — owns the Health tab and already receives scores; it will forward them down
@packages/web/src/components/SidePanel.tsx

# graph-utils — classifyScoreTier + ScoreTier type live here; signature is (score, allScores)
@packages/web/src/lib/graph-utils.ts

# App.tsx → useGraphAnalytics → allScoreValues (already computed, already passed to SidePanel)
@packages/web/src/App.tsx

# Background: the percentile classifier this feature depends on was finalized in 260419-snh
@.planning/quick/260419-snh-percentile-score-tier-landing-dialog/260419-snh-SUMMARY.md

<interfaces>
<!-- Extracted from codebase so executor does not need to spelunk. -->

From packages/web/src/lib/graph-utils.ts:
```typescript
export type ScoreTier = "high" | "mid" | "low" | "neutral";

export function classifyScoreTier(score: number, allScores: number[]): ScoreTier;
//   Returns "neutral" when allScores.length <= 1 or all scores equal.
//   Otherwise returns "low" | "mid" | "high" based on percentile rank.
```

From packages/web/src/hooks/useGraphAnalytics.ts (already wired in App.tsx):
```typescript
const {
  scores,          // Map<string, number>
  allScoreValues,  // number[]  — already memoized from [...scores.values()]
  ...
} = useGraphAnalytics(nodes, edges);
```

From packages/web/src/components/SidePanel.tsx — current HealthPanel call site (line 98):
```tsx
<HealthPanel nodes={nodes} depthMap={depthMap} outboundMap={outboundMap} />
```
Note: `SidePanelProps` already includes `scores: Map<string, number>`. Only `allScoreValues` needs to be added to the prop interface and plumbed through from App.tsx.

From packages/web/src/components/HealthPanel.tsx — current props:
```typescript
interface HealthPanelProps {
  nodes: Node<UrlNodeData>[];
  depthMap: Map<string, number>;
  outboundMap: Map<string, number>;
}
```

Existing tier color tokens in packages/web/src/index.css (already used by UrlNode.tsx TONE_MAP):
- --color-tier-high, --color-tier-mid, --color-tier-low
- Tailwind arbitrary values already present: `bg-red-100 text-red-700` (Low badge), `bg-amber-100 text-amber-700` (Mid badge) — reuse for consistency.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Plumb scores + allScoreValues into HealthPanel and render Low/Mid Score Tier section</name>
  <files>
    packages/web/src/components/HealthPanel.tsx,
    packages/web/src/components/SidePanel.tsx,
    packages/web/src/App.tsx,
    packages/web/src/components/HealthPanel.test.tsx
  </files>
  <behavior>
    Tests to add to HealthPanel.test.tsx (TDD — write first, watch fail, then implement):

    1. "renders a Score Tier section listing Low and Mid pages in addition to warnings":
       - Build 6 nodes with distinct synthetic scores so classifyScoreTier produces 2 high / 2 mid / 2 low (use n=6 → highFirstIdx=4, midFirstIdx=2 per existing algorithm).
       - All 6 have `tags: ["t"]` (no warnings) so the warnings list is empty and we prove the tier section is independent.
       - Pass `scores={Map<id, number>}` and `allScoreValues={[...scores.values()]}`.
       - Expect `screen.getByTestId("score-tier-section")` to exist.
       - Expect exactly 4 `screen.getAllByTestId("score-tier-row")` rows (the 2 low + 2 mid, NOT the high ones).
       - Each row exposes `data-tier="low"` or `data-tier="mid"`.

    2. "Score Tier section hides when allScoreValues is empty (no scoring computed yet)":
       - Pass `scores={new Map()}` and `allScoreValues={[]}`.
       - Expect `screen.queryByTestId("score-tier-section")` to be null.

    3. "Score Tier section hides when all nodes classify as 'neutral' (allScoreValues.length <= 1 OR min === max)":
       - Single node with score=1.0, allScoreValues=[1.0] → classifier returns "neutral".
       - Expect `screen.queryByTestId("score-tier-section")` to be null.

    4. "Score Tier section is NOT affected by the 'Show warnings only' checkbox":
       - Same 6-node fixture as test 1.
       - Click the `warnings-only-toggle`.
       - Expect `screen.getAllByTestId("score-tier-row")` to still have length 4.

    5. "Score Tier rows are sorted: low tier before mid tier, then alphabetical by urlTemplate within each tier":
       - Build nodes with templates in deliberately non-alphabetical order.
       - Expect rendered order: all low rows first (alphabetical), then all mid rows (alphabetical).

    6. "Score Tier header shows count like 'N pages need attention'":
       - 6-node fixture (2 low + 2 mid → 4 attention-worthy pages).
       - `screen.getByTestId("score-tier-summary")` contains "4 pages need attention".
  </behavior>
  <action>
    Implements design decision: add a separate "Score Tier" section inside HealthPanel. Addresses constraint: "Keep existing 'Show warnings only' behavior working; consider how it composes with the new Low/Mid listing."

    Step 1 — HealthPanel props: extend `HealthPanelProps` in `packages/web/src/components/HealthPanel.tsx`:
    ```typescript
    interface HealthPanelProps {
      nodes: Node<UrlNodeData>[];
      depthMap: Map<string, number>;
      outboundMap: Map<string, number>;
      scores: Map<string, number>;        // NEW
      allScoreValues: number[];           // NEW
    }
    ```

    Step 2 — HealthPanel body:
    - Add `import { classifyScoreTier, type ScoreTier } from "../lib/graph-utils";` (extend the existing graph-utils import line).
    - Add a second `useMemo` after the existing `rows` memo:
      ```typescript
      const tierRows = useMemo(() => {
        if (allScoreValues.length === 0) return [];
        return nodes
          .map((n) => ({
            id: n.id,
            urlTemplate: n.data.urlTemplate,
            tier: classifyScoreTier(scores.get(n.id) ?? 0, allScoreValues),
          }))
          .filter((r) => r.tier === "low" || r.tier === "mid")
          .sort((a, b) => {
            // low before mid, then alphabetical by urlTemplate
            if (a.tier !== b.tier) return a.tier === "low" ? -1 : 1;
            return a.urlTemplate.localeCompare(b.urlTemplate);
          });
      }, [nodes, scores, allScoreValues]);
      ```
    - Render the section BELOW the existing warnings `<ul>` (still inside the outer `data-testid="health-panel"` div). Gate on `tierRows.length > 0` — when empty, render nothing (hides per truth #3).
    - Section structure:
      ```tsx
      {tierRows.length > 0 && (
        <div data-testid="score-tier-section">
          <div className="px-3 py-2.5 border-t border-border">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
              Score Tier
            </h2>
            <p className="text-[11px] text-muted-fg mt-1" data-testid="score-tier-summary">
              {tierRows.length} pages need attention
            </p>
          </div>
          <ul className="divide-y divide-border">
            {tierRows.map((row) => (
              <li
                key={row.id}
                data-testid="score-tier-row"
                data-tier={row.tier}
                className="px-3 py-2.5 flex items-center gap-2"
              >
                <span className="flex-1 min-w-0 text-sm text-dark truncate">{row.urlTemplate}</span>
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${
                    row.tier === "low" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {row.tier === "low" ? "Low" : "Mid"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      ```
      Rationale: badge classes mirror UrlNode.tsx `TONE_MAP` (low=red-100/red-700, mid=amber-100/amber-700) for visual consistency. `border-t` separates this section from the warnings list above.

    Step 3 — SidePanel plumbing (`packages/web/src/components/SidePanel.tsx`):
    - Add `allScoreValues: number[];` to `SidePanelProps`.
    - Destructure `allScoreValues` in the component signature.
    - Update the HealthPanel call site (line 98) to:
      ```tsx
      <HealthPanel
        nodes={nodes}
        depthMap={depthMap}
        outboundMap={outboundMap}
        scores={scores}
        allScoreValues={allScoreValues}
      />
      ```
      `scores` is already in props — only `allScoreValues` is net-new plumbing.

    Step 4 — App.tsx wiring (`packages/web/src/App.tsx`):
    - `allScoreValues` is already destructured from `useGraphAnalytics` (line 152).
    - Add `allScoreValues={allScoreValues}` to the `<SidePanel ... />` JSX (around line 271-284).

    Step 5 — Update existing HealthPanel tests:
    The current test calls `render(<HealthPanel nodes={...} depthMap={...} outboundMap={...} />)` without the new required props. These will now be TS errors. Update every existing `render(<HealthPanel .../>)` in `HealthPanel.test.tsx` to include:
    ```tsx
    scores={new Map()} allScoreValues={[]}
    ```
    This preserves the existing test semantics (no tier section will render because allScoreValues is empty — safe for all 9 existing tests).

    Step 6 — Add the 6 new tests from `<behavior>` block.

    Do NOT:
    - Do NOT modify classifyScoreTier — its signature is frozen per 260419-snh SUMMARY decisions.
    - Do NOT add a tier filter UI or merge with the warnings-only checkbox — chosen design keeps them independent.
    - Do NOT make high pages visible in this section — the user explicitly asked for Low & Medium only.
    - Do NOT click-handle the score-tier-row — matches existing HealthPanel read-only row behavior (see existing test "rows do NOT respond to click").
  </action>
  <verify>
    <automated>cd packages/web && pnpm test -- --run HealthPanel.test.tsx</automated>
  </verify>
  <done>
    - All existing HealthPanel tests still pass (9 tests).
    - 6 new tests pass.
    - `pnpm --filter web tsc --noEmit` (or the project's typecheck) shows no type errors introduced in HealthPanel.tsx, HealthPanel.test.tsx, SidePanel.tsx, App.tsx.
    - `pnpm --filter web lint` clean on the changed files.
    - Manual smoke (not required for automated verify): opening the Health tab with a graph of mixed-score nodes shows the new "Score Tier" section listing Low and Mid pages.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Visual verification of the Low/Mid Score Tier section</name>
  <what-built>
    HealthPanel now renders a "Score Tier" section below the existing warnings list, showing every Low and Mid page with a colored tier badge (red = Low, amber = Mid). The section hides when no scores are computed. The existing "Show warnings only" checkbox is unchanged and does not affect this new section.
  </what-built>
  <how-to-verify>
    1. Run `pnpm --filter web dev` and open the app.
    2. Import a fixture with enough nodes to produce a mix of tiers — recommended: open `fixture-kkday.json` (present at repo root, already mentioned in git status) or any scenario with 6+ nodes.
    3. Click the **Health** tab in the left sidebar.
    4. Confirm:
       - The existing warnings summary ("N / M pages have warnings") is still at the top, unchanged.
       - Below the warnings list, a new **Score Tier** header appears with "N pages need attention".
       - The list shows URL templates, each with a Low (red) or Mid (amber) pill on the right.
       - Low rows appear before Mid rows; within each tier, rows are alphabetically sorted.
       - Toggling the "Show warnings only" checkbox changes ONLY the warnings list above — the Score Tier section count and rows are unchanged.
    5. Clear the canvas (Toolbar → Clear Canvas → confirm). Confirm the Score Tier section disappears entirely (no empty-state text, no header).
    6. Add a single node with default settings. Confirm the Score Tier section is still hidden (only 1 node → classifyScoreTier returns "neutral" → filtered out).
  </how-to-verify>
  <resume-signal>Type "approved" if all 6 checks pass, or describe the discrepancy so Claude can fix.</resume-signal>
</task>

</tasks>

<verification>
- `pnpm --filter web test` — full web test suite green (or at least no new failures beyond the pre-existing EditPopover / useScenarioHandlers failures documented in 260419-snh SUMMARY).
- `pnpm --filter web tsc --noEmit` — no new TypeScript errors.
- `pnpm --filter web lint` — no new lint warnings.
- Grep `classifyScoreTier` in HealthPanel.tsx → present.
- Grep `allScoreValues` in SidePanel.tsx and App.tsx `<SidePanel` JSX → present.
</verification>

<success_criteria>
1. Opening the Health tab with a multi-node graph shows a "Score Tier" section listing every Low and Mid page.
2. Each Low/Mid row shows the URL template plus a Low (red) or Mid (amber) pill.
3. Empty/single-node/all-equal-score graphs hide the Score Tier section entirely.
4. The "Show warnings only" checkbox only affects the warnings list above — never the Score Tier section.
5. All 9 pre-existing HealthPanel tests still pass, plus the 6 new behavior tests.
6. No type or lint regressions.
</success_criteria>

<output>
After completion, create `.planning/quick/260419-uje-health-panel-low-medium/260419-uje-SUMMARY.md`.

Commit message (commitlint-style, per user's global rule):
```
feat(web): surface Low & Mid pages in Health Panel score tier section
```
If split into two commits (tests first, then implementation), use:
```
test(web): add failing tests for Health Panel Low/Mid score tier section
feat(web): render Low & Mid pages in Health Panel score tier section
```
</output>
