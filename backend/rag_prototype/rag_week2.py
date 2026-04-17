from __future__ import annotations

import argparse
import os
import re
from pathlib import Path
from typing import Iterable

import chromadb
import google.generativeai as genai
from chromadb.config import Settings
from dotenv import load_dotenv


DEFAULT_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "models/gemini-embedding-001")
DEFAULT_GEN_MODEL = os.getenv("GEMINI_GEN_MODEL", "models/gemini-2.5-flash")
EMBED_MODEL_CANDIDATES = [
    DEFAULT_EMBED_MODEL,
    "models/gemini-embedding-001",
    "gemini-embedding-001",
    "models/gemini-embedding-2-preview",
    "gemini-embedding-2-preview",
    "models/embedding-001",
    "embedding-001",
    "models/text-embedding-004",
    "text-embedding-004",
]
GEN_MODEL_CANDIDATES = [
    DEFAULT_GEN_MODEL,
    "models/gemini-2.5-flash",
    "gemini-2.5-flash",
    "models/gemini-flash-latest",
    "gemini-flash-latest",
    "models/gemini-2.0-flash",
    "gemini-2.0-flash",
    "models/gemini-1.5-flash",
    "gemini-1.5-flash",
]


def split_text(text: str, chunk_size: int = 280, overlap: int = 60) -> list[str]:
    normalized_text = re.sub(r"\s+", " ", text).strip()
    if not normalized_text:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(normalized_text):
        end = min(start + chunk_size, len(normalized_text))
        chunk = normalized_text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(normalized_text):
            break
        start = max(0, end - overlap)
    return chunks


def _parse_embedding_result(result: object) -> list[float]:
    if isinstance(result, dict) and isinstance(result.get("embedding"), list):
        return result["embedding"]

    embedding = getattr(result, "embedding", None)
    if isinstance(embedding, list):
        return embedding

    raise RuntimeError("Gemini embedding response format is unexpected.")


def _dedupe_keep_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def list_embed_capable_models() -> list[str]:
    model_names: list[str] = []
    try:
        for model in genai.list_models():
            methods = set(getattr(model, "supported_generation_methods", []) or [])
            if "embedContent" in methods:
                model_names.append(getattr(model, "name", ""))
    except Exception:
        return []
    return _dedupe_keep_order(model_names)


def list_generate_capable_models() -> list[str]:
    model_names: list[str] = []
    try:
        for model in genai.list_models():
            methods = set(getattr(model, "supported_generation_methods", []) or [])
            if "generateContent" in methods:
                model_names.append(getattr(model, "name", ""))
    except Exception:
        return []
    return _dedupe_keep_order(model_names)


def embed_text_with_fallback(text: str, task_type: str) -> tuple[list[float], str]:
    errors: list[str] = []
    candidates = _dedupe_keep_order(EMBED_MODEL_CANDIDATES)

    for model in candidates:
        try:
            result = genai.embed_content(
                model=model,
                content=text,
                task_type=task_type,
            )
            return _parse_embedding_result(result), model
        except Exception as error:  # pragma: no cover
            errors.append(f"{model}: {error}")

    available_embed_models = list_embed_capable_models()
    available_hint = ", ".join(available_embed_models) if available_embed_models else "(unable to list)"

    raise RuntimeError(
        "Failed to embed content with all candidate models.\n"
        f"Tried: {', '.join(candidates)}\n"
        f"Available embed-capable models: {available_hint}\n"
        f"Last errors:\n- " + "\n- ".join(errors)
    )


def generate_with_fallback(prompt: str) -> tuple[str, str]:
    errors: list[str] = []
    candidates = _dedupe_keep_order(GEN_MODEL_CANDIDATES)

    for model_name in candidates:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            output = (getattr(response, "text", "") or "").strip()
            return output, model_name
        except Exception as error:  # pragma: no cover
            errors.append(f"{model_name}: {error}")

    available_gen_models = list_generate_capable_models()
    available_hint = ", ".join(available_gen_models) if available_gen_models else "(unable to list)"
    raise RuntimeError(
        "Failed to generate content with all candidate models.\n"
        f"Tried: {', '.join(candidates)}\n"
        f"Available generate-capable models: {available_hint}\n"
        f"Last errors:\n- " + "\n- ".join(errors)
    )


def extract_names_with_fallback(text: str) -> list[str]:
    pattern = (
        r"(?:^|[，。、\s])"
        r"(?:第[一二三四五六七八九十0-9]+天(?:早上|下午|晚上)?(?:先到|到|去)?|最後一天到|先到|到|去|在|參觀|逛|和)?\s*"
        r"([\u4e00-\u9fff]{2,12}(寺|神宮|神社|公園|市場|塔|城|宮|町|車站|八幡宮))"
    )
    matches = re.finditer(pattern, text)
    names = []
    prefix_pattern = re.compile(
        r"^(第一天先到|第一天到|第一天|第二天早上到|第二天到|第二天|第三天搭車去|第三天|最後一天到|最後一天|晚上去|早上到|下午在|傍晚到|參觀|到|去|在|和)"
    )

    for match in matches:
        full_name = match.group(1).strip()
        full_name = prefix_pattern.sub("", full_name).strip()
        if full_name not in names:
            names.append(full_name)
    return names


def format_chunks_for_prompt(chunks: Iterable[str]) -> str:
    lines = []
    for index, chunk in enumerate(chunks, start=1):
        lines.append(f"[段落 {index}] {chunk}")
    return "\n".join(lines)


def run_rag_prototype(input_text: str, user_query: str, top_k: int, reset_db: bool) -> dict:
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

    chunks = split_text(input_text)
    if not chunks:
        raise ValueError("Input text is empty, cannot run RAG prototype.")

    ids = [f"chunk-{index + 1}" for index in range(len(chunks))]
    embeddings: list[list[float]] = []
    used_embed_model = ""
    for chunk in chunks:
        chunk_embedding, embed_model = embed_text_with_fallback(chunk, "retrieval_document")
        embeddings.append(chunk_embedding)
        used_embed_model = embed_model

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
        include=["documents", "distances"],
    )

    retrieved_chunks = query_result.get("documents", [[]])[0]
    context_text = format_chunks_for_prompt(retrieved_chunks)

    prompt = f"""
你是旅遊資料整理助手。請根據以下內容抽取景點名稱：
- 只回傳景點名稱清單
- 不要加入未出現在內容中的地點
- 每行一個

使用者問題：{user_query}

檢索內容：
{context_text}
""".strip()

    generation_warning = ""
    try:
        model_output, used_gen_model = generate_with_fallback(prompt)
    except Exception as error:
        used_gen_model = "fallback-regex"
        generation_warning = str(error)
        model_output = ""

    if not model_output:
        fallback_names = extract_names_with_fallback(" ".join(retrieved_chunks))
        model_output = "\n".join(fallback_names)
        if not generation_warning and not fallback_names:
            generation_warning = "No names found by regex fallback."

    return {
        "chunks": chunks,
        "retrieved_chunks": retrieved_chunks,
        "model_output": model_output,
        "embed_model": used_embed_model or query_embed_model,
        "gen_model": used_gen_model,
        "generation_warning": generation_warning,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Week 2 RAG prototype: Gemini embedding + ChromaDB")
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

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is missing. Please set it in backend/rag_prototype/.env")
    genai.configure(api_key=api_key)

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

    print("=== Embed Model Used ===")
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
