# Phase 6: Placement Autocomplete - Research

**Researched:** 2026-04-15
**Domain:** React combobox / autocomplete UI within an existing EditPopover component
**Confidence:** HIGH

---

## Summary

Phase 6 adds a freeform-with-suggestions autocomplete to the placement name inputs inside `EditPopover`. When a user types into a placement name `<input>`, a dropdown of existing placement names (collected from all OTHER global nodes) appears. The user can click a suggestion to pre-fill the field or ignore it and type freely.

The project already has `@base-ui/react@1.4.0` installed which ships a first-class `Autocomplete` component. Using it is the correct path — it handles keyboard navigation, ARIA roles, open/close state, and item selection out of the box. The alternative (hand-rolled `<datalist>` or bespoke dropdown) would require reimplementing all of that.

The key data-flow challenge: `EditPopover` currently receives no information about other nodes. The `allPlacements: string[]` suggestions list must be derived in `UrlNode` (which has access to `useReactFlow()`) and passed down as a new prop to `EditPopover`.

**Primary recommendation:** Pass a `placementSuggestions: string[]` prop from `UrlNode` into `EditPopover`, replace each placement name `<input>` in `EditPopover` with a `@base-ui/react` `<Autocomplete.Root>` wired to that suggestions list.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLACE-01 | When adding a placement name on a global node, user sees a dropdown of existing placement names used across all other global nodes | `Autocomplete.Root items={filteredSuggestions}` renders the dropdown; derive suggestions from nodes via `useReactFlow` in UrlNode |
| PLACE-02 | User can select a suggested name from the dropdown to pre-fill the placement name field | `Autocomplete.Root onValueChange` callback updates `localPlacements` state in EditPopover |
| PLACE-03 | User can still type a freeform name not in the suggestions list | Base UI Autocomplete allows free text — it does not enforce selection from the list |
| PLACE-04 | Suggestions only appear when other global nodes have placements defined; no dropdown shown otherwise | Pass empty array when no other global nodes have placements; Base UI hides the popup when `items` is empty |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | 1.4.0 (already installed) | Headless Autocomplete component | Already in project; ships accessible combobox/autocomplete built on Floating UI; no extra install needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `reactflow` (useReactFlow) | 11.11.4 (already installed) | Read all nodes inside UrlNode to derive suggestions | UrlNode already uses `useReactFlow` for `setNodes`; same hook gives access to `getNodes()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Autocomplete` from `@base-ui/react` | Native `<datalist>` + `<input list="">` | `<datalist>` has poor cross-browser styling and no controlled filtering; not viable |
| `Autocomplete` from `@base-ui/react` | Hand-rolled `<ul>` dropdown with `onFocus`/`onBlur` | Needs manual keyboard nav, ARIA, portal, click-outside — significant complexity for no benefit |
| `Autocomplete` from `@base-ui/react` | `Combobox` from same library | `Combobox` requires explicit value selection; `Autocomplete` allows free text (PLACE-03) |

**Installation:** None required. `@base-ui/react` is already in `dependencies`.

---

## Architecture Patterns

### Data Flow

```
App.tsx (nodes state)
  └── UrlNode (useReactFlow → getNodes())
        ├── derives: placementSuggestions = unique names from other global nodes
        └── EditPopover (new prop: placementSuggestions)
              └── per-placement Autocomplete.Root (items = placementSuggestions)
```

`UrlNode` already uses `useReactFlow()` for `setNodes`. The same hook provides `getNodes()`, which lets `UrlNode` read all current nodes to build the suggestions list without any prop-drilling from `App.tsx`.

### Recommended Project Structure

No new files needed for the minimal implementation. Changes are confined to:

```
src/
├── components/
│   ├── UrlNode.tsx          # derive suggestions, pass to EditPopover
│   └── EditPopover.tsx      # accept suggestions prop, replace name inputs with Autocomplete
└── lib/
    └── graph-utils.ts       # optional: extract collectPlacementSuggestions() pure function
```

An optional `collectPlacementSuggestions` pure function in `graph-utils.ts` makes unit testing the suggestion derivation trivial without mounting components.

### Pattern 1: Deriving Suggestions in UrlNode

**What:** Read all nodes via `useReactFlow`, filter to other global nodes, collect and deduplicate their placement names.

**When to use:** Suggestions must reflect the live graph state at the moment the popover opens.

```typescript
// In UrlNodeComponent — before the return
const { setNodes, getNodes } = useReactFlow();

const placementSuggestions = useMemo(() => {
  const otherGlobalNodes = getNodes().filter(
    (n) => n.id !== id && n.data.isGlobal && (n.data.placements?.length ?? 0) > 0,
  );
  const names = otherGlobalNodes.flatMap(
    (n) => (n.data.placements ?? []).map((p: Placement) => p.name).filter(Boolean),
  );
  return [...new Set(names)];
}, [id, getNodes]);
```

Note: `getNodes()` is a stable function reference from `useReactFlow`; wrapping in `useMemo` with `[id, getNodes]` deps is correct. Because UrlNode is `memo`-wrapped, the `useMemo` only re-runs when the containing node re-renders (which happens when graph state changes).

### Pattern 2: Base UI Autocomplete in EditPopover

**What:** Replace the plain placement-name `<input>` with `Autocomplete.Root` + minimal sub-parts.

**When to use:** Only when `localIsGlobal` is true (placement section visible).

```typescript
// Source: @base-ui/react autocomplete API (verified from installed types)
import { Autocomplete } from '@base-ui/react/autocomplete';

// Inside EditPopover, inside the placement mapping:
<Autocomplete.Root
  value={p.name}
  items={placementSuggestions}
  onValueChange={(value) =>
    setLocalPlacements((prev) =>
      prev.map((pl) => (pl.id === p.id ? { ...pl, name: value } : pl))
    )
  }
>
  <Autocomplete.InputGroup>
    <Autocomplete.Input
      className="flex-1 h-7 text-sm text-dark border border-border rounded-lg px-2 ..."
      placeholder="e.g. Header Nav"
    />
    {placementSuggestions.length > 0 && <Autocomplete.Trigger />}
  </Autocomplete.InputGroup>
  <Autocomplete.Positioner>
    <Autocomplete.Popup className="bg-white border border-border rounded-lg shadow-md z-[60] ...">
      <Autocomplete.List>
        {placementSuggestions.map((name) => (
          <Autocomplete.Item key={name} value={name}>
            {name}
          </Autocomplete.Item>
        ))}
      </Autocomplete.List>
    </Autocomplete.Popup>
  </Autocomplete.Positioner>
</Autocomplete.Root>
```

The `Positioner` uses Floating UI under the hood and auto-positions the popup. For the EditPopover context (which sits inside the ReactFlow canvas at `z-50`), the Popup needs `z-[60]` or higher.

### Pattern 3: Conditional Rendering When No Suggestions

**What:** When `placementSuggestions.length === 0`, render the plain `<input>` (no autocomplete wrapper). This satisfies PLACE-04 without needing to configure Base UI to show an empty list.

**When to use:** Simplest path — avoids managing empty-state inside Autocomplete.Root.

```typescript
// In EditPopover, per-placement rendering:
{placementSuggestions.length > 0 ? (
  <Autocomplete.Root ...>...</Autocomplete.Root>
) : (
  <input
    type="text"
    className="flex-1 h-7 ..."
    placeholder="e.g. Header Nav"
    value={p.name}
    onChange={(e) =>
      setLocalPlacements((prev) =>
        prev.map((pl) => (pl.id === p.id ? { ...pl, name: e.target.value } : pl))
      )
    }
  />
)}
```

**Alternative:** Always render `Autocomplete.Root` but pass `items={[]}` — Base UI hides the popup when items is empty. Both approaches satisfy PLACE-04; the conditional rendering approach is more explicit.

### Anti-Patterns to Avoid

- **Drilling `nodes` prop from App.tsx through UrlNode to EditPopover:** Unnecessary. UrlNode already has `useReactFlow` access. Adding `nodes` as a prop creates a new source of truth.
- **Putting suggestion derivation inside EditPopover:** EditPopover has no access to the global node list. It only knows its own placements. Derivation must happen at a higher scope.
- **Using `Combobox` instead of `Autocomplete`:** Base UI's `Combobox` enforces selection from the list (selection mode). `Autocomplete` allows freeform text which is required by PLACE-03.
- **Using a portal without care for z-index:** The EditPopover itself is `z-50`. The Autocomplete popup must be `z-[60]` or higher to avoid being clipped, especially since UrlNode elevates to `zIndex: 1000` when popover is open.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown open/close on focus | Custom `onFocus`/`onBlur` state | `Autocomplete.Root` + `Autocomplete.Trigger` | Handles click-outside, escape key, blur between sub-elements automatically |
| Keyboard navigation in list | `onKeyDown` with arrow key tracking | `Autocomplete.Root` | ARIA combobox pattern requires precise keyboard management; Base UI implements it correctly |
| Popup positioning | Manual `top`/`left` calculation | `Autocomplete.Positioner` (Floating UI) | Handles viewport boundary, flip, scroll — especially relevant inside the React Flow canvas |
| ARIA roles | Manual `role="combobox"`, `aria-expanded`, etc. | `Autocomplete.Root` | The ARIA combobox pattern is non-trivial; Base UI handles it per W3C spec |

**Key insight:** An accessible, well-behaved combobox has ~15 interacting edge cases. The installed library handles all of them.

---

## Common Pitfalls

### Pitfall 1: z-index clipping
**What goes wrong:** The autocomplete popup renders behind the ReactFlow canvas or other nodes.
**Why it happens:** EditPopover is `z-50`; ReactFlow nodes have their own stacking context; when a node's zIndex is elevated to 1000 (existing popover logic), children still clip at the parent's stacking context.
**How to avoid:** Use `Autocomplete.Portal` to render the popup outside the node tree, OR ensure the Popup element has a z-index higher than any parent stacking context. `z-[60]` relative to the popover container should be sufficient if using Portal.
**Warning signs:** Popup appears briefly then disappears; dropdown renders behind the UrlNode card.

### Pitfall 2: Click-outside conflict with EditPopover's own mousedown handler
**What goes wrong:** Clicking an autocomplete dropdown item triggers the `handleMouseDown` in EditPopover's `useEffect`, causing the popover to save and close before the item selection fires.
**Why it happens:** EditPopover listens to `document.addEventListener('mousedown', handleMouseDown)`. A click on an Autocomplete.Item is a mousedown outside `popoverRef`.
**How to avoid:** The autocomplete popup must be rendered inside `popoverRef` so `popoverRef.current.contains(e.target)` returns `true`. This means using `Autocomplete.Positioner` in-place (without Portal) but controlling z-index, OR using Portal and adding the portal container to the contains check.
**Warning signs:** Selecting an autocomplete suggestion closes the popover instead of filling the input.

### Pitfall 3: Stale suggestion list when typing rapidly
**What goes wrong:** Suggestions reflect the state at popover-open time, not the current moment.
**Why it happens:** If `placementSuggestions` is derived once on mount (no reactivity).
**How to avoid:** Derive via `useMemo` inside `UrlNode` with dependency on node data, so suggestions update if the graph changes while popover is open. In practice this is rare but the memo approach handles it correctly.
**Warning signs:** A placement name added to another node while this popover is open doesn't appear in suggestions until re-open.

### Pitfall 4: Autocomplete onValueChange vs onChange conflict
**What goes wrong:** Both the Autocomplete `onValueChange` and an `onChange` on the underlying input try to update state, causing double-updates or stale closures.
**Why it happens:** Base UI's `Autocomplete.Input` internally manages its own input value. Providing an `onChange` alongside `onValueChange` on the Root can cause conflicts.
**How to avoid:** Use only `onValueChange` on `Autocomplete.Root` as the single source of truth for state updates. Do not attach a separate `onChange` to `Autocomplete.Input`.

---

## Code Examples

### Verified: collectPlacementSuggestions pure function (recommended for graph-utils.ts)

```typescript
// src/lib/graph-utils.ts
/**
 * Collects unique, non-empty placement names from all global nodes
 * EXCEPT the node with the given currentNodeId.
 */
export function collectPlacementSuggestions(
  nodes: Node<UrlNodeData>[],
  currentNodeId: string,
): string[] {
  const names = nodes
    .filter((n) => n.id !== currentNodeId && n.data.isGlobal && n.data.placements?.length)
    .flatMap((n) => (n.data.placements ?? []).map((p) => p.name).filter(Boolean));
  return [...new Set(names)];
}
```

### Verified: EditPopover new prop signature

```typescript
// EditPopoverProps — add one prop
interface EditPopoverProps {
  nodeId: string;
  urlTemplate: string;
  pageCount: number;
  isGlobal: boolean;
  placements: Placement[];
  placementSuggestions: string[];   // NEW
  onSave: (urlTemplate: string, pageCount: number, isGlobal: boolean, placements: Placement[]) => void;
  onClose: () => void;
}
```

### Verified: UrlNode call site — pass suggestions

```typescript
// In UrlNode, inside the return JSX:
<EditPopover
  nodeId={id}
  urlTemplate={data.urlTemplate}
  pageCount={data.pageCount}
  isGlobal={data.isGlobal ?? false}
  placements={data.placements ?? []}
  placementSuggestions={placementSuggestions}   // NEW
  onSave={handleSave}
  onClose={() => setShowPopover(false)}
/>
```

---

## Environment Availability

Step 2.6: SKIPPED — this is a pure code change. No external services, databases, CLI tools, or runtimes beyond the existing dev environment are required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + @testing-library/react 16.3.2 |
| Config file | `vite.config.ts` (test block) |
| Quick run command | `npx vitest run src/components/EditPopover.test.tsx` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLACE-01 | Dropdown of suggestions appears when input focused and other globals have placements | unit | `npx vitest run src/components/EditPopover.test.tsx` | ✅ (extend existing) |
| PLACE-02 | Clicking a suggestion pre-fills the input | unit | `npx vitest run src/components/EditPopover.test.tsx` | ✅ (extend existing) |
| PLACE-03 | Freeform text not in suggestions is accepted | unit | `npx vitest run src/components/EditPopover.test.tsx` | ✅ (extend existing) |
| PLACE-04 | No dropdown when placementSuggestions is empty | unit | `npx vitest run src/components/EditPopover.test.tsx` | ✅ (extend existing) |

PLACE-01 through PLACE-04 can all be covered by extending `EditPopover.test.tsx`. No new test files needed.

If `collectPlacementSuggestions` is extracted to `graph-utils.ts`, add a test case to `graph-utils.test.ts` for the function in isolation (pure function, trivial to test).

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/EditPopover.test.tsx`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. `EditPopover.test.tsx` already exists; tests are added not created from scratch.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@base-ui/react/autocomplete/root/AutocompleteRoot.d.ts` — verified Autocomplete.Root props: `value`, `onValueChange`, `items`, `mode`, `openOnInputClick`
- `node_modules/@base-ui/react/autocomplete/index.parts.d.ts` — verified available sub-components: Root, Input, InputGroup, Trigger, Positioner, Popup, List, Item
- `node_modules/@base-ui/react/autocomplete/item/AutocompleteItem.d.ts` — verified Item props: `value`, `index`, `disabled`
- `src/components/EditPopover.tsx` — current implementation confirmed (state shape, placement input structure, mousedown handler)
- `src/components/UrlNode.tsx` — confirmed `useReactFlow` already used; `memo` wrapping; `handleSave` signature

### Secondary (MEDIUM confidence)
- Base UI docs pattern for `Autocomplete.Positioner` + `Autocomplete.Popup` for popup positioning (inferred from Floating UI integration in type chain)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@base-ui/react` already installed; types inspected directly
- Architecture: HIGH — data flow derived directly from existing source code
- Pitfalls: HIGH — mousedown conflict identified by direct code reading of EditPopover; z-index confirmed by existing popover elevation logic in UrlNode

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable dependencies)
