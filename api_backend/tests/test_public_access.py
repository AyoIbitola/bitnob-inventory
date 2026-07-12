"""Confirms the public/admin split introduced when self-registration and
staff-only login were removed: browsing (read) is public, every mutation
stays admin-gated. See app.products.router / app.categories.router /
app.search.router / app.settings.router for the endpoints themselves.
"""


def test_list_products_is_public(client):
    resp = client.get("/products")
    assert resp.status_code == 200


def test_product_summary_is_public(client):
    resp = client.get("/products/summary")
    assert resp.status_code == 200


def test_list_categories_is_public(client):
    resp = client.get("/categories")
    assert resp.status_code == 200


def test_search_is_public(client):
    resp = client.post("/search", json={"query": "mouse"})
    assert resp.status_code == 200


def test_creating_a_product_still_requires_admin(client):
    resp = client.post(
        "/products",
        json={"serial_number": "PUBLIC-TEST-1", "brand": "Dell"},
    )
    assert resp.status_code == 401


def test_creating_a_category_still_requires_admin(client):
    resp = client.post("/categories", json={"name": "Public Test Category"})
    assert resp.status_code == 401


def test_updating_settings_still_requires_admin(client):
    resp = client.patch("/settings", json={"low_stock_threshold": 1})
    assert resp.status_code == 401


def test_listing_users_still_requires_admin(client):
    resp = client.get("/users")
    assert resp.status_code == 401
