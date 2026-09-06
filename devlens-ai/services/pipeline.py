from models.requests import IngestRequest
from psycopg_pool  import AsyncConnectionPool
from bson import ObjectId
import traceback

from enums.Status import Status


async def run(payload:IngestRequest,pg_pool: AsyncConnectionPool, mongo_db):
    try:
        await updateConectedRepoStatus(mongo_db,payload.connectedRepoId,Status.INDEXING.value)

        print("Pipeline finished successfully!")

        await updateConectedRepoStatus(mongo_db,payload.connectedRepoId,Status.READY.value)
        
    except Exception as e:
        print(f"Pipeline failed: {traceback.format_exc()}")
        print(f"Pipeline failed for {payload.connectedRepoId}: {payload.repoUrl}")


async def updateConectedRepoStatus(mongo_db,connected_repo_id:str,new_value:str):
    collection = mongo_db.get_collection("connectedRepo")
    print(f"Connected Repo Id {connected_repo_id}")
    where_clause = {
        "_id":ObjectId(connected_repo_id)
    }
    update_query = {
        "$set" :{
            "status":new_value 
        }
    }
    result = await collection.update_one(where_clause,update_query)
    print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")