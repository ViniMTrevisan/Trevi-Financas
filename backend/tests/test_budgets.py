import pytest


async def test_list_budgets_empty(client):
    resp = await client.get("/api/budgets")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_budget(client):
    resp = await client.put("/api/budgets/Alimentação", json={"monthly_limit": 500.0})
    assert resp.status_code == 200
    data = resp.json()
    assert data["category"] == "Alimentação"
    assert data["monthly_limit"] == pytest.approx(500.0)


async def test_update_existing_budget(client):
    await client.put("/api/budgets/Transporte", json={"monthly_limit": 200.0})
    resp = await client.put("/api/budgets/Transporte", json={"monthly_limit": 350.0})
    assert resp.status_code == 200
    assert resp.json()["monthly_limit"] == pytest.approx(350.0)


async def test_list_budgets_after_create(client):
    await client.put("/api/budgets/Lazer", json={"monthly_limit": 150.0})
    resp = await client.get("/api/budgets")
    assert resp.status_code == 200
    cats = [b["category"] for b in resp.json()]
    assert "Lazer" in cats


async def test_delete_budget(client):
    await client.put("/api/budgets/Saúde", json={"monthly_limit": 300.0})
    resp = await client.delete("/api/budgets/Saúde")
    assert resp.status_code == 204
    budgets = (await client.get("/api/budgets")).json()
    assert all(b["category"] != "Saúde" for b in budgets)


async def test_delete_budget_not_found(client):
    resp = await client.delete("/api/budgets/Inexistente")
    assert resp.status_code == 404
