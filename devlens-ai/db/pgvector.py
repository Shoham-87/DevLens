
async def save_chunks(pg_pool, chunks: list[dict]):
    if not chunks:
        return

    insert_query = """
        INSERT INTO code_chunks (
            connected_repo_id,
            file_path,
            line_start,
            line_end,
            language,
            chunk_type,
            content,
            embedding
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s
        )
    """

    data_to_insert = []
    for chunk in chunks:
        data_to_insert.append((
            chunk["repo_id"],
            chunk["file_path"],
            chunk["line_start"],
            chunk["line_end"],
            chunk["language"],
            chunk["chunk_type"],
            chunk["content"],
            chunk["embedding"]
        ))
    async with pg_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.executemany(insert_query, data_to_insert)
        await conn.commit()


async def similarity_search(pg_pool, query_embedding: list[float], repo_id: str, limit: int = 8):

    select_query ="""
        SELECT content, file_path, line_start, line_end, language, chunk_type,
               1 - (embedding <=> %s::vector) AS similarity
        FROM code_chunks
        WHERE connected_repo_id = %s
        ORDER BY embedding <=> %s::vector
        LIMIT %s

    """
     
    async with pg_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(select_query,(query_embedding, repo_id, query_embedding, limit))
            return await cur.fetchall()