from fastapi import APIRouter,BackgroundTasks,Request,status
from models.requests import IngestRequest
from psycopg_pool import AsyncConnectionPool

from services.pipeline import run as pipeline

router = APIRouter()

@router.get("/health")
async def healthCheck():
    return {"status":"ok"}


@router.post("/ingest",status_code=status.HTTP_202_ACCEPTED)
async def ingestCode(payload: IngestRequest,background_tasks: BackgroundTasks,request: Request):
    pool : AsyncConnectionPool = request.app.state.db_pool
    mongo_db = getattr(request.app.state, "mongo_db", None)
    background_tasks.add_task(pipeline,payload,pool,mongo_db)
    return {"status": "success", 
            "message": "Ingestion started",
            "connectedRepoId": payload.connectedRepoId}
