import httpx

async def embed(chunks: list[dict],api_key:str, batch_size: int = 100) -> list[dict]:
    async def embed_batch(client: httpx.AsyncClient, texts: list[str]) -> list[list]:
        response = await client.post(
           "https://api.jina.ai/v1/embeddings",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "jina-embeddings-v2-base-code",
                "input": texts
            },
            timeout=60.0
        )
        response.raise_for_status()
        return [item["embedding"] for item in response.json()["data"]]
    total_batches = (len(chunks) + batch_size - 1) // batch_size
    async with httpx.AsyncClient() as client:
        for i in range(0,len(chunks),batch_size):
            batch = chunks[i:i+batch_size]
            vectors = await embed_batch(client,[chunk["content"] for chunk in batch])
            for chunk, vector in zip(batch, vectors):
                chunk["embedding"] = vector
            print(f"Embedded batch {i // batch_size + 1} / {total_batches}")
    return chunks
