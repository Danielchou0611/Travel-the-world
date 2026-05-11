# RAG 評估報告（2026-05-11）

## 評估設定

- 專案範圍：日本旅遊行程規劃
- 種子問題：`backend/rag_prototype/eval_seed_questions.jsonl`
- 題數：40 題
- `text` 語言：全部為繁體中文
- 地區限制：40 題皆為日本地區；`q027` 到 `q040` 已改為仙台、日光、伊勢志摩、四國、九州、東北、中部等日本行程
- API：`http://127.0.0.1:8010/api/rag/extract`
- top_k：4
- RAGAS 評估模型：`gpt-4o-mini`
- RAGAS embedding：`text-embedding-3-small`
- 最新樣本輸出：`rag_eval_samples_20260511_200709.jsonl`
- 最新摘要輸出：`rag_eval_summary_20260511_200709.json`

執行命令：

```powershell
cd C:\NTU_YANBH\WebAPP1\project\backend\rag_prototype
.\.venv\Scripts\python.exe eval_ragas.py --dataset eval_seed_questions.jsonl --api-base http://127.0.0.1:8010 --debug --top-k 4 --run-ragas --eval-model gpt-4o-mini --eval-embedding-model text-embedding-3-small
```

## 量化結果

| 面向 | 指標 | 分數 | 說明 |
|---|---:|---:|---|
| 測試規模 | sample_count | 40 | 成功完成評估的題數 |
| 穩定性 | failure_count | 0 | API 呼叫失敗數 |
| 生成覆蓋 | empty_answer_count | 0 | 無抽取結果的題數 |
| 延遲 | latency_ms_avg | 751.89 | 平均 API 回應時間 |
| 延遲 | latency_ms_p95 | 919.19 | P95 API 回應時間 |
| 檢索/抽取準確率 | spot_precision_avg | 0.9529 | 預測景點中命中 ground truth 的比例 |
| 檢索/抽取召回率 | spot_recall_avg | 0.8850 | ground truth 被找出的比例 |
| 檢索/抽取綜合分數 | spot_f1_avg | 0.9115 | precision 與 recall 的調和平均 |
| RAGAS 生成忠實度 | faithfulness | 0.9663 | 回答是否被 context 支撐 |
| RAGAS 回答相關性 | answer_relevancy | 0.4182 | 回答與問題的語意相關性 |
| RAGAS 檢索精準度 | context_precision | 1.0000 | 檢索 context 對回答是否有用 |
| RAGAS 檢索召回率 | context_recall | 1.0000 | ground truth 是否可由 context 支撐 |

## 判讀

- 日本旅遊資料集重新設計後，40 題全數成功完成評估，`failure_count=0`。
- 檢索與景點抽取整體表現穩定：`spot_f1_avg=0.9115`。
- `spot_precision_avg=0.9529` 高於 `spot_recall_avg=0.8850`，表示系統較少亂抓景點，但仍會漏掉部分行程點。
- `faithfulness=0.9663` 表示輸出的景點清單大多能被檢索 context 支撐。
- `answer_relevancy=0.4182` 偏低，主要是因為 API 回答形式是景點名稱清單，而 RAGAS answer relevancy 較偏好完整自然語句回答；此數字不應單獨解讀為景點抽取失敗。
- 評估腳本已加入簡繁常見字正規化，例如 `日光东照宫` 會盡量與 `日光東照宮` 視為相同，降低簡體輸出造成的誤扣分。

## 低分案例

| id | precision | recall | f1 | 主要問題 |
|---|---:|---:|---:|---|
| q037 | 0.6667 | 0.5000 | 0.5714 | 伊豆題漏掉 `修善寺溫泉`，且 `熱海梅園` 輸出為簡體 |
| q032 | 1.0000 | 0.4000 | 0.5714 | 別府由布院題只抽到 `由布院金鱗湖`、`湯之坪街道`，漏掉地獄巡禮相關景點 |
| q028 | 0.6000 | 0.6000 | 0.6000 | 日光題全數輸出簡體，正規化仍有覆蓋不足 |
| q012 | 0.7500 | 0.6000 | 0.6667 | 函館題漏掉 `函館朝市` |
| q004 | 1.0000 | 0.6000 | 0.7500 | 京都伏見題漏掉 `千本鳥居`、`宇治川` |
| q006 | 0.7500 | 0.7500 | 0.7500 | `通天閣` 被輸出為簡體，仍有正規化覆蓋不足 |
| q018 | 0.7500 | 0.7500 | 0.7500 | `書寫山圓教寺` 被縮短成 `圓教寺` |
| q003 | 1.0000 | 0.6667 | 0.8000 | 京都題漏掉 `二年坂`、`三年坂` |
| q017 | 0.8000 | 0.8000 | 0.8000 | 神戶題多抓到較泛化的 `神戶港灣` |
| q036 | 0.8000 | 0.8000 | 0.8000 | `立山站` 被縮短成 `立山` |

## 後續優化建議

1. 在抽取 prompt 中明確要求「保留原文繁體景點名稱，不翻譯、不改寫、不簡化」。
2. 加強景點別名與簡繁正規化，例如 `日光东照宫`/`日光東照宮`、`热海梅园`/`熱海梅園`。
3. 對容易漏掉的複合景點加入規則或後處理，例如 `別府地獄巡禮`、`海地獄`、`血池地獄` 應可同時保留。
4. 報告主指標建議採 `spot_f1_avg` 與 `faithfulness`；`answer_relevancy` 可作輔助，因為目前任務是景點抽取而非完整問答生成。
