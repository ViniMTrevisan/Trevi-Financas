from datetime import date, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Transaction


async def total_today(session: AsyncSession) -> float:
    result = await session.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.transaction_date == date.today()
        )
    )
    return float(result.scalar() or 0)


async def total_month(session: AsyncSession) -> float:
    today = date.today()
    result = await session.execute(
        select(func.sum(Transaction.amount))
        .where(func.extract("year", Transaction.transaction_date) == today.year)
        .where(func.extract("month", Transaction.transaction_date) == today.month)
    )
    return float(result.scalar() or 0)


async def last_transactions(session: AsyncSession, limit: int = 5) -> list[Transaction]:
    result = await session.execute(
        select(Transaction).order_by(Transaction.created_at.desc()).limit(limit)
    )
    return list(result.scalars())


async def categories_month(session: AsyncSession) -> list[tuple[str, float]]:
    today = date.today()
    result = await session.execute(
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(func.extract("year", Transaction.transaction_date) == today.year)
        .where(func.extract("month", Transaction.transaction_date) == today.month)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    return [(row.category, float(row.total)) for row in result]


async def total_week(session: AsyncSession) -> float:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    result = await session.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.transaction_date >= monday)
        .where(Transaction.transaction_date <= today)
    )
    return float(result.scalar() or 0)


async def categories_week(session: AsyncSession) -> list[tuple[str, float]]:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    result = await session.execute(
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(Transaction.transaction_date >= monday)
        .where(Transaction.transaction_date <= today)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    return [(row.category, float(row.total)) for row in result]


async def get_transaction_by_position(session: AsyncSession, pos: int) -> Transaction | None:
    """Retorna a transação na posição 1–5 das mais recentes."""
    result = await session.execute(
        select(Transaction).order_by(Transaction.created_at.desc()).limit(5)
    )
    txs = list(result.scalars())
    idx = pos - 1
    return txs[idx] if 0 <= idx < len(txs) else None


async def update_transaction(session: AsyncSession, tx_id, **fields) -> None:
    await session.execute(
        update(Transaction).where(Transaction.id == tx_id).values(**fields)
    )
    await session.commit()
