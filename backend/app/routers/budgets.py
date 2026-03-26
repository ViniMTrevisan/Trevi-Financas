from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
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
    stmt = (
        insert(CategoryBudget)
        .values(category=category, monthly_limit=body.monthly_limit)
        .on_conflict_do_update(
            index_elements=["category"],
            set_={"monthly_limit": body.monthly_limit},
        )
        .returning(CategoryBudget)
    )
    result = await session.execute(stmt)
    await session.commit()
    return result.scalar_one()
