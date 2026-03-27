from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CategoryBudget
from app.schemas import BudgetIn, BudgetOut

router = APIRouter()


@router.get("/budgets", response_model=list[BudgetOut])
async def list_budgets(session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(CategoryBudget).order_by(CategoryBudget.category)
    )
    return list(result.scalars())


@router.put("/budgets/{category}", response_model=BudgetOut)
async def upsert_budget(
    category: str,
    body: BudgetIn,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(CategoryBudget).where(CategoryBudget.category == category)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.monthly_limit = body.monthly_limit
        await session.commit()
        await session.refresh(existing)
        return existing
    new_budget = CategoryBudget(category=category, monthly_limit=body.monthly_limit)
    session.add(new_budget)
    await session.commit()
    await session.refresh(new_budget)
    return new_budget


@router.delete("/budgets/{category}", status_code=204)
async def delete_budget(
    category: str,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        delete(CategoryBudget).where(CategoryBudget.category == category)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    await session.commit()
