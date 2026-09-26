from fastapi import APIRouter,Request
from psycopg_pool import AsyncConnectionPool
from fastapi.responses import StreamingResponse

from models.requests import ChatRequest
from services.rag import stream_rag_response
from config import setting

router = APIRouter()

@router.post("/chat")
async def chatWithCode(payload: ChatRequest,request: Request):
    pool : AsyncConnectionPool = request.app.state.db_pool
    generator = stream_rag_response(payload.question,payload.connectedRepoId,payload.conversationHistory
                        ,pool,setting.jina_api_key,setting.groq_api_key)
    return StreamingResponse(generator, media_type="text/plain")