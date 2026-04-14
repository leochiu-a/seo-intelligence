---
phase: quick
plan: 260414-deh
type: execute
wave: 1
depends_on: []
files_modified:
  - src/index.css
  - tailwind.config.js
  - src/components/UrlNode.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - UrlNode renders at fixed w-[280px] with rounded-xl border-2 matching StepNode proportions
    - Each score tier (high/mid/low/neutral) has a distinct card border color and selected glow shadow
    - Header row shows a colored badge pill with tier label and pencil edit button aligned right
    - Title (urlTemplate) renders as truncated text-sm font-semibold using --color-dark token
    - Subtitle shows page count and, when isWeak, an inline warning indicator in muted text
    - Handles are white with placeholder-colored border, 12x12px, matching StepNode handles
  artifacts:
    - path: src/index.css
      provides: CSS custom properties for --color-dark, --color-muted-fg, --color-placeholder, and per-tier glow colors
    - path: tailwind.config.js
      provides: Tailwind color tokens dark, muted-fg, placeholder, and tier colors (green-tier, amber-tier, red-tier, indigo-tier)
    - path: src/components/UrlNode.tsx
      provides: Restyled UrlNode with TONE_MAP, badge header, StepNode-equivalent layout
  key_links:
    - from: src/components/UrlNode.tsx
      to: src/index.css
      via: CSS variables consumed by Tailwind utility classes
      pattern: "--color-"
    - from: tailwind.config.js
      to: src/components/UrlNode.tsx
      via: Custom color tokens referenced in className strings
      pattern: "text-dark|text-muted-fg|border-placeholder"
---

<objective>
Restyle UrlNode to visually match the StepNode design from agent-flow.

Purpose: Make seo-intelligence canvas nodes look polished and consistent with the agent-flow aesthetic — fixed width card, rounded-xl, TONE_MAP per score tier, badge header, StepNode-style handles.
Output: Updated UrlNode.tsx, extended tailwind.config.js, and populated index.css with color tokens.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/components/UrlNode.tsx
@src/index.css
@tailwind.config.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add CSS variables and extend Tailwind config with color tokens</name>
  <files>src/index.css, tailwind.config.js</files>
  <action>
In src/index.css, add CSS custom properties inside :root (after the existing @tailwind directives):

```css
:root {
  --color-dark: #1f2937;
  --color-muted-fg: #9ca3af;
  --color-placeholder: #d1d5db;

  /* Score tier glow colors (rgba values for box-shadow) */
  --color-tier-high: #22c55e;
  --color-tier-high-glow: rgba(34, 197, 94, 0.6);
  --color-tier-high-ambient: rgba(34, 197, 94, 0.15);

  --color-tier-mid: #f59e0b;
  --color-tier-mid-glow: rgba(245, 158, 11, 0.6);
  --color-tier-mid-ambient: rgba(245, 158, 11, 0.15);

  --color-tier-low: #f87171;
  --color-tier-low-glow: rgba(248, 113, 113, 0.6);
  --color-tier-low-ambient: rgba(248, 113, 113, 0.15);

  --color-tier-neutral: #6366f1;
  --color-tier-neutral-glow: rgba(99, 102, 241, 0.6);
  --color-tier-neutral-ambient: rgba(99, 102, 241, 0.15);
}
```

In tailwind.config.js, extend theme.colors with:

```js
theme: {
  extend: {
    colors: {
      dark: 'var(--color-dark)',
      'muted-fg': 'var(--color-muted-fg)',
      placeholder: 'var(--color-placeholder)',
      'tier-high': 'var(--color-tier-high)',
      'tier-mid': 'var(--color-tier-mid)',
      'tier-low': 'var(--color-tier-low)',
      'tier-neutral': 'var(--color-tier-neutral)',
    },
  },
},
```
  </action>
  <verify>
    <automated>grep -q "\-\-color-dark" /Users/leochiu.chiu/Desktop/seo-intelligence/src/index.css && grep -q "tier-high" /Users/leochiu.chiu/Desktop/seo-intelligence/tailwind.config.js && echo "OK"</automated>
  </verify>
  <done>CSS variables exist in :root and Tailwind color tokens are registered for dark, muted-fg, placeholder, and all four tier colors.</done>
</task>

<task type="auto">
  <name>Task 2: Restyle UrlNode to match StepNode design</name>
  <files>src/components/UrlNode.tsx</files>
  <action>
Rewrite the UrlNodeComponent JSX and TONE_MAP to match StepNode structure. Keep all existing logic (handleSave, showPopover, EditPopover) intact — only restructure the markup and styling.

Replace TIER_BORDER_CLASS with a TONE_MAP identical in shape to StepNode's TONE_MAP:

```ts
const TONE_MAP: Record<ScoreTier, { card: string; focus: string; badge: string; badgeLabel: string }> = {
  high: {
    card: 'bg-white border-tier-high/40',
    focus: 'border-tier-high shadow-[0_0_0_1px_var(--color-tier-high-glow),0_0_24px_var(--color-tier-high-ambient)]',
    badge: 'bg-green-100 text-green-700',
    badgeLabel: 'High',
  },
  mid: {
    card: 'bg-white border-tier-mid/40',
    focus: 'border-tier-mid shadow-[0_0_0_1px_var(--color-tier-mid-glow),0_0_24px_var(--color-tier-mid-ambient)]',
    badge: 'bg-amber-100 text-amber-700',
    badgeLabel: 'Mid',
  },
  low: {
    card: 'bg-white border-tier-low/40',
    focus: 'border-tier-low shadow-[0_0_0_1px_var(--color-tier-low-glow),0_0_24px_var(--color-tier-low-ambient)]',
    badge: 'bg-red-100 text-red-700',
    badgeLabel: 'Low',
  },
  neutral: {
    card: 'bg-white border-tier-neutral/40',
    focus: 'border-tier-neutral shadow-[0_0_0_1px_var(--color-tier-neutral-glow),0_0_24px_var(--color-tier-neutral-ambient)]',
    badge: 'bg-indigo-100 text-indigo-700',
    badgeLabel: 'Neutral',
  },
};
```

The component signature gains a `selected` prop (NodeProps already provides it):

```tsx
function UrlNodeComponent({ id, data, selected }: NodeProps<UrlNodeExtendedData>) {
```

New JSX layout — outer div, handles, header, title, subtitle:

```tsx
const tier = data.scoreTier ?? 'neutral';
const tone = TONE_MAP[tier];

return (
  <div
    className={`w-[280px] rounded-xl border-2 p-3.5 shadow-md shadow-black/8 transition ${tone.card} ${selected ? tone.focus : ''}`}
  >
    <Handle
      type="target"
      position={Position.Left}
      style={{ background: '#ffffff', border: '2px solid var(--color-placeholder)', width: 12, height: 12 }}
    />

    {/* Header: badge + edit button */}
    <div className="mb-2.5 flex items-center gap-2">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
        {tone.badgeLabel}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <button
          className="nodrag p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label="Edit node"
          onClick={(e) => {
            e.stopPropagation();
            setShowPopover((prev) => !prev);
          }}
        >
          <Pencil size={14} className="text-muted-fg hover:text-dark" />
        </button>
      </div>
    </div>

    {/* Title */}
    <div className="mb-1 truncate text-sm font-semibold text-dark">
      {data.urlTemplate || <span className="text-placeholder">No URL template</span>}
    </div>

    {/* Subtitle */}
    <div className="flex items-center gap-1.5 text-[11px] text-muted-fg">
      <span>{formatPageCount(data.pageCount)}</span>
      {data.isWeak && (
        <>
          <span>·</span>
          <TriangleAlert size={11} className="text-amber-500" aria-label="Weak page" />
          <span className="text-amber-500">Weak</span>
        </>
      )}
    </div>

    <Handle
      type="source"
      position={Position.Right}
      style={{ background: '#ffffff', border: '2px solid var(--color-placeholder)', width: 12, height: 12 }}
    />

    {showPopover && (
      <EditPopover
        nodeId={id}
        urlTemplate={data.urlTemplate}
        pageCount={data.pageCount}
        onSave={handleSave}
        onClose={() => setShowPopover(false)}
      />
    )}
  </div>
);
```

Remove the now-unused `group relative` classes and the old `TIER_BORDER_CLASS` constant. Remove the old absolute-positioned edit button and the top isWeak icon (both replaced by new layout above).
  </action>
  <verify>
    <automated>cd /Users/leochiu.chiu/Desktop/seo-intelligence && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>TypeScript compiles clean. UrlNode renders w-[280px] card with badge header, truncated title, subtitle row (page count + weak indicator), white handles with placeholder border, and colored border+glow on selected state per tier.</done>
</task>

</tasks>

<verification>
After both tasks: run `npx tsc --noEmit` in the project root — zero errors expected.
Visual check: open the app, add a URL node, confirm it renders at 280px with rounded-xl shape, badge pill in header, edit button aligned right, handles are white with gray border.
Select a node — confirm colored border + glow shadow appear based on its score tier.
</verification>

<success_criteria>
- UrlNode visually matches StepNode proportions: w-[280px], rounded-xl, border-2, p-3.5
- Each of the four score tiers has a unique card border color (40% opacity) and a selected-state glow shadow
- Badge pill in header shows correct tier label with appropriate background/text colors
- Handles are 12x12px, white background, var(--color-placeholder) border — identical to StepNode handles
- isWeak renders as inline "Weak" text with triangle icon in subtitle row, not overlapping title
- TypeScript compiles with zero errors
</success_criteria>

<output>
No SUMMARY.md needed for quick plans.
</output>
