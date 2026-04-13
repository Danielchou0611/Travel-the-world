# AGENTS.md

## 系統架構設計（System Architecture Design）

### 技術棧確認（Tech Stack）

| 層級    | 技術選擇                  | 備註                                   |
| ----- | --------------------- | ------------------------------------ |
| 前端    | React + TypeScript    | 元件化開發，狀態管理使用 Zustand 或 Redux Toolkit |
| 後端    | Django + DRF          | 快速建立 REST API                        |
| 認證    | simplejwt             | JWT 登入機制                             |
| 資料庫   | MySQL                 | 搭配 Django ORM                        |
| AI 引擎 | Gemini 1.5 Flash API  | 支援 JSON mode，輸出穩定                    |
| 地圖服務  | Google Maps API       | Places + Directions                  |
| 部署    | Railway + PlanetScale | Django + MySQL 免費方案                  |
| 版本控制  | GitHub                | Feature Branch workflow              |

---

### 資料庫 Schema（Database Design）

#### users

| 欄位            | 說明     |
| ------------- | ------ |
| id            | 使用者 ID |
| email         | 帳號     |
| password_hash | 密碼     |
| created_at    | 建立時間   |

---

#### trips

| 欄位           | 說明    |
| ------------ | ----- |
| id           | 旅程 ID |
| user_id (FK) | 使用者   |
| title        | 標題    |
| country      | 國家    |
| days         | 天數    |
| budget       | 預算    |
| status       | 狀態    |
| created_at   | 建立時間  |

---

#### itinerary_items

| 欄位                 | 說明              |
| ------------------ | --------------- |
| id                 | 項目 ID           |
| trip_id (FK)       | 所屬旅程            |
| day                | 第幾天             |
| order              | 排序              |
| place_name         | 景點名稱            |
| place_id           | Google Place ID |
| lat, lng           | 座標              |
| category           | 類型              |
| visit_duration_min | 停留時間            |
| xai_reason         | AI 推薦原因         |
| created_at         | 建立時間            |

---

#### user_preferences

| 欄位             | 說明   |
| -------------- | ---- |
| id             | ID   |
| user_id (FK)   | 使用者  |
| travel_style   | 旅遊風格 |
| food_pref      | 飲食偏好 |
| budget_level   | 預算   |
| mobility       | 行動能力 |
| interests_json | 興趣   |

---

#### ai_sessions

| 欄位            | 說明   |
| ------------- | ---- |
| id            | ID   |
| trip_id (FK)  | 對應旅程 |
| messages_json | 對話紀錄 |
| created_at    | 建立時間 |

---

### 核心 API 設計（Backend Contract）

| Method | Endpoint                  | 說明                  |
| ------ | ------------------------- | ------------------- |
| POST   | /api/auth/login           | 使用者登入（JWT）          |
| POST   | /api/trips/               | 建立旅程                |
| GET    | /api/trips/{id}/          | 取得旅程（含行程）           |
| POST   | /api/trips/{id}/generate/ | AI 生成行程             |
| PATCH  | /api/itinerary/{item_id}/ | 更新行程（排序/修改）         |
| DELETE | /api/itinerary/{item_id}/ | 刪除景點                |
| POST   | /api/trips/{id}/chat/     | AI 對話               |
| GET    | /api/places/search/?q=    | Google Places Proxy |
