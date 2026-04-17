---
quick_id: 260417-ljg
description: 連接點沒有對齊線
date: 2026-04-17
---

# Quick 260417-ljg: Center React Flow Handles on Node Border

## Context

User reports that connection points (the 4 handle circles on `UrlNode`) don't align with edge lines — specifically, 連線末端沒對到圓圈中心 (edge endpoints don't meet circle centers).

Root cause:

1. `packages/web/src/components/UrlNode.tsx` lines 85, 91, 178, 184 render `Handle` with inline style `width: 12, height: 12, border: 2px`.
2. React Flow v11.11.4 default CSS positions handles with hardcoded `-4px` offsets (`.react-flow__handle-top { top: -4px; transform: translate(-50%, 0); }`, etc.). These offsets only correctly center ~8px handles.

With 12px handles, each visible circle center sits 2px inside the node border instead of on it. React Flow routes edges to the handle center (via `getBoundingClientRect`, see `@reactflow/core .../index.js:2585-2598`), so edge endpoints sit 2px inside the node, visibly misaligned from where the user expects the line to meet the circle.

## Task

Add CSS overrides in `packages/web/src/index.css` (after the `.react-flow__controls-button:hover` rule, before EOF) that anchor each handle's visual center exactly on the node border midline regardless of handle size:

```css
.react-flow__handle-top    { top: 0;    left: 50%; transform: translate(-50%, -50%); }
.react-flow__handle-bottom { top: 100%; bottom: auto; left: 50%; transform: translate(-50%, -50%); }
.react-flow__handle-left   { top: 50%; left: 0;    transform: translate(-50%, -50%); }
.react-flow__handle-right  { top: 50%; left: 100%; right: auto; transform: translate(-50%, -50%); }
```

Why: `top/left: 0 | 100% | 50%` anchors the handle box at the border midline / center axis, and `translate(-50%, -50%)` shifts it back by half its own bounding box — so the visual center always lands on the border midline. React Flow's `getBoundingClientRect` measurement picks up the same post-transform center, so edge routing and visible circle coincide.

- Files: `packages/web/src/index.css`
- Action: insert 4 CSS rules after line 55
- Verify: `pnpm -C packages/web test` passes (no geometry assertions); visually confirm via `pnpm dev` that edges terminate at circle centers
- Done: handles centered on border midline for all 4 positions regardless of size
