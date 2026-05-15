#!/usr/bin/env python3
"""Create an interest-friendly JSON from the scored Japan restaurants CSV."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any


DEFAULT_INPUT = Path("output/日本全_v1_with_rating_scored.csv")
DEFAULT_OUTPUT = Path("output/日本全_v1_with_rating_interest.json")

BAR_KEYWORDS = (
    "ワインバー",
    "ラウンジバー",
    "カクテル バー",
    "水パイプ バー",
    "カラオケ バー",
    "オイスターバー",
    "バー＆グリル",
    "バー",
    "パブ",
    "ビアホール",
    "酒店",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Simplify restaurant categories and export an interest-friendly JSON file.",
    )
    parser.add_argument(
        "input_csv",
        nargs="?",
        default=str(DEFAULT_INPUT),
        help=f"Path to the scored CSV. Defaults to {DEFAULT_INPUT}.",
    )
    parser.add_argument(
        "output_json",
        nargs="?",
        default=str(DEFAULT_OUTPUT),
        help=f"Path to the output JSON. Defaults to {DEFAULT_OUTPUT}.",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="Indent size for pretty-printed JSON. Use 0 for compact output.",
    )
    return parser.parse_args()


def convert_scalar(value: str) -> Any:
    text = value.strip()
    if text == "":
        return None

    lowered = text.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False

    try:
        if text.isdigit() or (text.startswith("-") and text[1:].isdigit()):
            return int(text)
        return float(text)
    except ValueError:
        return text


def normalize_type(raw_type: str) -> str:
    return raw_type.strip()


def is_bar_type(raw_type: str) -> bool:
    text = normalize_type(raw_type)
    return any(keyword in text for keyword in BAR_KEYWORDS) and "ハンバーガー" not in text


def simplify_category(raw_type: str) -> str:
    category = normalize_type(raw_type)

    if "インドネシア" in category:
        return "異國料理"
    if any(keyword in category for keyword in ("居酒屋",)):
        return "居酒屋"
    if any(keyword in category for keyword in ("ラーメン",)):
        return "拉麵"
    if any(keyword in category for keyword in ("焼肉", "ホルモン")):
        return "燒肉"
    if any(keyword in category for keyword in ("寿司",)):
        return "壽司"
    if any(keyword in category for keyword in ("中華",)):
        return "中華"
    if any(keyword in category for keyword in ("韓国",)):
        return "韓式"
    if any(keyword in category for keyword in ("カレー",)):
        return "咖哩"
    if any(keyword in category for keyword in ("イタリア", "ピザ")):
        return "義式"
    if any(keyword in category for keyword in ("フランス", "ビストロ", "洋食", "ステーキ", "ハンバーガー")):
        return "西式"
    if any(
        keyword in category
        for keyword in (
            "インド",
            "ネパール",
            "タイ料理",
            "ベトナム",
            "スペイン",
            "メキシコ",
            "スリランカ",
            "フィリピン",
            "ブラジル",
            "トルコ",
            "ペルー",
            "バングラデシュ",
            "パキスタン",
            "ポルトガル",
            "ハワイ",
            "アメリカ料理",
            "地中海料理",
            "ロシア料理",
            "タコス",
            "アジア料理",
            "アジア多国籍",
            "ハラル",
            "ビーガン",
            "ベジタリアン",
            "ケバブ",
        )
    ):
        return "異國料理"
    if any(keyword in category for keyword in ("カフェ", "喫茶", "コーヒー")):
        return "咖啡"
    if any(keyword in category for keyword in ("ティーハウス",)):
        return "咖啡"
    if any(
        keyword in category
        for keyword in (
            "和菓子",
            "洋菓子",
            "ケーキ",
            "デザート",
            "スイーツ",
            "アイス",
            "クレープ",
            "ドーナツ",
            "菓子店",
            "パンケーキ",
            "アサイー",
            "フルーツ パーラー",
            "チョコレート",
        )
    ):
        return "甜點"
    if any(
        keyword in category
        for keyword in (
            "ベーカリー",
            "サンドイッチ",
            "ベーグル",
            "軽食",
            "ファースト フード",
            "ファーストフード",
            "弁当",
            "総菜",
            "デリカテッセン",
            "仕出し",
            "ケータリング",
            "フードコート",
        )
    ):
        return "麵包輕食"
    if is_bar_type(category):
        return "酒吧"
    if any(keyword in category for keyword in ("海鮮", "シーフード", "うなぎ", "かに", "ふぐ", "魚料理")):
        return "海鮮"
    if any(keyword in category for keyword in ("四川", "広東", "台湾料理", "点心", "飲茶", "餃子", "担々麺")):
        return "中華"
    if any(
        keyword in category
        for keyword in (
            "和食",
            "郷土料理",
            "定食",
            "蕎麦",
            "そば",
            "うどん",
            "とんかつ",
            "牛かつ",
            "牛カツ",
            "会席",
            "懐石",
            "天ぷら",
            "おでん",
            "おばんざい",
            "焼き鳥",
            "串揚げ",
            "串カツ",
            "串焼き",
            "すき焼き",
            "しゃぶしゃぶ",
            "鍋料理",
            "もつ鍋",
            "牛丼",
            "天丼",
            "かつ丼",
            "お好み焼き",
            "もんじゃ焼き",
            "たこ焼き",
            "鉄板焼き",
            "鶏料理",
            "牛タン",
            "京都風日本料理",
            "料亭",
            "ちゃんこ",
            "豆腐料理",
        )
    ):
        return "日式"
    return "綜合餐廳"


def infer_venue_type(raw_type: str) -> str:
    category = normalize_type(raw_type)
    if any(
        keyword in category
        for keyword in (
            "カフェ",
            "喫茶",
            "ベーカリー",
            "和菓子",
            "洋菓子",
            "ケーキ",
            "デザート",
            "スイーツ",
            "アイス",
            "クレープ",
            "サンドイッチ",
            "ベーグル",
            "軽食",
            "テイクアウト",
            "ファースト フード",
            "ファーストフード",
            "菓子店",
            "パンケーキ",
            "アサイー",
            "フルーツ パーラー",
            "チョコレート",
            "弁当",
            "総菜",
        )
    ):
        return "小店"
    return "餐廳"


def detailed_interest_labels(raw_type: str) -> list[str]:
    category = normalize_type(raw_type)
    labels: list[str] = []
    mapping = [
        ("和菓子", ("和菓子",)),
        ("西式甜點", ("洋菓子", "デザート", "スイーツ", "菓子店")),
        ("蛋糕", ("ケーキ",)),
        ("鬆餅", ("パンケーキ",)),
        ("冰品", ("アイス",)),
        ("可麗餅", ("クレープ",)),
        ("巧克力", ("チョコレート",)),
        ("巴西莓", ("アサイー",)),
        ("水果甜點", ("フルーツ パーラー",)),
        ("麵包", ("ベーカリー",)),
        ("貝果", ("ベーグル",)),
        ("三明治", ("サンドイッチ",)),
        ("咖啡", ("コーヒー",)),
        ("喫茶店", ("喫茶",)),
        ("拉麵", ("ラーメン",)),
        ("擔擔麵", ("担々麺",)),
        ("居酒屋", ("居酒屋",)),
        ("燒肉", ("焼肉", "ホルモン")),
        ("壽司", ("寿司",)),
        ("中華料理", ("中華",)),
        ("台灣料理", ("台湾料理",)),
        ("四川料理", ("四川",)),
        ("廣東料理", ("広東",)),
        ("點心", ("点心", "飲茶")),
        ("餃子", ("餃子",)),
        ("韓國料理", ("韓国",)),
        ("印尼料理", ("インドネシア",)),
        ("咖哩", ("カレー",)),
        ("義大利料理", ("イタリア",)),
        ("披薩", ("ピザ",)),
        ("法式料理", ("フランス",)),
        ("牛排", ("ステーキ",)),
        ("炸牛排", ("牛かつ", "牛カツ")),
        ("漢堡", ("ハンバーガー",)),
        ("印度料理", ("インド",)),
        ("尼泊爾料理", ("ネパール",)),
        ("泰式料理", ("タイ料理",)),
        ("越南料理", ("ベトナム",)),
        ("西班牙料理", ("スペイン",)),
        ("墨西哥料理", ("メキシコ",)),
        ("斯里蘭卡料理", ("スリランカ",)),
        ("美式料理", ("アメリカ料理",)),
        ("地中海料理", ("地中海料理",)),
        ("俄式料理", ("ロシア料理",)),
        ("塔可", ("タコス",)),
        ("菲律賓料理", ("フィリピン",)),
        ("巴西料理", ("ブラジル",)),
        ("土耳其料理", ("トルコ",)),
        ("祕魯料理", ("ペルー",)),
        ("孟加拉料理", ("バングラデシュ",)),
        ("巴基斯坦料理", ("パキスタン",)),
        ("葡萄牙料理", ("ポルトガル",)),
        ("夏威夷料理", ("ハワイ",)),
        ("亞洲料理", ("アジア料理", "アジア多国籍")),
        ("清真料理", ("ハラル",)),
        ("純素料理", ("ビーガン", "ベジタリアン")),
        ("烤肉捲", ("ケバブ",)),
        ("茶屋", ("ティーハウス",)),
        ("海鮮", ("海鮮", "シーフード")),
        ("河豚", ("ふぐ",)),
        ("螃蟹", ("かに",)),
        ("魚料理", ("魚料理",)),
        ("鰻魚", ("うなぎ",)),
        ("定食", ("定食",)),
        ("蕎麥麵", ("蕎麦", "そば")),
        ("烏龍麵", ("うどん",)),
        ("炸豬排", ("とんかつ",)),
        ("牛舌", ("牛タン",)),
        ("懷石料理", ("会席", "懐石")),
        ("天婦羅", ("天ぷら",)),
        ("關東煮", ("おでん",)),
        ("燒鳥", ("焼き鳥",)),
        ("串炸", ("串揚げ", "串カツ")),
        ("串燒", ("串焼き",)),
        ("壽喜燒", ("すき焼き",)),
        ("涮涮鍋", ("しゃぶしゃぶ",)),
        ("牛腸鍋", ("もつ鍋",)),
        ("鍋物", ("鍋料理",)),
        ("大阪燒", ("お好み焼き",)),
        ("文字燒", ("もんじゃ焼き",)),
        ("章魚燒", ("たこ焼き",)),
        ("鐵板燒", ("鉄板焼き",)),
        ("雞肉料理", ("鶏料理",)),
        ("牛丼", ("牛丼",)),
        ("天丼", ("天丼",)),
        ("豬排丼", ("かつ丼",)),
        ("便當", ("弁当",)),
        ("熟食", ("総菜", "デリカテッセン")),
        ("豆腐料理", ("豆腐料理",)),
        ("相撲火鍋", ("ちゃんこ",)),
        ("京都料理", ("京都風日本料理",)),
        ("料亭", ("料亭",)),
        ("自助餐", ("ビュッフェ",)),
        ("酒吧", BAR_KEYWORDS),
        ("葡萄酒", ("ワイン",)),
        ("日本酒", ("日本酒",)),
        ("家庭餐廳", ("ファミリー レストラン",)),
        ("外帶", ("テイクアウト",)),
        ("速食", ("ファースト フード", "ファーストフード")),
        ("輕食", ("軽食",)),
        ("鄉土料理", ("郷土料理",)),
        ("立食", ("立食形式",)),
    ]

    for label, keywords in mapping:
        matched = is_bar_type(category) if label == "酒吧" else any(
            keyword in category for keyword in keywords
        )
        if label == "印度料理" and "インドネシア" in category:
            matched = False
        if matched and label not in labels:
            labels.append(label)
    return labels


def build_interests(name: str, raw_type: str, category: str, venue_type: str) -> list[str]:
    text = f"{name} {raw_type}".strip()
    interests: list[str] = [category]

    if venue_type not in interests:
        interests.append(venue_type)

    for label in detailed_interest_labels(raw_type):
        if label not in interests:
            interests.append(label)

    rules = [
        ("咖啡廳", ("カフェ", "喫茶", "コーヒー")),
        ("甜點", ("甜點", "菓子", "ケーキ", "アイス", "クレープ", "スイーツ", "デザート", "パンケーキ")),
        ("聚餐", ("居酒屋", "焼肉", "火鍋", "しゃぶしゃぶ", "ビュッフェ", "レストラン", "もつ鍋", "鍋料理", "鉄板焼き")),
        ("約會", ("フランス料理", "イタリア料理", "ビストロ", "ワインバー")),
        ("宵夜", ("居酒屋", "バー", "ラーメン", "焼き鳥", "おでん", "もつ鍋", "たこ焼き")),
        ("外帶", ("テイクアウト", "軽食", "ファースト フード", "ファーストフード", "サンドイッチ", "弁当", "総菜")),
        ("酒類", ("居酒屋", "ビアホール", "ワインバー", "日本酒", "酒店", "醸造所")),
        ("在地特色", ("郷土料理店", "和菓子屋", "会席", "懐石", "うなぎ", "海鮮")),
        ("家庭聚餐", ("ファミリー レストラン", "定食屋", "ビュッフェ", "お好み焼き", "しゃぶしゃぶ")),
        ("快速用餐", ("ラーメン", "カレー", "蕎麦", "そば", "うどん", "牛丼", "軽食", "ファースト フード", "ファーストフード", "天丼", "かつ丼", "餃子")),
    ]

    for label, keywords in rules:
        matched = any(keyword in text for keyword in keywords)
        if label in {"宵夜", "酒類"} and "ハンバーガー" in text:
            matched = False
        if matched and label not in interests:
            interests.append(label)

    return interests


def simplify_row(row: dict[str, str]) -> dict[str, Any]:
    raw_type = row["category"] or row["interest_tags"] or ""
    category = simplify_category(raw_type)
    venue_type = infer_venue_type(raw_type)
    simplified = {
        "id": convert_scalar(row["id"]),
        "name": convert_scalar(row["name"]),
        "region": convert_scalar(row["region"]),
        "category": category,
        "venue_type": venue_type,
        "interests": build_interests(row["name"], raw_type, category, venue_type),
        "google_rating": convert_scalar(row["google_rating"]),
        "review_count": convert_scalar(row["review_count"]),
        "station_anchor": convert_scalar(row["station_anchor"]),
        "distance_to_station_km": convert_scalar(row["distance_to_station_km"]),
        "rating_norm": convert_scalar(row["rating_norm"]),
        "review_norm": convert_scalar(row["review_norm"]),
        "station_distance_efficiency": convert_scalar(row["station_distance_efficiency"]),
        "static_score": convert_scalar(row["static_score"]),
        "image_url": convert_scalar(row["image_url"]),
        "lat": convert_scalar(row["lat"]),
        "lng": convert_scalar(row["lng"]),
        "google_name_matched": convert_scalar(row["google_name_matched"]),
        "raw_type": convert_scalar(raw_type),
    }
    return simplified


def load_rows(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return [simplify_row(row) for row in reader]


def write_json(path: Path, rows: list[dict[str, Any]], indent: int) -> None:
    with path.open("w", encoding="utf-8") as file:
        if indent > 0:
            json.dump(rows, file, ensure_ascii=False, indent=indent)
            file.write("\n")
        else:
            json.dump(rows, file, ensure_ascii=False, separators=(",", ":"))


def main() -> None:
    args = parse_args()
    input_csv = Path(args.input_csv)
    output_json = Path(args.output_json)

    if not input_csv.exists():
        raise FileNotFoundError(f"Input CSV not found: {input_csv}")

    rows = load_rows(input_csv)
    write_json(output_json, rows, args.indent)

    category_counts = Counter(row["category"] for row in rows)
    print(f"Wrote {len(rows)} rows to {output_json}")
    print("Simplified categories:")
    for category, count in category_counts.most_common():
        print(f"{count}\t{category}")


if __name__ == "__main__":
    main()
