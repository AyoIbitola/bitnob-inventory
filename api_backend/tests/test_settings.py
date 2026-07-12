def test_get_settings_returns_default(client):
    resp = client.get("/settings")
    # No auth token -> 401, proving the endpoint isn't wide open.
    assert resp.status_code == 401


def test_get_settings_requires_auth_but_any_user_can_read(client, make_admin):
    headers = make_admin("settingsadmin@example.com")
    resp = client.get("/settings", headers=headers)
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
