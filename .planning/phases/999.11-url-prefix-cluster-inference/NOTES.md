# 999.11: URL Prefix 自動推斷 Cluster 預設值 (P2)

## 問題

999.5 要求 PM 手動為每個節點打 cluster tag，節點多時（50+）很繁瑣。實際上多數網站的 URL 已經有主題結構（`/food/*`、`/hotel/*`），應該能從 URL pattern 自動推斷 cluster 預設值。

## 目標

新增節點或匯入時，根據 URL prefix 自動填入 cluster 欄位作為預設值，PM 仍可手動覆寫。

- `/food/ramen` → cluster 預設 `food`
- `/hotel/taipei/zhongshan` → cluster 預設 `hotel`
- `/tokyo-ramen-guide`（無 prefix）→ cluster 留空，要求手動

## 依賴

必須先完成 999.5（topical cluster tags）。

## 價值

- 大幅降低 999.5 的使用成本
- 仍保留「URL 不反映內容」情境下 PM 手動打 tag 的彈性
- 比 999.12（embedding）簡單 100 倍

## 成本

低 — 純正則 + UI 預設值，無外部依賴。
