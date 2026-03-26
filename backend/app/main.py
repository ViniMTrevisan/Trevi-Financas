from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.bot.application import build_application
from app.config import get_settings
from app.database import Base, engine
from app.models import CategoryBudget, Transaction  # noqa: F401 — registra os models no Base.metadata
from app.routers import budgets, transactions


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

# CORS
_settings = get_settings()
_origins = ["http://localhost:5173"]
if _settings.frontend_url:
    _origins.append(_settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "PUT"],
    allow_headers=["*"],
)

app.include_router(transactions.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
