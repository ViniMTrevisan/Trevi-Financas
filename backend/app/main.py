from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.bot.application import build_application
from app.database import Base, engine
from app.models import Transaction  # noqa: F401 — registra o model no Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Banco
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Bot
    bot = build_application()
    await bot.initialize()
    await bot.start()
    await bot.updater.start_polling(drop_pending_updates=True)

    yield

    await bot.updater.stop()
    await bot.stop()
    await bot.shutdown()
    await engine.dispose()


app = FastAPI(title="Trevi Finanças", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}
