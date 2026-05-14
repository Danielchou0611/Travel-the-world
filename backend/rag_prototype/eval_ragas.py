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
    print("\nRAGAS:")
    print(json.dumps(ragas_result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
