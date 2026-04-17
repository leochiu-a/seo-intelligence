# 999.12: 內容 Embedding 相似度（Google Layer 3 模擬）(P2)

## 問題

999.5 的 cluster tag 是人工分類，有兩個限制：

1. PM 可能打錯 tag 或分類粒度不一致
2. 無法捕捉「不同 cluster 但實際語意相關」的頁面（e.g.「東京美食」和「日本旅遊攻略」）

Google 實際上是用 neural embedding 比對語意相似度（Layer 3），不看 URL 也不看人工 tag。

## 目標

允許 PM 在節點上貼 meta description（或短文案），工具呼叫 LLM/Embedding API 算頁面向量，PageRank 加權時考慮兩端向量的 cosine similarity。

- 有打 tag → 用 tag（999.5）
- 沒打 tag 但有 meta description → 用 embedding similarity
- 兩者都沒 → 維持原 PageRank 不加權

## 依賴

- 必須先完成 999.5
- 需要 LLM/Embedding API（OpenAI text-embedding-3-small 或 local model）
- 需要設計 API key 管理 UX

## 價值

- 最接近 Google 實際演算法
- 自動捕捉人類沒想到的語意關聯
- 強化工具的「SEO 模擬」可信度

## 成本

中 — LLM API 呼叫、快取、API key UX、成本預估顯示給使用者。

## 風險

- API call 成本對使用者不透明
- 沒網路 / 沒 API key 時功能降級處理
- embedding model 對中文 / 多語言網站效果可能不穩
