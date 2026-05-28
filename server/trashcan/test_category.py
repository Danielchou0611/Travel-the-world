import csv
import json
import requests
from typing import Any

BASE_URL = "http://127.0.0.1:8000"

REGIONS = [
    "三重縣", "京都府", "佐賀縣", "兵庫縣", "北海道", "千葉縣", "和歌山縣", "埼玉縣",
    "大分縣", "大阪府", "奈良縣", "宮城縣", "宮崎縣", "富山縣", "山口縣", "山形縣",
    "山梨縣", "岐阜縣", "岡山縣", "岩手縣", "島根縣", "廣島縣", "德島縣", "愛媛縣",
    "愛知縣", "新潟縣", "東京都", "栃木縣", "沖繩縣", "滋賀縣", "熊本縣", "石川縣",
    "神奈川縣", "福井縣", "福岡縣", "福島縣", "秋田縣", "群馬縣", "茨城縣", "長崎縣",
    "長野縣", "青森縣", "靜岡縣", "香川縣", "高知縣", "鳥取縣", "鹿兒島縣",
]

SCENIC_CATEGORIES = [
    "景點",
    "寺社",
    "自然",
    "博物館",
    "文化藝術",
    "溫泉",
    "購物",
    "遊樂",
]


def get_json(path: str, params: dict[str, Any]) -> dict[str, Any]:
    response = requests.get(
        f"{BASE_URL}{path}",
        params=params,
        timeout=20,
    )

    print(f"[GET] {response.url} -> {response.status_code}")

    response.raise_for_status()
    return response.json()


def extract_results(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return data

    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return data["results"]

    return []


def get_count(data: Any) -> int:
    if isinstance(data, dict) and isinstance(data.get("count"), int):
        return data["count"]

    return len(extract_results(data))


def sample_places(results: list[dict[str, Any]], limit: int = 3) -> list[dict[str, Any]]:
    return [
        {
            "id": item.get("id"),
            "name": item.get("name"),
            "region": item.get("region"),
            "category": item.get("category"),
            "google_rating": item.get("google_rating"),
            "interests": item.get("interests"),
        }
        for item in results[:limit]
    ]


def test_region_category(region: str, category: str) -> dict[str, Any]:
    data = get_json(
        "/api/pois/",
        {
            "region": region,
            "category": category,
            "page_size": 5,
            "ordering": "-google_rating",
        },
    )

    results = extract_results(data)

    return {
        "region": region,
        "category": category,
        "count": get_count(data),
        "results_length": len(results),
        "sample": sample_places(results),
    }


def test_raw_region(region: str) -> dict[str, Any]:
    data = get_json(
        "/api/pois/",
        {
            "region": region,
            "page_size": 5,
            "ordering": "-google_rating",
        },
    )

    results = extract_results(data)

    return {
        "region": region,
        "raw_count": get_count(data),
        "raw_sample": sample_places(results),
    }


def main():
    report = []

    for region in REGIONS:
        print("\n" + "=" * 100)
        print(f"測試地區：{region}")

        try:
            raw_info = test_raw_region(region)
        except Exception as exc:
            print(f"[ERROR] raw region 查詢失敗：{region}, error={exc}")
            raw_info = {
                "region": region,
                "raw_count": -1,
                "raw_sample": [],
            }

        for category in SCENIC_CATEGORIES:
            try:
                row = test_region_category(region, category)
                row["raw_region_count"] = raw_info["raw_count"]
                report.append(row)

                print(
                    json.dumps(
                        {
                            "region": row["region"],
                            "category": row["category"],
                            "raw_region_count": row["raw_region_count"],
                            "category_count": row["count"],
                            "sample": row["sample"],
                        },
                        ensure_ascii=False,
                        indent=2,
                    )
                )

            except Exception as exc:
                print(f"[ERROR] category 查詢失敗：region={region}, category={category}, error={exc}")
                report.append({
                    "region": region,
                    "category": category,
                    "raw_region_count": raw_info["raw_count"],
                    "count": -1,
                    "results_length": 0,
                    "sample": [],
                    "error": str(exc),
                })

    with open("poi_category_region_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    with open("poi_category_region_report.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "region",
                "category",
                "raw_region_count",
                "count",
                "results_length",
            ],
        )
        writer.writeheader()

        for row in report:
            writer.writerow({
                "region": row["region"],
                "category": row["category"],
                "raw_region_count": row.get("raw_region_count", 0),
                "count": row.get("count", 0),
                "results_length": row.get("results_length", 0),
            })

    print("\n完成，已輸出：")
    print("- poi_category_region_report.json")
    print("- poi_category_region_report.csv")


if __name__ == "__main__":
    main()