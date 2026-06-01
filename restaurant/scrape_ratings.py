import argparse
import json
import os
import re
import subprocess
import time


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.join(BASE_DIR, "japan_data_v1")
OUTPUT_DIR = os.path.join(BASE_DIR, "japan_data_v1_with_rating")


def resolve_scraper_path():
    candidates = [
        os.path.join(os.path.dirname(BASE_DIR), "google_maps_scraper_tool", "google-maps-scraper"),
        os.path.join(os.path.dirname(os.path.dirname(BASE_DIR)), "google_maps_scraper_tool", "google-maps-scraper"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[-1]


SCRAPER_PATH = resolve_scraper_path()


def load_json_with_fallback(path):
    encodings = ["utf-8", "cp932"]
    for enc in encodings:
        try:
            with open(path, "r", encoding=enc) as f:
                return json.load(f)
        except UnicodeDecodeError:
            continue
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return json.load(f)


def read_lines_with_fallback(path):
    encodings = ["utf-8", "cp932"]
    for enc in encodings:
        try:
            with open(path, "r", encoding=enc) as f:
                return f.readlines()
        except UnicodeDecodeError:
            continue
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.readlines()


def parse_point(point_str):
    if not point_str or not isinstance(point_str, str):
        return None, None
    match = re.search(r"Point\(([-\d.]+) ([-\d.]+)\)", point_str)
    if match:
        return float(match.group(2)), float(match.group(1))
    return None, None


def calculate_distance(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return 999
    return ((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2) ** 0.5


def is_name_match(name1, name2):
    if not name1 or not name2:
        return False
    if name1 in name2 or name2 in name1:
        return True
    suffixes = r"(餐廳|居酒屋|喫茶|咖啡|拉麵|壽司|燒肉|食堂|店|本店|分店)$"
    s1 = re.sub(suffixes, "", name1)
    s2 = re.sub(suffixes, "", name2)
    return len(s1) > 1 and (s1 in s2 or s2 in s1)


def safe_save(data, file_path):
    temp_file = file_path + ".tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    os.replace(temp_file, file_path)


def load_prefecture_data(pref_name):
    source_path = os.path.join(SOURCE_DIR, f"{pref_name}.json")
    output_path = os.path.join(OUTPUT_DIR, f"{pref_name}.json")

    base_data = []
    if os.path.exists(output_path):
        base_data = load_json_with_fallback(output_path)
    elif os.path.exists(source_path):
        base_data = load_json_with_fallback(source_path)

    if not isinstance(base_data, list):
        return output_path, []
    return output_path, base_data


def build_targets(data, repair_mode):
    targets = []
    for item in data:
        if "id" not in item:
            continue
        if repair_mode:
            matched = item.get("google_name_matched", "")
            rating = item.get("google_rating")
            if matched == "NOT_FOUND" or rating is None or not is_name_match(item.get("name", ""), matched):
                targets.append(item)
        else:
            if "google_rating" not in item and "google_review_count" not in item:
                targets.append(item)
    return targets


def apply_match(item, best_match):
    if best_match:
        item["google_rating"] = best_match.get("review_rating")
        item["google_review_count"] = best_match.get("review_count", 0)
        item["google_name_matched"] = best_match.get("title")
    else:
        item["google_rating"] = None
        item["google_review_count"] = 0
        item["google_name_matched"] = "NOT_FOUND"


def scrape_prefecture(pref_name, chunk_size=40, repair_mode=False):
    output_file, data = load_prefecture_data(pref_name)
    if not data:
        print(f"⚠️ {pref_name}: 沒有可處理資料 ({output_file})")
        return

    targets = build_targets(data, repair_mode)
    if not targets:
        print(f"⏩ {pref_name}: 不需更新")
        return

    print(f"🚀 {pref_name}: 預計處理 {len(targets)} 筆")
    by_id = {item["id"]: item for item in data if "id" in item}

    failed_batches = 0
    for i in range(0, len(targets), chunk_size):
        chunk = targets[i : i + chunk_size]
        queries = [f"{pref_name} {item.get('name', '')}".strip() for item in chunk]

        q_file = os.path.join(BASE_DIR, "temp_queries_active.txt")
        r_file = os.path.join(BASE_DIR, "temp_batch_results.json")

        with open(q_file, "w", encoding="utf-8") as f:
            for q in queries:
                f.write(q + "\n")

        cmd = [SCRAPER_PATH, "-input", q_file, "-json", "-lang", "ja", "-results", r_file]

        try:
            subprocess.run(cmd, check=True, capture_output=True)
            batch_google = []
            if os.path.exists(r_file):
                for line in read_lines_with_fallback(r_file):
                    if not line.strip():
                        continue
                    try:
                        batch_google.append(json.loads(line))
                    except Exception:
                        continue

            for item in chunk:
                orig_lat, orig_lon = parse_point(item.get("coordinates"))
                best_match = None
                min_dist = 999

                for res in batch_google:
                    res_lat, res_lon = res.get("latitude"), res.get("longtitude")
                    res_title = res.get("title", "")
                    dist = calculate_distance(orig_lat, orig_lon, res_lat, res_lon)

                    if is_name_match(item.get("name", ""), res_title) and dist < 0.02:
                        if dist < min_dist:
                            min_dist = dist
                            best_match = res
                    elif dist < 0.003:
                        if dist < min_dist:
                            min_dist = dist
                            best_match = res

                apply_match(by_id[item["id"]], best_match)

            safe_save(list(by_id.values()), output_file)
            print(f"  💾 {pref_name}: 已更新 {min(i + chunk_size, len(targets))}/{len(targets)}")

            if os.path.exists(q_file):
                os.remove(q_file)
            if os.path.exists(r_file):
                os.remove(r_file)
            time.sleep(1)
        except Exception as e:
            print(f"❌ {pref_name} 批次失敗: {e}")
            failed_batches += 1
            if os.path.exists(q_file):
                os.remove(q_file)
            if os.path.exists(r_file):
                os.remove(r_file)
            continue

    if failed_batches:
        print(f"⚠️ {pref_name}: 共跳過 {failed_batches} 個失敗批次")


def available_prefectures():
    prefs = []
    if not os.path.exists(SOURCE_DIR):
        return prefs
    for filename in os.listdir(SOURCE_DIR):
        if filename.endswith(".json"):
            prefs.append(filename.replace(".json", ""))
    prefs.sort()
    return prefs


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("prefectures", nargs="*", help="指定要處理的縣市，例如：東京都 大阪府")
    parser.add_argument("--repair", action="store_true", help="修復模式：重抓 NOT_FOUND 或低匹配資料")
    parser.add_argument("--chunk", type=int, default=40, help="批次大小")
    args = parser.parse_args()

    if not os.path.exists(SCRAPER_PATH):
        print(f"❌ 找不到工具：{SCRAPER_PATH}")
        raise SystemExit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    prefs = available_prefectures()
    targets = args.prefectures if args.prefectures else prefs
    targets = [p for p in targets if p in prefs]
    if not targets:
        print("❌ 找不到可處理的縣市資料檔")
        raise SystemExit(1)

    print("⭐ 餐廳評分補抓任務啟動")
    print("---------------------------------------------")
    for pref in targets:
        scrape_prefecture(pref, chunk_size=args.chunk, repair_mode=args.repair)
    print("\n🎉 任務完成")
