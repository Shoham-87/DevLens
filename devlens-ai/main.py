from fastapi import FastAPI,Request
from contextlib import asynccontextmanager
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row

from config import setting


@asynccontextmanager
async def lifeCycle(app:FastAPI):
    print("Creating psycopg connection pool...")
    app.state.db_pool = AsyncConnectionPool(
        setting.database_url,
        kwargs={"row_factory":dict_row}
    )
    await app.state.db_pool.wait()

    yield

    print("Closing psycopg connection pool...")
    await app.state.db_pool.close()

app=FastAPI(lifespan=lifeCycle)

@app.get("/health")
async def healthCheck():
    return {"status":"ok"}


@app.get("/data")
async def getData(request:Request):
    pool : AsyncConnectionPool = request.app.state.db_pool

    async with pool.connection() as connection:
        cursor = await connection.execute('SELECT id, name FROM test')
        records= await cursor.fetchall()

        return {"data": records}
