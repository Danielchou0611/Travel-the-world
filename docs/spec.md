# 日本旅遊行程規劃 App — 規格文件（spec.md）

## 1. 專案概述（Overview）

本專案旨在開發一個 **日本旅遊行程規劃應用程式（Japan Travel Itinerary App）**，結合 AI 推薦、可解釋性評分（XAI）與互動式行程編輯功能。

系統主要包含三個核心模組：

* 資料處理與景點評分系統（Data Pipeline & Scoring）
* 行程編輯器（Frontend Itinerary Editor）
* 評估與分析（Evaluation）

---

## 2. 負責範圍（Responsibilities）

### 2.1 資料層（核心）

* 建立景點資料處理流程（Data Pipeline）
* 設計景點評分加權公式
* 提供 AI 推薦的可解釋性依據（XAI）

---

### 2.2 前端（核心）

* 開發可拖拉的行程編輯器（Drag & Drop）
* 提供以下使用者操作功能：

  * 調整行程順序
  * 刪除景點
  * 新增自訂景點

---

### 2.3 評估（支援）

* 設計測試情境
* 蒐集 AI 推薦失敗案例
* 協助撰寫報告內容

---

## 3. 系統架構（System Architecture）

### 3.1 整體架構概覽

系統採用 **前後端分離架構**：

* Frontend：React + TypeScript
* Backend：Django REST Framework
* Database：MySQL
* AI Engine：Gemini API
* External APIs：Google Maps Platform

---

### 3.2 資料處理流程（Data Pipeline）

**輸入：**

* 爬蟲取得之景點資料（CSV）

**處理：**

* 資料清洗（Data Cleaning）
* 特徵萃取（Feature Extraction）
* 評分計算（Scoring）

**輸出：**

* 景點評分資料集（CSV / Excel）

---

### 3.3 景點評分公式（XAI）

[
Score = 0.4 \cdot Google評分 + 0.3 \cdot \log(評論數) + 0.2 \cdot 興趣符合度 + 0.1 \cdot 距離效率
]

#### 設計理念：

* 使用對數（log）處理評論數，避免數值過大影響結果
* 平衡以下因素：

  * 景點熱門程度
  * 使用者個人偏好
  * 行程移動效率

---

### 3.4 行程編輯器（Frontend Itinerary Editor）

前端系統（行程編輯器）

#### 核心功能：

* 拖拉排序（使用 `dnd-kit`）
* 刪除行程項目
* 新增自訂景點（串接 Google Places API）

---

#### API 設計：

* 更新順序：

```
PATCH /api/itinerary/{item_id}/
```

* 刪除景點：

```
DELETE /api/itinerary/{item_id}/
```

---

## 4. 每週任務與交付物（Weekly Deliverables）

### Week 1（3/30 – 4/6）

**任務：**

* 建立資料 pipeline
* 設計評分公式
* 產出 50+ 景點資料
* 建立行程編輯器 UI 基本架構

**交付物：**

* 評分公式文件
* 可拖拉的基本 UI

---

### Week 2（4/7 – 4/13）

**任務：**

* 擴展至 200+ 景點
* 涵蓋五大地區：

  * 東京
  * 京都
  * 大阪
  * 沖繩
  * 北海道
* 串接前後端 API
* 加入刪除功能
* 分析使用者偏好（Python）

**交付物：**

* 可儲存行程順序
* 資料分析圖表

---

### Week 3（4/14 – 4/20）

**任務：**

* 新增自訂景點功能（Google Places）
* 製作資料視覺化圖表
* 驗證 XAI 評分與 AI 推薦一致性

**交付物：**

* 自訂景點功能完成
* 評分驗證紀錄

---

### Week 4（4/21 – 4/27）

**任務：**

* 設計 9 種測試情境（3 Persona × 3 類型）
* 找出 2–3 個失敗案例：

  * 行程過於緊湊
  * 景點重複
  * 推薦不合理
* 撰寫報告評估章節

**交付物：**

* 評估測試表
* 失敗案例分析

---

### Week 5（4/28 – 6/8）

**任務：**

* 製作期末簡報
* 行程編輯器 Demo（約 2 分鐘）
* 上傳資料至 GitHub

**交付物：**

* 簡報（含評估結果）
* 完整可展示系統

---

## 5. 評估設計（Evaluation）

### 5.1 測試情境設計

| Persona | 旅遊類型 | 情境  |
| ------- | ---- | --- |
| A       | 輕鬆型  | A1  |
| A       | 密集型  | A2  |
| A       | 主題型  | A3  |
| B       | 輕鬆型  | B1  |
| ...     | ...  | ... |

（共 9 種情境）

---

### 5.2 失敗案例分類

* 行程過度密集
* 資料不足
* 突發狀況未考量

---

## 6. 技術與工具（Tech Stack）

### 前端

* React 18
* dnd-kit

### 資料分析

* pandas
* matplotlib / plotly

### 外部服務

* Google Places API

---

## 7. 最終驗收標準（Milestones）

於 6/8 展示需達成：

① 行程可拖拉並正確儲存順序
② 景點評分資料完整且可查詢
③ 報告包含具體評估結果

---

## 8. 開發原則（Development Principle）

> 先求有，再求好（Build first, optimize later）

---

## 9. 備註（Notes）

* 若 Drag & Drop 無法完成：
  → 可改用「上下按鈕」調整順序（作為備案）
* 優先確保功能完整，再優化 UI

