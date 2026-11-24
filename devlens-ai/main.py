from fastapi import FastAPI,Request
from contextlib import asynccontextmanager
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from motor.motor_asyncio import AsyncIOMotorClient
from pgvector.psycopg import register_vector_async

from config import setting

from routers.ingestion import router as ingestion
from routers.chat import router as chat
from enums.IncomingDB import IncomingDB
from db.pgvector import ensure_schema


async def setup_connection(conn):
    await register_vector_async(conn)


@asynccontextmanager
async def lifeCycle(app:FastAPI):
    print("Creating psycopg connection pool...")
    app.state.db_pool = AsyncConnectionPool(
        setting.database_uri,
        kwargs={"row_factory":dict_row},
        open=False,
        configure=setup_connection
    )
    await app.state.db_pool.open()
    await app.state.db_pool.wait()
    await ensure_schema(app.state.db_pool)
    if setting.incoming_db == IncomingDB.MONGO.value.lower():
        print("MongoDB configuration detected. Initializing client...")
        client = AsyncIOMotorClient(setting.incoming_database_uri)
        app.state.mongo_client = client
        app.state.mongo_db = client[setting.incoming_db_schema_name]
    else:
        print(f"Skipping MongoDB. Configured DB is: {setting.incoming_db}")
        app.state.mongo_client = None
        app.state.mongo_db = None
    yield

    print("Closing psycopg connection pool...")
    await app.state.db_pool.close()
    if app.state.mongo_client is not None:
        app.state.mongo_client.close()

app=FastAPI(lifespan=lifeCycle)
app.include_router(ingestion,prefix="/ai",tags=["Ingestion Module"])
app.include_router(chat,prefix="/ai",tags=["Chat Module"])

@app.get("/")
async def root():
    return {"message": "Welcome to the main API"}

