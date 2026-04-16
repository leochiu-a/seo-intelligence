# 999.4: Orphan Node 獨立警示（inbound=0）(P0)

## 問題

`identifyWeakNodes` 用 mean - stddev，但沒區分「score 低」和「完全沒有 inbound」兩種 case。後者是 SEO 最嚴重的問題（Google 根本爬不到），應該獨立警示。

## 目標

區分「score 低（weak）」和「完全沒有 inbound（orphan）」兩種 case，orphan 獨立警示。

## 價值

比 weak node 更嚴重，不該混在一起。
