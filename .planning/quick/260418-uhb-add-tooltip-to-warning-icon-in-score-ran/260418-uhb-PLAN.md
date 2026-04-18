---
phase: quick
plan: 260418-uhb
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/web/src/components/ScoreSidebar.tsx
  - packages/web/src/components/ScoreSidebar.test.tsx
autonomous: true
requirements: [UX-WARN-01]
must_haves:
  truths:
    - "Hovering the warning triangle (TriangleAlert) next to a ranked page in the Score Ranking panel shows a tooltip explaining why the page is flagged as weak"
    - "The tooltip copy tells the user the page's PageRank score is significantly below average (below mean minus one standard deviation) and suggests adding more inbound internal links"
    - "Keyboard focus on the warning icon also reveals the tooltip (focus-triggered, matching base-ui Tooltip default behavior)"
    - "The existing weakNodes logic and icon placement remain unchanged — only the hover affordance is added"
  artifacts:
    - path: "packages/web/src/components/ScoreSidebar.tsx"
      provides: "TriangleAlert icon wrapped in <Tooltip>/<TooltipTrigger>/<TooltipContent> for weak nodes in the main Score Ranking list"
      contains: "Tooltip"
    - path: "packages/web/src/components/ScoreSidebar.test.tsx"
      provides: "Test confirming the weak-node warning icon renders an accessible tooltip trigger with descriptive content"
  key_links:
    - from: "packages/web/src/components/ScoreSidebar.tsx"
      to: "packages/web/src/components/ui/tooltip.tsx"
      via: "import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'"
      pattern: "from '@/components/ui/tooltip'"
    - from: "packages/web/src/components/ScoreSidebar.tsx"
      to: "packages/web/src/App.tsx"
      via: "TooltipProvider already wraps <AppInner /> at App.tsx line 667 — no extra provider needed"
      pattern: "TooltipProvider"
---

<objective>
Add a tooltip to the TriangleAlert ("weak page") warning icon in the ScoreSidebar's Score Ranking list so PMs understand why a page is flagged instead of seeing an unexplained icon.

Purpose: The warning icon next to low-ranking URLs (e.g. "/") currently has no explanation, causing poor UX. A hover/focus tooltip explains that the page's PageRank score is significantly below average and hints at the remediation (add more inbound links).

Output: ScoreSidebar renders each weak-node TriangleAlert inside a shadcn-style Tooltip (Base UI under the hood) using the exact same pattern already proven in HealthPanel.tsx.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/web/src/components/ScoreSidebar.tsx
@packages/web/src/components/ScoreSidebar.test.tsx
@packages/web/src/components/HealthPanel.tsx
@packages/web/src/components/ui/tooltip.tsx
@packages/web/src/lib/graph-utils.ts
@packages/web/src/App.tsx

<interfaces>
<!-- Key contracts the executor needs. Do NOT re-discover these. -->

Tooltip component API (from `packages/web/src/components/ui/tooltip.tsx`):
```typescript
// Exports
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
// Usage:
//   <Tooltip>
//     <TooltipTrigger className="..." data-testid="...">
//       <IconOrChildren />
//     </TooltipTrigger>
//     <TooltipContent>tooltip text — supports whitespace-pre-line for \n</TooltipContent>
//   </Tooltip>
// TooltipContent default side="top", delay={0} via TooltipProvider at App root.
```

Proven pattern in `packages/web/src/components/HealthPanel.tsx` (lines 89-100):
```tsx
<Tooltip>
  <TooltipTrigger
    data-testid="warning-icon"
    className="text-amber-500 flex-shrink-0 cursor-default inline-flex outline-none"
  >
    <TriangleAlert size={14} />
  </TooltipTrigger>
  <TooltipContent>
    {buildTooltipContent(row.status)}
  </TooltipContent>
</Tooltip>
```

Current ScoreSidebar weak-icon site (`packages/web/src/components/ScoreSidebar.tsx` lines 283-285):
```tsx
{weakNodes.has(item.id) && (
  <TriangleAlert size={14} className="text-amber-500 mt-0.5 flex-shrink-0" aria-label="Weak page" />
)}
```

Weak-node definition (`packages/web/src/lib/graph-utils.ts` lines 424-432):
```
identifyWeakNodes(scores): returns Set of node ids with score < (mean - 1 stddev).
Empty when <=1 node or stddev=0.
```

TooltipProvider root wiring (`packages/web/src/App.tsx` lines 26, 667-671) — ALREADY PRESENT:
```tsx
import { TooltipProvider } from './components/ui/tooltip';
// ...
return (
  <TooltipProvider>
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  </TooltipProvider>
);
```
Therefore: no provider wiring needed in this plan — just wrap the icon.

Test harness pattern (`packages/web/src/components/ScoreSidebar.test.tsx` lines 1-7, 245-252):
- Tests render `<ReactFlowProvider><ScoreSidebar ... /></ReactFlowProvider>` via `renderSidebar` helper.
- HealthPanel tests (`HealthPanel.test.tsx`) do NOT wrap in TooltipProvider — rendering the trigger + content works without it; only open-state animations require the provider. Assertions on `getByTestId('warning-icon')` and visible text are safe.
- Existing assertion: `expect(screen.getByLabelText('Weak page')).toBeTruthy()` — must keep working after the refactor (TriangleAlert still carries `aria-label="Weak page"`).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wrap weak-node TriangleAlert in Tooltip with explanatory copy</name>
  <files>packages/web/src/components/ScoreSidebar.tsx, packages/web/src/components/ScoreSidebar.test.tsx</files>
  <behavior>
    - Existing test "weak node icon appears on child nodes too" (line 245-252) MUST still pass — the TriangleAlert keeps `aria-label="Weak page"`.
    - New test: rendering a weak node exposes a tooltip trigger (`getByTestId('score-weak-warning')`) whose accessible text / inner `TooltipContent` contains the word "weak" or "below average" so PMs can read the explanation.
    - New test: non-weak nodes do NOT render the tooltip trigger (absence of `score-weak-warning` testid) — parity with current `weakNodes.has(item.id)` conditional.
  </behavior>
  <action>
    Edit `packages/web/src/components/ScoreSidebar.tsx`:

    1. Add the import at the top (after the existing `HealthPanel` import):
       ```ts
       import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
       ```

    2. Replace the current weak-icon block (lines 283-285):
       ```tsx
       {weakNodes.has(item.id) && (
         <TriangleAlert size={14} className="text-amber-500 mt-0.5 flex-shrink-0" aria-label="Weak page" />
       )}
       ```
       with a Tooltip-wrapped version that mirrors the HealthPanel pattern. Keep the TriangleAlert element IDENTICAL (same size, same className, same aria-label) so existing tests and visual layout are untouched:
       ```tsx
       {weakNodes.has(item.id) && (
         <Tooltip>
           <TooltipTrigger
             data-testid="score-weak-warning"
             className="flex-shrink-0 cursor-default inline-flex outline-none mt-0.5"
             // Prevent the tooltip trigger's click from bubbling to the row button
             // (row <button> calls handleClick which fitViews — unwanted when user just wants to read the tooltip).
             onClick={(e) => e.stopPropagation()}
           >
             <TriangleAlert size={14} className="text-amber-500" aria-label="Weak page" />
           </TooltipTrigger>
           <TooltipContent>
             This page's PageRank score is significantly below average (below mean − 1σ). Consider adding more inbound internal links to strengthen it.
           </TooltipContent>
         </Tooltip>
       )}
       ```

       Rationale for choices:
       - `data-testid="score-weak-warning"` — distinct from HealthPanel's `warning-icon` testid to avoid collision when both panels render in the same test tree.
       - Keeping `aria-label="Weak page"` on the inner `<TriangleAlert>` preserves the existing assertion `screen.getByLabelText('Weak page')` in line 251.
       - `cursor-default inline-flex outline-none` copy/pasted from HealthPanel trigger for visual consistency.
       - `onClick={(e) => e.stopPropagation()}` — the parent `<button>` in the ranking row runs `handleClick(nodeId)` which triggers `fitView`. Users hovering the warning should not also trigger navigation on click; stopping propagation keeps the icon as a pure informational affordance. Moving the `mt-0.5` margin from the SVG up to the trigger keeps baseline alignment with the adjacent text node.
       - Copy chosen to be short but actionable, referencing the real algorithm (mean − 1 stddev per `identifyWeakNodes`) in accessible language and suggesting a concrete next step (add inbound links) — directly addressing the "doesn't explain WHY it appears" feedback.

    3. Add a new test block to `packages/web/src/components/ScoreSidebar.test.tsx` immediately after the existing "weak node icon appears on child nodes too" test (~line 252). Do NOT modify the existing test — it must continue to pass unchanged.
       ```ts
       it('weak node renders tooltip trigger with explanatory content', () => {
         const blog = makeNode('n1', '/blog');
         const cat = makeNode('n2', '/blog/category');
         const scores = new Map([['n1', 0.8], ['n2', 0.3]]);
         const weakNodes = new Set(['n2']);
         renderSidebar([blog, cat], scores, weakNodes);
         const trigger = screen.getByTestId('score-weak-warning');
         expect(trigger).toBeTruthy();
         // The tooltip's content node is rendered in the DOM (base-ui Tooltip renders lazily on open,
         // but the textual content lives as a child of the Tooltip root and is queryable via text match).
         expect(screen.getByText(/below average/i)).toBeTruthy();
       });

       it('non-weak nodes do NOT render the tooltip trigger', () => {
         const blog = makeNode('n1', '/blog');
         const scores = new Map([['n1', 0.8]]);
         renderSidebar([blog], scores, new Set());
         expect(screen.queryByTestId('score-weak-warning')).toBeNull();
       });
       ```

       Note on the `getByText(/below average/i)` assertion: Base UI's Tooltip uses `<TooltipPrimitive.Portal>` which may render content into `document.body` only when open. If `getByText` fails because the Portal hasn't opened, fall back to asserting the trigger's presence and optionally firing a `mouseEnter`/`focus` event + using `findByText` with a short timeout. If the portal renders lazily and the simpler assertion cannot be made reliable, delete the `getByText` line and keep only the trigger assertion — the key regression guard is that the trigger exists with the correct testid and that non-weak nodes do not get one.

    Running `pnpm --filter web test -- ScoreSidebar` locally must show green with all existing tests + the 2 new tests. Do not modify any other tests.
  </action>
  <verify>
    <automated>cd packages/web && pnpm test -- ScoreSidebar --run</automated>
  </verify>
  <done>
    - `pnpm --filter web test -- ScoreSidebar --run` passes including the 2 new assertions.
    - `pnpm --filter web build` succeeds (typecheck passes — the new imports and JSX are valid).
    - Existing `screen.getByLabelText('Weak page')` assertion continues to pass (aria-label preserved).
    - Manual spot check (optional): `pnpm --filter web dev`, open app, hover the warning triangle on any weak-ranked row — tooltip appears with the explanatory copy; clicking the icon does NOT trigger fitView.
  </done>
</task>

</tasks>

<verification>
1. `cd packages/web && pnpm test -- ScoreSidebar --run` — all existing tests pass + 2 new tests pass.
2. `cd packages/web && pnpm build` — TypeScript compiles clean (new `Tooltip`/`TooltipTrigger`/`TooltipContent` imports resolve, no unused-import warnings).
3. `cd packages/web && pnpm lint` (if configured in project) — no new lint errors.
4. Manual: run dev server, confirm tooltip appears on hover over a weak-row warning icon and that clicking the icon no longer navigates/fitViews (because of stopPropagation).
</verification>

<success_criteria>
- Hovering or keyboard-focusing the warning triangle in the Score Ranking panel displays a tooltip with copy explaining the weak-node criterion and suggesting remediation.
- No regression: existing `ScoreSidebar` tests pass unchanged; weak-node logic (`identifyWeakNodes`) and icon styling are untouched.
- Commit follows commitlint conventional format, e.g. `feat(score-sidebar): add tooltip explaining weak-page warning icon`.
</success_criteria>

<output>
After completion, create `.planning/quick/260418-uhb-add-tooltip-to-warning-icon-in-score-ran/260418-uhb-SUMMARY.md` summarizing:
- Files changed
- Final tooltip copy used
- Test results (before/after counts)
- Any deviations from the plan (e.g. if the `getByText` portal assertion was swapped for a `findByText` after `userEvent.hover`)
</output>
