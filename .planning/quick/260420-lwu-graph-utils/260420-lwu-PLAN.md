---
phase: quick-260420-lwu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/web/src/lib/graph-utils.ts
  - packages/web/src/lib/graph-pagerank.ts
  - packages/web/src/lib/graph-analysis.ts
  - packages/web/src/lib/graph-io.ts
autonomous: true
requirements:
  - QUICK-260420-LWU-01
must_haves:
  truths:
    - "packages/web/src/lib/graph-utils.ts shrinks from 1032 lines to ~130 lines (types + node management + re-exports only)"
    - "All 28 consumer files continue to import from `./lib/graph-utils` or `@/lib/graph-utils` without any source change"
    - "`pnpm --filter web test` passes with zero changes to graph-utils.test.ts (imports unchanged)"
    - "`pnpm --filter web typecheck` passes with zero type errors across the repo"
    - "Every symbol previously exported from graph-utils.ts remains exported from graph-utils.ts (via re-export) so no consumer breaks"
  artifacts:
    - path: "packages/web/src/lib/graph-pagerank.ts"
      provides: "PageRank + scoring: DAMPING, MAX_ITER, EPSILON, CLUSTER_BONUS_FACTOR, OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD, ScoreTier, hasSameCluster, calculatePageRank, calculateOutboundLinks, classifyScoreTier, identifyWeakNodes"
      contains: "export function calculatePageRank"
    - path: "packages/web/src/lib/graph-analysis.ts"
      provides: "Health check + graph structure + URL tree: HealthStatus, getHealthStatus, hasAnyWarning, buildTooltipContent, PlacementGroup, ClusterGroup, collectPlacementGroups, collectClusterGroups, calculateCrawlDepth, identifyOrphanNodes, collectPlacementSuggestions, collectClusterSuggestions, getConnectedElements, UrlTreeNode, buildUrlTree"
      contains: "export function buildUrlTree"
    - path: "packages/web/src/lib/graph-io.ts"
      provides: "Handle utils + import/export + copy-for-AI: HANDLE_IDS, getClosestHandleIds, parseImportJson, CopyForAIInput, buildCopyForAIText"
      contains: "export function buildCopyForAIText"
    - path: "packages/web/src/lib/graph-utils.ts"
      provides: "Types (Placement, UrlNodeData, LinkCountEdgeData) + node management (counter, createDefaultNode, updateNodeData, updateEdgeLinkCount, validateNodeData, validateLinkCount, formatPageCount) + barrel re-exports of the 3 new files"
      contains: "export * from"
  key_links:
    - from: "packages/web/src/lib/graph-utils.ts"
      to: "packages/web/src/lib/graph-pagerank.ts"
      via: "re-export"
      pattern: "export \\* from \"\\./graph-pagerank\""
    - from: "packages/web/src/lib/graph-utils.ts"
      to: "packages/web/src/lib/graph-analysis.ts"
      via: "re-export"
      pattern: "export \\* from \"\\./graph-analysis\""
    - from: "packages/web/src/lib/graph-utils.ts"
      to: "packages/web/src/lib/graph-io.ts"
      via: "re-export"
      pattern: "export \\* from \"\\./graph-io\""
    - from: "packages/web/src/lib/graph-pagerank.ts"
      to: "packages/web/src/lib/graph-utils.ts"
      via: "import UrlNodeData, LinkCountEdgeData types"
      pattern: "import type \\{[^}]*UrlNodeData"
    - from: "packages/web/src/lib/graph-analysis.ts"
      to: "packages/web/src/lib/graph-pagerank.ts"
      via: "import OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD"
      pattern: "import .*(OUTBOUND_WARNING_THRESHOLD|DEPTH_WARNING_THRESHOLD)"
    - from: "packages/web/src/lib/graph-io.ts"
      to: "packages/web/src/lib/graph-pagerank.ts"
      via: "import thresholds used by formatNodeLine"
      pattern: "import .*(OUTBOUND_WARNING_THRESHOLD|DEPTH_WARNING_THRESHOLD)"
---

<objective>
Split the 1032-line `packages/web/src/lib/graph-utils.ts` into 4 focused files without
breaking any of the 28 downstream consumers.

Purpose: `graph-utils.ts` has grown into a grab-bag of unrelated concerns (PageRank,
health checks, URL tree, I/O, copy-for-AI). It is hard to navigate and review. A
per-concern split improves readability while a barrel re-export preserves all
consumer import paths so the refactor is a pure internal restructure.

Output: 3 new focused modules (graph-pagerank, graph-analysis, graph-io) and a
slimmed-down `graph-utils.ts` that keeps its core types + node management and
re-exports everything else for backward compatibility.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/web/src/lib/graph-utils.ts
@packages/web/src/lib/graph-utils.test.ts

<interfaces>
<!-- Public API that MUST remain re-exported from graph-utils.ts after the split.
     Listed here so executor can verify the barrel before running tests. -->

Types / interfaces:
- Placement, UrlNodeData, LinkCountEdgeData (stay in graph-utils.ts)
- ScoreTier (move to graph-pagerank.ts)
- HealthStatus (move to graph-analysis.ts)
- PlacementGroup, ClusterGroup, UrlTreeNode (move to graph-analysis.ts)
- CopyForAIInput (move to graph-io.ts)

Constants:
- OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD (move to graph-pagerank.ts — exported)
- HANDLE_IDS (move to graph-io.ts — exported)
- DAMPING, MAX_ITER, EPSILON, CLUSTER_BONUS_FACTOR (move to graph-pagerank.ts — module-private, keep as-is)

Functions (stay in graph-utils.ts — Section 1+2):
- resetNodeIdCounter, syncNodeIdCounter, createDefaultNode
- updateNodeData, updateEdgeLinkCount
- validateNodeData, validateLinkCount, formatPageCount

Functions moving to graph-pagerank.ts (Section 3):
- hasSameCluster, calculatePageRank, calculateOutboundLinks
- classifyScoreTier, identifyWeakNodes

Functions moving to graph-analysis.ts (Sections 4+5+6):
- getHealthStatus, hasAnyWarning, buildTooltipContent
- collectPlacementGroups, collectClusterGroups
- calculateCrawlDepth, identifyOrphanNodes
- collectPlacementSuggestions, collectClusterSuggestions
- getConnectedElements
- buildUrlTree

Functions moving to graph-io.ts (Sections 7+8+9):
- getClosestHandleIds
- parseImportJson
- buildCopyForAIText
- (private helpers formatNodeLine, formatEdgeLine — stay module-private in graph-io.ts)
</interfaces>

<cross-module-dependencies>
After the split, these imports cross module boundaries:

graph-pagerank.ts imports from graph-utils.ts:
  - type UrlNodeData, type LinkCountEdgeData (for function signatures)

graph-analysis.ts imports from graph-utils.ts:
  - type UrlNodeData, type LinkCountEdgeData
graph-analysis.ts imports from graph-pagerank.ts:
  - OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD (used by getHealthStatus, buildTooltipContent)

graph-io.ts imports from graph-utils.ts:
  - type UrlNodeData, type LinkCountEdgeData, type Placement (for parseImportJson)
graph-io.ts imports from graph-pagerank.ts:
  - OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD (used by formatNodeLine)

No circular imports: graph-utils.ts re-exports but does not import from the three new files at type/value level beyond `export *`.
</cross-module-dependencies>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract PageRank + scoring into graph-pagerank.ts</name>
  <files>packages/web/src/lib/graph-pagerank.ts, packages/web/src/lib/graph-utils.ts</files>
  <action>
    Create `packages/web/src/lib/graph-pagerank.ts` containing Section 3 of graph-utils.ts (lines 130-489 in the current file). Move (verbatim, including JSDoc) these symbols:

    Constants (module-private unless noted):
    - DAMPING, MAX_ITER, EPSILON, CLUSTER_BONUS_FACTOR (module-private — NOT exported)
    - OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD (exported)

    Types:
    - ScoreTier (exported)

    Functions:
    - hasSameCluster, calculatePageRank, calculateOutboundLinks, classifyScoreTier, identifyWeakNodes (all exported)

    At the top of graph-pagerank.ts add:
    ```ts
    import type { Node, Edge } from "@xyflow/react";
    import type { UrlNodeData, LinkCountEdgeData } from "./graph-utils";
    ```

    Then in graph-utils.ts:
    1. DELETE lines 130-489 (the entire Section 3 block you just moved).
    2. Add at the bottom of graph-utils.ts (after the remaining Section 1+2 code):
       ```ts
       // Re-exports — preserve backward compatibility with existing consumers
       export * from "./graph-pagerank";
       ```
    3. Keep all Section 1+2 code (types, nodeIdCounter, createDefaultNode, updateNodeData, updateEdgeLinkCount, validateNodeData, validateLinkCount, formatPageCount) untouched.

    Do NOT modify any consumer file — `@/lib/graph-utils` still exports every symbol via the barrel.

    Why this ordering: graph-pagerank.ts depends on UrlNodeData/LinkCountEdgeData types which live in graph-utils.ts. The barrel re-export goes one way (utils → pagerank) so there is no cycle: graph-pagerank imports TYPES only from graph-utils, and graph-utils re-exports VALUES from graph-pagerank. TypeScript resolves this fine because type imports are erased at runtime.
  </action>
  <verify>
    <automated>pnpm --filter web typecheck &amp;&amp; pnpm --filter web test -- graph-utils</automated>
  </verify>
  <done>
    - `packages/web/src/lib/graph-pagerank.ts` exists and exports every symbol listed in the action block.
    - `packages/web/src/lib/graph-utils.ts` no longer contains the DAMPING/MAX_ITER/calculatePageRank/etc block; it ends with `export * from "./graph-pagerank"`.
    - `pnpm --filter web typecheck` passes with zero errors.
    - `pnpm --filter web test -- graph-utils` passes with zero changes to the test file.
  </done>
</task>

<task type="auto">
  <name>Task 2: Extract health check + graph analysis + URL tree into graph-analysis.ts</name>
  <files>packages/web/src/lib/graph-analysis.ts, packages/web/src/lib/graph-utils.ts</files>
  <action>
    Create `packages/web/src/lib/graph-analysis.ts` containing Sections 4, 5, and 6 of the ORIGINAL graph-utils.ts (lines 360-418 + 491-693 + 696-782). Move (verbatim, including JSDoc) these symbols:

    Types / interfaces (all exported):
    - HealthStatus
    - PlacementGroup, ClusterGroup
    - UrlTreeNode

    Functions (all exported):
    - getHealthStatus, hasAnyWarning, buildTooltipContent
    - collectPlacementGroups, collectClusterGroups
    - calculateCrawlDepth, identifyOrphanNodes
    - collectPlacementSuggestions, collectClusterSuggestions
    - getConnectedElements
    - buildUrlTree

    At the top of graph-analysis.ts add:
    ```ts
    import type { Node, Edge } from "@xyflow/react";
    import type { UrlNodeData } from "./graph-utils";
    import { OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD } from "./graph-pagerank";
    ```

    Preserve the existing section-divider comments (the `// ---` blocks that introduce "Phase 11.1: PM Health Check" and "URL tree hierarchy") — move them along with their sections.

    Then in graph-utils.ts:
    1. DELETE the corresponding blocks (Section 4, 5, 6 as listed above) that you just moved.
    2. Add to the re-export list at the bottom:
       ```ts
       export * from "./graph-analysis";
       ```
    3. Resulting barrel section should be:
       ```ts
       export * from "./graph-pagerank";
       export * from "./graph-analysis";
       ```

    Do NOT touch any consumer file. Do NOT change section ordering within graph-analysis.ts — keep health check first, then structure/groups, then URL tree so it matches the original file's flow for reviewers.

    Note: `getHealthStatus` and `buildTooltipContent` reference `OUTBOUND_WARNING_THRESHOLD` and `DEPTH_WARNING_THRESHOLD` — these are now imported from graph-pagerank.ts (not module-local).
  </action>
  <verify>
    <automated>pnpm --filter web typecheck &amp;&amp; pnpm --filter web test -- graph-utils</automated>
  </verify>
  <done>
    - `packages/web/src/lib/graph-analysis.ts` exists and exports every symbol listed in the action block.
    - `graph-utils.ts` no longer contains getHealthStatus/collectPlacementGroups/buildUrlTree/etc.
    - `pnpm --filter web typecheck` passes.
    - `pnpm --filter web test -- graph-utils` passes.
  </done>
</task>

<task type="auto">
  <name>Task 3: Extract handles + import/export + copy-for-AI into graph-io.ts and verify full suite</name>
  <files>packages/web/src/lib/graph-io.ts, packages/web/src/lib/graph-utils.ts</files>
  <action>
    Create `packages/web/src/lib/graph-io.ts` containing Sections 7, 8, 9 of the ORIGINAL graph-utils.ts (lines 783-822 + 823-911 + 913-1032). Move (verbatim, including JSDoc and section-divider comments) these symbols:

    Constants (exported):
    - HANDLE_IDS

    Types / interfaces (exported):
    - CopyForAIInput

    Functions:
    - getClosestHandleIds (exported)
    - parseImportJson (exported)
    - buildCopyForAIText (exported)
    - formatNodeLine, formatEdgeLine (module-private — keep NOT exported, same as original)

    At the top of graph-io.ts add:
    ```ts
    import type { Node, Edge } from "@xyflow/react";
    import type { UrlNodeData, LinkCountEdgeData, Placement } from "./graph-utils";
    import { OUTBOUND_WARNING_THRESHOLD, DEPTH_WARNING_THRESHOLD } from "./graph-pagerank";
    ```

    Then in graph-utils.ts:
    1. DELETE Sections 7, 8, 9 (everything from `export const HANDLE_IDS` through the end of `buildCopyForAIText`).
    2. Add the final re-export line:
       ```ts
       export * from "./graph-io";
       ```
    3. After this task, the entire re-export block at the end of graph-utils.ts should be:
       ```ts
       // Re-exports — preserve backward compatibility with existing consumers.
       // See graph-pagerank.ts, graph-analysis.ts, graph-io.ts for the implementations.
       export * from "./graph-pagerank";
       export * from "./graph-analysis";
       export * from "./graph-io";
       ```
    4. graph-utils.ts should now contain ONLY:
       - The `import type { Node, Edge }` line at the top
       - Section 1 (Placement / UrlNodeData / LinkCountEdgeData types)
       - Section 2 (node id counter + updateNodeData + updateEdgeLinkCount + validate* + formatPageCount)
       - The 3-line barrel re-export block at the bottom
       Total should be ~130 lines, down from 1032.

    Final verification step (after the move):
    - Run `pnpm --filter web typecheck` — must be zero errors.
    - Run `pnpm --filter web test` — full test suite, not just graph-utils — must all pass. This exercises the 28 downstream consumers (App.tsx, hooks, components) through their existing tests.
    - Run `pnpm --filter web lint` if configured — must have zero new errors (pre-existing warnings are fine).

    Do NOT touch any consumer file. Do NOT delete formatNodeLine / formatEdgeLine — they stay module-private inside graph-io.ts.
  </action>
  <verify>
    <automated>pnpm --filter web typecheck &amp;&amp; pnpm --filter web test &amp;&amp; pnpm --filter web lint</automated>
  </verify>
  <done>
    - `packages/web/src/lib/graph-io.ts` exists with HANDLE_IDS, getClosestHandleIds, parseImportJson, CopyForAIInput, buildCopyForAIText exported and formatNodeLine/formatEdgeLine module-private.
    - `packages/web/src/lib/graph-utils.ts` is ~130 lines containing only types + node management + 3 re-export lines.
    - Full test suite (`pnpm --filter web test`) passes — all 28 consumer files continue to work.
    - `pnpm --filter web typecheck` passes.
    - `pnpm --filter web lint` introduces no new errors.
  </done>
</task>

</tasks>

<verification>
Overall integration checks after all 3 tasks complete:

1. `pnpm --filter web typecheck` — zero errors across the whole web package.
2. `pnpm --filter web test` — full suite green. Confirms all 28 consumer files still resolve their imports correctly and runtime behavior is unchanged (pure code motion with re-exports).
3. `wc -l packages/web/src/lib/graph-utils.ts` — should report ~130 lines (down from 1032).
4. Spot-check one consumer file (e.g. App.tsx) to confirm its import line is unchanged:
   `grep -n "from \"@/lib/graph-utils\"" packages/web/src/App.tsx`
5. Build succeeds: `pnpm --filter web build` (optional but recommended — catches tree-shaking / circular import issues that typecheck can miss).
</verification>

<success_criteria>
- graph-utils.ts shrinks from 1032 lines to ~130 lines
- 3 new files created: graph-pagerank.ts, graph-analysis.ts, graph-io.ts
- Every public symbol previously exported from graph-utils.ts is still importable from `@/lib/graph-utils` via the barrel
- Zero consumer file (all 28) modified
- `pnpm --filter web typecheck` passes
- `pnpm --filter web test` passes (including graph-utils.test.ts unchanged)
- No circular imports (graph-utils → barrel → 3 new files; 3 new files import TYPES only from graph-utils, which is safe)
</success_criteria>

<output>
After completion, create `.planning/quick/260420-lwu-graph-utils/260420-lwu-SUMMARY.md` summarizing:
- Before/after line counts per file
- Which symbols landed in which new module
- Confirmation that no consumer file was touched
- Any follow-up opportunities (e.g. consumers that could now import from the more focused modules directly in a future pass)
</output>
