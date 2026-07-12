import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app

settings.allowed_email_domains = ""  # tests use @example.com; open the domain lock

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    # SQLite ignores FK constraints (including ON DELETE SET NULL) unless
    # turned on per-connection. Without this, deleting a parent product here
    # would leave a dangling attached_to_id instead of nulling it, unlike
    # production Postgres which enforces it by default.
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def _admin_headers():
    # Set immediately before use, not at module import time: test_admin_seed.py
    # mutates this same process-wide singleton, and whichever module's import
    # ran last would otherwise silently win for the whole test run.
    settings.admin_seed_emails = "attachadmin@example.com"
    client.post(
        "/auth/register",
        json={"email": "attachadmin@example.com", "password": "password123"},
    )
    resp = client.post(
        "/auth/login",
        json={"email": "attachadmin@example.com", "password": "password123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_product(headers, serial, **overrides):
    payload = {
        "serial_number": serial,
        "brand": "Dell",
        "model_no": "OptiPlex",
        "category": "Desktops",
        "price": 500,
    }
    payload.update(overrides)
    resp = client.post("/products", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_unit_attached_to_existing_unit():
    headers = _admin_headers()
    desktop = _make_product(headers, "DESK-ATTACH-1")

    resp = client.post(
        "/products",
        json={
            "serial_number": "MOUSE-ATTACH-1",
            "brand": "Logitech",
            "category": "Peripherals",
            "attached_to_id": desktop["id"],
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["attached_to_id"] == desktop["id"]


def test_attach_to_nonexistent_product_rejected():
    headers = _admin_headers()
    resp = client.post(
        "/products",
        json={
            "serial_number": "MOUSE-ATTACH-BAD",
            "brand": "Logitech",
            "attached_to_id": 999999,
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "does not match" in resp.json()["detail"]


def test_cannot_attach_to_self_via_update():
    headers = _admin_headers()
    product = _make_product(headers, "SELF-ATTACH-1")
    resp = client.patch(
        f"/products/{product['id']}",
        json={"attached_to_id": product["id"]},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "itself" in resp.json()["detail"]


def test_cannot_chain_attachments():
    headers = _admin_headers()
    desktop = _make_product(headers, "DESK-CHAIN-1")
    mouse = _make_product(
        headers, "MOUSE-CHAIN-1", brand="Logitech", attached_to_id=desktop["id"]
    )
    # A keyboard trying to attach to the mouse (itself an accessory) must fail.
    resp = client.post(
        "/products",
        json={
            "serial_number": "KEYBOARD-CHAIN-1",
            "brand": "Logitech",
            "attached_to_id": mouse["id"],
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "itself attached" in resp.json()["detail"]


def test_deleting_parent_orphans_accessory_instead_of_cascading():
    headers = _admin_headers()
    desktop = _make_product(headers, "DESK-ORPHAN-1")
    mouse = _make_product(
        headers, "MOUSE-ORPHAN-1", brand="Logitech", attached_to_id=desktop["id"]
    )

    resp = client.delete(f"/products/{desktop['id']}", headers=headers)
    assert resp.status_code == 204

    resp = client.get(f"/products/{mouse['id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["attached_to_id"] is None


def test_clearing_attachment_via_update():
    headers = _admin_headers()
    desktop = _make_product(headers, "DESK-CLEAR-1")
    mouse = _make_product(
        headers, "MOUSE-CLEAR-1", brand="Logitech", attached_to_id=desktop["id"]
    )

    resp = client.patch(
        f"/products/{mouse['id']}",
        json={"attached_to_id": None},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["attached_to_id"] is None
