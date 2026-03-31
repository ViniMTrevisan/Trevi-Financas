import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import InvestmentSnapshot
from app.schemas import InvestmentSnapshotIn, InvestmentSnapshotOut, InvestmentSummary

router = APIRouter()


@router.get("/investments/summary", response_model=InvestmentSummary)
async def get_investment_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InvestmentSnapshot).order_by(InvestmentSnapshot.snapshot_date.asc())
    )
    snapshots = result.scalars().all()

    count = len(snapshots)
    if count == 0:
        return InvestmentSummary(
            latest_amount=None,
            previous_amount=None,
            growth_abs=None,
            growth_pct=None,
            total_growth_abs=None,
            total_growth_pct=None,
            snapshots_count=0,
        )

    latest = float(snapshots[-1].amount)
    first = float(snapshots[0].amount)
    previous = float(snapshots[-2].amount) if count >= 2 else None

    growth_abs = round(latest - previous, 2) if previous is not None else None
    growth_pct = round((latest - previous) / previous * 100, 2) if previous else None
    total_growth_abs = round(latest - first, 2)
    total_growth_pct = round((latest - first) / first * 100, 2) if first else None

    return InvestmentSummary(
        latest_amount=latest,
        previous_amount=previous,
        growth_abs=growth_abs,
        growth_pct=growth_pct,
        total_growth_abs=total_growth_abs,
        total_growth_pct=total_growth_pct,
        snapshots_count=count,
    )


@router.get("/investments", response_model=list[InvestmentSnapshotOut])
async def list_investments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InvestmentSnapshot).order_by(InvestmentSnapshot.snapshot_date.desc())
    )
    return result.scalars().all()


@router.post("/investments", response_model=InvestmentSnapshotOut, status_code=201)
async def create_investment(data: InvestmentSnapshotIn, db: AsyncSession = Depends(get_db)):
    snapshot_date = (
        date.fromisoformat(data.snapshot_date) if data.snapshot_date else date.today()
    )

    existing = await db.execute(
        select(InvestmentSnapshot).where(InvestmentSnapshot.snapshot_date == snapshot_date)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Já existe um registro para {snapshot_date.strftime('%d/%m/%Y')}. Use o dashboard para editar ou deletar.",
        )

    snapshot = InvestmentSnapshot(
        id=uuid.uuid4(),
        amount=data.amount,
        notes=data.notes,
        snapshot_date=snapshot_date,
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot


@router.delete("/investments/{snapshot_id}", status_code=204)
async def delete_investment(snapshot_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InvestmentSnapshot).where(InvestmentSnapshot.id == snapshot_id)
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    await db.delete(snapshot)
    await db.commit()
