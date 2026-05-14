from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
DEFAULT_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
DEFAULT_GEN_MODEL = os.getenv("OLLAMA_GEN_MODEL", "qwen2.5:7b-instruct")
EMBED_MODEL_CANDIDATES = [
    DEFAULT_EMBED_MODEL,
    "nomic-embed-text",
    "bge-m3",
]
GEN_MODEL_CANDIDATES = [
    DEFAULT_GEN_MODEL,
    "qwen2.5:7b-instruct",
    "llama3.1:8b-instruct",
    "gemma3:4b",
]


def split_text(
    text: str,
    chunk_size: int = 360,
    overlap: int = 80,
    min_chunk_size: int = 140,
) -> list[str]:
    if chunk_size <= 0:
        return []

    paragraph_candidates = [re.sub(r"\s+", " ", item).strip() for item in re.split(r"\n+", text)]
    paragraphs = [item for item in paragraph_candidates if item]

    if not paragraphs:
        normalized_text = re.sub(r"\s+", " ", text).strip()
        paragraphs = [normalized_text] if normalized_text else []
    if not paragraphs:
        return []

    max_overlap = max(0, chunk_size - 1)
    overlap = max(0, min(overlap, max_overlap))

    heading_pattern = re.compile(
        r"^(DAY\s*\d+|第[一二三四五六七八九十0-9]+\s*天|行程重點|【[^】]{1,28}(一日遊|半日遊|二日遊|三日遊|四日遊|行程|自由行)[^】]{0,18}】)",
        flags=re.IGNORECASE,
    )

    merged_paragraphs: list[str] = []
    current_parts: list[str] = []
    current_length = 0

    def flush_current() -> None:
        nonlocal current_parts, current_length
        if current_parts:
            merged_paragraphs.append(" ".join(current_parts))
        current_parts = []
        current_length = 0

    for paragraph in paragraphs:
        line = paragraph.strip()
        if line and heading_pattern.search(line):
            flush_current()
            merged_paragraphs.append(line)
            continue

        paragraph_length = len(paragraph)
        if not current_parts:
            current_parts = [paragraph]
            current_length = paragraph_length
            continue

        projected_length = current_length + 1 + paragraph_length
        if projected_length <= chunk_size:
            current_parts.append(paragraph)
            current_length = projected_length
            continue

        overflow_limit = int(chunk_size * 1.45)
        if current_length < min_chunk_size and projected_length <= overflow_limit:
            current_parts.append(paragraph)
            current_length = projected_length
            continue

        flush_current()
        current_parts = [paragraph]
        current_length = paragraph_length

    flush_current()

    chunks: list[str] = []
    for paragraph in merged_paragraphs:
        if len(paragraph) <= chunk_size:
            chunks.append(paragraph)
            continue

        # Long paragraph fallback: split with overlap to avoid context cut.
        start = 0
        while start < len(paragraph):
            end = min(start + chunk_size, len(paragraph))
            chunk = paragraph[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end == len(paragraph):
                break
            start = max(0, end - overlap)

    return chunks


def _dedupe_keep_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def _compact_error_text(error: object, limit: int = 320) -> str:
    message = re.sub(r"\s+", " ", str(error)).strip()
    if len(message) <= limit:
        return message
    return f"{message[: limit - 3]}..."


def _is_dimension_mismatch_error(error: object) -> bool:
    message = str(error).lower()
    return "expecting embedding with dimension" in message and "got" in message


def _read_json_response(request: Request, timeout_sec: int = 90) -> dict:
    try:
        with urlopen(request, timeout=timeout_sec) as response:
            body = response.read().decode("utf-8", errors="ignore")
            return json.loads(body) if body else {}
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Ollama HTTP {error.code}: {detail or error.reason}") from error
    except URLError as error:
        raise RuntimeError(f"Ollama request failed: {error.reason}") from error
    except Exception as error:
        raise RuntimeError(f"Ollama request failed: {error}") from error


def _ollama_post(path: str, payload: dict, timeout_sec: int = 90) -> dict:
    url = f"{OLLAMA_BASE_URL}{path}"
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return _read_json_response(request, timeout_sec=timeout_sec)


def list_ollama_models() -> list[str]:
    try:
        request = Request(f"{OLLAMA_BASE_URL}/api/tags", method="GET")
        payload = _read_json_response(request, timeout_sec=10)
        models = payload.get("models", [])
        names = [model.get("name", "") for model in models if isinstance(model, dict)]
        return _dedupe_keep_order(names)
    except Exception:
        return []


def _parse_embed_vector(response_payload: dict) -> list[float]:
    # /api/embed response: {"embeddings": [[...]]}
    embeddings = response_payload.get("embeddings")
    if isinstance(embeddings, list) and embeddings:
        first_item = embeddings[0]
        if isinstance(first_item, list):
            return [float(value) for value in first_item]

    # /api/embeddings response: {"embedding": [...]}
    embedding = response_payload.get("embedding")
    if isinstance(embedding, list) and embedding:
        return [float(value) for value in embedding]

    raise RuntimeError("Ollama embedding response format is unexpected.")


def embed_text_with_fallback(text: str, task_type: str) -> tuple[list[float], str]:
    # task_type kept for interface compatibility with previous version.
    _ = task_type
    errors: list[str] = []
    candidates = _dedupe_keep_order(EMBED_MODEL_CANDIDATES)

    for model in candidates:
        try:
            response_payload = _ollama_post("/api/embed", {"model": model, "input": [text]})
            return _parse_embed_vector(response_payload), model
        except Exception as error_embed_api:
            try:
                response_payload = _ollama_post("/api/embeddings", {"model": model, "prompt": text})
                return _parse_embed_vector(response_payload), model
            except Exception as error_embeddings_api:
                errors.append(
                    f"{model}: embed API error={_compact_error_text(error_embed_api)} | "
                    f"embeddings API error={_compact_error_text(error_embeddings_api)}"
                )

    available_models = list_ollama_models()
    available_hint = ", ".join(available_models) if available_models else "(unable to list)"
    raise RuntimeError(
        "Failed to embed content with all Ollama candidate models.\n"
        f"Tried: {', '.join(candidates)}\n"
        f"Available Ollama models: {available_hint}\n"
        f"Last errors:\n- " + "\n- ".join(errors)
    )


def generate_with_fallback(prompt: str) -> tuple[str, str]:
    errors: list[str] = []
    candidates = _dedupe_keep_order(GEN_MODEL_CANDIDATES)

    for model_name in candidates:
        try:
            response_payload = _ollama_post(
                "/api/generate",
                {
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.2},
                },
            )
            output = str(response_payload.get("response", "") or "").strip()
            if output:
                return output, model_name
            errors.append(f"{model_name}: empty response")
        except Exception as error:
            errors.append(f"{model_name}: {_compact_error_text(error)}")

    available_models = list_ollama_models()
    available_hint = ", ".join(available_models) if available_models else "(unable to list)"
    raise RuntimeError(
        "Failed to generate content with all Ollama candidate models.\n"
        f"Tried: {', '.join(candidates)}\n"
        f"Available Ollama models: {available_hint}\n"
        f"Last errors:\n- " + "\n- ".join(errors)
    )


def extract_names_with_fallback(text: str) -> list[str]:
    pattern = (
        r"(?:^|[，。、\s])"
        r"(?:第[一二三四五六七八九十0-9]+天(?:早上|下午|晚上)?(?:先到|到|去)?|最後一天到|先到|到|去|在|參觀|逛|和)?\s*"
        r"([\u4e00-\u9fff]{2,12}(寺|神宮|神社|公園|市場|塔|城|宮|町|車站|八幡宮))"
    )
    matches = re.finditer(pattern, text)
    names: list[str] = []
    prefix_pattern = re.compile(
        r"^(第一天先到|第一天到|第一天|第二天早上到|第二天到|第二天|第三天搭車去|第三天|最後一天到|最後一天|晚上去|早上到|下午在|傍晚到|參觀|到|去|在|和)"
    )

    for match in matches:
        full_name = match.group(1).strip()
        full_name = prefix_pattern.sub("", full_name).strip()
        if full_name not in names:
            names.append(full_name)
    return names


def extract_names_from_model_output(model_output: str) -> list[str]:
    if not model_output:
        return []

    ignore_exact = {
        "景點名稱",
        "景點名稱清單",
        "旅遊景點名稱",
        "無",
        "沒有",
    }

    def clean_candidate(value: str) -> str:
        cleaned = value.strip()
        cleaned = re.sub(r"^[\s\-\*\d\.\)\(、:：]+", "", cleaned)
        cleaned = re.sub(r"^(景點名稱清單|景點名稱|旅遊景點名稱|推薦景點)\s*[:：]?", "", cleaned)
        cleaned = re.sub(r"[（(][^)）]{0,24}[)）]\s*$", "", cleaned)
        cleaned = re.sub(r"\s+", "", cleaned)
        return cleaned

    def is_valid_name(value: str) -> bool:
        if not value:
            return False
        if value in ignore_exact:
            return False
        if len(value) < 2 or len(value) > 20:
            return False
        if re.search(r"[。！？.!?]", value):
            return False
        if re.search(r"(以下|文章|內容|抽取|景點|名稱|來源|第\d+段|請)", value):
            return False
        return bool(re.search(r"[\u4e00-\u9fff]", value))

    names: list[str] = []
    for line in model_output.splitlines():
        if not line.strip():
            continue

        normalized_line = line.replace("：", ":")
        if ":" in normalized_line and normalized_line.index(":") < 10:
            normalized_line = normalized_line.split(":", maxsplit=1)[1]

        candidates = re.split(r"[、，,;/；|]", normalized_line)
        for candidate in candidates:
            cleaned = clean_candidate(candidate)
            if is_valid_name(cleaned) and cleaned not in names:
                names.append(cleaned)

    if names:
        return names
    return extract_names_with_fallback(model_output)


def format_chunks_for_prompt(chunks: Iterable[str]) -> str:
    lines = []
    for index, chunk in enumerate(chunks, start=1):
        lines.append(f"[段落 {index}] {chunk}")
    return "\n".join(lines)


def _build_extraction_prompt(user_query: str, chunks: list[str], chunk_indices: list[int]) -> str:
    lines = []
    for local_index, chunk in enumerate(chunks, start=1):
        actual_index = chunk_indices[local_index - 1] if local_index - 1 < len(chunk_indices) else local_index
        lines.append(f"[段落 {actual_index}] {chunk}")
    context_text = "\n".join(lines)

    return f"""
你是旅遊資料整理助手。請根據以下內容抽取景點名稱：
- 只回傳景點名稱清單
- 不要加入未出現在內容中的地點
- 每行一個

使用者問題：{user_query}

檢索內容：
{context_text}
""".strip()


def _extract_names_from_chunks_with_model(
    *,
    chunks: list[str],
    chunk_indices: list[int],
    user_query: str,
) -> tuple[str, list[str], str, str]:
    if not chunks:
        return "", [], "fallback-regex", "No chunks provided."

    max_chunks_per_prompt = max(1, int(os.getenv("RAG_MAX_CHUNKS_PER_PROMPT", "10")))
    warnings: list[str] = []
    used_gen_model = ""
    outputs: list[str] = []
    all_names: list[str] = []

    for start in range(0, len(chunks), max_chunks_per_prompt):
        chunk_batch = chunks[start : start + max_chunks_per_prompt]
        index_batch = chunk_indices[start : start + max_chunks_per_prompt]
        prompt = _build_extraction_prompt(user_query, chunk_batch, index_batch)

        try:
            model_output, model_name = generate_with_fallback(prompt)
            if not used_gen_model:
                used_gen_model = model_name
            if model_output:
                outputs.append(model_output)
                all_names.extend(extract_names_from_model_output(model_output))
            else:
                all_names.extend(extract_names_with_fallback(" ".join(chunk_batch)))
        except Exception as error:
            warnings.append(_compact_error_text(error))
            all_names.extend(extract_names_with_fallback(" ".join(chunk_batch)))

    deduped_names = _dedupe_keep_order(all_names)
    if not deduped_names:
        deduped_names = extract_names_with_fallback(" ".join(chunks))

    combined_output = "\n".join(deduped_names) if deduped_names else "\n\n".join(outputs)
    if not combined_output:
        combined_output = "(empty)"
    warning_text = " | ".join(warnings)
    return combined_output, deduped_names, used_gen_model or "fallback-regex", warning_text


def _fallback_without_embedding(
    *,
    chunks: list[str],
    user_query: str,
    top_k: int,
    embed_error: Exception,
    read_full_document: bool,
) -> dict:
    if read_full_document:
        retrieved_chunks = chunks
        retrieved_chunk_indices = list(range(1, len(chunks) + 1))
    else:
        retrieved_chunks = chunks[: min(top_k, len(chunks))]
        retrieved_chunk_indices = list(range(1, len(retrieved_chunks) + 1))

    warning_lines = [f"Embedding unavailable, switched to non-vector fallback: {_compact_error_text(embed_error)}"]
    model_output, spot_names, used_gen_model, batch_warning = _extract_names_from_chunks_with_model(
        chunks=retrieved_chunks,
        chunk_indices=retrieved_chunk_indices,
        user_query=user_query,
    )
    if batch_warning:
        warning_lines.append(f"Generation fallback reason: {batch_warning}")
    if not spot_names:
        warning_lines.append("No names found by fallback extraction.")

    return {
        "chunks": chunks,
        "retrieved_chunks": retrieved_chunks,
        "retrieved_chunk_indices": retrieved_chunk_indices,
        "model_output": model_output,
        "spot_names": spot_names,
        "embed_model": "fallback-no-embedding",
        "gen_model": used_gen_model,
        "generation_warning": " | ".join(warning_lines),
    }


def run_rag_prototype(
    input_text: str,
    user_query: str,
    top_k: int,
    reset_db: bool,
    read_full_document: bool = False,
) -> dict:
    chroma_dir = Path(os.getenv("RAG_CHROMA_DIR", "./chroma_store")).resolve()
    collection_name = os.getenv("RAG_COLLECTION_NAME", "japan_guides_week2")

    client = chromadb.PersistentClient(
        path=str(chroma_dir),
        settings=Settings(anonymized_telemetry=False),
    )

    if reset_db:
        try:
            client.delete_collection(name=collection_name)
        except Exception:
            pass

    collection = client.get_or_create_collection(name=collection_name)
    existing_ids: list[str] = []
    try:
        existing = collection.get(include=[])
        existing_ids = [item for item in (existing.get("ids") or []) if isinstance(item, str) and item]
    except Exception:
        existing_ids = []

    if existing_ids:
        collection.delete(ids=existing_ids)

    chunks = split_text(input_text)
    if not chunks:
        raise ValueError("Input text is empty, cannot run RAG prototype.")

    ids = [f"chunk-{index + 1}" for index in range(len(chunks))]
    embeddings: list[list[float]] = []
    used_embed_model = ""
    query_embed_model = ""

    try:
        for chunk in chunks:
            chunk_embedding, embed_model = embed_text_with_fallback(chunk, "retrieval_document")
            embeddings.append(chunk_embedding)
            used_embed_model = embed_model

        try:
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=[{"chunk_index": index + 1} for index in range(len(chunks))],
            )
        except Exception as upsert_error:
            if not _is_dimension_mismatch_error(upsert_error):
                raise
            # Collection dimension mismatch: recreate so Ollama vectors can be written.
            client.delete_collection(name=collection_name)
            collection = client.get_or_create_collection(name=collection_name)
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=[{"chunk_index": index + 1} for index in range(len(chunks))],
            )

        query_embedding, query_embed_model = embed_text_with_fallback(user_query, "retrieval_query")
        query_result = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, len(chunks)),
            include=["documents", "distances", "metadatas"],
        )

        retrieved_chunks = query_result.get("documents", [[]])[0]
        retrieved_metadatas = query_result.get("metadatas", [[]])[0]
        retrieved_chunk_indices = [
            int(metadata.get("chunk_index", 0)) if isinstance(metadata, dict) else 0 for metadata in retrieved_metadatas
        ]
    except Exception as embed_error:
        return _fallback_without_embedding(
            chunks=chunks,
            user_query=user_query,
            top_k=top_k,
            embed_error=embed_error,
            read_full_document=read_full_document,
        )

    if read_full_document:
        retrieved_chunks = chunks
        retrieved_chunk_indices = list(range(1, len(chunks) + 1))

    model_output, spot_names, used_gen_model, generation_warning = _extract_names_from_chunks_with_model(
        chunks=retrieved_chunks,
        chunk_indices=retrieved_chunk_indices,
        user_query=user_query,
    )

    return {
        "chunks": chunks,
        "retrieved_chunks": retrieved_chunks,
        "retrieved_chunk_indices": retrieved_chunk_indices,
        "model_output": model_output,
        "spot_names": spot_names,
        "embed_model": used_embed_model or query_embed_model,
        "gen_model": used_gen_model,
        "generation_warning": generation_warning,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Week 3 RAG prototype: Ollama embedding + ChromaDB")
    parser.add_argument("--file", type=str, default="", help="Path to the travel article text file.")
    parser.add_argument("--text", type=str, default="", help="Direct travel article text.")
    parser.add_argument(
        "--query",
        type=str,
        default="請列出文章中的旅遊景點名稱",
        help="Question for retrieval.",
    )
    parser.add_argument("--top-k", type=int, default=4, help="How many chunks to retrieve from ChromaDB.")
    parser.add_argument(
        "--reset-db",
        action="store_true",
        help="Delete and recreate the Chroma collection before indexing.",
    )
    args = parser.parse_args()

    load_dotenv()
    input_text = args.text.strip()
    if not input_text and args.file:
        input_text = Path(args.file).read_text(encoding="utf-8")
    if not input_text:
        raise ValueError("Please provide --text or --file.")

    result = run_rag_prototype(
        input_text=input_text,
        user_query=args.query,
        top_k=args.top_k,
        reset_db=args.reset_db,
    )

    print("=== Ollama Base URL ===")
    print(OLLAMA_BASE_URL)
    print("\n=== Embed Model Used ===")
    print(result["embed_model"])
    print("\n=== Generation Model Used ===")
    print(result["gen_model"])
    if result["generation_warning"]:
        print("\n=== Generation Warning ===")
        print(result["generation_warning"])

    print("\n=== Indexed Chunks ===")
    for index, chunk in enumerate(result["chunks"], start=1):
        print(f"[{index}] {chunk}")

    print("\n=== Retrieved Chunks ===")
    for index, chunk in enumerate(result["retrieved_chunks"], start=1):
        print(f"[{index}] {chunk}")

    print("\n=== Extracted Spot Names (Model Output) ===")
    print(result["model_output"] or "(empty)")


if __name__ == "__main__":
    main()
