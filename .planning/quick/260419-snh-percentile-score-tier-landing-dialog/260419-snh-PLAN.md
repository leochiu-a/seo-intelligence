---
phase: quick-260419-snh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/web/src/lib/graph-utils.ts
  - packages/web/src/lib/graph-utils.test.ts
  - packages/web/src/components/LegendDialog.tsx
autonomous: true
requirements:
  - SNH-01  # Percentile-based score tier classification
  - SNH-02  # Landing dialog explains relative ranking
must_haves:
  truths:
    - "When one node is an extreme outlier (e.g. 357k-page global node), the remaining nodes split into roughly equal thirds across high/mid/low — not all compressed into low."
    - "Score tier is determined by each node's RANK relative to the others, not by where its score falls in the linear min-max range."
    - "When a user opens the Landing/Legend dialog, the Score Tiers section clearly states that the ranking is relative (percentile-based) and that 'Low' does not mean the page is bad in absolute terms."
    - "Existing tier values (high / mid / low / neutral) and the classifyScoreTier(score, allScores) signature are preserved — all current callers (useGraphAnalytics, buildCopyForAIText) continue to work unchanged."
  artifacts:
    - path: "packages/web/src/lib/graph-utils.ts"
      provides: "Percentile-based classifyScoreTier implementation"
      contains: "function classifyScoreTier"
    - path: "packages/web/src/lib/graph-utils.test.ts"
      provides: "Updated + new tests covering percentile behavior"
      contains: "describe(\"classifyScoreTier\""
    - path: "packages/web/src/components/LegendDialog.tsx"
      provides: "Updated Score Tiers copy explaining relative ranking"
      contains: "Score Tiers"
  key_links:
    - from: "packages/web/src/hooks/useGraphAnalytics.ts"
      to: "packages/web/src/lib/graph-utils.ts"
      via: "classifyScoreTier(score, allScoreValues) — signature unchanged"
      pattern: "classifyScoreTier\\("
    - from: "packages/web/src/lib/graph-utils.ts"
      to: "packages/web/src/lib/graph-utils.ts (buildCopyForAIText)"
      via: "classifyScoreTier reused internally — must still accept (number, number[])"
      pattern: "classifyScoreTier\\("
---

<objective>
改用 percentile-based 分法計算 score tier，讓 `/zh-tw/product/{id}-{slug}` 這類極端 outlier 不再把其他 20 個 node 全部壓到 "low" tier；並在 Landing (Legend) dialog 說明評分是相對排名 (percentile)，而非絕對好壞。

Purpose: 現在 `classifyScoreTier` 用線性 (max-min) 分三等分，outlier 會主宰整個 range，其他 node 被壓到底部。改成按「排名百分位數」切分，讓 high/mid/low 各占約 1/3 的 node 數量，符合使用者對「排名」的直覺。同時要在 Landing dialog 澄清「Low 只代表『相對排名靠後』，不代表頁面本身品質差」。

Output:
- `classifyScoreTier` 改為按 rank 分成 top 33% / middle 33% / bottom 33%
- `graph-utils.test.ts` 既有斷言改為反映 percentile 行為，並新增一個 outlier case
- `LegendDialog.tsx` 的 Score Tiers 段落文案更新，強調 relative/percentile 排名
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/web/src/lib/graph-utils.ts
@packages/web/src/lib/graph-utils.test.ts
@packages/web/src/components/LegendDialog.tsx
@packages/web/src/hooks/useGraphAnalytics.ts

<interfaces>
<!-- Current contract of classifyScoreTier — signature MUST be preserved. -->
<!-- All callers pass `allScoreValues` = [...scores.values()] (unsorted). -->

From packages/web/src/lib/graph-utils.ts:
```typescript
export type ScoreTier = "high" | "mid" | "low" | "neutral";

export function classifyScoreTier(score: number, allScores: number[]): ScoreTier;
```

Callers (unchanged after refactor):
- packages/web/src/hooks/useGraphAnalytics.ts:67 — per-node enrichment in render loop
- packages/web/src/lib/graph-utils.ts:887 — buildCopyForAIText formatting

Existing edge cases (already in function — KEEP):
- `allScores.length <= 1` → "neutral"
- `min === max` (all equal) → "neutral"
</interfaces>

<existing_tests_that_will_break>
The current tests at graph-utils.test.ts:441-473 assert on LINEAR thirds of the range [0, 3]
with explicit cases like `classifyScoreTier(2.0, [0, 1, 2, 3]) → "high"`. Under percentile
classification over 4 values (ranks 0..3, cutoffs at n/3≈1.33 and 2n/3≈2.67), the rankings are:
  value 3 (rank 0) → high
  value 2 (rank 1) → mid    ← was "high" under linear
  value 1 (rank 2) → low    ← was "mid" under linear
  value 0 (rank 3) → low
These assertions MUST be updated in this plan.
</existing_tests_that_will_break>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Rewrite classifyScoreTier as percentile-based + update tests</name>
  <files>packages/web/src/lib/graph-utils.ts, packages/web/src/lib/graph-utils.test.ts</files>
  <behavior>
    NEW percentile-based behavior (test these FIRST in graph-utils.test.ts):

    - Test A (outlier case — the bug this plan fixes):
        scores = [100, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]  (n=12, 1 huge outlier + 11 close values)
        • classifyScoreTier(100, scores) === "high"
        • At LEAST one of [1.8, 1.9, 2.0] is classified "mid" (proves outlier doesn't compress everything to "low")
        • At LEAST one of [1, 1.1, 1.2] is classified "low"
        • The distribution is roughly balanced: count("high") ≈ count("mid") ≈ count("low") ≈ n/3 (each between floor(n/3) and ceil(n/3), i.e. 4±1)

    - Test B (exact-thirds on n=9):
        scores = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        • classifyScoreTier(9, scores) === "high"; classifyScoreTier(8, scores) === "high"; classifyScoreTier(7, scores) === "high"
        • classifyScoreTier(6, scores) === "mid"; classifyScoreTier(5, scores) === "mid"; classifyScoreTier(4, scores) === "mid"
        • classifyScoreTier(3, scores) === "low"; classifyScoreTier(2, scores) === "low"; classifyScoreTier(1, scores) === "low"

    - Test C (ties all get the same tier — tie bias "high"):
        scores = [5, 5, 5, 1, 1, 1]  (n=6, two distinct values tied in groups of 3)
        • classifyScoreTier(5, scores) === "high"  (all three 5s are top rank)
        • classifyScoreTier(1, scores) === "low"   (all three 1s are bottom rank)

    - Test D (existing edge cases — KEEP passing, no change needed):
        • classifyScoreTier(1.0, [1.0]) === "neutral"
        • classifyScoreTier(1.0, [1.0, 1.0, 1.0]) === "neutral"  (all equal)

    - Test E (small n=2 — degenerate: split gives 1 high / 1 low, no mid):
        scores = [10, 1]
        • classifyScoreTier(10, scores) === "high"
        • classifyScoreTier(1, scores) === "low"

    - Test F (REPLACE existing linear-thirds cases in graph-utils.test.ts lines 450-473):
        scores = [0, 1, 2, 3]  (n=4; cutoffs by rank: top ceil(4/3)=2 → high; next 1 → mid; bottom 1 → low — or equivalent balanced split)
        • classifyScoreTier(3, scores) === "high"
        • classifyScoreTier(2, scores) === "high"  (NOTE: was implicitly assumed but never tested under linear; under percentile with balanced-top-heavy split 2 is in top third by rank)
        • classifyScoreTier(1, scores) === "mid"
        • classifyScoreTier(0, scores) === "low"
        IMPORTANT: because n=4 does not divide evenly by 3, the exact split depends on implementation. Pick a rule in `<action>`, document it in the source file JSDoc, and match the test assertions to that rule. Do NOT fudge the test — align source + test on one documented rule.
  </behavior>
  <action>
    Step 1 — Update graph-utils.test.ts:
    1. Replace the existing `describe("classifyScoreTier", ...)` block at lines 441-474.
       - KEEP the two "neutral" cases (single element, all equal) verbatim.
       - REMOVE the 5 linear-thirds cases (lines 450-473).
       - ADD Test A, B, C, E, F from <behavior> above.
    2. Run the updated test file FIRST: `pnpm --filter web test -- graph-utils.test.ts`.
       The new tests MUST FAIL against the current linear implementation (this is the RED step).

    Step 2 — Rewrite classifyScoreTier in graph-utils.ts (lines 394-413):

    Algorithm (percentile-by-rank with explicit tie-to-high bias):
    ```
    function classifyScoreTier(score, allScores):
      if allScores.length <= 1: return "neutral"
      const min = Math.min(...allScores); const max = Math.max(...allScores)
      if min === max: return "neutral"

      // Sort ascending copy (do NOT mutate caller's array)
      const sorted = [...allScores].sort((a, b) => a - b)
      const n = sorted.length

      // Cutoff values by rank. Use Math.ceil so on uneven splits the TOP tier
      // gets the extra slot (matches user intuition: "top third, generously").
      // highCutoffIdx = first index of top third
      const highCutoffIdx = n - Math.ceil(n / 3)          // e.g. n=9 → 6; n=4 → 2
      const midCutoffIdx = n - Math.ceil((2 * n) / 3)     // e.g. n=9 → 3; n=4 → 1

      const highThreshold = sorted[highCutoffIdx]
      const midThreshold  = sorted[midCutoffIdx]

      if (score >= highThreshold) return "high"
      if (score >= midThreshold)  return "mid"
      return "low"
    ```

    Tie handling: because we compare with `>=` against the cutoff value, all scores equal to
    `sorted[highCutoffIdx]` land in "high" (tie-to-high bias). This is intentional and
    user-friendly — ties don't arbitrarily split.

    Why Math.ceil (not Math.floor): for n=4 this produces
      highCutoffIdx = 4 - ceil(4/3) = 4 - 2 = 2 → highThreshold = sorted[2] = 2
      midCutoffIdx  = 4 - ceil(8/3) = 4 - 3 = 1 → midThreshold  = sorted[1] = 1
    Classification:
      3 >= 2 → high; 2 >= 2 → high; 1 >= 1 → mid; 0 < 1 → low.  (2/1/1 split — top tier wins extra slot)

    Why NOT sort on every call is a perf concern: current callers (useGraphAnalytics) call
    this per-node in `enrichedNodes` useMemo, so with N nodes we do N sorts of length N (O(N² log N)).
    For the MVP scale (typically <100 nodes) this is fine, but ADD a JSDoc note acknowledging it
    and pointing at a future optimization (memoize `sorted` in the caller, or add an overload
    accepting pre-sorted thresholds). Do NOT actually optimize now — out of scope.

    Step 3 — Update the JSDoc comment above classifyScoreTier to describe the new algorithm:
      "Classifies a score into a tier based on its RANK among allScores (percentile-based).
       Top ~1/3 by rank → 'high', middle ~1/3 → 'mid', bottom ~1/3 → 'low'. Ties bias to the
       higher tier. Rationale: linear min-max thirds compresses all nodes into 'low' when one
       outlier dominates the range (e.g. a global node with 357k pages). Returns 'neutral' when
       allScores.length <= 1 or all scores are equal."

    Step 4 — Run tests again: `pnpm --filter web test -- graph-utils.test.ts`. All must pass (GREEN).

    Step 5 — Run the full web test suite: `pnpm --filter web test` to catch any other test that
    was asserting on tier values from the old linear logic (e.g. tests that build a graph then
    check a node's tier via enrichedNodes). Fix any regressions by adjusting test fixtures, NOT
    the algorithm.
  </action>
  <verify>
    <automated>pnpm --filter web test -- graph-utils.test.ts</automated>
  </verify>
  <done>
    - classifyScoreTier uses rank-based percentile split with Math.ceil top-heavy tie-break
    - JSDoc updated to describe percentile behavior + tie-to-high bias + perf note
    - All new test cases (A, B, C, E, F) pass
    - All existing neutral-edge-case tests still pass
    - `pnpm --filter web test` passes the whole suite (no collateral breakage)
  </done>
</task>

<task type="auto">
  <name>Task 2: Update LegendDialog Score Tiers copy to explain relative ranking</name>
  <files>packages/web/src/components/LegendDialog.tsx</files>
  <action>
    Update the "Score Tiers" section in LegendDialog.tsx (currently lines 43-78) to clearly
    communicate that the ranking is RELATIVE (percentile-based) — not an absolute quality score.

    Specific edits:

    1. Replace the first paragraph (lines 47-51), currently:
       > "Each node's score reflects how well it is connected internally — pages that receive
       >  more links from well-connected pages score higher. Nodes are split into thirds (High /
       >  Mid / Low) relative to the rest of the graph."

       With something clearer about relative ranking. Use this Traditional Chinese + English
       mixed style to match the project's existing dialog voice (keep the paragraph in English —
       the existing dialog is English-only; do NOT introduce zh-TW into the dialog body, only
       sharpen the English wording):

       > "Each node's score reflects how well it is connected internally — pages that receive
       >  more links from well-connected pages score higher.

       > The **High / Mid / Low** label is a **relative ranking**: nodes are ordered by score
       >  and split into roughly equal thirds. A page tagged **Low** only means it is in the
       >  bottom third of *this* graph — it does **not** mean the page is bad in absolute terms.
       >  If you add one extreme-outlier node (e.g. a global page with hundreds of thousands of
       >  pages), every other node's label is measured relative to the new outlier-inclusive
       >  ranking."

       Render as two <p> elements inside the existing `flex flex-col gap-3` wrapper (matching the
       pattern of the second existing paragraph about "High-scoring page passes more link equity").
       Use `<strong className="text-gray-700">` for the emphasis spans (matches existing style on
       lines 55-56 and 157-178).

    2. Update the three LegendRow `description` props (lines 60-72) to reinforce the relative framing:
       - High: "Top ~1/3 of nodes by score — best-connected pages in this graph."
       - Mid:  "Middle ~1/3 by score — solid but not dominant within this graph."
       - Low:  "Bottom ~1/3 by score within this graph. Relative, not absolute — still may be a valuable page."
       (Keep the Neutral row at line 73-77 unchanged — its "Not enough data yet to rank this node." wording is still accurate.)

    3. Do NOT change the BADGE constant, DialogContent sizing, icon imports, or any other section
       (Node Labels, Warnings, How to Improve, Tags/Clusters). Scope is strictly the Score Tiers
       block.

    4. No test file changes required for this task. LegendDialog has no dedicated test file
       (confirmed via `ls packages/web/src/components/ | grep -i legend`). If a smoke test is
       desired later, it would go in a new file — out of scope here.
  </action>
  <verify>
    <automated>pnpm --filter web build && pnpm --filter web lint</automated>
  </verify>
  <done>
    - Score Tiers section contains a paragraph explicitly calling the ranking "relative" and
      stating that "Low" does not mean the page is bad in absolute terms
    - The three tier description strings reference "Top/Middle/Bottom ~1/3 of nodes" (rank-based
      framing), not "Top/Middle/Bottom third of the score range" (value-based framing)
    - `pnpm --filter web build` succeeds (no TS errors)
    - `pnpm --filter web lint` succeeds
    - No unrelated sections of LegendDialog are touched
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification of percentile scoring + updated Landing dialog</name>
  <what-built>
    - Score tier classification now uses percentile-by-rank with Math.ceil top-heavy split
    - LegendDialog Score Tiers section rewritten to explain relative ranking
  </what-built>
  <how-to-verify>
    1. Start the dev server: `pnpm --filter web dev`
    2. Import the outlier fixture: use the "Import JSON" toolbar button and load
       `fixture-kkday.json` (at project root — the 21-node fixture with the 357k-page global node).
    3. Observe the Score Panel (right sidebar) and the canvas node badges:
       - Expected: nodes are distributed across **High / Mid / Low** tiers — roughly 7 / 7 / 7
         (not all 20 non-outlier nodes compressed into "Low" as before).
       - The global outlier node should still be "High".
       - At least a handful of nodes should show "Mid" badges on the canvas.
    4. Open the Landing / Legend dialog via the toolbar info button.
       - Expected: Score Tiers section starts with the relative-ranking explanation.
       - The word "relative" appears prominently.
       - The three tier descriptions mention "Top/Middle/Bottom ~1/3 of nodes".
    5. Try removing the outlier node and confirm remaining nodes re-balance across thirds
       (High/Mid/Low should re-split among the 20 remaining nodes).
    6. Sanity check: run `pnpm --filter web test` one more time to confirm the full suite
       is still green.
  </how-to-verify>
  <resume-signal>Type "approved" if both the distribution looks balanced and the dialog copy reads well; otherwise describe what looks off (e.g. "too many still in low" → revisit Math.ceil rule; "copy too wordy" → tighten paragraph).</resume-signal>
</task>

</tasks>

<verification>
- `pnpm --filter web test` — full web suite passes
- `pnpm --filter web build` — no TS errors
- `pnpm --filter web lint` — no lint errors
- Manual: fixture-kkday.json produces balanced tier distribution on canvas
- Manual: LegendDialog Score Tiers section explains relative ranking
</verification>

<success_criteria>
- `classifyScoreTier` is rank/percentile-based (not linear min-max thirds)
- With the 21-node kkday fixture, node tier counts are roughly balanced (7±2 per tier),
  not 1-high / 0-mid / 20-low
- LegendDialog's Score Tiers section uses the words "relative" and "ranking" (or equivalent)
  and explicitly states "Low" is not an absolute quality judgment
- No behavioral regression in `useGraphAnalytics`, `buildCopyForAIText`, or any other caller —
  signature `(number, number[]) → ScoreTier` is preserved
- All `classifyScoreTier` tests reflect percentile semantics (old linear-thirds assertions removed)
</success_criteria>

<output>
After completion, create `.planning/quick/260419-snh-percentile-score-tier-landing-dialog/260419-snh-SUMMARY.md` following the standard quick-task summary template.

Commit message style (follows commitlint + the project's bilingual convention seen in recent commits like "feat(web): use destructive variant for Clear Canvas confirm button"):

- Task 1 commit: `refactor(web): use percentile ranking for score tier classification`
- Task 2 commit: `docs(web): explain relative ranking in Landing dialog Score Tiers section`
  (or combine both into a single commit if preferred: `feat(web): switch score tier to percentile and clarify in Landing dialog`)
</output>
