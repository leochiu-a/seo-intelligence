# 999.5: Topical Cluster Tags + 同 Cluster Edge 加權 (P1)

## 問題

Google 非常看重 topical authority — 同主題頁面互連的權重遠高於跨主題。目前 PageRank 是 topology-agnostic 的：

- `/food/ramen` → `/hotel/taipei` 和 `/food/ramen` → `/food/sushi` 在模型裡權重一樣，但 SEO 效果完全不同
- 可以讓節點打 tag/cluster，cluster 內的邊有 bonus weight，或至少視覺上同 cluster 上色

## 目標

節點可打 tag/cluster，同 cluster 內的邊有 bonus weight，視覺上同 cluster 上色。

## 價值

對得上 Google topical authority。
