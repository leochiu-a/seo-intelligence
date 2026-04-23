# Phase 13: Inbound / Outbound Highlight

## 問題

畫布用 ReactFlow，點節點時會 dim 掉不相連節點（opacity 0.2），但：

- Inbound 邊和 Outbound 邊顏色完全一樣（灰 #9CA3AF），線又重疊在一起
- `getConnectedElements()` 雙向一起算，沒有分方向
- 沒有 side panel 列出「這頁被誰連 / 這頁連到誰」
- PM 無法回答「這頁的內部連結來源是哪幾頁？」

## 目標

點節點時提供雙軌視覺化：

**(a) 邊上色分方向**

- Inbound 邊 → 藍色
- Outbound 邊 → 橘色
- 其他邊 → 淡化（現行 dim 機制）

**(b) SidePanel 新增「Selected Node」tab**

- 顯示當前選中節點的 URL template + score
- Inbound 清單：列出哪些頁面連到此頁，可點擊跳轉
- Outbound 清單：列出此頁連到哪些頁面，可點擊跳轉
- 每列顯示對方頁面的 URL template + score + link count

## 價值

PM 能在畫布 + 側欄同時掌握單頁的連結結構，不用肉眼追線。

## 代價 / 待討論

- 多一個 tab，SidePanel 從 3 tabs → 4 tabs
- 沒選節點時 Selected Node tab 顯示什麼？（empty state）
- Inbound count 目前只在 orphan 判定時臨時算，需要提升為 App 級 memo（類似 `outboundMap`）
- 藍/橘配色要驗證 colorblind 可讀性
- 是否考慮與 Phase 12（Pages panel）整併：點列後同時切到 Selected Node tab
