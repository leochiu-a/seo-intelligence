# Phase 9: Scenario Comparison - Research

**Researched:** 2026-04-16
**Domain:** Multi-scenario state management with localStorage persistence, React tab-bar UI, data migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Scenario tabs render in a second row below the toolbar header — a horizontal tab bar with one tab per scenario. Active tab is highlighted. `[+]` button at the end creates a new scenario.
- **D-02:** Clicking a tab activates that scenario (switches graph state). A small gear/chevron control on each tab opens a popover with Rename and Delete actions.
- **D-03:** Delete is disabled when only one scenario exists. The last scenario can be renamed but not removed.
- **D-04:** When clicking `[+]`, a small prompt asks: "Start blank or clone current?" — user chooses before the tab is created.
- **D-05:** Default scenario name follows auto-increment: `Scenario 1`, `Scenario 2`, etc. (based on count of existing scenarios). User can rename immediately via the tab popover.
- **D-06:** Score delta comparison (SCENE-04, SCENE-05) is dropped from Phase 9 scope. Only SCENE-01, SCENE-02, SCENE-03 are implemented.
- **D-07:** New storage key: `seo-planner-scenarios`. Structure: `{ activeScenarioId, scenarios: [{ id, name, nodes, edges }] }`
- **D-08:** On save, the entire `seo-planner-scenarios` object is written on every change.
- **D-09:** Auto-migration on first load: if `seo-planner-graph` exists and `seo-planner-scenarios` does not, wrap old data as scenario named "Default", write to new key, delete old key.

### Claude's Discretion

- Tab bar visual style (font size, active/inactive states, border treatment — follow existing toolbar Tailwind patterns)
- Exact popover design for rename/delete actions on each tab
- ID generation for new scenarios (e.g., `crypto.randomUUID()` or timestamp-based)
- Whether switching scenarios saves the current graph first or relies on the change-triggered save effect

### Deferred Ideas (OUT OF SCOPE)

- **SCENE-04 / SCENE-05: Score delta comparison** — user explicitly dropped from Phase 9. Side-by-side comparison panel with per-node green/red deltas is a future phase after Phase 10.
- **Comparison view: added/removed node labeling** — discussed as part of comparison diff; deferred with the rest of comparison.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCENE-01 | User can create multiple named scenarios (e.g. "Current", "Proposal A") | Tab bar with `[+]` creation flow; blank/clone modal; auto-incremented names |
| SCENE-02 | User can switch between scenarios; each scenario has its own independent graph state | Scenario switch handler serializes current, swaps activeScenarioId, restores target nodes/edges |
| SCENE-03 | Scenarios persist in localStorage independently | `seo-planner-scenarios` key with array of `{ id, name, nodes, edges }`; D-08 full-write on every change |
</phase_requirements>

---

## Summary

Phase 9 replaces the current single-graph `seo-planner-graph` localStorage pattern with a multi-scenario structure keyed at `seo-planner-scenarios`. All three in-scope requirements (SCENE-01 through SCENE-03) are purely frontend state-management and UI work — no new library dependencies are required.

The core implementation has three parts: (1) a data layer refactor in `App.tsx` that lifts single-graph state into a scenarios array with an active pointer, (2) a new `ScenarioTabBar` component inserted between `<Toolbar>` and the canvas layout `<div>`, and (3) an auto-migration guard that runs once on mount to convert any existing `seo-planner-graph` data into the new format.

The biggest risk is the `isFirstRender` save-guard pattern: the existing ref skips exactly one save cycle on first mount. With multi-scenario, switching scenarios also triggers `setNodes`/`setEdges`, which must not be mistaken for a "first render" and must not fire the save effect before the new scenario data has fully hydrated. The solution is to extend (or replace) the `isFirstRender` ref with a switching flag that suppresses the save effect during the scenario-switch transition.

**Primary recommendation:** Keep `App.tsx` as the single source of truth for scenario state. Introduce a `useScenarios` hook (or inline state) that owns the `seo-planner-scenarios` object, exposes `activeScenario`, `switchScenario`, `createScenario`, `renameScenario`, `deleteScenario`, and write the `ScenarioTabBar` as a pure presentational component receiving these values as props.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component state, hooks | Already in use |
| TypeScript | 5.x | Type safety for ScenarioStore shape | Already in use |
| Tailwind CSS | 3.x | Tab bar styling consistent with Toolbar | Already in use |
| lucide-react | latest | Icons for `+`, gear, rename, delete | Already in use |

No new npm dependencies required for this phase.

**Version verification:** All packages are already installed. No installation step needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── App.tsx                    # Replace STORAGE_KEY + single-graph effects with useScenarios
├── hooks/
│   └── useScenarios.ts        # NEW: manages seo-planner-scenarios state + localStorage I/O
├── components/
│   ├── Toolbar.tsx            # Unchanged
│   ├── ScenarioTabBar.tsx     # NEW: tab row, [+] button, tab popovers
│   └── ScenarioTabBar.test.tsx # NEW: unit tests
└── lib/
    └── graph-utils.ts         # Unchanged; serializeGraph() reused per-scenario
```

### Pattern 1: Scenarios Hook (`useScenarios`)

**What:** A custom React hook that owns the full `seo-planner-scenarios` state, exposes stable callbacks, and handles localStorage persistence.

**When to use:** Anytime App.tsx needs to read or mutate scenario data — never manipulate localStorage directly from the component.

**Key interface:**
```typescript
interface ScenarioRecord {
  id: string;
  name: string;
  nodes: SerializedNode[];   // same shape as serializeGraph() output
  edges: SerializedEdge[];
}

interface ScenariosStore {
  activeScenarioId: string;
  scenarios: ScenarioRecord[];
}

function useScenarios(): {
  store: ScenariosStore;
  activeScenario: ScenarioRecord;
  switchScenario: (id: string, currentNodes: Node<AppNodeData>[], currentEdges: Edge[]) => void;
  createScenario: (mode: 'blank' | 'clone', currentNodes: Node<AppNodeData>[], currentEdges: Edge[]) => void;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => void;
}
```

**Migration logic runs once inside `useScenarios` init:**
```typescript
// Source: D-09 (CONTEXT.md)
const OLD_KEY = 'seo-planner-graph';
const NEW_KEY = 'seo-planner-scenarios';

function loadOrMigrate(): ScenariosStore {
  const existing = localStorage.getItem(NEW_KEY);
  if (existing) return JSON.parse(existing) as ScenariosStore;

  const old = localStorage.getItem(OLD_KEY);
  if (old) {
    const parsed = JSON.parse(old) as { nodes: SerializedNode[]; edges: SerializedEdge[] };
    const store: ScenariosStore = {
      activeScenarioId: 's1',
      scenarios: [{ id: 's1', name: 'Default', nodes: parsed.nodes, edges: parsed.edges }],
    };
    localStorage.setItem(NEW_KEY, JSON.stringify(store));
    localStorage.removeItem(OLD_KEY); // clean removal after successful migration (D-09)
    return store;
  }

  // Fresh start
  const id = crypto.randomUUID();
  return { activeScenarioId: id, scenarios: [{ id, name: 'Scenario 1', nodes: [], edges: [] }] };
}
```

### Pattern 2: Scenario Switch Flow

**What:** Serializes current live nodes/edges into the active scenario record, updates `activeScenarioId`, then restores the target scenario into `setNodes`/`setEdges`.

**Critical:** Must not trigger the auto-save effect during the restore step. Use an `isSwitchingRef` flag analogous to the existing `isFirstRender` ref.

```typescript
// Source: established isFirstRender pattern (Phase 3 CONTEXT.md D-02)
const isSwitchingRef = useRef(false);

// Save effect — skip during scenario switch
useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return; }
  if (isSwitchingRef.current) return; // suppress spurious save during switch
  // ... write to seo-planner-scenarios
}, [nodes, edges]);

// Switch handler
function handleSwitchScenario(targetId: string) {
  isSwitchingRef.current = true;
  // 1. serialize current into store.scenarios[activeIndex]
  // 2. update activeScenarioId to targetId
  // 3. setNodes(restored target nodes with callbacks wired)
  // 4. setEdges(restored target edges with callbacks wired)
  // React will batch the re-render; after paint, clear the flag
  requestAnimationFrame(() => { isSwitchingRef.current = false; });
}
```

### Pattern 3: ScenarioTabBar Component

**What:** Purely presentational — renders tabs, active state, `[+]` button, per-tab popover.

**Tab bar CSS (from CONTEXT.md specifics):**
```tsx
// Source: 09-CONTEXT.md <specifics>
<div className="flex items-center border-b border-border bg-white px-4 h-9 text-sm gap-1">
  {scenarios.map((s) => (
    <ScenarioTab
      key={s.id}
      scenario={s}
      isActive={s.id === activeScenarioId}
      onActivate={() => onSwitch(s.id)}
      onRename={(name) => onRename(s.id, name)}
      onDelete={() => onDelete(s.id)}
      canDelete={scenarios.length > 1}  // D-03: disabled when only one scenario
    />
  ))}
  <button onClick={onAdd} className="ml-1 ..."><Plus size={14} /></button>
</div>
```

**Active tab style:** `border-b-2 border-dark font-semibold text-dark`
**Inactive tab style:** `text-muted hover:text-ink`

### Pattern 4: New Scenario Creation Modal (blank vs clone)

**What:** A small inline prompt (not a full modal) on `[+]` click. Two buttons: "Blank" and "Clone Current". No 3rd-party dialog needed — use conditional render of a small floating div.

**Why inline prompt:** Keeps interaction lightweight. The existing codebase has `ImportDialog` as a full modal example, but for a simple two-choice prompt, a small popover is less disruptive.

### Anti-Patterns to Avoid

- **Reading localStorage directly in App.tsx after migration:** All reads/writes go through `useScenarios` — never bypass the hook.
- **Saving before scenario is fully restored:** The `isSwitchingRef` guard prevents this. Without it, the save effect fires with the new `nodes` state but the old `activeScenarioId`, overwriting the wrong scenario.
- **Forgetting to wire callbacks on scenario restore:** When `setNodes` is called with restored serialized data, `onUpdate`, `onRootToggle`, and `onZIndexChange` must be re-attached (same pattern as the existing restore effect and `handleImportFromDialog`).
- **Using the same `isFirstRender` ref for both mount and switch:** They serve different purposes. Introducing a separate `isSwitchingRef` keeps concerns clear.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique scenario IDs | Custom counter | `crypto.randomUUID()` | Built into browsers, no collision risk, no dependency |
| Popover for rename/delete | Custom positioned div | Existing Base UI Popover pattern (used in EditPopover) | Already established in the codebase |
| Tab rename inline input | Custom contentEditable | Plain `<input>` replacing tab label on rename trigger | Simpler, testable, consistent with existing form inputs |

**Key insight:** This phase adds no new library surface area. All patterns reuse what is already in the codebase.

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `seo-planner-graph` key in localStorage (existing single-graph format) | Data migration — auto-migrate to `seo-planner-scenarios` on first load (D-09); delete old key after successful migration |
| Live service config | None — no external services | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

**Migration is the only runtime state concern.** The `seo-planner-graph` key contains serialized `{ nodes, edges }`. Migration wraps this into `{ activeScenarioId: 's1', scenarios: [{ id: 's1', name: 'Default', nodes, edges }] }` and writes to `seo-planner-scenarios`, then removes `seo-planner-graph`.

---

## Common Pitfalls

### Pitfall 1: Save Effect Fires During Scenario Switch
**What goes wrong:** `setNodes`/`setEdges` called during switch triggers the save `useEffect`. If `activeScenarioId` has not yet been updated in state, the save writes the NEW scenario's graph data into the OLD scenario slot, corrupting it.
**Why it happens:** React state batching is not guaranteed to include both `setNodes` and the scenarios store update in the same synchronous commit, especially if they live in separate state atoms.
**How to avoid:** Use `isSwitchingRef.current = true` before the switch, clear it with `requestAnimationFrame` after the commit. The save effect checks this flag and returns early.
**Warning signs:** After switching and switching back, the original scenario's graph is empty or shows the previous scenario's data.

### Pitfall 2: Runtime Callbacks Missing After Restore
**What goes wrong:** Restored nodes render without `onUpdate` / `onRootToggle` / `onZIndexChange`, causing the EditPopover to silently fail (calling undefined).
**Why it happens:** Serialized nodes never store callbacks — they must be re-wired on restore.
**How to avoid:** Apply the exact same callback-wiring step used in the existing restore `useEffect` and in `handleImportFromDialog`. Extract this into a shared `wireNodeCallbacks(nodes, callbacks)` utility to avoid repetition across restore, switch, and import paths.
**Warning signs:** Opening EditPopover on a restored-scenario node produces no visible change, or a JS error: "onUpdate is not a function".

### Pitfall 3: Migration Guard Race on Concurrent Tabs
**What goes wrong:** Two browser tabs open simultaneously both run the migration guard, both find `seo-planner-graph`, both write `seo-planner-scenarios`, then both delete `seo-planner-graph`. Result is two separate scenario stores that diverge.
**Why it happens:** localStorage operations are synchronous but not atomic across tabs.
**How to avoid:** The migration writes `seo-planner-scenarios` first, then removes the old key. Because `loadOrMigrate` checks `existing = localStorage.getItem(NEW_KEY)` at the top, the second tab finds the new key already present and skips migration. This is the safe ordering already specified in D-09.
**Warning signs:** On refresh with two tabs open, one tab shows empty canvas.

### Pitfall 4: Auto-Increment Name Counting
**What goes wrong:** Deleting "Scenario 2" then creating a new scenario names it "Scenario 2" again instead of "Scenario 3".
**Why it happens:** Counter based on `scenarios.length` instead of max existing number.
**How to avoid:** Use `scenarios.length + 1` is acceptable per D-05 ("based on count of existing scenarios"). The user can rename via popover. This is a known UX trade-off, not a bug.
**Warning signs:** Duplicate scenario names (allowed by design — names are display labels, IDs are the identity).

### Pitfall 5: Clone Scenario Shares Object References
**What goes wrong:** Cloning a scenario by spreading `{ ...activeScenario }` shares the `nodes` and `edges` array references. Mutating one scenario's nodes array mutates the clone.
**Why it happens:** Shallow copy of an object containing arrays.
**How to avoid:** Deep-copy the serialized data: `JSON.parse(JSON.stringify(activeScenario))` or use `structuredClone(activeScenario)`. Since `serializeGraph()` already produces plain serializable data, cloning serialized (not live) state is safe.

---

## Code Examples

### localStorage Migration Guard
```typescript
// Source: D-09 (09-CONTEXT.md)
const OLD_KEY = 'seo-planner-graph';
const SCENARIOS_KEY = 'seo-planner-scenarios';

function loadOrMigrate(): ScenariosStore {
  const raw = localStorage.getItem(SCENARIOS_KEY);
  if (raw) return JSON.parse(raw) as ScenariosStore;

  const oldRaw = localStorage.getItem(OLD_KEY);
  if (oldRaw) {
    const parsed = JSON.parse(oldRaw);
    const id = crypto.randomUUID();
    const store: ScenariosStore = {
      activeScenarioId: id,
      scenarios: [{ id, name: 'Default', nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] }],
    };
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(store));
    localStorage.removeItem(OLD_KEY);
    return store;
  }

  const id = crypto.randomUUID();
  return {
    activeScenarioId: id,
    scenarios: [{ id, name: 'Scenario 1', nodes: [], edges: [] }],
  };
}
```

### Scenario Switch with Save-Guard
```typescript
// Source: isFirstRender pattern from Phase 3 (App.tsx line 103)
const isSwitchingRef = useRef(false);

const handleSwitchScenario = useCallback((targetId: string) => {
  if (targetId === activeScenarioId) return;
  isSwitchingRef.current = true;

  // Serialize current live graph into active scenario slot
  const serialized = serializeGraph(nodes, edges);
  updateActiveScenarioInStore(serialized);  // updates store state

  // Restore target scenario
  const target = store.scenarios.find((s) => s.id === targetId)!;
  const restoredNodes = target.nodes.map((n) => ({
    ...n,
    type: n.type ?? 'urlNode',
    data: { ...n.data, onUpdate: onNodeDataUpdate, onRootToggle, onZIndexChange: onNodeZIndexChange },
  })) as Node<AppNodeData>[];
  const restoredEdges = target.edges.map((e) => ({
    ...e,
    type: e.type ?? 'linkCountEdge',
    markerEnd: e.markerEnd ?? { type: MarkerType.ArrowClosed, color: '#9CA3AF' },
    data: { ...e.data, onLinkCountChange: onEdgeLinkCountChange },
  }));

  setNodes(restoredNodes);
  setEdges(restoredEdges);
  setActiveScenarioId(targetId);

  requestAnimationFrame(() => { isSwitchingRef.current = false; });
}, [activeScenarioId, nodes, edges, store, /* callbacks */]);
```

### ScenarioTabBar Skeleton
```tsx
// Source: 09-CONTEXT.md <specifics>
export function ScenarioTabBar({ scenarios, activeId, onSwitch, onAdd, onRename, onDelete }: ScenarioTabBarProps) {
  return (
    <div className="flex items-center border-b border-border bg-white px-4 h-9 text-sm gap-1 shrink-0">
      {scenarios.map((s) => (
        <ScenarioTab
          key={s.id}
          name={s.name}
          isActive={s.id === activeId}
          canDelete={scenarios.length > 1}
          onActivate={() => onSwitch(s.id)}
          onRename={(name) => onRename(s.id, name)}
          onDelete={() => onDelete(s.id)}
        />
      ))}
      <button
        onClick={onAdd}
        className="ml-1 flex items-center gap-1 rounded px-2 py-1 text-muted hover:text-ink hover:bg-surface transition-colors"
        aria-label="New scenario"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
```

---

## Environment Availability

Step 2.6: SKIPPED — This phase makes no use of external tools, services, CLIs, or runtimes beyond the project's own React/TypeScript codebase and browser localStorage API.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + React Testing Library |
| Config file | `vite.config.ts` (test block present) |
| Quick run command | `pnpm test -- --run src/components/ScenarioTabBar.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCENE-01 | `[+]` button triggers creation flow; new tab appears with auto-incremented name | unit | `pnpm test -- --run src/components/ScenarioTabBar.test.tsx` | Wave 0 |
| SCENE-01 | Clone mode copies active scenario's nodes/edges; blank mode starts empty | unit | `pnpm test -- --run src/hooks/useScenarios.test.ts` | Wave 0 |
| SCENE-02 | Switching tabs calls switch handler; tab bar shows new active tab | unit | `pnpm test -- --run src/components/ScenarioTabBar.test.tsx` | Wave 0 |
| SCENE-02 | Delete disabled when only one scenario (D-03) | unit | `pnpm test -- --run src/components/ScenarioTabBar.test.tsx` | Wave 0 |
| SCENE-03 | Migration: old `seo-planner-graph` key converted to `seo-planner-scenarios` and old key removed | unit | `pnpm test -- --run src/hooks/useScenarios.test.ts` | Wave 0 |
| SCENE-03 | Fresh start: single "Scenario 1" written to localStorage | unit | `pnpm test -- --run src/hooks/useScenarios.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- --run src/components/ScenarioTabBar.test.tsx src/hooks/useScenarios.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/ScenarioTabBar.test.tsx` — covers SCENE-01, SCENE-02 tab UI
- [ ] `src/hooks/useScenarios.test.ts` — covers SCENE-01 clone/blank, SCENE-03 migration, fresh-start init

*(All other test files already exist: `Toolbar.test.tsx`, `EditPopover.test.tsx`, `ScoreSidebar.test.tsx`, `FilterPanel.test.tsx`, `ImportDialog.test.tsx`, `UrlNode.test.tsx`)*

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `STORAGE_KEY = 'seo-planner-graph'` (single graph) | `'seo-planner-scenarios'` (array of graphs) | Phase 9 | Old key becomes dead after migration; remove references to `STORAGE_KEY` const |
| `isFirstRender` ref guards only mount | `isFirstRender` + `isSwitchingRef` guard both mount and scenario switch | Phase 9 | Prevents corrupt saves during switch transition |

**Deprecated after this phase:**
- `const STORAGE_KEY = 'seo-planner-graph'` in `App.tsx` — remove after migration guard is in place
- Single-graph `useEffect` restore/save pair in `App.tsx` — replaced by `useScenarios` hook effects

---

## Open Questions

1. **Where does `useScenarios` live — hook or inline in App.tsx?**
   - What we know: The CONTEXT.md says "App.tsx or new `useScenarios` hook (or inline state)".
   - What's unclear: Whether the hook is complex enough to warrant extraction, or whether inline state keeps the diff smaller.
   - Recommendation: Extract to `src/hooks/useScenarios.ts`. It has 3+ effects (init/migrate, save, restore on switch) and several callbacks. Extracting keeps App.tsx readable and makes the hook independently testable.

2. **Should `handleClearCanvas` clear only the active scenario or all scenarios?**
   - What we know: Current `handleClearCanvas` calls `localStorage.removeItem(STORAGE_KEY)` and clears nodes/edges. With multi-scenario, the storage key changes.
   - What's unclear: User intent — "clear canvas" likely means clear the current scenario's graph, not delete all scenarios.
   - Recommendation: Clear only active scenario's nodes/edges; persist the scenarios store with that scenario's graph emptied. Do not remove other scenarios.

---

## Sources

### Primary (HIGH confidence)
- `src/App.tsx` — live codebase; existing save/restore pattern, `serializeGraph`, `isFirstRender` ref, callback wiring
- `src/lib/graph-utils.ts` — `serializeGraph`, `parseImportJson`, `createDefaultNode` — reused as-is
- `src/components/Toolbar.tsx` — visual reference for secondary button styles and `<header>` structure
- `.planning/phases/09-scenario-comparison/09-CONTEXT.md` — all locked decisions, exact CSS classes, storage schema
- `vite.config.ts` — Vitest config confirming jsdom + globals + setupFiles

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — accumulated codebase decisions (Phase 3 `isFirstRender`, Phase 4 `parseImportJson` backward compat)
- `src/components/Toolbar.test.tsx` — test pattern reference (render + fireEvent + assertions)

### Tertiary (LOW confidence)
- None — all findings derive from project source code and locked CONTEXT decisions.

---

## Project Constraints (from CLAUDE.md)

- Commit messages must follow commitlint convention (e.g., `feat(09): ...`, `refactor(app): ...`).
- No CLAUDE.md exists in the project root — only in `~/.claude/CLAUDE.md`. No project-specific code constraints beyond commitlint.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; verified by reading package.json and existing source files
- Architecture: HIGH — patterns derived directly from existing codebase and locked CONTEXT.md decisions
- Pitfalls: HIGH — derived from analyzing the existing `isFirstRender` pattern and React state update ordering

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable domain; localStorage + React hooks patterns are not fast-moving)
