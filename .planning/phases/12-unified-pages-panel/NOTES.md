# Phase 12: Unified Pages Panel (整合 Score + Health)

## 問題

目前 PM 的「弱頁指標」散落在多個 tab：

- ScorePanel：PageRank 排名、weak-page 警示（⚠️ 三角形）、orphan/unreachable 折疊區塊
- HealthPanel：Links / Depth / Tags 三個 health warning、Score Tier 分位
- SidePanel 是單 tab 切換，不能同時看 Score 和 Health

結果：PM 想回答「哪些頁面最該優先修？」必須切 tab、目視掃描、心算交集。

## 目標

合併 ScorePanel + HealthPanel 為單一「Pages」panel：

- 每列一頁，欄位包含 URL template、score、depth、inbound、outbound、warning badges
- 預設依「綜合弱度」排序（orphan/unreachable 最前，低分 + 多警告次之）
- 可切換排序欄位（score / depth / outbound / inbound）
- 可 filter：只看有警告的頁 / 特定 tier / 特定 cluster（與 FilterPanel 對齊概念）
- 點擊列 → 在畫布上 highlight + pan 到該節點（沿用現行行為）

## 價值

一眼看完所有弱頁，不用切 tab。

## 代價 / 待討論

- UI 資訊密度高，窄螢幕（<1280）需考慮：欄位隱藏、橫向捲動、或響應式折疊
- ScoreTier summary 區塊是否保留為 panel 上方 summary card？
- 既有的 "Show warnings only" toggle 要怎麼整併進新 filter model
- 是否保留舊 ScorePanel / HealthPanel 作為向後相容，或直接取代
