import httpx

JINA_EMBED_URL = "https://api.jina.ai/v1/embeddings"
JINA_RERANK_URL = "https://api.jina.ai/v1/rerank"
EMBED_MODEL = "jina-embeddings-v2-base-code"
RERANK_MODEL = "jina-reranker-v2-base-multilingual"

MAX_EMBED_CHARS = 16000


def embedding_text(chunk: dict) -> str:
    header = f"File: {chunk['file_path']}\nType: {chunk['chunk_type']}\n\n"
    return (header + chunk["content"])[:MAX_EMBED_CHARS]


async def embed_texts(client: httpx.AsyncClient, texts: list[str], api_key: str) -> list[list[float]]:
    response = await client.post(
        JINA_EMBED_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": EMBED_MODEL, "input": texts},
        timeout=60.0,
    )
    response.raise_for_status()
    return [item["embedding"] for item in response.json()["data"]]


async def embed(chunks: list[dict], api_key: str, batch_size: int = 100) -> list[dict]:
    total_batches = (len(chunks) + batch_size - 1) // batch_size
    async with httpx.AsyncClient() as client:
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            vectors = await embed_texts(client, [embedding_text(c) for c in batch], api_key)
            for c, vector in zip(batch, vectors):
                c["embedding"] = vector
            print(f"Embedded batch {i // batch_size + 1} / {total_batches}")
    return chunks


async def embed_query(question: str, api_key: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        return (await embed_texts(client, [question], api_key))[0]


async def rerank(query: str, documents: list[str], api_key: str, top_n: int) -> list[int] | None:
    if not documents:
        return []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                JINA_RERANK_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": RERANK_MODEL,
                    "query": query,
                    "documents": [d[:4000] for d in documents],
                    "top_n": min(top_n, len(documents)),
                },
                timeout=30.0,
            )
            response.raise_for_status()
            return [r["index"] for r in response.json()["results"]]
    except Exception as e:
        print(f"Rerank failed, falling back to fused ranking: {e}")
        return None
