# 999.2: Crawl Depth 指標 + 3-Click 警告 (P0)

## 問題

SEO 共識是「重要頁面要在 3 次點擊內可達」，Google 對深層頁面的爬取頻率明顯較低。目前工具只看 PageRank 分數，但：

- 一個頁面可能 PageRank 高、但距離首頁 6 層深 → 照樣爬不到
- 應該要在 sidebar 顯示每個節點到「root 節點」的最短路徑深度

## 目標

Sidebar 顯示每個節點到 root 節點的最短路徑深度，超過 3 層的節點標示警告。

## 價值

補齊 SEO 標準 checklist，實作成本低。
