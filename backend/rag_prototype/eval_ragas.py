from __future__ import annotations

import argparse
import ast
import json
import math
import os
import re
import statistics
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


CJK_VARIANT_MAP = str.maketrans(
    {
        "浅": "淺",
        "见": "見",
        "东": "東",
        "宫": "宮",
        "涩": "澀",
        "强": "強",
        "术": "術",
        "芦": "蘆",
        "纪": "紀",
        "园": "園",
        "圆": "圓",
        "顶": "頂",
        "广": "廣",
        "严": "嚴",
        "国": "國",
        "湾": "灣",
        "华": "華",
        "创": "創",
        "饶": "饒",
        "电": "電",
        "车": "車",
        "罗": "羅",
        "馆": "館",
        "户": "戶",
        "马": "馬",
        "赛": "賽",
        "兴": "興",
        "鸟": "鳥",
        "维": "維",
        "亚": "亞",
        "异": "異",
        "区": "區",
        "县": "縣",
        "桥": "橋",
        "业": "業",
        "场": "場",
        "丽": "麗",
        "备": "備",
        "双": "雙",
        "韩": "韓",
        "尔": "爾",
        "岛": "島",
        "会": "會",
        "冈": "岡",
        "后": "後",
        "乐": "樂",
        "仓": "倉",
        "实": "實",
        "丰": "豐",
        "产": "產",
        "龙": "龍",
        "历": "歷",
        "码": "碼",
        "头": "頭",
        "渔": "漁",
        "质": "質",
        "盐": "鹽",
        "滨": "濱",
        "萨": "薩",
        "台": "臺",
    }
)


def normalize_name(value: str) -> str:
    normalized = str(value or "").translate(CJK_VARIANT_MAP)
    return re.sub(r"[\W_]+", "", normalized, flags=re.UNICODE).strip().lower()


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for idx, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at line {idx}: {error}") from error
    return rows


def post_json(url: str, payload: dict[str, Any], timeout_sec: int = 120) -> dict[str, Any]:
    req = Request(
        url=url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=timeout_sec) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"HTTP {error.code}: {detail or error.reason}") from error
    except URLError as error:
        raise RuntimeError(f"Request failed: {error.reason}") from error


def call_extract_api(api_base: str, row: dict[str, Any], top_k: int, debug: bool) -> tuple[dict[str, Any], float]:
    payload = {
        "text": row.get("text", ""),
        "url": row.get("url", ""),
        "query": row.get("query", "List sightseeing spots mentioned in the article."),
        "top_k": top_k,
        "reset_db": False,
        "debug": debug,
    }
    start = time.perf_counter()
    result = post_json(f"{api_base.rstrip('/')}/api/rag/extract", payload)
    return result, (time.perf_counter() - start) * 1000


def dedupe(values: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        val = str(value or "").strip()
        if not val or val in seen:
            continue
        seen.add(val)
        out.append(val)
    return out


def build_sample(row: dict[str, Any], api_result: dict[str, Any], latency_ms: float) -> dict[str, Any]:
    spot_names = dedupe([str(x) for x in api_result.get("spot_names", [])])
    spots = api_result.get("spots", []) or []
    contexts = dedupe([str(s.get("source_text", "")) for s in spots if isinstance(s, dict)])
    answer = "、".join(spot_names)
    return {
        "id": row.get("id", ""),
        "question": row.get("query", ""),
        "ground_truth_spots": row.get("ground_truth_spots", []) or [],
        "predicted_spots": spot_names,
        "answer": answer,
        "contexts": contexts,
        "latency_ms": round(latency_ms, 2),
        "api_result": api_result,
    }


def compute_basic_metrics(samples: list[dict[str, Any]]) -> dict[str, Any]:
    if not samples:
        return {"sample_count": 0}

    latencies = [float(s.get("latency_ms", 0.0)) for s in samples]
    p95_idx = max(0, min(len(latencies) - 1, int((0.95 * len(latencies)) + 0.999999) - 1))

    precision_scores: list[float] = []
    recall_scores: list[float] = []
    f1_scores: list[float] = []

    for item in samples:
        pred = {normalize_name(x) for x in item.get("predicted_spots", []) if normalize_name(x)}
        gt = {normalize_name(x) for x in item.get("ground_truth_spots", []) if normalize_name(x)}
        if not gt:
            continue
        overlap = len(pred & gt)
        precision = overlap / len(pred) if pred else 0.0
        recall = overlap / len(gt) if gt else 0.0
        f1 = 0.0 if precision + recall == 0 else 2 * precision * recall / (precision + recall)
        precision_scores.append(precision)
        recall_scores.append(recall)
        f1_scores.append(f1)

    summary: dict[str, Any] = {
        "sample_count": len(samples),
        "empty_answer_count": sum(1 for s in samples if not s.get("predicted_spots")),
        "latency_ms_avg": round(statistics.mean(latencies), 2),
        "latency_ms_p95": round(sorted(latencies)[p95_idx], 2),
    }
    if precision_scores:
        summary["spot_precision_avg"] = round(statistics.mean(precision_scores), 4)
        summary["spot_recall_avg"] = round(statistics.mean(recall_scores), 4)
        summary["spot_f1_avg"] = round(statistics.mean(f1_scores), 4)
    return summary


POI_COMPARE_VARIANT_MAP = str.maketrans(
    {
        "溫": "温",
        "稻": "稲",
        "觀": "観",
        "禪": "禅",
        "滿": "満",
        "靈": "霊",
        "國": "国",
    }
)


def normalize_poi_compare(value: Any) -> str:
    normalized = str(value or "").translate(POI_COMPARE_VARIANT_MAP)
    return re.sub(r"[\W_]+", "", normalized, flags=re.UNICODE).strip().lower()


def is_poi_matched(spot: dict[str, Any]) -> bool:
    poi_match = spot.get("poiMatch") or {}
    return bool(poi_match.get("matched") or spot.get("poi"))


def has_position(spot: dict[str, Any]) -> bool:
    position = spot.get("position") or {}
    if not isinstance(position, dict):
        return False
    return position.get("lat") is not None and position.get("lng") is not None


def has_rating(spot: dict[str, Any]) -> bool:
    rating = spot.get("rating")
    if rating in {None, "", "-"}:
        return False
    try:
        return math.isfinite(float(rating))
    except (TypeError, ValueError):
        return False


def safe_positive_int(value: Any) -> bool:
    try:
        return int(value) > 0
    except (TypeError, ValueError):
        return False


def classify_poi_match_quality(spot: dict[str, Any]) -> str:
    if not is_poi_matched(spot):
        return "unmatched"

    extracted_name = spot.get("extracted_name") or spot.get("name") or ""
    poi = spot.get("poi") or {}
    candidate_names = [
        spot.get("matchedName"),
        poi.get("name") if isinstance(poi, dict) else "",
        poi.get("google_name_matched") if isinstance(poi, dict) else "",
    ]
    query = (spot.get("poiMatch") or {}).get("query", "")

    extracted_key = normalize_poi_compare(extracted_name)
    query_key = normalize_poi_compare(query)
    candidate_keys = [normalize_poi_compare(value) for value in candidate_names if normalize_poi_compare(value)]

    if extracted_key and extracted_key in candidate_keys:
        return "exact"
    if extracted_key and any(extracted_key in key or key in extracted_key for key in candidate_keys):
        return "partial"
    if query_key and (
        query_key in candidate_keys or any(query_key in key or key in query_key for key in candidate_keys)
    ):
        return "query_variant"
    return "weak"


def compute_poi_match_metrics(samples: list[dict[str, Any]], detail_limit: int = 30) -> dict[str, Any]:
    if not samples:
        return {"sample_count": 0}

    total_spots = 0
    matched_spots = 0
    position_count = 0
    rating_count = 0
    review_count = 0
    image_count = 0
    quality_counts = {
        "exact": 0,
        "partial": 0,
        "query_variant": 0,
        "weak": 0,
        "unmatched": 0,
    }
    quality_weights = {
        "exact": 1.0,
        "partial": 0.85,
        "query_variant": 0.7,
        "weak": 0.35,
        "unmatched": 0.0,
    }
    quality_score_sum = 0.0
    per_sample: list[dict[str, Any]] = []
    unmatched_details: list[dict[str, Any]] = []
    weak_match_details: list[dict[str, Any]] = []
    sample_rates: list[float] = []

    for sample in samples:
        api_result = sample.get("api_result") or {}
        spots = [spot for spot in (api_result.get("spots") or []) if isinstance(spot, dict)]
        sample_total = len(spots)
        sample_matched = 0
        sample_unmatched: list[str] = []

        for spot in spots:
            total_spots += 1
            quality = classify_poi_match_quality(spot)
            quality_counts[quality] = quality_counts.get(quality, 0) + 1
            quality_score_sum += quality_weights.get(quality, 0.0)

            if is_poi_matched(spot):
                matched_spots += 1
                sample_matched += 1
                if has_position(spot):
                    position_count += 1
                if has_rating(spot):
                    rating_count += 1
                if safe_positive_int(spot.get("reviewsCount") or spot.get("reviews_count") or 0):
                    review_count += 1
                if spot.get("imageUrl") or (isinstance(spot.get("poi"), dict) and spot["poi"].get("image_url")):
                    image_count += 1
                if quality == "weak" and len(weak_match_details) < detail_limit:
                    poi = spot.get("poi") or {}
                    weak_match_details.append(
                        {
                            "sample_id": sample.get("id", ""),
                            "spot_name": spot.get("name", ""),
                            "query": (spot.get("poiMatch") or {}).get("query", ""),
                            "matched_name": spot.get("matchedName") or (poi.get("name") if isinstance(poi, dict) else ""),
                            "google_name_matched": poi.get("google_name_matched") if isinstance(poi, dict) else "",
                        }
                    )
            else:
                sample_unmatched.append(str(spot.get("name", "")))
                if len(unmatched_details) < detail_limit:
                    unmatched_details.append(
                        {
                            "sample_id": sample.get("id", ""),
                            "spot_name": spot.get("name", ""),
                            "query": (spot.get("poiMatch") or {}).get("query", ""),
                        }
                    )

        sample_rate = sample_matched / sample_total if sample_total else 0.0
        sample_rates.append(sample_rate)
        per_sample.append(
            {
                "id": sample.get("id", ""),
                "spot_count": sample_total,
                "poi_matched_count": sample_matched,
                "poi_match_rate": round(sample_rate, 4),
                "unmatched_spots": sample_unmatched[:detail_limit],
            }
        )

    match_rate = matched_spots / total_spots if total_spots else 0.0
    quality_score = quality_score_sum / total_spots if total_spots else 0.0
    position_rate = position_count / matched_spots if matched_spots else 0.0
    rating_rate = rating_count / matched_spots if matched_spots else 0.0
    review_rate = review_count / matched_spots if matched_spots else 0.0
    image_rate = image_count / matched_spots if matched_spots else 0.0
    enrichment_score = statistics.mean([position_rate, rating_rate, review_rate, image_rate]) if matched_spots else 0.0
    integration_score = (0.5 * match_rate) + (0.3 * quality_score) + (0.2 * enrichment_score)

    return {
        "sample_count": len(samples),
        "total_spot_count": total_spots,
        "poi_matched_count": matched_spots,
        "poi_unmatched_count": max(0, total_spots - matched_spots),
        "poi_match_rate": round(match_rate, 4),
        "poi_match_quality_score": round(quality_score, 4),
        "poi_enrichment_score": round(enrichment_score, 4),
        "poi_integration_score": round(integration_score, 4),
        "sample_poi_match_rate_avg": round(statistics.mean(sample_rates), 4) if sample_rates else 0.0,
        "sample_full_match_count": sum(1 for item in per_sample if item["spot_count"] and item["poi_matched_count"] == item["spot_count"]),
        "sample_any_match_count": sum(1 for item in per_sample if item["poi_matched_count"] > 0),
        "match_quality_counts": quality_counts,
        "matched_position_rate": round(position_rate, 4),
        "matched_rating_rate": round(rating_rate, 4),
        "matched_review_count_rate": round(review_rate, 4),
        "matched_image_rate": round(image_rate, 4),
        "per_sample": per_sample,
        "unmatched_details": unmatched_details,
        "weak_match_details": weak_match_details,
    }


def maybe_run_ragas(samples: list[dict[str, Any]], eval_model: str, eval_embedding_model: str) -> dict[str, Any]:
    if not samples:
        return {"status": "skipped", "reason": "no samples"}
    if not os.getenv("OPENAI_API_KEY"):
        return {"status": "skipped", "reason": "OPENAI_API_KEY is not set"}

    try:
        from datasets import Dataset
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings
        from ragas import evaluate
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from ragas.llms import LangchainLLMWrapper
        from ragas.metrics import answer_relevancy, context_precision, context_recall, faithfulness
    except Exception as error:
        return {"status": "skipped", "reason": f"ragas import failed: {error}"}

    rows = {
        "question": [str(s.get("question", "")) for s in samples],
        "answer": [str(s.get("answer", "")) for s in samples],
        "contexts": [list(s.get("contexts", []) or []) for s in samples],
        "ground_truth": ["、".join(s.get("ground_truth_spots", []) or []) for s in samples],
    }
    has_gt = any(bool(x.strip()) for x in rows["ground_truth"])

    metrics = [faithfulness, answer_relevancy, context_precision]
    if has_gt:
        metrics.append(context_recall)

    dataset = Dataset.from_dict(rows)
    evaluator_llm = LangchainLLMWrapper(ChatOpenAI(model=eval_model, temperature=0))
    evaluator_embeddings = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model=eval_embedding_model))

    try:
        result = evaluate(
            dataset=dataset,
            metrics=metrics,
            llm=evaluator_llm,
            embeddings=evaluator_embeddings,
            raise_exceptions=False,
            show_progress=True,
        )
    except Exception as error:
        return {"status": "failed", "reason": str(error)}

    try:
        metrics_dict = dict(result)
    except Exception:
        metrics_dict = {"raw": str(result)}

    raw_metrics = metrics_dict.get("raw")
    if isinstance(raw_metrics, str):
        try:
            parsed_raw = ast.literal_eval(raw_metrics)
            if isinstance(parsed_raw, dict):
                metrics_dict = parsed_raw
        except (SyntaxError, ValueError):
            pass

    metrics_dict = {
        str(key): (round(float(value), 4) if isinstance(value, (int, float)) and math.isfinite(float(value)) else value)
        for key, value in metrics_dict.items()
    }
    return {"status": "ok", "metrics": metrics_dict}


def main() -> None:
    parser = argparse.ArgumentParser(description="RAG extract API evaluation (baseline + optional RAGAS).")
    parser.add_argument("--api-base", default="http://127.0.0.1:8010")
    parser.add_argument("--dataset", default="eval_seed_questions.jsonl")
    parser.add_argument("--top-k", type=int, default=4)
    parser.add_argument("--max-samples", type=int, default=0)
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--run-ragas", action="store_true")
    parser.add_argument("--eval-model", default="gpt-4o-mini")
    parser.add_argument("--eval-embedding-model", default="text-embedding-3-small")
    parser.add_argument("--output-dir", default="eval_outputs")
    parser.add_argument("--poi-detail-limit", type=int, default=30)
    args = parser.parse_args()

    dataset_path = Path(args.dataset).resolve()
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    rows = load_jsonl(dataset_path)
    if args.max_samples > 0:
        rows = rows[: args.max_samples]

    samples: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    for row in rows:
        try:
            api_result, latency_ms = call_extract_api(args.api_base, row, args.top_k, args.debug)
            samples.append(build_sample(row, api_result, latency_ms))
        except Exception as error:
            failures.append({"id": row.get("id", ""), "error": str(error)})

    basic_metrics = compute_basic_metrics(samples)
    poi_match_metrics = compute_poi_match_metrics(samples, detail_limit=args.poi_detail_limit)
    ragas_result = (
        maybe_run_ragas(samples, args.eval_model, args.eval_embedding_model)
        if args.run_ragas
        else {"status": "skipped", "reason": "use --run-ragas to enable"}
    )

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    sample_path = output_dir / f"rag_eval_samples_{ts}.jsonl"
    summary_path = output_dir / f"rag_eval_summary_{ts}.json"

    sample_path.write_text(
        "\n".join(json.dumps(s, ensure_ascii=False) for s in samples) + ("\n" if samples else ""),
        encoding="utf-8",
    )
    summary_path.write_text(
        json.dumps(
            {
                "timestamp": ts,
                "api_base": args.api_base,
                "dataset_path": str(dataset_path),
                "sample_count": len(samples),
                "failure_count": len(failures),
                "failures": failures,
                "basic_metrics": basic_metrics,
                "poi_match_metrics": poi_match_metrics,
                "ragas": ragas_result,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("=== Evaluation Completed ===")
    print(f"Samples: {len(samples)}")
    print(f"Failures: {len(failures)}")
    print(f"Sample file: {sample_path}")
    print(f"Summary file: {summary_path}")
    print("\nBasic metrics:")
    print(json.dumps(basic_metrics, ensure_ascii=False, indent=2))
    print("\nPOI match metrics:")
    print(json.dumps(poi_match_metrics, ensure_ascii=False, indent=2))
    print("\nRAGAS:")
    print(json.dumps(ragas_result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
