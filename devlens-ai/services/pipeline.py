from models.requests import IngestRequest
from psycopg_pool  import AsyncConnectionPool


async def run(payload:IngestRequest,pg_pool: AsyncConnectionPool, mongo_db):
    try:

        

        print("Pipeline finished successfully!")
        
    except Exception as e:
        print(f"Pipeline failed for {payload.connectedRepoId}: {payload.repoUrl}")