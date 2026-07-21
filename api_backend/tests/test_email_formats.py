"""Tests that registration and login accept ALL valid email formats,
not just company-domain addresses (e.g. @withbitnob.com).

Structurally invalid emails (missing '@', missing domain, spaces, etc.)
must still be rejected by the schema validator.
"""

import pytest


# ---------------------------------------------------------------------------
# Emails from various domains — ALL should be accepted
# ---------------------------------------------------------------------------

VALID_EMAILS = [
    "user@gmail.com",
    "user@yahoo.com",
    "user@outlook.com",
    "user@hotmail.com",
    "user@protonmail.com",
    "user@company.io",
    "user@withbitnob.com",
    "user@university.edu",
    "firstname.lastname@domain.org",
    "user+tag@gmail.com",
    "user@sub.domain.co.uk",
]


@pytest.mark.parametrize("email", VALID_EMAILS)
def test_register_accepts_any_valid_email(client, email):
    """Any well-formed email — regardless of domain — should register successfully."""
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    assert resp.status_code == 201, f"Registration rejected for {email}: {resp.json()}"
    assert resp.json()["email"] == email.lower()


@pytest.mark.parametrize("email", VALID_EMAILS)
def test_login_accepts_any_valid_email(client, email):
    """Any previously registered email should be able to log in."""
    # Register first
    client.post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    # Now log in
    resp = client.post(
        "/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert resp.status_code == 200, f"Login rejected for {email}: {resp.json()}"
    assert "access_token" in resp.json()


def test_admin_create_user_accepts_any_email(client, make_admin):
    """Admins should be able to create accounts with any email domain."""
    headers = make_admin("emailadmin@example.com")

    resp = client.post(
        "/users",
        json={"email": "newuser@gmail.com", "password": "password123", "is_admin": False},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "newuser@gmail.com"


# ---------------------------------------------------------------------------
# Structurally INVALID emails — these must still be rejected
# ---------------------------------------------------------------------------

INVALID_EMAILS = [
    "not-an-email",          # no @ sign
    "@no-local-part.com",    # missing local part
    "user@",                 # missing domain
    "user@ space.com",       # space in domain
    "user @domain.com",      # space in local part
    "",                      # empty string
    "   ",                   # whitespace only
]


@pytest.mark.parametrize("email", INVALID_EMAILS)
def test_register_rejects_invalid_email_format(client, email):
    """Structurally malformed emails must still be rejected (422)."""
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": "password123"},
    )
    assert resp.status_code == 422, f"Should have rejected {email!r} but got {resp.status_code}"
