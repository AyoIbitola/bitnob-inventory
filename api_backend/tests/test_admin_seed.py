from app.config import settings


def test_seed_email_becomes_admin(client):
    settings.admin_seed_emails = "seedadmin@example.com"
    resp = client.post(
        "/auth/register",
        json={"email": "seedadmin@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    assert resp.json()["is_admin"] is True


def test_non_seed_email_is_not_admin(client):
    resp = client.post(
        "/auth/register",
        json={"email": "regular@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    assert resp.json()["is_admin"] is False


def test_seed_email_is_case_insensitive(client):
    settings.admin_seed_emails = "seedadmin2@example.com"
    resp = client.post(
        "/auth/register",
        json={"email": "SeedAdmin2@Example.com", "password": "password123"},
    )
    assert resp.json()["is_admin"] is True
