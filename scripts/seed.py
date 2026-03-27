"""
Seed de dados falsos para screenshots do dashboard.

Uso:
  python scripts/seed.py           # insere dados
  python scripts/seed.py --clear   # apaga TUDO (transações + metas)

Requer o container do banco rodando (docker-compose up db).
"""

import asyncio
import sys
import uuid
from datetime import date

import asyncpg

DB_URL = "postgresql://trevi:trevi@localhost:5432/trevi"

# ── Dados falsos ──────────────────────────────────────────────────────────────

TRANSACTIONS = [
    # Janeiro 2026
    ("2026-01-03", 89.90,  "iFood",              "Alimentação"),
    ("2026-01-05", 312.40, "Carrefour",           "Mercado"),
    ("2026-01-07", 34.20,  "Uber",                "Transporte"),
    ("2026-01-08", 52.00,  "Farmácia São João",   "Saúde"),
    ("2026-01-10", 29.90,  "Netflix",             "Serviços"),
    ("2026-01-10", 21.90,  "Spotify",             "Serviços"),
    ("2026-01-12", 67.50,  "Rappi",               "Alimentação"),
    ("2026-01-14", 18.00,  "99",                  "Transporte"),
    ("2026-01-15", 280.00, "Pão de Açúcar",       "Mercado"),
    ("2026-01-17", 120.00, "Academia Smart Fit",  "Saúde"),
    ("2026-01-19", 95.00,  "Outback",             "Alimentação"),
    ("2026-01-21", 48.00,  "Posto Shell",         "Transporte"),
    ("2026-01-22", 35.00,  "Livraria Cultura",    "Lazer"),
    ("2026-01-24", 199.90, "Vivo Fibra",          "Serviços"),
    ("2026-01-25", 44.00,  "Burger King",         "Alimentação"),
    ("2026-01-26", 260.00, "Carrefour",           "Mercado"),
    ("2026-01-28", 75.00,  "Ultrafarma",          "Saúde"),
    ("2026-01-29", 60.00,  "Cinema Kinoplex",     "Lazer"),
    ("2026-01-30", 38.50,  "McDonald's",          "Alimentação"),
    ("2026-01-31", 22.00,  "Uber",                "Transporte"),

    # Fevereiro 2026
    ("2026-02-02", 110.00, "iFood",               "Alimentação"),
    ("2026-02-04", 295.60, "Pão de Açúcar",       "Mercado"),
    ("2026-02-05", 29.90,  "Netflix",             "Serviços"),
    ("2026-02-05", 21.90,  "Spotify",             "Serviços"),
    ("2026-02-07", 42.00,  "99",                  "Transporte"),
    ("2026-02-09", 85.00,  "Farmácia São João",   "Saúde"),
    ("2026-02-11", 55.00,  "Subway",              "Alimentação"),
    ("2026-02-13", 199.90, "Vivo Fibra",          "Serviços"),
    ("2026-02-14", 180.00, "Outback",             "Alimentação"),
    ("2026-02-15", 120.00, "Academia Smart Fit",  "Saúde"),
    ("2026-02-17", 330.00, "Carrefour",           "Mercado"),
    ("2026-02-18", 56.00,  "Posto Shell",         "Transporte"),
    ("2026-02-20", 90.00,  "Rappi",               "Alimentação"),
    ("2026-02-21", 48.00,  "Steam",               "Lazer"),
    ("2026-02-22", 70.00,  "Ultrafarma",          "Saúde"),
    ("2026-02-24", 38.00,  "Uber",                "Transporte"),
    ("2026-02-25", 240.00, "Extra",               "Mercado"),
    ("2026-02-26", 29.00,  "Burger King",         "Alimentação"),
    ("2026-02-27", 65.00,  "Cinema Kinoplex",     "Lazer"),
    ("2026-02-28", 44.00,  "McDonald's",          "Alimentação"),

    # Março 2026 (mês atual)
    ("2026-03-01", 105.00, "iFood",               "Alimentação"),
    ("2026-03-03", 318.90, "Pão de Açúcar",       "Mercado"),
    ("2026-03-03", 29.90,  "Netflix",             "Serviços"),
    ("2026-03-03", 21.90,  "Spotify",             "Serviços"),
    ("2026-03-05", 35.00,  "99",                  "Transporte"),
    ("2026-03-06", 199.90, "Vivo Fibra",          "Serviços"),
    ("2026-03-07", 62.00,  "Farmácia São João",   "Saúde"),
    ("2026-03-09", 78.00,  "Rappi",               "Alimentação"),
    ("2026-03-10", 120.00, "Academia Smart Fit",  "Saúde"),
    ("2026-03-12", 290.00, "Carrefour",           "Mercado"),
    ("2026-03-13", 52.00,  "Uber",                "Transporte"),
    ("2026-03-15", 145.00, "Outback",             "Alimentação"),
    ("2026-03-17", 44.00,  "Posto Shell",         "Transporte"),
    ("2026-03-18", 88.00,  "Ultrafarma",          "Saúde"),
    ("2026-03-19", 55.00,  "Subway",              "Alimentação"),
    ("2026-03-20", 38.00,  "Steam",               "Lazer"),
    ("2026-03-21", 270.00, "Extra",               "Mercado"),
    ("2026-03-22", 29.00,  "McDonald's",          "Alimentação"),
    ("2026-03-24", 80.00,  "Cinema Kinoplex",     "Lazer"),
    ("2026-03-25", 42.00,  "Burger King",         "Alimentação"),
    # Hoje (2026-03-26)
    ("2026-03-26", 67.80,  "iFood",               "Alimentação"),
    ("2026-03-26", 28.50,  "Uber",                "Transporte"),
    ("2026-03-26", 189.90, "Pão de Açúcar",       "Mercado"),
]

BUDGETS = [
    ("Alimentação", 600.00),
    ("Mercado",     900.00),
    ("Transporte",  250.00),
    ("Saúde",       350.00),
    ("Lazer",       200.00),
    ("Serviços",    300.00),
]


# ── Funções ───────────────────────────────────────────────────────────────────

async def clear(conn):
    await conn.execute("DELETE FROM transactions")
    await conn.execute("DELETE FROM category_budgets")
    print("Todos os dados apagados.")


async def seed(conn):
    for tx_date, amount, merchant, category in TRANSACTIONS:
        await conn.execute(
            """
            INSERT INTO transactions (id, amount, merchant, category, transaction_date, source)
            VALUES ($1, $2, $3, $4, $5, 'manual')
            """,
            uuid.uuid4(), amount, merchant, category, date.fromisoformat(tx_date),
        )
    print(f"{len(TRANSACTIONS)} transações inseridas.")

    for category, limit in BUDGETS:
        await conn.execute(
            """
            INSERT INTO category_budgets (id, category, monthly_limit)
            VALUES ($1, $2, $3)
            ON CONFLICT (category) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
            """,
            uuid.uuid4(), category, limit,
        )
    print(f"{len(BUDGETS)} metas inseridas.")


async def main():
    conn = await asyncpg.connect(DB_URL)
    try:
        if "--clear" in sys.argv:
            await clear(conn)
        else:
            await seed(conn)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
