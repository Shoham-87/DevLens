from fastapi import FastAPI,Request
from contextlib import asynccontextmanager
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from motor.motor_asyncio import AsyncIOMotorClient

from config import setting

from routers.ingestion import router as ingestion
from enums.IncomingDB import IncomingDB


@asynccontextmanager
async def lifeCycle(app:FastAPI):
    print("Creating psycopg connection pool...")
    app.state.db_pool = AsyncConnectionPool(
        setting.database_uri,
        kwargs={"row_factory":dict_row}
    )
    await app.state.db_pool.wait()
    if setting.incoming_db == IncomingDB.MONGO.value.lower():
        print("MongoDB configuration detected. Initializing client...")
        app.state.mongo_db = AsyncIOMotorClient(setting.incoming_database_uri)
    else:
        print(f"Skipping MongoDB. Configured DB is: {setting.incoming_db}")
        app.state.mongo_db = None
    yield

    print("Closing psycopg connection pool...")
    await app.state.db_pool.close()
    if app.state.mongo_db:
        await app.state.mongo_db.close()

app=FastAPI(lifespan=lifeCycle)
app.include_router(ingestion,prefix="/ai",tags=["Ingestion Module"])

@app.get("/")
async def root():
    return {"message": "Welcome to the main API"}


@app.get("/data")
async def getData(request:Request):
    pool : AsyncConnectionPool = request.app.state.db_pool

    async with pool.connection() as connection:
        cursor = await connection.execute('SELECT id, name FROM test')
        records= await cursor.fetchall()

        return {"data": records}
