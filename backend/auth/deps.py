"""FastAPI dependency: get current authenticated user from Bearer token."""
from fastapi import Header, HTTPException, status
from jose import JWTError
from auth.jwt import decode_token
from db import fetchrow


async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or invalid token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalid or expired")
    user = await fetchrow("SELECT * FROM users WHERE id::text = $1", payload["sub"])
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return dict(user)


async def get_optional_user(authorization: str = Header(None)) -> dict | None:
    """Returns user if token is valid, None if no token provided."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
