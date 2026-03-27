import os

# Dummy env vars must be set before any app import so pydantic-settings validates OK
os.environ.setdefault("TELEGRAM_TOKEN", "test:token")
os.environ.setdefault("TELEGRAM_CHAT_ID", "123456")
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://dummy")

from unittest.mock import AsyncMock, patch  # noqa: E402

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database import Base, get_db  # noqa: E402
import app.main as main_module  # noqa: E402


@pytest_asyncio.fixture
async def client():
    """AsyncClient com banco SQLite in-memory isolado por teste."""
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestSession = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with TestSession() as session:
            yield session

    main_module.app.dependency_overrides[get_db] = override_get_db

    mock_bot = AsyncMock()
    mock_bot.updater = AsyncMock()

    with (
        patch.object(main_module, "engine", test_engine),
        patch("app.main.build_application", return_value=mock_bot),
    ):
        transport = ASGITransport(app=main_module.app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c

    main_module.app.dependency_overrides.clear()
