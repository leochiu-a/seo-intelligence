---
name: fixture-generator
description: >
  Guides a PM through a conversational interview to describe their website structure,
  then generates a fixture JSON file that can be imported into the SEO internal link planner.
  Use this skill whenever someone wants to create a fixture, set up a new site in the planner,
  describe a website for import, or says things like "I want to add my site", "create a fixture",
  "import my website structure", "new site fixture", or "help me set up the site map".
  The PM never needs to write or read JSON — the skill handles all of that.
---

# Fixture Generator

You are helping a PM create a fixture file for the SEO Internal Link Planner. Your job is to ask friendly, plain-English questions and produce the JSON at the end. The PM should never need to see or write any JSON.

## What a fixture represents

A fixture is a snapshot of a website's URL structure — which page templates exist, how many pages they contain, how they link together, and which navigation areas they appear in. It gets imported into the planner as a visual graph.

## Interview flow

Work through the phases below in order. Be conversational — ask one or two questions at a time, not all at once. Confirm answers before moving on. If the PM seems uncertain, offer examples.

---

### Phase 1 — Site overview

Ask:
- What kind of site is it? (e-commerce, blog, news, corporate, SaaS, etc.)
- What would you like to name this fixture file? (e.g., "my-shop", "company-blog")

---

### Phase 2 — URL structure

Goal: capture all URL templates and their page counts.

Ask the PM to describe their main sections (e.g., "we have a blog, a products section, and an about page").

For each section:
1. What is the URL pattern? (e.g., `/blog`, `/products`)
2. Does it have sub-pages with a variable part in the URL? (e.g., `/blog/<slug>` for individual posts, `/products/<category>/<id>` for product detail pages)
3. Approximately how many pages are in this section? This is the total number of real pages that URL pattern generates:
   - A static page like `/about` → 1
   - A blog listing `/blog` → 1
   - Individual blog posts `/blog/<slug>` with 50 articles → 50
   - A product category template `/products/<category>` with 8 categories → 8
   - A product detail page `/products/<category>/<id>` (many products) → ask for the count, or use 1 if it's just the template placeholder

The homepage `/` is always the root. If they don't mention it, add it automatically.

**Examples to share if the PM is unsure:**
- A blog listing page `/blog` — always 1 page
- Individual blog posts `/blog/<slug>` — fill in how many articles exist (e.g., 50)
- A product category `/products/<category>` — fill in how many categories exist (e.g., 8)
- A static page like `/about` — always 1 page

---

### Phase 3 — Global pages & navigation

Ask which pages appear in **site-wide navigation** (header, footer, etc.). These become `isGlobal: true`.

Then ask: what navigation areas does the site have? (e.g., "Header Nav", "Footer Links", "Blog Sidebar")

For each globally-navigated page, ask:
- Which navigation areas link to it?
- Roughly how many links from each area? (usually 1–3)

---

### Phase 4 — Tags / groups

Ask if they want to group pages by topic. This is **completely optional** — if the PM says no or doesn't care, skip entirely and add no tags to any node.

Example: pages under `/blog/**` might all get the tag `"blog"`. Pages under `/products/**` get `"products"`.

If they say yes, help them assign tag strings to each URL template. Multiple tags per page are allowed.

**Important:** Only add tags a PM explicitly assigns. Never invent tags like "core", "home", or "main" on your own.

---

### Phase 5 — Internal links

Ask: which pages link to which other pages, and roughly how many links?

Keep it simple — think in terms of sections, not individual pages. For example:
- "The blog listing page links to individual blog posts (2 links)"
- "Each product detail page links back to the products section (1 link)"

---

### Phase 6 — Generate

Once all phases are done, generate the fixture JSON silently (don't show it yet) and then present the summary in three plain-language sections:

**1. 頁面結構（Page hierarchy）**

Show the pages as an indented tree based on URL depth. Use friendly names, not raw URLs. For example:

```
首頁 (/)
├── 部落格 (/blog)
│   └── 文章頁 (/blog/<slug>) — 50 頁
└── 關於我們 (/about)
```

**2. 導覽列連結（Navigation placements）**

List which pages appear in each navigation area. For example:

```
Header Nav：首頁、部落格
Footer Links：關於我們、聯絡我們
```

**3. 分類標籤（Tags）** — only show this section if the PM assigned tags

List which pages belong to which group. For example:

```
blog：部落格、文章頁
products：產品列表、分類頁、產品詳細頁
```

After showing the summary, ask: "這樣看起來對嗎？有任何需要調整的地方我可以幫你修改。"

Once confirmed, write the file to the current working directory as `fixture-<name>.json`, where `<name>` is the slug they provided in Phase 1.

Tell the PM the exact file path and that they can import it via **File → Import** in the planner.

---

## Generating the fixture JSON

Use this schema exactly. Do not add extra fields.

```json
{
  "nodes": [
    {
      "id": "node-1",
      "urlTemplate": "/",
      "pageCount": 1,
      "x": 600,
      "y": 60,
      "isRoot": true,
      "isGlobal": true,
      "placements": [
        { "id": "p1-1", "name": "Header Nav", "linkCount": 2 }
      ]
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "node-1",
      "target": "node-2",
      "linkCount": 2
    }
  ]
}
```

**Rules:**
- `isRoot: true` only on the homepage node
- `isGlobal` and `placements` only appear on globally-navigated pages
- `tags` only appears when the PM assigned tags
- `placements` IDs use the format `p<nodeNumber>-<placementIndex>` (e.g., `p2-1`, `p2-2`)
- Edge IDs use `e<sourceNumber>-<targetNumber>` (e.g., `e1-2`)

### Auto-layout coordinates

Assign x/y coordinates based on URL depth (number of `/` segments minus 1):

| Depth | y value | Notes |
|---|---|---|
| 0 | 60 | Root `/` only |
| 1 | 220 | `/blog`, `/products`, `/about` |
| 2 | 420 | `/blog/seo`, `/products/<cat>` |
| 3 | 660 | `/blog/seo/<slug>` |

For x, distribute nodes at the same depth evenly. Use a canvas width of ~1200px (range 0–1200), center around x=600. Space nodes ~200–300px apart.

Example for 3 nodes at depth 1: x = 220, 600, 980

---

## Tone and style

- Friendly, plain English — no technical jargon unless the PM introduces it
- Offer examples freely when a question might be confusing
- Confirm understanding before moving to the next phase
- Keep each message short — one or two questions at a time
- If the PM gives vague answers, ask a clarifying follow-up rather than guessing
