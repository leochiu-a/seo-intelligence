# Phase 4: Global Nodes - Research

**Researched:** 2026-04-14
**Domain:** React + TypeScript, React Flow node data model, PageRank algorithm extension
**Confidence:** HIGH

## Summary

Phase 4 extends the existing canvas editor with a "global node" concept: any UrlNode can be marked global, and once it is, every non-global node in the graph implicitly links to it. The effective inbound link count for the global node equals the sum of its placement link counts (e.g. Header Nav = 2 links, Footer = 1 link → 3 implicit links per non-global source node). This affects the PageRank algorithm, the node's visual appearance, and the edit popover.

The codebase is small and well-factored. Data flows unidirectionally: `graph-utils.ts` contains all pure functions (node factory, PageRank, scoring), `App.tsx` manages state, and React Flow node/edge components are pure presentational. The cleanest approach is to (1) extend `UrlNodeData` with `isGlobal` and `placements` fields, (2) update `calculatePageRank` to inject synthetic inbound edges for global nodes, and (3) extend `EditPopover` with a "Global" toggle and placement list UI. No new state management infrastructure is needed.

The main PageRank change is to augment the inbound adjacency map inside `calculatePageRank` before the iteration loop: for every global node `g`, add a synthetic inbound entry from every non-global node `v` with `linkCount = sum(g.placements[*].linkCount)`. The rest of the algorithm is unchanged, meaning all existing test coverage stays valid.

**Primary recommendation:** Extend `UrlNodeData` with `isGlobal: boolean` and `placements: Placement[]`, update `calculatePageRank` to synthesize global inbound links, extend `EditPopover` with the global toggle + placement editor, and show a visible badge on global UrlNodes. All changes stay within existing patterns — no new libraries or state managers needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GLOB-01 | User can mark any node as "global" via the node edit popover | Extend `EditPopover` props + `UrlNodeData`; wire `onUpdate` with `isGlobal` |
| GLOB-02 | Global nodes display a visible indicator (badge/icon) on the canvas | Add conditional badge in `UrlNodeComponent` using existing `TONE_MAP` pattern; use a distinct color/icon (e.g. Globe icon from lucide-react) |
| GLOB-03 | A global node has one or more named placements, each with its own link count | Add `placements: Placement[]` to `UrlNodeData`; `Placement = { id: string; name: string; linkCount: number }` |
| GLOB-04 | User can add, edit, and delete placements on a global node | Inline placement editor section inside `EditPopover` rendered when `isGlobal` is true |
| GLOB-05 | PageRank algorithm treats every non-global node as implicitly linking to all global nodes; effective inbound link count = sum of placement link counts | Modify `calculatePageRank` to inject synthetic inbound entries before the iteration loop |
</phase_requirements>

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| reactflow | ^11.11.4 | Canvas, nodes, edges | Already in use; node data model is extended, not replaced |
| lucide-react | ^1.8.0 | Icon for global badge | Already used for Pencil, TriangleAlert icons; use `Globe` icon |
| React + TypeScript | 18.3 / 5.6 | Component and type model | Project stack |
| Vitest | ^4.1.4 | Unit tests for algorithm changes | Already used in graph-utils.test.ts |

### No new dependencies required
All required capabilities are already present. The placement editor needs no specialized date-picker, drag-and-drop, or form library — plain controlled inputs with Tailwind are the established pattern in this codebase.

## Architecture Patterns

### Existing Data Flow (to extend, not replace)
```
App.tsx (state)
  ├── nodes: Node<AppNodeData>[]   ← AppNodeData extends UrlNodeData
  ├── edges: Edge[]
  ├── scores = useMemo(() => calculatePageRank(nodes, edges))
  └── enrichedNodes = useMemo(...)  ← adds scoreTier, isWeak

graph-utils.ts (pure functions)
  ├── UrlNodeData interface
  ├── calculatePageRank(nodes, edges) → Map<id, score>
  └── updateNodeData(nodes, id, partial) → new nodes[]
```

### Pattern 1: Extend UrlNodeData with global fields

`UrlNodeData` is the canonical data type for nodes (serialized to localStorage and JSON export). Add optional fields to preserve backward compatibility with saved graphs.

```typescript
// graph-utils.ts

export interface Placement {
  id: string;     // nanoid or crypto.randomUUID() — already available in browser
  name: string;
  linkCount: number;
}

export interface UrlNodeData {
  urlTemplate: string;
  pageCount: number;
  isGlobal?: boolean;       // undefined === false — backward compatible
  placements?: Placement[]; // undefined === [] — backward compatible
}
```

Note: Use `crypto.randomUUID()` for placement IDs — no external library needed (available in all modern browsers and Node 15+).

### Pattern 2: Synthetic inbound edges in calculatePageRank

Insert global link injection before the iteration loop. The existing adjacency maps (`inbound`, `outbound`, `totalWeightedOut`) are built from the edges array first, then synthetic entries are appended.

```typescript
// graph-utils.ts — inside calculatePageRank, after building inbound/outbound maps

// Global node injection: every non-global node implicitly links to each global node
const globalNodes = nodes.filter((n) => n.data.isGlobal);
for (const globalNode of globalNodes) {
  const totalPlacementLinks = (globalNode.data.placements ?? []).reduce(
    (sum, p) => sum + p.linkCount,
    0,
  );
  if (totalPlacementLinks <= 0) continue;

  for (const sourceNode of nodes) {
    if (sourceNode.data.isGlobal) continue; // global nodes don't implicitly link to each other
    // Append to inbound adjacency for globalNode
    inbound.get(globalNode.id)?.push({
      sourceId: sourceNode.id,
      linkCount: totalPlacementLinks,
    });
    // Append to outbound adjacency for sourceNode (needed for totalWeightedOut)
    outbound.get(sourceNode.id)?.push({
      targetId: globalNode.id,
      linkCount: totalPlacementLinks,
    });
  }
}
// Then recompute totalWeightedOut AFTER injection (move the precompute loop to after injection)
```

**Key ordering constraint:** `totalWeightedOut` must be computed AFTER the global injection loop. Currently it is computed inline after building `outbound`. Restructure so: (1) build inbound/outbound from edges, (2) inject global synthetics, (3) compute `totalWeightedOut`.

### Pattern 3: EditPopover extension for global toggle + placement editor

The current `EditPopover` is a simple form with two fields. Extend it with:
- A toggle checkbox/switch at the top: "Global node"
- When `isGlobal` is true: show a "Placements" section with list of placement rows (name + link count + delete button) and an "Add placement" button
- The popover currently calls `onSave(urlTemplate, pageCount)`. The signature must expand to include global data.

Existing save signature:
```typescript
onSave: (urlTemplate: string, pageCount: number) => void
```

New signature needed:
```typescript
onSave: (
  urlTemplate: string,
  pageCount: number,
  isGlobal: boolean,
  placements: Placement[],
) => void
```

The `handleSave` in `UrlNodeComponent` already delegates to `data.onUpdate(id, partial)` — extend the partial to include `isGlobal` and `placements`.

### Pattern 4: Global badge in UrlNodeComponent

The existing badge pattern (score tier badge) is a good model. Add a "Global" badge below the tier badge when `data.isGlobal` is true. Use the `Globe` icon from lucide-react (already installed).

```typescript
// In UrlNodeComponent JSX, near the tier badge:
{data.isGlobal && (
  <div className="mb-2 flex items-center gap-1">
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
      <Globe size={9} />
      Global
    </span>
  </div>
)}
```

### Pattern 5: serializeGraph must include global fields

`serializeGraph` in `App.tsx` currently strips everything except `urlTemplate` and `pageCount` before writing to localStorage. It must be extended to preserve `isGlobal` and `placements`.

```typescript
// In serializeGraph — extend data mapping:
data: { urlTemplate, pageCount, isGlobal, placements },
// → data: { urlTemplate, pageCount, isGlobal, placements }
```

Same applies to `parseImportJson` in `graph-utils.ts` — must read back `isGlobal` and `placements` from imported JSON.

### Recommended Project Structure (no changes needed)
```
src/
├── lib/
│   └── graph-utils.ts      # Add Placement interface, update UrlNodeData, update calculatePageRank
├── components/
│   ├── UrlNode.tsx          # Add global badge rendering
│   └── EditPopover.tsx      # Add global toggle + placement editor
└── App.tsx                  # Extend serializeGraph; restore logic
```

### Anti-Patterns to Avoid
- **Creating a separate global edges array:** Don't maintain a parallel edge list for global links. Inject synthetically inside `calculatePageRank` — this keeps the canvas graph clean (no spurious visual edges) while the algorithm accounts for global links.
- **Storing placements as edges:** Placements are configuration on the global node, not visual graph edges. Keep them in `UrlNodeData.placements`.
- **Mutating the inbound/outbound maps after totalWeightedOut is computed:** The injection loop MUST run before `totalWeightedOut` is computed, otherwise global source nodes' outbound weights will be wrong.
- **Passing `Placement[]` as a prop to UrlNode via `AppNodeData` callbacks at the top level:** The update callback `onUpdate` already handles partial updates — no new callback needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique placement IDs | Custom counter or timestamp | `crypto.randomUUID()` | Collision-free, no import needed, works in browser + Vitest jsdom |
| Toggle UI | Custom toggle HTML | Tailwind-styled `<input type="checkbox">` or a `<button>` with aria-pressed | Project uses plain Tailwind inputs throughout — consistent |
| Placement form validation | Complex validation framework | Inline validation in handler (same pattern as `validateLinkCount`) | Already established pattern in graph-utils.ts |

**Key insight:** The project consistently avoids external UI component libraries for simple interactions. All forms use plain inputs + Tailwind. Follow this pattern for the placement editor.

## Common Pitfalls

### Pitfall 1: totalWeightedOut computed before global injection
**What goes wrong:** Source nodes that implicitly link to global nodes have their outbound weight incorrectly calculated as 0 for those global links, causing the PageRank formula to divide by wrong totals.
**Why it happens:** In the current code, `totalWeightedOut` is computed immediately after building `outbound` from edges. If global injection happens after, the map is stale.
**How to avoid:** Restructure `calculatePageRank` to have three clear phases: (1) build adjacency from edges, (2) inject global synthetics into both `inbound` and `outbound`, (3) compute `totalWeightedOut`.
**Warning signs:** Global nodes gain much lower scores than expected; increasing placement link counts has little effect on scores.

### Pitfall 2: serializeGraph strips isGlobal and placements
**What goes wrong:** User marks nodes as global and adds placements; after page refresh, all nodes are back to non-global.
**Why it happens:** `serializeGraph` explicitly destructures only `{ urlTemplate, pageCount }` from node data.
**How to avoid:** Update destructuring in `serializeGraph` and the restore logic in the `useEffect` to include `isGlobal` and `placements`.
**Warning signs:** Global state is lost on refresh but works within a single session.

### Pitfall 3: EditPopover onSave signature mismatch
**What goes wrong:** TypeScript error or silent data loss when the popover tries to save global fields but `onSave` only accepts `(urlTemplate, pageCount)`.
**Why it happens:** The existing `EditPopoverProps` interface has a narrow `onSave` type.
**How to avoid:** Update `EditPopoverProps.onSave` signature first, then update all call sites: `UrlNodeComponent.handleSave` and `App.tsx`'s `onNodeDataUpdate` call chain.
**Warning signs:** TypeScript compilation error mentioning argument count mismatch.

### Pitfall 4: Global nodes implicitly linking to each other
**What goes wrong:** If two global nodes A and B both link to each other via the synthetic injection, circular global links cause score inflation.
**Why it happens:** Naive injection loops over all nodes including other global nodes as sources.
**How to avoid:** In the injection loop, skip source nodes where `sourceNode.data.isGlobal === true`. Only non-global nodes contribute synthetic links.
**Warning signs:** Global nodes accumulate disproportionately high scores even with no real edges.

### Pitfall 5: Placement list UI creates React key warnings
**What goes wrong:** React warns about missing `key` props when rendering placement list.
**Why it happens:** Placements rendered in a `.map()` without stable unique keys.
**How to avoid:** Use `placement.id` (UUID) as the React `key`. Never use array index as key since users can delete arbitrary placements.
**Warning signs:** Console warning "Each child in a list should have a unique 'key' prop."

### Pitfall 6: parseImportJson ignores isGlobal/placements on import
**What goes wrong:** Importing a JSON file with global nodes loses all global state.
**Why it happens:** `parseImportJson` currently only reads `urlTemplate` and `pageCount` from node objects.
**How to avoid:** Extend the import parser to read `isGlobal?: boolean` and `placements?: Placement[]` and pass them through.

## Code Examples

Verified patterns from the existing codebase:

### Pattern: updateNodeData with extended partial (graph-utils.ts)
```typescript
// Existing call — will continue to work with extended UrlNodeData
setNodes((nds) => updateNodeData(nds as Node<UrlNodeData>[], nodeId, {
  urlTemplate,
  pageCount,
  isGlobal,
  placements,
}) as Node<AppNodeData>[]);
```

### Pattern: Controlled input for linkCount (matches LinkCountEdge pattern)
```typescript
// Placement link count input — follow existing validateLinkCount pattern
<input
  type="number"
  min={1}
  className="w-16 h-7 text-sm text-dark border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-tier-neutral/50 focus:border-tier-neutral transition"
  value={placement.linkCount}
  onChange={(e) => handlePlacementLinkCountChange(placement.id, Number(e.target.value))}
/>
```

### Pattern: Vitest test structure for algorithm changes (graph-utils.test.ts)
```typescript
describe('calculatePageRank with global nodes', () => {
  it('global node receives implicit inbound links from all non-global nodes', () => {
    const nodeA = { id: 'a', ...data({ isGlobal: false }) };
    const nodeB = { id: 'b', ...data({ isGlobal: true, placements: [{ id: 'p1', name: 'Header', linkCount: 2 }] }) };
    const scores = calculatePageRank([nodeA, nodeB], []);
    // B should have a higher score than A due to implicit inbound link from A
    expect(scores.get('b')!).toBeGreaterThan(scores.get('a')!);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EditPopover only edits urlTemplate + pageCount | Must extend to include isGlobal + placements | Phase 4 | Signature change required in EditPopoverProps, UrlNodeComponent, App.tsx update path |
| calculatePageRank uses only edges for adjacency | Must inject synthetic adjacency for global nodes | Phase 4 | Algorithm restructure: injection before totalWeightedOut computation |
| serializeGraph strips to {urlTemplate, pageCount} | Must include {isGlobal, placements} | Phase 4 | localStorage and JSON export/import updated |

## Open Questions

1. **Should global nodes themselves be able to link to other global nodes via placements?**
   - What we know: GLOB-05 says "every non-global node" links to global nodes. Global-to-global is ambiguous.
   - What's unclear: Whether a global Header node linking to another global node is intended.
   - Recommendation: Exclude global nodes from synthetic source list (safe default). Document as a decision in the plan.

2. **What is the minimum viable placement state when toggling a node from global → non-global?**
   - What we know: When `isGlobal` is toggled off, placements become irrelevant for scoring.
   - What's unclear: Should placements be discarded or preserved (in case user re-enables)?
   - Recommendation: Preserve `placements` in node data even when `isGlobal = false`. This allows toggling back without data loss. The algorithm ignores placements when `isGlobal` is false.

3. **Popover width: will the placement editor fit in the current 280px popover?**
   - What we know: EditPopover is `w-[280px]`. A placement row needs name input + link count input + delete button.
   - What's unclear: Whether 280px is enough for a comfortable placement editing experience.
   - Recommendation: Keep 280px but use compact row layout (name input flex-1, link count w-14, delete button). Or increase to w-[320px] for global nodes.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all required tools are already installed in the project).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.4 |
| Config file | vite.config.ts (vitest config inline) or implicit |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GLOB-01 | Toggle isGlobal via onUpdate | unit | `npm test -- graph-utils` | ✅ (extend graph-utils.test.ts) |
| GLOB-02 | Global badge renders when isGlobal=true | unit/component | `npm test -- UrlNode` | ❌ Wave 0: create UrlNode.test.tsx |
| GLOB-03 | Placement data stored in UrlNodeData | unit | `npm test -- graph-utils` | ✅ (extend graph-utils.test.ts) |
| GLOB-04 | Add/edit/delete placement via EditPopover | unit/component | `npm test -- EditPopover` | ❌ Wave 0: create EditPopover.test.tsx |
| GLOB-05 | PageRank scores global nodes using synthetic inbound links | unit | `npm test -- graph-utils` | ✅ (extend graph-utils.test.ts) |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/UrlNode.test.tsx` — covers GLOB-02 (global badge visibility)
- [ ] `src/components/EditPopover.test.tsx` — covers GLOB-04 (placement CRUD in popover)

*(graph-utils.test.ts already exists and covers GLOB-01, GLOB-03, GLOB-05 once extended)*

## Project Constraints (from CLAUDE.md)

- **Commit messages:** Must use commitlint format (e.g. `feat(glob): add global node toggle`, `fix(pagerank): inject global synthetics before outbound precompute`)

## Sources

### Primary (HIGH confidence)
- Direct codebase reading: `src/lib/graph-utils.ts`, `src/App.tsx`, `src/components/EditPopover.tsx`, `src/components/UrlNode.tsx`, `src/components/ScoreSidebar.tsx`
- `package.json` — verified all dependency versions

### Secondary (MEDIUM confidence)
- React Flow v11 docs (ConnectionMode.Loose, node data patterns) — consistent with observed usage in codebase
- lucide-react v1.8.0 — Globe icon available (confirmed by existing Pencil, TriangleAlert usage pattern)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and existing source files
- Architecture: HIGH — derived directly from codebase reading, no assumptions
- Pitfalls: HIGH — identified from concrete code structure (algorithm ordering, serialization gaps)
- Algorithm: HIGH — calculatePageRank fully read and understood; synthetic injection point is unambiguous

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable stack, no fast-moving dependencies)
