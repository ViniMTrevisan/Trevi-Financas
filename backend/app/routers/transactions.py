import csv
import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Transaction
from app.schemas import CategoryTotal, DailyTotal, MerchantTotal, SummaryMonth, SummaryToday, TransactionIn, TransactionOut, TransactionUpdate

router = APIRouter()


@router.get("/summary/today", response_model=SummaryToday)
async def summary_today(session: AsyncSession = Depends(get_db)):
    today = date.today()
    result = await session.execute(
        select(
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
        ).where(Transaction.transaction_date == today)
    )
    row = result.one()
    return SummaryToday(total=float(row.total), count=row.count)


@router.get("/summary/month", response_model=SummaryMonth)
async def summary_month(
    month: str | None = Query(None, description="Mês no formato YYYY-MM"),
    session: AsyncSession = Depends(get_db),
):
    if month:
        year, m = int(month.split("-")[0]), int(month.split("-")[1])
    else:
        today = date.today()
        year, m = today.year, today.month

    # Total e contagem
    result = await session.execute(
        select(
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(func.extract("year", Transaction.transaction_date) == year)
        .where(func.extract("month", Transaction.transaction_date) == m)
    )
    row = result.one()

    # Agrupamento diário
    daily_result = await session.execute(
        select(
            Transaction.transaction_date.label("dt"),
            func.sum(Transaction.amount).label("total"),
        )
        .where(func.extract("year", Transaction.transaction_date) == year)
        .where(func.extract("month", Transaction.transaction_date) == m)
        .group_by(Transaction.transaction_date)
        .order_by(Transaction.transaction_date)
    )
    daily = [
        DailyTotal(date=str(r.dt), total=float(r.total)) for r in daily_result
    ]

    return SummaryMonth(
        total=float(row.total),
        count=row.count,
        month=f"{year:04d}-{m:02d}",
        daily=daily,
    )


@router.get("/summary/categories", response_model=list[CategoryTotal])
async def summary_categories(
    month: str | None = Query(None, description="Mês no formato YYYY-MM"),
    session: AsyncSession = Depends(get_db),
):
    if month:
        year, m = int(month.split("-")[0]), int(month.split("-")[1])
    else:
        today = date.today()
        year, m = today.year, today.month

    result = await session.execute(
        select(
            Transaction.category,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(func.extract("year", Transaction.transaction_date) == year)
        .where(func.extract("month", Transaction.transaction_date) == m)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    return [
        CategoryTotal(category=r.category, total=float(r.total), count=r.count)
        for r in result
    ]


@router.get("/transactions", response_model=list[TransactionOut])
async def list_transactions(
    month: str | None = Query(None, description="Mês no formato YYYY-MM"),
    category: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
):
    stmt = select(Transaction)

    if month:
        year, m = int(month.split("-")[0]), int(month.split("-")[1])
        stmt = stmt.where(
            func.extract("year", Transaction.transaction_date) == year
        ).where(func.extract("month", Transaction.transaction_date) == m)

    if category:
        stmt = stmt.where(Transaction.category == category)

    stmt = stmt.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc()).limit(limit)

    result = await session.execute(stmt)
    return list(result.scalars())


@router.get("/export")
async def export_csv(
    month: str | None = Query(None, description="Mês no formato YYYY-MM"),
    session: AsyncSession = Depends(get_db),
):
    if month:
        year, m = int(month.split("-")[0]), int(month.split("-")[1])
    else:
        today = date.today()
        year, m = today.year, today.month

    stmt = (
        select(Transaction)
        .where(func.extract("year", Transaction.transaction_date) == year)
        .where(func.extract("month", Transaction.transaction_date) == m)
        .order_by(Transaction.transaction_date, Transaction.created_at)
    )
    result = await session.execute(stmt)
    transactions = list(result.scalars())

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Data", "Estabelecimento", "Categoria", "Valor", "Fonte"])
    for tx in transactions:
        writer.writerow([
            tx.transaction_date.strftime("%d/%m/%Y"),
            tx.merchant,
            tx.category,
            f"{float(tx.amount):.2f}".replace(".", ","),
            tx.source,
        ])

    filename = f"trevi-{year:04d}-{m:02d}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/summary/merchants", response_model=list[MerchantTotal])
async def summary_merchants(
    month: str | None = Query(None, description="Mês no formato YYYY-MM"),
    session: AsyncSession = Depends(get_db),
):
    if month:
        year, m = int(month.split("-")[0]), int(month.split("-")[1])
    else:
        today = date.today()
        year, m = today.year, today.month

    result = await session.execute(
        select(
            Transaction.merchant,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(func.extract("year", Transaction.transaction_date) == year)
        .where(func.extract("month", Transaction.transaction_date) == m)
        .group_by(Transaction.merchant)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(10)
    )
    return [
        MerchantTotal(merchant=r.merchant, total=float(r.total), count=r.count)
        for r in result
    ]


@router.post("/transactions", response_model=TransactionOut, status_code=201)
async def create_transaction(
    body: TransactionIn,
    session: AsyncSession = Depends(get_db),
):
    tx = Transaction(
        amount=body.amount,
        merchant=body.merchant,
        category=body.category,
        transaction_date=date.fromisoformat(body.transaction_date),
        source="manual",
    )
    session.add(tx)
    await session.commit()
    await session.refresh(tx)
    return tx


@router.put("/transactions/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: uuid.UUID,
    body: TransactionUpdate,
    session: AsyncSession = Depends(get_db),
):
    tx = await session.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    if body.amount is not None:
        tx.amount = body.amount
    if body.merchant is not None:
        tx.merchant = body.merchant
    if body.category is not None:
        tx.category = body.category
    await session.commit()
    await session.refresh(tx)
    return tx


@router.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
):
    tx = await session.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    await session.delete(tx)
    await session.commit()
