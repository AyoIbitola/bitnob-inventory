import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
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


def test_seed_email_becomes_admin():
    # Set immediately before use, not at module import time: another test
    # module importing in the same pytest run also mutates this process-wide
    # singleton, and whichever import ran last would otherwise silently win.
    settings.admin_seed_emails = "seedadmin@example.com"
    resp = client.post(
        "/auth/register",
        json={"email": "seedadmin@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    assert resp.json()["is_admin"] is True


def test_non_seed_email_is_not_admin():
    resp = client.post(
        "/auth/register",
        json={"email": "regular@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    assert resp.json()["is_admin"] is False


def test_seed_email_is_case_insensitive():
    settings.admin_seed_emails = "seedadmin2@example.com"
    resp = client.post(
        "/auth/register",
        json={"email": "SeedAdmin2@Example.com", "password": "password123"},
    )
    assert resp.json()["is_admin"] is True
