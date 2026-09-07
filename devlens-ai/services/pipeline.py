from models.requests import IngestRequest
from psycopg_pool  import AsyncConnectionPool
import traceback

from enums.Status import Status
from services.cloner import clone,cleanUp
from db.mongo import updateConnectedRepoStatus,updateConnectedRepoTotalFiles
from services.walker import walk
from config import setting


async def run(payload:IngestRequest,pg_pool: AsyncConnectionPool, mongo_db):
    temp_dir = None
    try:
        await updateConnectedRepoStatus(mongo_db,payload.connectedRepoId,Status.INDEXING.value)

        temp_dir = clone(payload.repoUrl,payload.githubAccessToken,payload.connectedRepoId)

        files = walk(temp_dir,setting.excluded_dirs,setting.allowed_extensions,setting.max_file_size)

        print(f"Walker found {len(files)} eligible files")

        await updateConnectedRepoTotalFiles(mongo_db,payload.connectedRepoId,len(files))

        print("Pipeline finished successfully!")

        await updateConnectedRepoStatus(mongo_db,payload.connectedRepoId,Status.READY.value)
        
    except Exception as e:
        print(f"Pipeline failed: {traceback.format_exc()}")
        print(f"Pipeline failed for {payload.connectedRepoId}: {payload.repoUrl}")
        await updateConnectedRepoStatus(mongo_db, payload.connectedRepoId, Status.FAILED.value)

    finally:
        if temp_dir:
            cleanUp(temp_dir)
