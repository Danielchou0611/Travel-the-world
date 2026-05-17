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


# Ollama 服務與預設模型設定：可透過環境變數覆寫，方便在不同機器切換模型。
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
DEFAULT_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
DEFAULT_GEN_MODEL = os.getenv("OLLAMA_GEN_MODEL", "qwen2.5:7b-instruct")

# Embedding 模型候選清單：前面的模型優先嘗試，失敗時依序 fallback。
EMBED_MODEL_CANDIDATES = [
    DEFAULT_EMBED_MODEL,
    "nomic-embed-text",
    "bge-m3",
]

# 生成模型候選清單：用於回答或抽取景點名稱時的容錯切換。
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
    """將長文本切成多個可檢索片段，保留段落語意並避免片段過短。"""
    if chunk_size <= 0:
        return []

    # 先依空行切段，並把多餘空白壓成單一空白，避免索引時出現雜訊。
    paragraph_candidates = [re.sub(r"\s+", " ", item).strip() for item in re.split(r"\n+", text)]
    paragraphs = [item for item in paragraph_candidates if item]

    # 若原文沒有明顯換行，改用整段正規化文字作為唯一段落。
    if not paragraphs:
        normalized_text = re.sub(r"\s+", " ", text).strip()
        paragraphs = [normalized_text] if normalized_text else []
    if not paragraphs:
        return []

    # overlap 不能大於 chunk_size，否則長段落切分時可能無法前進。
    max_overlap = max(0, chunk_size - 1)
    overlap = max(0, min(overlap, max_overlap))

    # 偵測標題或日期行，讓它們獨立成 chunk，避免被併入前一段而降低檢索準確度。
    heading_pattern = re.compile(
        r"^(DAY\s*\d+|第[一二三四五六七八九十0-9]+\s*天|行程重點|【[^】]{1,28}(一日遊|半日遊|二日遊|三日遊|四日遊|行程|自由行)[^】]{0,18}】)",
        flags=re.IGNORECASE,
    )

    merged_paragraphs: list[str] = []
    current_parts: list[str] = []
    current_length = 0

    def flush_current() -> None:
        """把目前累積的段落寫入 merged_paragraphs，並重置暫存狀態。"""
        nonlocal current_parts, current_length
        if current_parts:
            merged_paragraphs.append(" ".join(current_parts))
        current_parts = []
        current_length = 0

    for paragraph in paragraphs:
        line = paragraph.strip()
        # 標題行直接獨立保存，讓後續 prompt 能保留行程結構。
        if line and heading_pattern.search(line):
            flush_current()
            merged_paragraphs.append(line)
            continue

        paragraph_length = len(paragraph)
        # 第一段直接作為目前累積內容的起點。
        if not current_parts:
            current_parts = [paragraph]
            current_length = paragraph_length
            continue

        # 若加入下一段仍在 chunk_size 內，就繼續合併成同一個片段。
        projected_length = current_length + 1 + paragraph_length
        if projected_length <= chunk_size:
            current_parts.append(paragraph)
            current_length = projected_length
            continue

        # 若目前片段過短，允許稍微超過 chunk_size，以減少資訊被切得太碎。
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
        # 已符合長度限制的段落可直接作為 chunk。
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
    """移除重複值，同時保留原本出現順序。"""
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def _compact_error_text(error: object, limit: int = 320) -> str:
    """將錯誤訊息壓縮成單行，避免回傳內容過長。"""
    message = re.sub(r"\s+", " ", str(error)).strip()
    if len(message) <= limit:
        return message
    return f"{message[: limit - 3]}..."


def _is_dimension_mismatch_error(error: object) -> bool:
    """判斷 Chroma collection 是否因 embedding 維度不一致而寫入失敗。"""
    message = str(error).lower()
    return "expecting embedding with dimension" in message and "got" in message


def _read_json_response(request: Request, timeout_sec: int = 90) -> dict:
    """送出 HTTP request 並解析 JSON 回應，統一包裝 Ollama 連線錯誤。"""
    try:
        with urlopen(request, timeout=timeout_sec) as response:
            body = response.read().decode("utf-8", errors="ignore")
            return json.loads(body) if body else {}
    except HTTPError as error:
        # HTTPError 可能包含 Ollama 回傳的詳細訊息，優先讀取 body 方便除錯。
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Ollama HTTP {error.code}: {detail or error.reason}") from error
    except URLError as error:
        raise RuntimeError(f"Ollama request failed: {error.reason}") from error
    except Exception as error:
        raise RuntimeError(f"Ollama request failed: {error}") from error


def _ollama_post(path: str, payload: dict, timeout_sec: int = 90) -> dict:
    """呼叫 Ollama POST API，並回傳已解析的 JSON dict。"""
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
    """讀取本機 Ollama 已安裝模型清單；失敗時回傳空清單供錯誤提示使用。"""
    try:
        request = Request(f"{OLLAMA_BASE_URL}/api/tags", method="GET")
        payload = _read_json_response(request, timeout_sec=10)
        models = payload.get("models", [])
        names = [model.get("name", "") for model in models if isinstance(model, dict)]
        return _dedupe_keep_order(names)
    except Exception:
        return []


def _parse_embed_vector(response_payload: dict) -> list[float]:
    """相容 Ollama 新舊 embedding API 格式，取出第一組向量。"""
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
    """將文字轉成 embedding，若預設模型或 API 失敗則依序嘗試候選模型。"""
    # task_type kept for interface compatibility with previous version.
    _ = task_type
    errors: list[str] = []
    candidates = _dedupe_keep_order(EMBED_MODEL_CANDIDATES)

    for model in candidates:
        try:
            # 優先使用新版 /api/embed；它支援一次傳入多筆 input。
            response_payload = _ollama_post("/api/embed", {"model": model, "input": [text]})
            return _parse_embed_vector(response_payload), model
        except Exception as error_embed_api:
            try:
                # 若新版 API 不可用，改試舊版 /api/embeddings。
                response_payload = _ollama_post("/api/embeddings", {"model": model, "prompt": text})
                return _parse_embed_vector(response_payload), model
            except Exception as error_embeddings_api:
                errors.append(
                    f"{model}: embed API error={_compact_error_text(error_embed_api)} | "
                    f"embeddings API error={_compact_error_text(error_embeddings_api)}"
                )

    available_models = list_ollama_models()
    available_hint = ", ".join(available_models) if available_models else "(unable to list)"
    # 所有候選模型都失敗時，列出嘗試過的模型與本機模型清單，方便使用者安裝或改環境變數。
    raise RuntimeError(
        "Failed to embed content with all Ollama candidate models.\n"
        f"Tried: {', '.join(candidates)}\n"
        f"Available Ollama models: {available_hint}\n"
        f"Last errors:\n- " + "\n- ".join(errors)
    )


def generate_with_fallback(prompt: str) -> tuple[str, str]:
    """使用 Ollama 生成文字，並在不同生成模型之間做 fallback。"""
    errors: list[str] = []
    candidates = _dedupe_keep_order(GEN_MODEL_CANDIDATES)

    for model_name in candidates:
        try:
            # 關閉 stream 以取得單次完整 JSON 回應；低 temperature 讓抽取結果較穩定。
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
    # 若所有生成模型都無法產生內容，回報完整 fallback 訊息給上層。
    raise RuntimeError(
        "Failed to generate content with all Ollama candidate models.\n"
        f"Tried: {', '.join(candidates)}\n"
        f"Available Ollama models: {available_hint}\n"
        f"Last errors:\n- " + "\n- ".join(errors)
    )


def extract_names_with_fallback(text: str) -> list[str]:
    """不用 LLM 時的備援名稱抽取，透過正則表達式從文字中找可能的景點名。"""
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
        # 取出正則捕捉到的名稱，並清掉可能被一起抓進來的前綴詞。
        full_name = match.group(1).strip()
        full_name = prefix_pattern.sub("", full_name).strip()
        if full_name not in names:
            names.append(full_name)
    return names


def extract_names_from_model_output(model_output: str) -> list[str]:
    """清理 LLM 輸出，把條列、標點與提示文字移除後轉成景點名稱清單。"""
    if not model_output:
        return []

    # 明確排除常見但不是景點名稱的字串，避免污染最終 spot_names。
    ignore_exact = {
        "景點名稱",
        "景點名稱清單",
        "旅遊景點名稱",
        "無",
        "沒有",
    }

    def clean_candidate(value: str) -> str:
        """清除單一候選名稱前後的編號、標點與說明文字。"""
        cleaned = value.strip()
        cleaned = re.sub(r"^[\s\-\*\d\.\)\(、:：]+", "", cleaned)
        cleaned = re.sub(r"^(景點名稱清單|景點名稱|旅遊景點名稱|推薦景點)\s*[:：]?", "", cleaned)
        cleaned = re.sub(r"[（(][^)）]{0,24}[)）]\s*$", "", cleaned)
        cleaned = re.sub(r"\s+", "", cleaned)
        return cleaned

    def is_valid_name(value: str) -> bool:
        """判斷清理後的候選字串是否像有效中文景點名稱。"""
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
        # 逐行處理模型輸出，支援條列、逗號分隔與冒號後內容。
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
    # 若模型輸出清理後沒有有效名稱，退回 regex fallback 再試一次。
    return extract_names_with_fallback(model_output)


def format_chunks_for_prompt(chunks: Iterable[str]) -> str:
    """把 chunks 格式化成帶編號的 prompt 內容，方便模型引用上下文。"""
    lines = []
    for index, chunk in enumerate(chunks, start=1):
        lines.append(f"[段落 {index}] {chunk}")
    return "\n".join(lines)


def _build_extraction_prompt(user_query: str, chunks: list[str], chunk_indices: list[int]) -> str:
    """根據使用者問題與檢索片段建立景點名稱抽取 prompt。"""
    lines = []
    for local_index, chunk in enumerate(chunks, start=1):
        # 維持原始 chunk 編號，讓模型輸出與檢索結果可以追溯來源。
        actual_index = chunk_indices[local_index - 1] if local_index - 1 < len(chunk_indices) else local_index
        lines.append(f"[段落 {actual_index}] {chunk}")
    context_text = "\n".join(lines)

    # Prompt 內容要求模型只輸出景點名稱，降低後續解析成本。
    return f"""
你是日本旅遊景點名稱抽取器。請根據使用者問題，從文章段落中抽取「正式景點/設施名稱」。

輸出規則：
- 只輸出景點名稱，每行一個。
- 不要輸出編號、解釋、分類、JSON、Markdown。
- 不要輸出交通方式、票券、Pass、車站轉乘、住宿名稱、餐廳名稱、地區泛稱、形容詞片語。
- 如果文字同時有地區和景點，例如「京都清水寺」，優先輸出「清水寺」；如果地區是正式名稱的一部分才保留。
- 使用原文中最接近正式名稱的寫法，不要自行翻譯或補描述。
- 沒有明確景點時輸出空白。

使用者問題：
{user_query}

文章段落：
{context_text}
""".strip()

def _extract_names_from_chunks_with_model(
    *,
    chunks: list[str],
    chunk_indices: list[int],
    user_query: str,
) -> tuple[str, list[str], str, str]:
    """分批把 chunks 交給生成模型抽取名稱，失敗時退回 regex 抽取。"""
    if not chunks:
        return "", [], "fallback-regex", "No chunks provided."

    # 每次 prompt 的 chunks 數量可用環境變數調整，避免上下文過長。
    max_chunks_per_prompt = max(1, int(os.getenv("RAG_MAX_CHUNKS_PER_PROMPT", "10")))
    warnings: list[str] = []
    used_gen_model = ""
    outputs: list[str] = []
    all_names: list[str] = []

    for start in range(0, len(chunks), max_chunks_per_prompt):
        # 將大量 chunks 切成 batch，逐批抽取後再合併去重。
        chunk_batch = chunks[start : start + max_chunks_per_prompt]
        index_batch = chunk_indices[start : start + max_chunks_per_prompt]
        prompt = _build_extraction_prompt(user_query, chunk_batch, index_batch)

        try:
            # 先用 LLM 抽取；若有輸出，再做清理與名稱驗證。
            model_output, model_name = generate_with_fallback(prompt)
            if not used_gen_model:
                used_gen_model = model_name
            if model_output:
                outputs.append(model_output)
                all_names.extend(extract_names_from_model_output(model_output))
            else:
                all_names.extend(extract_names_with_fallback(" ".join(chunk_batch)))
        except Exception as error:
            # 任一批生成失敗時，不中斷整體流程，改用 regex 從該批內容抽取。
            warnings.append(_compact_error_text(error))
            all_names.extend(extract_names_with_fallback(" ".join(chunk_batch)))

    deduped_names = _dedupe_keep_order(all_names)
    if not deduped_names:
        # 若所有批次都沒有結果，再用完整文本做最後一次備援抽取。
        deduped_names = extract_names_with_fallback(" ".join(chunks))

    # model_output 優先回傳清理後名稱清單，若沒有名稱才保留原始模型輸出供除錯。
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
    """Embedding 或向量檢索不可用時的非向量備援流程。"""
    if read_full_document:
        # read_full_document=True 時直接使用全部 chunks，避免檢索失敗造成資訊遺漏。
        retrieved_chunks = chunks
        retrieved_chunk_indices = list(range(1, len(chunks) + 1))
    else:
        # 否則取前 top_k 個 chunks 作為簡化 fallback。
        retrieved_chunks = chunks[: min(top_k, len(chunks))]
        retrieved_chunk_indices = list(range(1, len(retrieved_chunks) + 1))

    warning_lines = [f"Embedding unavailable, switched to non-vector fallback: {_compact_error_text(embed_error)}"]
    # 即使沒有 embedding，仍嘗試用生成模型或 regex 抽取景點名稱。
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
    """執行完整 RAG 流程：切塊、建立向量索引、檢索、抽取景點名稱。"""
    # ChromaDB 儲存路徑與 collection 名稱可用環境變數調整。
    chroma_dir = Path(os.getenv("RAG_CHROMA_DIR", "./chroma_store")).resolve()
    collection_name = os.getenv("RAG_COLLECTION_NAME", "japan_guides_week2")

    # 使用 PersistentClient 讓向量資料可保存在本機資料夾中。
    client = chromadb.PersistentClient(
        path=str(chroma_dir),
        settings=Settings(anonymized_telemetry=False),
    )

    if reset_db:
        # 使用者要求重建時，先刪除既有 collection；不存在則忽略錯誤。
        try:
            client.delete_collection(name=collection_name)
        except Exception:
            pass

    collection = client.get_or_create_collection(name=collection_name)
    existing_ids: list[str] = []
    try:
        # 清空目前 collection 的既有文件，避免舊資料干擾本次查詢。
        existing = collection.get(include=[])
        existing_ids = [item for item in (existing.get("ids") or []) if isinstance(item, str) and item]
    except Exception:
        existing_ids = []

    if existing_ids:
        collection.delete(ids=existing_ids)

    # 將輸入文章切成 chunks，作為 embedding 與檢索的基本單位。
    chunks = split_text(input_text)
    if not chunks:
        raise ValueError("Input text is empty, cannot run RAG prototype.")

    ids = [f"chunk-{index + 1}" for index in range(len(chunks))]
    embeddings: list[list[float]] = []
    used_embed_model = ""
    query_embed_model = ""

    try:
        # 對每個 chunk 建立 embedding，後續寫入 ChromaDB。
        for chunk in chunks:
            chunk_embedding, embed_model = embed_text_with_fallback(chunk, "retrieval_document")
            embeddings.append(chunk_embedding)
            used_embed_model = embed_model

        try:
            # 寫入文件、向量與 chunk 編號 metadata，讓查詢結果能回推來源。
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
            # 若 collection 既有向量維度不同，重建 collection 後再寫入。
            client.delete_collection(name=collection_name)
            collection = client.get_or_create_collection(name=collection_name)
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=[{"chunk_index": index + 1} for index in range(len(chunks))],
            )

        # 將使用者問題也轉成 embedding，再用 ChromaDB 找最相近的 chunks。
        query_embedding, query_embed_model = embed_text_with_fallback(user_query, "retrieval_query")
        query_result = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, len(chunks)),
            include=["documents", "distances", "metadatas"],
        )

        retrieved_chunks = query_result.get("documents", [[]])[0]
        retrieved_metadatas = query_result.get("metadatas", [[]])[0]
        # 從 metadata 取回原始 chunk 編號，供 prompt 與輸出追蹤使用。
        retrieved_chunk_indices = [
            int(metadata.get("chunk_index", 0)) if isinstance(metadata, dict) else 0 for metadata in retrieved_metadatas
        ]
    except Exception as embed_error:
        # embedding、寫入或查詢任一環節失敗時，改走非向量 fallback。
        return _fallback_without_embedding(
            chunks=chunks,
            user_query=user_query,
            top_k=top_k,
            embed_error=embed_error,
            read_full_document=read_full_document,
        )

    if read_full_document:
        # API 可選擇讀完整文件，不只使用向量檢索回來的 top_k chunks。
        retrieved_chunks = chunks
        retrieved_chunk_indices = list(range(1, len(chunks) + 1))

    # 最後把檢索到的 chunks 交給模型抽取景點名稱。
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
    """命令列入口：讀取文字或檔案，執行 RAG prototype，並印出結果。"""
    # 定義 CLI 參數，支援直接傳文字、讀檔、指定問題與重建資料庫。
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

    # 載入 .env，讓本機 Ollama、模型名稱與 Chroma 設定可以外部化。
    load_dotenv()
    input_text = args.text.strip()
    if not input_text and args.file:
        # 若沒有直接輸入文字，改從指定檔案讀取文章內容。
        input_text = Path(args.file).read_text(encoding="utf-8")
    if not input_text:
        raise ValueError("Please provide --text or --file.")

    # 執行主流程，取得 chunks、檢索結果、模型輸出與抽取出的景點名稱。
    result = run_rag_prototype(
        input_text=input_text,
        user_query=args.query,
        top_k=args.top_k,
        reset_db=args.reset_db,
    )

    # 以下為命令列輸出區塊，方便快速檢查模型、警告、索引與檢索內容。
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
    # 只有直接執行此檔案時才啟動 CLI；被 import 時不會自動跑流程。
    main()
