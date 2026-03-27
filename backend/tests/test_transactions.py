from datetime import date

import pytest


TODAY = date.today().isoformat()
MONTH = date.today().strftime("%Y-%m")


async def _create(client, amount=50.0, merchant="Mercado X", category="Alimentação", tx_date=None):
    resp = await client.post("/api/transactions", json={
        "amount": amount,
        "merchant": merchant,
        "category": category,
        "transaction_date": tx_date or TODAY,
    })
    assert resp.status_code == 201
    return resp.json()


# ── /summary/today ────────────────────────────────────────────────────────────

async def test_today_empty(client):
    resp = await client.get("/api/summary/today")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0.0
    assert data["count"] == 0


async def test_today_with_transactions(client):
    await _create(client, amount=30.0)
    await _create(client, amount=20.0)
    resp = await client.get("/api/summary/today")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == pytest.approx(50.0)
    assert data["count"] == 2


# ── /summary/month ─────────────────────────────────────────────────────────────

async def test_month_empty(client):
    resp = await client.get(f"/api/summary/month?month={MONTH}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0.0
    assert data["count"] == 0
    assert data["month"] == MONTH


async def test_month_with_transactions(client):
    await _create(client, amount=100.0)
    await _create(client, amount=40.0)
    resp = await client.get(f"/api/summary/month?month={MONTH}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == pytest.approx(140.0)
    assert data["count"] == 2


async def test_month_daily_breakdown(client):
    await _create(client, amount=25.0)
    resp = await client.get(f"/api/summary/month?month={MONTH}")
    assert resp.status_code == 200
    daily = resp.json()["daily"]
    assert len(daily) >= 1
    assert any(d["date"] == TODAY for d in daily)


async def test_month_filter_excludes_other_months(client):
    # Transação de outro mês não deve aparecer no mês atual
    await _create(client, amount=999.0, tx_date="2020-01-15")
    resp = await client.get(f"/api/summary/month?month={MONTH}")
    data = resp.json()
    assert data["total"] == 0.0


# ── /summary/categories ───────────────────────────────────────────────────────

async def test_categories_empty(client):
    resp = await client.get(f"/api/summary/categories?month={MONTH}")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_categories_grouped(client):
    await _create(client, amount=30.0, category="Alimentação")
    await _create(client, amount=20.0, category="Alimentação")
    await _create(client, amount=50.0, category="Transporte")
    resp = await client.get(f"/api/summary/categories?month={MONTH}")
    data = resp.json()
    cats = {c["category"]: c for c in data}
    assert cats["Alimentação"]["total"] == pytest.approx(50.0)
    assert cats["Alimentação"]["count"] == 2
    assert cats["Transporte"]["total"] == pytest.approx(50.0)


# ── /summary/merchants ────────────────────────────────────────────────────────

async def test_merchants_empty(client):
    resp = await client.get(f"/api/summary/merchants?month={MONTH}")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_merchants_top(client):
    await _create(client, amount=100.0, merchant="Loja A")
    await _create(client, amount=60.0, merchant="Loja A")
    await _create(client, amount=80.0, merchant="Loja B")
    resp = await client.get(f"/api/summary/merchants?month={MONTH}")
    data = resp.json()
    assert data[0]["merchant"] == "Loja A"
    assert data[0]["total"] == pytest.approx(160.0)
    assert data[0]["count"] == 2


# ── GET /transactions ─────────────────────────────────────────────────────────

async def test_list_default_empty(client):
    resp = await client.get("/api/transactions")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_returns_created(client):
    tx = await _create(client, amount=42.0, merchant="Padaria")
    resp = await client.get("/api/transactions")
    ids = [t["id"] for t in resp.json()]
    assert tx["id"] in ids


async def test_list_limit(client):
    for _ in range(5):
        await _create(client)
    resp = await client.get("/api/transactions?limit=2")
    assert len(resp.json()) == 2


async def test_list_category_filter(client):
    await _create(client, category="Saúde", merchant="Farmácia")
    await _create(client, category="Lazer", merchant="Cinema")
    resp = await client.get("/api/transactions?category=Saúde")
    data = resp.json()
    assert len(data) == 1
    assert data[0]["category"] == "Saúde"


# ── POST /transactions ────────────────────────────────────────────────────────

async def test_create_transaction(client):
    resp = await client.post("/api/transactions", json={
        "amount": 75.50,
        "merchant": "Restaurante Z",
        "category": "Alimentação",
        "transaction_date": TODAY,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == pytest.approx(75.50)
    assert data["merchant"] == "Restaurante Z"
    assert data["category"] == "Alimentação"
    assert data["source"] == "manual"
    assert "id" in data


async def test_create_transaction_missing_fields(client):
    resp = await client.post("/api/transactions", json={"amount": 10.0})
    assert resp.status_code == 422


# ── PUT /transactions/{id} ────────────────────────────────────────────────────

async def test_update_transaction(client):
    tx = await _create(client, amount=100.0, merchant="Original")
    resp = await client.put(f"/api/transactions/{tx['id']}", json={
        "amount": 200.0,
        "merchant": "Atualizado",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["amount"] == pytest.approx(200.0)
    assert data["merchant"] == "Atualizado"
    assert data["category"] == tx["category"]  # não alterado


async def test_update_transaction_not_found(client):
    resp = await client.put(
        "/api/transactions/00000000-0000-0000-0000-000000000000",
        json={"amount": 1.0},
    )
    assert resp.status_code == 404


# ── DELETE /transactions/{id} ─────────────────────────────────────────────────

async def test_delete_transaction(client):
    tx = await _create(client)
    resp = await client.delete(f"/api/transactions/{tx['id']}")
    assert resp.status_code == 204
    # Confirma que sumiu
    list_resp = await client.get("/api/transactions")
    ids = [t["id"] for t in list_resp.json()]
    assert tx["id"] not in ids


async def test_delete_transaction_not_found(client):
    resp = await client.delete("/api/transactions/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


# ── GET /export ───────────────────────────────────────────────────────────────

async def test_export_csv_empty(client):
    resp = await client.get(f"/api/export?month={MONTH}")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]


async def test_export_csv_has_rows(client):
    await _create(client, amount=55.0, merchant="Supermercado")
    resp = await client.get(f"/api/export?month={MONTH}")
    assert resp.status_code == 200
    text = resp.text
    assert "Supermercado" in text
    assert "55" in text
