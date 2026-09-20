from bson import ObjectId

async def _update_connected_repo(mongo_db, connected_repo_id: str, fields: dict):
    collection = mongo_db.get_collection("connectedRepo")
    result = await collection.update_one(
        {"_id": ObjectId(connected_repo_id)},
        {"$set": fields}
    )
    print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")

async def updateConnectedRepoStatus(mongo_db, connected_repo_id: str, new_value: str):
    await _update_connected_repo(mongo_db, connected_repo_id, {"status": new_value})

async def updateConnectedRepoTotalFiles(mongo_db, connected_repo_id: str, total_files_count: int):
    await _update_connected_repo(mongo_db, connected_repo_id, {"total_files": total_files_count})

async def updateFilesProcessed(mongo_db, connected_repo_id, files_processed:int, total_files: int,chunks_created:int):
    progress = int((files_processed / total_files) * 100) if total_files > 0 else 0
    await _update_connected_repo(mongo_db, connected_repo_id, {
        "files_processed": files_processed,
        "progress_percent": progress,
        "chunks_created" :chunks_created
    })