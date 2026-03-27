import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class TransactionOut(BaseModel):
    id: uuid.UUID
    amount: float
    merchant: str
    category: str
    transaction_date: date
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SummaryToday(BaseModel):
    total: float
    count: int


class DailyTotal(BaseModel):
    date: str  # "YYYY-MM-DD"
    total: float


class SummaryMonth(BaseModel):
    total: float
    count: int
    month: str  # "YYYY-MM"
    daily: list[DailyTotal]


class CategoryTotal(BaseModel):
    category: str
    total: float
    count: int


class BudgetOut(BaseModel):
    category: str
    monthly_limit: float

    model_config = ConfigDict(from_attributes=True)


class BudgetIn(BaseModel):
    monthly_limit: float


class MerchantTotal(BaseModel):
    merchant: str
    total: float
    count: int


class TransactionIn(BaseModel):
    amount: float
    merchant: str
    category: str
    transaction_date: str  # "YYYY-MM-DD"


class TransactionUpdate(BaseModel):
    amount: float | None = None
    merchant: str | None = None
    category: str | None = None
