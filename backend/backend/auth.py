"""
Authentication module for AutomationEDA.

Uses JWT tokens with hardcoded users (no database required).
Designed for demo/UAS purposes.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt

# ── Configuration ─────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "automationeda-secret-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
COOKIE_NAME = "eda_session_token"

# ── Hardcoded Users ───────────────────────────────────────────────────────────

USERS_DB: list[Dict[str, Any]] = [
    {
        "id": "1",
        "name": "Arham Khan",
        "username": "Aarhamkhnz",
        "email": "hello@arhamkhnz.com",
        "password": "admin123",
        "avatar": "https://avatars.githubusercontent.com/u/43849669",
        "role": "administrator",
    },
    {
        "id": "2",
        "name": "Ammar Khan",
        "username": "ammarkhnz",
        "email": "hello@ammarkhnz.com",
        "password": "admin123",
        "avatar": "",
        "role": "admin",
    },
    {
        "id": "3",
        "name": "Test User",
        "username": "testuser",
        "email": "test@test.com",
        "password": "test123",
        "avatar": "",
        "role": "user",
    },
]


# ── Token Utilities ───────────────────────────────────────────────────────────


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT access token with the given payload and expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    )
    to_encode["exp"] = expire
    to_encode["iat"] = datetime.now(timezone.utc)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token.
    Returns the payload dict on success, None on failure.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user_id(token: str) -> Optional[str]:
    """Extract user_id from JWT token payload."""
    payload = verify_token(token)
    if not payload:
        return None
    return payload.get("sub")


# ── Authentication ────────────────────────────────────────────────────────────


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Validate credentials against the hardcoded user store.
    Returns user dict (without password) on success, None on failure.
    """
    email_lower = email.strip().lower()
    for user in USERS_DB:
        if user["email"].lower() == email_lower and user["password"] == password:
            # Return user info without password
            return {
                "id": user["id"],
                "name": user["name"],
                "username": user["username"],
                "email": user["email"],
                "avatar": user["avatar"],
                "role": user["role"],
            }
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a user by their ID (without password)."""
    for user in USERS_DB:
        if user["id"] == user_id:
            return {
                "id": user["id"],
                "name": user["name"],
                "username": user["username"],
                "email": user["email"],
                "avatar": user["avatar"],
                "role": user["role"],
            }
    return None
