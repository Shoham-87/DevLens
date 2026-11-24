import re

SCHEMA_STATEMENTS = [
    "CREATE EXTENSION IF NOT EXISTS vector",
    """
    CREATE TABLE IF NOT EXISTS code_chunks (
        id BIGSERIAL PRIMARY KEY,
        connected_repo_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_start INT,
        line_end INT,
        language TEXT,
        chunk_type TEXT,
        content TEXT NOT NULL,
        embedding vector(768)
    )
    """,
    """
    ALTER TABLE code_chunks ADD COLUMN IF NOT EXISTS tsv tsvector
        GENERATED ALWAYS AS (to_tsvector('simple', coalesce(file_path, '') || ' ' || coalesce(content, ''))) STORED
    """,
    "CREATE INDEX IF NOT EXISTS code_chunks_tsv_idx ON code_chunks USING gin (tsv)",
    "CREATE INDEX IF NOT EXISTS code_chunks_embedding_idx ON code_chunks USING hnsw (embedding vector_cosine_ops)",
    "CREATE INDEX IF NOT EXISTS code_chunks_repo_type_idx ON code_chunks (connected_repo_id, chunk_type)",
    """
    CREATE TABLE IF NOT EXISTS repo_overview (
        connected_repo_id TEXT PRIMARY KEY,
        overview TEXT NOT NULL,
        file_tree TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
]

SELECT_COLUMNS = "content, file_path, line_start, line_end, language, chunk_type"

STOPWORDS = {
    "the", "and", "for", "are", "how", "what", "where", "when", "why", "which", "does", "this",
    "that", "with", "from", "into", "can", "you", "use", "used", "using", "code", "file", "files",
    "function", "method", "class", "project", "repo", "codebase", "show", "explain", "work", "works",
    "need", "make", "there", "about", "have", "has", "its", "any", "all", "get", "set",
}


async def ensure_schema(pg_pool):
    async with pg_pool.connection() as conn:
        for statement in SCHEMA_STATEMENTS:
            try:
                await conn.execute(statement)
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                print(f"Schema statement skipped ({e.__class__.__name__}: {e})")


async def delete_repo_chunks(pg_pool, repo_id: str):
    async with pg_pool.connection() as conn:
        await conn.execute("DELETE FROM code_chunks WHERE connected_repo_id = %s", (repo_id,))
        await conn.execute("DELETE FROM repo_overview WHERE connected_repo_id = %s", (repo_id,))
        await conn.commit()


async def save_chunks(pg_pool, chunks: list[dict]):
    if not chunks:
        return

    insert_query = """
        INSERT INTO code_chunks (
            connected_repo_id, file_path, line_start, line_end,
            language, chunk_type, content, embedding
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    data_to_insert = [
        (c["repo_id"], c["file_path"], c["line_start"], c["line_end"],
         c["language"], c["chunk_type"], c["content"], c["embedding"])
        for c in chunks
    ]
    async with pg_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.executemany(insert_query, data_to_insert)
        await conn.commit()


def build_type_filter(include: list[str] | None, exclude: list[str] | None) -> tuple[str, list]:
    if include:
        return " AND chunk_type = ANY(%s)", [include]
    if exclude:
        return " AND NOT (chunk_type = ANY(%s))", [exclude]
    return "", []


async def similarity_search(pg_pool, query_embedding: list[float], repo_id: str, limit: int = 8,
                            include_types: list[str] | None = None,
                            exclude_types: list[str] | None = None):
    type_sql, type_params = build_type_filter(include_types, exclude_types)
    query = f"""
        SELECT {SELECT_COLUMNS}, 1 - (embedding <=> %s::vector) AS similarity
        FROM code_chunks
        WHERE connected_repo_id = %s{type_sql}
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """
    params = [query_embedding, repo_id, *type_params, query_embedding, limit]
    async with pg_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            return await cur.fetchall()


def build_tsquery(text: str) -> str | None:
    words = re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", text)
    terms = []
    for w in words:
        for part in w.lower().split("_"):
            if len(part) >= 3 and part not in STOPWORDS and part not in terms:
                terms.append(part)
    return " | ".join(terms) if terms else None


async def keyword_search(pg_pool, text: str, repo_id: str, limit: int = 30,
                         include_types: list[str] | None = None,
                         exclude_types: list[str] | None = None):
    tsquery = build_tsquery(text)
    if not tsquery:
        return []
    type_sql, type_params = build_type_filter(include_types, exclude_types)
    query = f"""
        SELECT {SELECT_COLUMNS}, ts_rank(tsv, to_tsquery('simple', %s)) AS similarity
        FROM code_chunks
        WHERE connected_repo_id = %s AND tsv @@ to_tsquery('simple', %s){type_sql}
        ORDER BY similarity DESC
        LIMIT %s
    """
    params = [tsquery, repo_id, tsquery, *type_params, limit]
    async with pg_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            return await cur.fetchall()


async def save_repo_overview(pg_pool, repo_id: str, overview: str, file_tree: str):
    async with pg_pool.connection() as conn:
        await conn.execute(
            """
            INSERT INTO repo_overview (connected_repo_id, overview, file_tree, updated_at)
            VALUES (%s, %s, %s, now())
            ON CONFLICT (connected_repo_id)
            DO UPDATE SET overview = EXCLUDED.overview, file_tree = EXCLUDED.file_tree, updated_at = now()
            """,
            (repo_id, overview, file_tree),
        )
        await conn.commit()


async def get_repo_overview(pg_pool, repo_id: str) -> dict | None:
    async with pg_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT overview, file_tree FROM repo_overview WHERE connected_repo_id = %s",
                (repo_id,),
            )
            return await cur.fetchone()
