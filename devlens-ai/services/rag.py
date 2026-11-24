import json
import re
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from typing import AsyncGenerator

from config import setting
from db.pgvector import similarity_search, keyword_search, get_repo_overview
from services.embedder import embed_query, rerank

GLOBAL_KEYWORDS = (
    "improve", "improvement", "refactor", "architecture", "overview", "structure", "design",
    "best practice", "what does this project", "what is this project", "explain the project",
    "tech stack", "weak", "issues", "problems", "changes", "review", "optimize", "scalab",
    "security", "summary", "summarize", "flow", "modules", "how does the project",
)

ROUTER_PROMPT = """You prepare search queries for a code-search assistant.
Given the chat history and the user's latest message:
1. Rewrite the latest message as a standalone question (resolve "it", "this", "that function", etc. from the history).
2. Classify its scope:
   - "specific": about a particular function, class, file, symbol, bug, error or line of code
   - "global": about the project as a whole: purpose, architecture, data flow, tech stack,
     improvements, refactoring, code quality, security review, best practices, what to change
3. List up to 5 code identifiers or keywords likely to appear in relevant code.
Respond with JSON only: {"query": "...", "scope": "specific" | "global", "keywords": ["..."]}"""

SYSTEM_PROMPT = """You are DevLens, an expert software engineer who knows this specific codebase.
You are given context retrieved from the repository: possibly a repository overview, a file tree,
file summaries and code chunks, each with its file path and line numbers.

Rules:
- Ground every factual statement about the code in the provided context.
- Cite code as `path/to/file.ext` (lines X-Y), using only paths and line numbers that appear in the context.
- Never invent code, files, functions or line numbers.
- For questions about improvements, refactoring, design, security, performance or best practices,
  give concrete, prioritized recommendations using your engineering knowledge, tie each one to
  specific files from the context, and show short code examples of the change where useful.
- For project-level questions, use the repository overview and file tree to explain the big picture.
- If a factual question cannot be answered from the context, say:
  "I couldn't find that in the indexed codebase." and mention what you did find that is closest."""


def create_llm(groq_key: str, model: str, streaming: bool = True) -> ChatGroq:
    return ChatGroq(
        model=model,
        api_key=groq_key,
        temperature=0,
        streaming=streaming
    )


def guess_scope(question: str) -> str:
    lowered = question.lower()
    return "global" if any(k in lowered for k in GLOBAL_KEYWORDS) else "specific"


async def route_question(question: str, history: list[dict], groq_key: str) -> dict:
    fallback = {"query": question, "scope": guess_scope(question), "keywords": []}
    history_text = "\n".join(f"{m.get('role')}: {str(m.get('content', ''))[:800]}" for m in history[-6:])
    try:
        llm = create_llm(groq_key, setting.router_model, streaming=False)
        response = await llm.ainvoke([
            SystemMessage(content=ROUTER_PROMPT),
            HumanMessage(content=f"Chat history:\n{history_text or '(none)'}\n\nLatest message: {question}")
        ])
        match = re.search(r"\{.*\}", response.content or "", re.S)
        if not match:
            return fallback
        routed = json.loads(match.group(0))
        query = str(routed.get("query") or question).strip()
        scope = routed.get("scope") if routed.get("scope") in ("specific", "global") else fallback["scope"]
        if guess_scope(question) == "global":
            scope = "global"
        keywords = [str(k) for k in routed.get("keywords", []) if isinstance(k, (str, int))][:5]
        return {"query": query, "scope": scope, "keywords": keywords}
    except Exception as e:
        print(f"Question routing failed, using fallback: {e}")
        return fallback


def chunk_key(chunk: dict) -> tuple:
    return (chunk["file_path"], chunk["line_start"], chunk["line_end"], chunk["chunk_type"])


def fuse_rankings(result_lists: list[list[dict]], k: int = 60) -> list[dict]:
    scores: dict[tuple, float] = {}
    best: dict[tuple, dict] = {}
    for results in result_lists:
        for rank, chunk in enumerate(results):
            key = chunk_key(chunk)
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank + 1)
            best.setdefault(key, chunk)
    ordered = sorted(scores, key=scores.get, reverse=True)
    return [best[key] for key in ordered]


async def hybrid_search(pg_pool, query_vector: list[float], search_text: str, repo_id: str,
                        jina_key: str, limit: int, include_types: list[str] | None = None,
                        exclude_types: list[str] | None = None) -> list[dict]:
    vector_hits = await similarity_search(pg_pool, query_vector, repo_id, 30, include_types, exclude_types)
    keyword_hits = await keyword_search(pg_pool, search_text, repo_id, 30, include_types, exclude_types)
    candidates = fuse_rankings([vector_hits, keyword_hits])[:30]
    if setting.rerank_enabled and len(candidates) > limit:
        documents = [f"{c['file_path']}\n{c['content']}" for c in candidates]
        order = await rerank(search_text, documents, jina_key, limit)
        if order:
            return [candidates[i] for i in order]
    return candidates[:limit]


def format_context(chunks: list[dict], title: str = "Code chunks") -> str:
    if not chunks:
        return ""
    formatted_blocks = []
    for index, chunk in enumerate(chunks, start=1):
        header = (
            f"[{index}] {chunk['file_path']} "
            f"(lines {chunk['line_start']}-{chunk['line_end']}) | "
            f"{chunk['language']} | {chunk['chunk_type']}"
        )
        formatted_blocks.append(f"{header}\n----\n{chunk['content']}")
    return f"### {title}\n\n" + "\n\n".join(formatted_blocks)


async def build_context(routed: dict, repo_id: str, pg_pool, jina_key: str) -> str:
    search_text = " ".join([routed["query"], *routed["keywords"]])
    query_vector = await embed_query(search_text, jina_key)
    sections = []

    if routed["scope"] == "global":
        overview = await get_repo_overview(pg_pool, repo_id)
        if overview:
            sections.append(f"### Repository overview\n\n{overview['overview']}")
            if overview.get("file_tree"):
                sections.append(f"### File tree\n\n{overview['file_tree'][:6000]}")
        summaries = await similarity_search(pg_pool, query_vector, repo_id, 12, include_types=["file_summary"])
        code = await hybrid_search(pg_pool, query_vector, search_text, repo_id, jina_key, 6,
                                   exclude_types=["file_summary"])
        sections.append(format_context(summaries, "File summaries"))
        sections.append(format_context(code, "Code chunks"))
    else:
        code = await hybrid_search(pg_pool, query_vector, search_text, repo_id, jina_key, 10,
                                   exclude_types=["file_summary"])
        summaries = await similarity_search(pg_pool, query_vector, repo_id, 3, include_types=["file_summary"])
        sections.append(format_context(code, "Code chunks"))
        sections.append(format_context(summaries, "Related file summaries"))

    context = "\n\n".join(s for s in sections if s)
    return context or "No relevant code found in the indexed codebase for this question."


async def stream_rag_response(question:str, repo_id:str, history:list[dict], pg_pool, jina_key:str, groq_key:str) -> AsyncGenerator[str, None]:
    if not question.strip():
        yield "No question provided."
        return

    history = history[-setting.max_history_messages:] if setting.max_history_messages > 0 else []

    try:
        routed = await route_question(question, history, groq_key)
        print(f"Routed question: {routed}")
        context = await build_context(routed, repo_id, pg_pool, jina_key)
    except Exception as e:
        print(f"Retrieval failed: {e}")
        yield "Sorry, I couldn't search the indexed codebase right now. Please try again."
        return

    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    for msg in history:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg.get("content", "")))
        elif msg.get("role") == "assistant":
            messages.append(AIMessage(content=msg.get("content", "")))
    messages.append(HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}"))

    llm = create_llm(groq_key, setting.chat_model)
    try:
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content
    except Exception as e:
        print(f"LLM streaming failed: {e}")
        yield "\n\nSorry, the answer was interrupted. Please try again."
