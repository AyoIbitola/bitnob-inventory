import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app

# Every test file used to build its OWN engine + its OWN
# `app.dependency_overrides[get_db]`. That override lives on the one shared
# `app` singleton (imported by every module), so whichever test file pytest
# happened to import LAST silently won for the ENTIRE run — earlier files'
# requests were quietly served by a different file's database. One shared
# setup here removes the possibility of that collision.
settings.allowed_email_domains = ""  # tests use @example.com; open the domain lock

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    # SQLite ignores FK constraints (including ON DELETE SET NULL) unless
    # turned on per-connection. Production Postgres enforces them by default;
    # this keeps test behavior matching it.
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def make_admin(client):
    """Register + log in an admin, keyed by a caller-chosen unique email.

    Sets admin_seed_emails immediately before use, not at import time —
    same reasoning as the get_db fix above, this is a process-wide singleton
    shared across every test module in the run.
    """

    def _make(email: str) -> dict:
        settings.admin_seed_emails = email
        client.post("/auth/register", json={"email": email, "password": "password123"})
        resp = client.post("/auth/login", json={"email": email, "password": "password123"})
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _make
