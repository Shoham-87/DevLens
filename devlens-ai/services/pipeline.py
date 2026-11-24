from models.requests import IngestRequest
from psycopg_pool import AsyncConnectionPool
import traceback

from enums.Status import Status
from services.cloner import clone, cleanUp
from db.mongo import updateConnectedRepoStatus, updateConnectedRepoTotalFiles, updateFilesProcessed
from services.walker import walk
from config import setting
from services.chunker import chunk, summarize_file
from services.embedder import embed
from services.overview import generate_overview
from db.pgvector import save_chunks, delete_repo_chunks, save_repo_overview

FLUSH_SIZE = 200


async def run(payload: IngestRequest, pg_pool: AsyncConnectionPool, mongo_db):
    temp_dir = None
    repo_id = payload.connectedRepoId
    try:
        await updateConnectedRepoStatus(mongo_db, repo_id, Status.INDEXING.value)

        temp_dir = clone(payload.repoUrl, payload.githubAccessToken, repo_id)

        files = walk(temp_dir, setting.excluded_dirs, setting.allowed_extensions, setting.max_file_size)
        print(f"Walker found {len(files)} eligible files")
        await updateConnectedRepoTotalFiles(mongo_db, repo_id, len(files))

        await delete_repo_chunks(pg_pool, repo_id)

        buffer: list[dict] = []
        file_summaries: list[dict] = []
        total_chunks = 0

        async def flush():
            nonlocal buffer
            if buffer:
                await save_chunks(pg_pool, await embed(buffer, setting.jina_api_key))
                buffer = []

        for i, file_path in enumerate(files):
            file_chunks = chunk(file_path, temp_dir, repo_id)
            summary = summarize_file(file_path, temp_dir, repo_id, file_chunks)
            if summary:
                file_summaries.append(summary)
                file_chunks.append(summary)

            buffer.extend(file_chunks)
            total_chunks += len(file_chunks)
            if len(buffer) >= FLUSH_SIZE:
                await flush()
            await updateFilesProcessed(mongo_db, repo_id, i + 1, len(files), total_chunks)

        await flush()
        print(f"Saved {total_chunks} chunks to pgvector")

        overview, file_tree = await generate_overview(
            temp_dir, files, file_summaries, setting.groq_api_key, setting.overview_model
        )
        await save_repo_overview(pg_pool, repo_id, overview, file_tree)
        print("Repo overview saved")

        print("Pipeline finished successfully!")
        await updateConnectedRepoStatus(mongo_db, repo_id, Status.READY.value)

    except Exception:
        print(f"Pipeline failed: {traceback.format_exc()}")
        print(f"Pipeline failed for {repo_id}: {payload.repoUrl}")
        await updateConnectedRepoStatus(mongo_db, repo_id, Status.FAILED.value)

    finally:
        if temp_dir:
            cleanUp(temp_dir)
