
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