import httpx
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from typing import AsyncGenerator

from db.pgvector import similarity_search


def create_llm(groq_key: str) -> ChatGroq:
    return ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=groq_key,
        temperature=0,
        streaming=True
    )

async def embed_question(question: str, api_key: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.jina.ai/v1/embeddings",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "jina-embeddings-v2-base-code",
                "input": [question]
            },
            timeout=60.0
        )
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]

def format_context(chunks: list[dict]) -> str:
    if not chunks:
        return "No relevant code found in the indexed codebase for this question."
    
    formatted_blocks = []
    for index, chunk in enumerate(chunks, start=1):
        header = (
            f"[{index}] {chunk['file_path']} "
            f"(lines {chunk['line_start']}-{chunk['line_end']}) | "
            f"{chunk['language']} | {chunk['chunk_type']} | "
            f"similarity: {chunk['similarity']:.2f}"
        )
        block = f"{header}\n----\n{chunk['content']}"
        formatted_blocks.append(block)
    
    return "\n\n".join(formatted_blocks)

async def stream_rag_response(question:str, repo_id:str, history:list[dict], pg_pool, jina_key:str, groq_key:str) -> AsyncGenerator[str, None]:
    if not question.strip():
        yield "No question provided."
        return
    query_vector = await embed_question(question, jina_key)
    chunks = await similarity_search(pg_pool, query_vector, repo_id)
    context = format_context(chunks)
    system_prompt = """You are an expert code assistant for a specific codebase.
                        Answer questions using ONLY the code context provided below.
                        Always cite the exact file path and line numbers when referencing code.
                        Format citations as: `filename.java` (lines X-Y)
                        If the answer is not found in the provided context, say exactly:
                        "I couldn't find that in the indexed codebase."
                        Never make up code, file names, or line numbers that aren't in the context."""
    messages = [SystemMessage(content=system_prompt)]
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
    messages.append(HumanMessage(content=f"Code Context:\n{context}\n\nQuestion: {question}"))
    llm = create_llm(groq_key)
    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content


