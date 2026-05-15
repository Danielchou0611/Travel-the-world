# Restaurant Regions And Categories

這份文件整理目前餐廳資料集中可用的地區與餐廳種類，方便前端做下拉選單、篩選條件或文件對照。

資料來源：

- `japan_restaurant_with_rating_interest.json`
- `GET /api/restaurants/metadata/`

目前統計：

- 地區數量：`47`
- 餐廳種類數量：`17`

## Regions

- 三重縣
- 京都府
- 佐賀縣
- 兵庫縣
- 北海道
- 千葉縣
- 和歌山縣
- 埼玉縣
- 大分縣
- 大阪府
- 奈良縣
- 宮城縣
- 宮崎縣
- 富山縣
- 山口縣
- 山形縣
- 山梨縣
- 岐阜縣
- 岡山縣
- 岩手縣
- 島根縣
- 廣島縣
- 德島縣
- 愛媛縣
- 愛知縣
- 新潟縣
- 東京都
- 栃木縣
- 沖繩縣
- 滋賀縣
- 熊本縣
- 石川縣
- 神奈川縣
- 福井縣
- 福岡縣
- 福島縣
- 秋田縣
- 群馬縣
- 茨城縣
- 長崎縣
- 長野縣
- 青森縣
- 靜岡縣
- 香川縣
- 高知縣
- 鳥取縣
- 鹿兒島縣

## Categories

- 中華
- 咖哩
- 咖啡
- 壽司
- 居酒屋
- 拉麵
- 日式
- 海鮮
- 燒肉
- 甜點
- 異國料理
- 綜合餐廳
- 義式
- 西式
- 酒吧
- 韓式
- 麵包輕食

## Related API

如果要讓前端動態抓最新清單，可使用：

```text
GET /api/restaurants/metadata/
```

Response 範例：

```json
{
  "regions": ["東京都", "大阪府", "京都府"],
  "categories": ["拉麵", "壽司", "咖啡"],
  "venue_types": ["小店", "餐廳"],
  "restaurant_count": 175979
}
```

## Usage Notes

- `region` 可直接用在：
  - `GET /api/restaurants/?region=東京都`
  - `POST /api/restaurants/recommendations/`
- `category` 可直接用在：
  - `GET /api/restaurants/?category=拉麵`
  - `POST /api/restaurants/recommendations/`
- 若前端要做 nearby 推薦，可以搭配：
  - `lat`
  - `lng`
  - `radius_m`
  - `top_k`
