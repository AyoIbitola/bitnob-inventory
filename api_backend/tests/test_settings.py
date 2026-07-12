def test_get_settings_is_public(client):
    # No auth token at all -> still 200. Reading inventory-related data
    # (including this threshold) is public; only PATCH is admin-gated.
    resp = client.get("/settings")
    assert resp.status_code == 200
    assert resp.json() == {"low_stock_threshold": 10}


def test_admin_can_update_threshold(client, make_admin):
    headers = make_admin("settingsadmin2@example.com")
    resp = client.patch("/settings", json={"low_stock_threshold": 3}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["low_stock_threshold"] == 3

    # And it sticks — a subsequent GET (even from a different user) sees it.
    resp = client.get("/settings", headers=headers)
    assert resp.json()["low_stock_threshold"] == 3


def test_non_admin_cannot_update_threshold(client):
    client.post(
        "/auth/register",
        json={"email": "settingsstaff@example.com", "password": "password123"},
    )
    login = client.post(
        "/auth/login",
        json={"email": "settingsstaff@example.com", "password": "password123"},
    )
    staff_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = client.patch("/settings", json={"low_stock_threshold": 999}, headers=staff_headers)
    assert resp.status_code == 403


def test_negative_threshold_rejected(client, make_admin):
    headers = make_admin("settingsadmin3@example.com")
    resp = client.patch("/settings", json={"low_stock_threshold": -1}, headers=headers)
    assert resp.status_code == 422
