# 🗄 Database Schema — Japan Travel App

> 資料庫 schema 定義  
> 修改需通知：珥豪（後端）＋ 所有使用該 model 的人  
> ORM：Django ORM　Dev：SQLite　Prod：MySQL (PlanetScale)

---

## 概覽：6 個主要 table

```
users ─┬─→ trips ─┬─→ itinerary_items ─→ attractions
       │          │
       └─→ user_preferences
                  └─→ ai_sessions
```

---

## 1. `users`（Django 內建 User 擴充）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BigAutoField | PK |
| username | CharField(150) | 唯一 |
| email | EmailField | 唯一，登入用 |
| password | CharField | Django hashing，不要自己 hash |
| date_joined | DateTimeField | auto |
| last_login | DateTimeField | auto |

**備註**：繼承 `AbstractUser`，不加多餘欄位（偏好放 `user_preferences`）。

---

## 2. `user_preferences`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BigAutoField | PK |
| user | OneToOneField(User, CASCADE) | |
| default_pace | CharField(10) | `relaxed` / `balanced` / `explorer` |
| default_interests | JSONField | `["culture", "food", ...]` |
| default_budget_jpy | IntegerField | 預設預算 |
| updated_at | DateTimeField | auto |

---

## 3. `trips`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BigAutoField | PK |
| user | ForeignKey(User, CASCADE) | 行程擁有者 |
| title | CharField(200) | 行程名稱 |
| days | IntegerField | 天數 |
| budget_jpy | IntegerField | 總預算 |
| start_date | DateField | nullable |
| start_city | CharField(100) | e.g. "Tokyo" |
| preferences_snapshot | JSONField | 生成時的偏好快照 |
| status | CharField(20) | `draft` / `generated` / `confirmed` |
| created_at | DateTimeField | auto |
| updated_at | DateTimeField | auto |

**Index**: `(user, -created_at)`

---

## 4. `attractions`（景點主檔）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BigAutoField | PK |
| google_place_id | CharField(255) | Google Places unique id，建 index |
| name | CharField(200) | 中/日文名 |
| name_en | CharField(200) | 英文名 |
| city | CharField(100) | |
| lat | DecimalField(9,6) | |
| lng | DecimalField(9,6) | |
| google_rating | DecimalField(2,1) | 0.0–5.0 |
| review_count | IntegerField | |
| categories | JSONField | `["culture", "temple", ...]` |
| price_estimate_jpy | IntegerField | 預估花費 |
| duration_minutes | IntegerField | 建議停留分鐘 |
| photo_url | TextField | nullable |
| last_synced_at | DateTimeField | 與 Google 同步時間 |

**Index**: `google_place_id`（unique）、`city`、`(lat, lng)`

**備註**：景點主檔由爬蟲/同步任務維護，不跟著使用者走。

---

## 5. `itinerary_items`（行程內的一筆）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BigAutoField | PK |
| trip | ForeignKey(Trip, CASCADE) | |
| attraction | ForeignKey(Attraction, PROTECT) | 保護避免誤刪 |
| day_index | IntegerField | 1, 2, 3, ... |
| order | IntegerField | 該天內順序 |
| start_time | TimeField | e.g. 09:00 |
| end_time | TimeField | |
| xai_reason | TextField | Gemini 生成的推薦原因 |
| xai_factors | JSONField | `{google_rating: 0.4, ...}` |
| confidence | DecimalField(3,2) | 0.00–1.00 |
| user_note | TextField | 使用者備註，nullable |
| is_user_added | BooleanField | 使用者自己加的 vs AI 推薦 |
| created_at | DateTimeField | auto |

**Index**: `(trip, day_index, order)`  
**Unique**: `(trip, day_index, order)` — 避免重複位置

---

## 6. `ai_sessions`（Gemini 呼叫紀錄）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BigAutoField | PK |
| trip | ForeignKey(Trip, CASCADE) | |
| session_type | CharField(20) | `generate` / `chat` / `rag_extract` |
| llm_model | CharField(50) | e.g. `gemini-1.5-flash` |
| prompt | TextField | 輸入 prompt |
| response_raw | TextField | 原始回應 |
| response_parsed | JSONField | parse 後結構 |
| duration_ms | IntegerField | |
| tokens_in | IntegerField | |
| tokens_out | IntegerField | |
| status | CharField(20) | `ok` / `retry` / `failed` |
| error_message | TextField | nullable |
| created_at | DateTimeField | auto |

**Index**: `(trip, -created_at)`

**備註**：用於除錯、成本追蹤、XAI 報告引用。

---

## 🔑 重要外鍵行為

| From | To | on_delete | 理由 |
|------|-----|-----------|------|
| trips | users | CASCADE | 刪使用者→刪行程 |
| itinerary_items | trips | CASCADE | 刪行程→刪項目 |
| itinerary_items | attractions | PROTECT | 景點主檔不能因單一行程被刪 |
| user_preferences | users | CASCADE | 1:1 |
| ai_sessions | trips | CASCADE | 除錯紀錄跟行程走 |

---

## 🚫 明確不建的 table（現階段）

- `reviews`（使用者景點評論）— 不做社群
- `followers`（追蹤關係）— 不做社群
- `achievements`（成就）— 付費功能
- `photo_uploads`（景點照片）— 付費功能

---

## Migration 策略

- Week 3 Day 1：珥豪建立 initial migration 含全部 6 個 table
- 欄位變動：走 Django migrations，PR 必附 migration file
- 不手動改 production schema

---

## 🔐 敏感資料處理

- `password`：Django hashing（不要自己 hash）
- `ai_sessions.prompt`：可能包含使用者偏好，**不要**在 log 中明文輸出
- Gemini API Key / Google Maps API Key：`.env`，不進 repo
