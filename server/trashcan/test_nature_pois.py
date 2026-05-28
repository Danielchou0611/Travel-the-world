import csv
import json
import requests
from typing import Any

BASE_URL = "http://127.0.0.1:8000"

NATURE_INTERESTS = ["自然", "戶外", "景觀"]

RESTAURANT_LIKE_CATEGORIES = {
    "中華", "咖哩", "咖啡", "壽司", "居酒屋", "拉麵", "日式", "海鮮",
    "燒肉", "甜點", "異國料理", "綜合餐廳", "義式", "西式", "酒吧",
    "韓式", "麵包輕食",
}

RESTAURANT_LIKE_INTERESTS = {
    "餐廳", "美食", "咖啡", "拉麵", "居酒屋", "海鮮", "壽司", "甜點", "燒肉", "鰻魚",
}


def get_json(path: str, params: dict[str, Any]) -> dict[str, Any]:
    url = f"{BASE_URL}{path}"
    response = requests.get(url, params=params, timeout=20)

    print(f"[GET] {response.url} -> {response.status_code}")

    response.raise_for_status()
    return response.json()


def get_regions() -> list[str]:
    try:
        data = get_json("/api/metadata/", {})
        regions = data.get("regions", [])
        if isinstance(regions, list) and regions:
            return regions
    except Exception as exc:
        print(f"[WARN] metadata 讀取失敗，使用內建地區清單：{exc}")

    return [
        "三重縣", "京都府", "佐賀縣", "兵庫縣", "北海道", "千葉縣", "和歌山縣", "埼玉縣",
        "大分縣", "大阪府", "奈良縣", "宮城縣", "宮崎縣", "富山縣", "山口縣", "山形縣",
        "山梨縣", "岐阜縣", "岡山縣", "岩手縣", "島根縣", "廣島縣", "德島縣", "愛媛縣",
        "愛知縣", "新潟縣", "東京都", "栃木縣", "沖繩縣", "滋賀縣", "熊本縣", "石川縣",
        "神奈川縣", "福井縣", "福岡縣", "福島縣", "秋田縣", "群馬縣", "茨城縣", "長崎縣",
        "長野縣", "青森縣", "靜岡縣", "香川縣", "高知縣", "鳥取縣", "鹿兒島縣",
    ]


def extract_results(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return data

    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return data["results"]

    return []


def api_count(data: Any) -> int:
    if isinstance(data, dict) and isinstance(data.get("count"), int):
        return data["count"]

    return len(extract_results(data))


def is_restaurant_like(place: dict[str, Any]) -> bool:
    category = str(place.get("category", "")).strip()
    interests = place.get("interests", [])

    if category in RESTAURANT_LIKE_CATEGORIES:
        return True

    if isinstance(interests, list):
        return any(str(item).strip() in RESTAURANT_LIKE_INTERESTS for item in interests)

    return False


def is_nature_like(place: dict[str, Any]) -> bool:
    interests = place.get("interests", [])
    category = str(place.get("category", "")).strip()
    text = " ".join([
        str(place.get("name", "")),
        str(place.get("category", "")),
        str(place.get("context", "")),
        str(place.get("description", "")),
        " ".join(map(str, interests)) if isinstance(interests, list) else "",
    ])

    if is_restaurant_like(place):
        return False

    if category in {"自然", "景觀", "公園", "戶外"}:
        return True

    if isinstance(interests, list):
        if any(str(item).strip() in NATURE_INTERESTS for item in interests):
            return True

    return any(keyword in text for keyword in ["自然", "公園", "庭園", "湖", "海岸", "山", "瀑布", "岬", "花園"])


def sample_places(places: list[dict[str, Any]], limit: int = 3) -> list[dict[str, Any]]:
    return [
        {
            "name": p.get("name"),
            "region": p.get("region"),
            "category": p.get("category"),
            "google_rating": p.get("google_rating"),
            "interests": p.get("interests"),
        }
        for p in places[:limit]
    ]


def main():
    regions = get_regions()
    report = []

    for region in regions:
        print("\n" + "=" * 80)
        print(f"測試地區：{region}")

        # 1. 直接測 API interests=自然
        try:
            nature_api_data = get_json(
                "/api/pois/",
                {
                    "region": region,
                    "interests": "自然",
                    "page_size": 500,
                    "ordering": "-google_rating",
                },
            )
            nature_api_results = extract_results(nature_api_data)
            nature_api_total = api_count(nature_api_data)
        except Exception as exc:
            print(f"[ERROR] interests=自然 查詢失敗：{exc}")
            nature_api_results = []
            nature_api_total = -1

        # 2. 再測 API interests=戶外
        try:
            outdoor_api_data = get_json(
                "/api/pois/",
                {
                    "region": region,
                    "interests": "戶外",
                    "page_size": 500,
                    "ordering": "-google_rating",
                },
            )
            outdoor_api_results = extract_results(outdoor_api_data)
            outdoor_api_total = api_count(outdoor_api_data)
        except Exception as exc:
            print(f"[ERROR] interests=戶外 查詢失敗：{exc}")
            outdoor_api_results = []
            outdoor_api_total = -1

        # 3. 不帶 interests，抓該地區資料後用 Python 本地判斷自然類
        try:
            raw_data = get_json(
                "/api/pois/",
                {
                    "region": region,
                    "page_size": 5000,
                    "ordering": "-google_rating",
                },
            )
            raw_results = extract_results(raw_data)
            raw_total = api_count(raw_data)
            local_nature = [p for p in raw_results if is_nature_like(p)]
        except Exception as exc:
            print(f"[ERROR] raw region 查詢失敗：{exc}")
            raw_results = []
            raw_total = -1
            local_nature = []

        row = {
            "region": region,
            "api_interests_nature_count": nature_api_total,
            "api_interests_outdoor_count": outdoor_api_total,
            "raw_region_count": raw_total,
            "local_nature_count_in_first_500": len(local_nature),
            "nature_sample": sample_places(nature_api_results),
            "outdoor_sample": sample_places(outdoor_api_results),
            "local_nature_sample": sample_places(local_nature),
        }

        report.append(row)

        print(json.dumps(row, ensure_ascii=False, indent=2))

    with open("nature_poi_region_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    with open("nature_poi_region_report.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "region",
                "api_interests_nature_count",
                "api_interests_outdoor_count",
                "raw_region_count",
                "local_nature_count_in_first_500",
            ],
        )
        writer.writeheader()

        for row in report:
            writer.writerow({
                "region": row["region"],
                "api_interests_nature_count": row["api_interests_nature_count"],
                "api_interests_outdoor_count": row["api_interests_outdoor_count"],
                "raw_region_count": row["raw_region_count"],
                "local_nature_count_in_first_500": row["local_nature_count_in_first_500"],
            })

    print("\n完成，已輸出：")
    print("- nature_poi_region_report.json")
    print("- nature_poi_region_report.csv")


if __name__ == "__main__":
    main()