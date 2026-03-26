from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import Base, engine
from app.models import Transaction  # noqa: F401 — registra o model no Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="Trevi Finanças", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}
