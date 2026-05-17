# API 規格書：AI 行程規劃系統

## 1. 產生行程 (Generate Trip)

*   **Endpoint:** `/api/trips/generate`
*   **Method:** `POST`
*   **Content-Type:** `application/json`
*   **說明:** 根據使用者的旅遊偏好，生成包含每日規劃、景點細節與可解釋性 AI (XAI) 評分的完整 AI 旅遊行程。

---

### 1.1 請求格式 (Request Payload)

```json
{
  "days": 7,                          // 旅遊總天數 (Integer)
  "budget": 50000,                    // 預算金額 (Integer, 單位: TWD)
  "interests": [                      // 興趣標籤 (Array of Strings)
    "美食", "文化", "自然"
  ],
  "explorationStyle": 60,             // 旅遊風格：0=輕鬆, 100=緊湊 (Integer, 0-100)
  "foodVsAttractions": 40,            // 偏好比重：0=偏好美食, 100=偏好景點 (Integer, 0-100)
  "mustVisit": "清水寺、藍瓶咖啡",     // 必去地點 (String，允許多個景點混合之自然語言)
  "ragContent": "",                   // 外部旅遊筆記或參考內容 (String)
  "specialRequirements": "希望這趣旅行能放鬆心情，並深入體驗地方文化" // 行程期望（選填）(String | null)
}
```

### 1.2 回應格式 (Response Payload)

```json
{
  "id": "trip-1234567890",              // 行程唯一識別碼 (String)
  "preferences": {                      // 原始請求的偏好設定 (Object)
    "days": 7,
    "budget": 50000,
    "interests": ["美食", "文化", "自然"],
    "explorationStyle": 60,
    "foodVsAttractions": 40,
    "mustVisit": "清水寺、藍瓶咖啡",
    "ragContent": "",
    "specialRequirements": "希望這趣旅行能放鬆心情，並深入體驗地方文化" // 原始傳入值原樣回傳 (String | null)
  },
  "summary": {                          // 行程總覽 (Object)
    "totalDays": 7,                     // 總天數 (Integer)
    "totalBudget": "NT$ 50,000",        // 預估總花費 (String)
    "totalAttractions": 18,             // 總景點數 (Integer)
    "avgPerDay": 2.6                    // 平均每日景點數 (Float)
  },
  "days": [                             // 每日行程 (Array of Objects)
    {
      "day": 1,                         // 第幾天 (Integer)
      "date": "4/18 (五)",               // 日期 (String)
      "warning": null,                  // 行程警告提示 (String | null)
      "attractions": [                  // 當日景點列表 (Array of Objects)
        {
          "id": "a01",                  // 景點唯一識別碼 (String)
          "name": "伏見稻荷大社",         // 景點名稱 (String)
          "category": "景點",             // 類別 (String: "景點" | "文化" | "購物" | "自然")
          "description": "千本鳥居是京都最具代表性的景點...", // 景點描述 (String)
          "image": "https://...",       // 外部圖床圖片 URL (String)
          "position": {                 // 地理座標 (Object)
            "lat": 34.9671,             // 緯度 (Float, WGS84)
            "lng": 135.7727             // 經度 (Float, WGS84)
          },
          "duration": "2–3 小時",        // 建議停留時間 (String)
          "rating": 4.8,                // 評分 (Float)
          "estimatedCost": "免費",       // 預估花費 (String)
          "location": "京都・伏見区",     // 所在區域 (String)
          
          "baseScore": 92,              // 基礎推薦分數 (Integer, 1-100)
          "foodScore": 10,              // 美食關聯分數 (Integer, 1-100)
          "explorationScore": 85,       // 探索/體力關聯分數 (Integer, 1-100)
          
          "xai": {                      // XAI 分析資料 (Object)
            "summary": "根據您選擇的「文化」興趣，AI 將此...", // 解釋摘要 (String)
            "matchedInterests": ["文化"], // 匹配的興趣標籤 (Array of Strings)
            "scores": [                 // 指標分析 (Array of Objects, 固定長度 3)
              { "label": "文化符合度", "value": 95 },
              { "label": "評分熱度",   "value": 88 },
              { "label": "探索指數",   "value": 72 }
            ]
          }
        }
      ]
    }
  ],
  "generatedAt": "2024-05-18T10:00:00Z" // 建立時間 (ISO 8601 String)
}
```

---

### 1.3 實作注意事項 (Implementation Notes)

1. **評分欄位要求 (Scoring Requirements):** 
   欄位 `baseScore`、`foodScore` 與 `explorationScore` 必須提供介於 `1-100` 之間的整數。這些數值對於前端執行即時重新排序 (Re-ranking) 邏輯是不可或缺的。
2. **圖片網址 (Image URLs):** 
   `image` 欄位必須提供有效的、可公開存取的絕對路徑網址 (Absolute URL)。圖片的上傳與裁切應透過外部服務或圖片 CDN 處理。
3. **必去景點 (Must Visit Field):**
   `mustVisit` 欄位會直接傳送原始的自然語言字串（例如：`"清水寺、藍瓶咖啡"`）。後端應自行處理分析，或直接將此字串應用於 LLM 的 Prompt 中。
4. **行程期望 (Special Requirements / Trip Expectations Field):**
   `specialRequirements` 為選填欄位（`String | null`），供使用者以自然語言描述對此趣行程的期望與感受，例如：「希望放鬆心情」、「希望深入體驗地方文化」、「希望行程緊湊充實」、「希望有浪漫氛圍」等。後端應將此内容納入 LLM Prompt，作為行程氣底調性與內容選取的參考方向。若欄位為空字串或 `null`，可忽略。
4. **錯誤處理 (Error Handling):** 
   若在產生行程時發生錯誤（例如：預算過低、無法解析必去景點），請回傳標準的 HTTP `400` 或 `500` 狀態碼，並附帶以下 JSON 錯誤格式：
   ```json
   {
     "error": "無法依據目前的設定排定行程，請提高預算或修改偏好設定。"
   }
   ```

5. **地理位置欄位 (Position Field):**
  - 在景點物件中新增 `position` 欄位，結構為 `{ lat, lng }`，兩者均為十進制度數 (Float)，採用 WGS84 座標系。
  - `lat` 範圍：-90 到 90；`lng` 範圍：-180 到 180。
  - 此欄位用於地圖標記、路徑規劃、距離計算與聚合分析。若無座標資料，可回傳 `null` 或略過欄位（視情境而定）。
