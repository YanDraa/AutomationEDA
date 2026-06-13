"""
FastAPI dependencies for authentication.

These dependencies extract the current user's ID from the JWT cookie
and are injected into endpoint handlers.
"""

from fastapi import Cookie, HTTPException

from backend.auth import COOKIE_NAME, get_current_user_id


async def require_user_id(
    eda_session_token: str | None = Cookie(None, alias=COOKIE_NAME),
) -> str:
    """
    FastAPI dependency that extracts and validates the current user_id
    from the JWT session cookie.

    Usage:
        @app.get("/api/example")
        async def example(user_id: str = Depends(require_user_id)):
            ...
    """
    if not eda_session_token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    user_id = get_current_user_id(eda_session_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token expired or invalid.")

    return user_id
