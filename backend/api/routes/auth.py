"""
Auth routes: signup, login, me, logout.
Google OAuth is handled via redirect flow.
"""
import os
import logging
import httpx
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from db import execute, fetchrow
from auth.jwt import create_token, decode_token
from auth.deps import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5174")


# ─── Schemas ──────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "landowner"
    org: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


def _safe_user(u: dict) -> dict:
    """Strip password_hash before returning to client."""
    return {k: v for k, v in u.items() if k != "password_hash"}


# ─── Signup ───────────────────────────────────────────────────────────────────
@router.post("/signup")
async def signup(req: SignupRequest):
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    existing = await fetchrow("SELECT id FROM users WHERE email = $1", req.email.lower())
    if existing:
        raise HTTPException(409, "An account with this email already exists")

    hashed = pwd.hash(req.password)
    user = await fetchrow(
        """
        INSERT INTO users (email, name, role, password_hash, org, email_verified)
        VALUES ($1, $2, $3, $4, $5, FALSE)
        RETURNING id, email, name, role, org, avatar_url, email_verified, created_at
        """,
        req.email.lower(), req.name, req.role, hashed, req.org or None,
    )
    if not user:
        raise HTTPException(500, "Failed to create account")

    user = dict(user)
    token = create_token(str(user["id"]), user["email"], user["role"])
    return {"token": token, "user": _safe_user(user)}


# ─── Login ────────────────────────────────────────────────────────────────────
@router.post("/login")
async def login(req: LoginRequest):
    user = await fetchrow("SELECT * FROM users WHERE email = $1", req.email.lower())
    if not user:
        raise HTTPException(401, "Invalid email or password")
    user = dict(user)
    if not user.get("password_hash"):
        raise HTTPException(401, "This account uses Google sign-in. Please continue with Google.")
    if not pwd.verify(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(str(user["id"]), user["email"], user["role"])
    return {"token": token, "user": _safe_user(user)}


# ─── Me ───────────────────────────────────────────────────────────────────────
@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return _safe_user(current_user)


# ─── Google OAuth ─────────────────────────────────────────────────────────────
@router.get("/google")
async def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(501, "Google OAuth not configured. Add GOOGLE_CLIENT_ID to backend/.env")
    redirect_uri = f"{FRONTEND_URL.rstrip('/')}/auth/google/callback"
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
        "&prompt=select_account"
    )
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(code: str, role: str = "landowner"):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(501, "Google OAuth not configured")

    redirect_uri = f"{FRONTEND_URL.rstrip('/')}/auth/google/callback"

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(400, "Google token exchange failed")

        tokens = token_resp.json()
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if user_resp.status_code != 200:
            raise HTTPException(400, "Failed to fetch Google profile")

        profile = user_resp.json()

    google_id = profile["id"]
    email = profile.get("email", "").lower()
    name = profile.get("name", email.split("@")[0])
    avatar_url = profile.get("picture")

    # Upsert user
    user = await fetchrow("SELECT * FROM users WHERE google_id = $1", google_id)
    if not user:
        user = await fetchrow("SELECT * FROM users WHERE email = $1", email)

    if user:
        user = dict(user)
        # Update google_id and avatar if missing
        await execute(
            "UPDATE users SET google_id=$1, avatar_url=$2, email_verified=TRUE, updated_at=NOW() WHERE id=$3",
            google_id, avatar_url, user["id"],
        )
        user["google_id"] = google_id
        user["avatar_url"] = avatar_url
    else:
        user = await fetchrow(
            """
            INSERT INTO users (email, name, role, google_id, avatar_url, email_verified)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            RETURNING id, email, name, role, org, avatar_url, email_verified, created_at
            """,
            email, name, role, google_id, avatar_url,
        )
        user = dict(user)

    token = create_token(str(user["id"]), user["email"], user["role"])
    # Redirect back to frontend with token
    return RedirectResponse(f"{FRONTEND_URL}?token={token}&user_name={name}&user_role={user['role']}")


# ─── Update profile ───────────────────────────────────────────────────────────
class ProfileUpdate(BaseModel):
    name: str = None
    org: str = None
    role: str = None


@router.patch("/me")
async def update_profile(req: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    fields, vals = [], []
    if req.name is not None:
        fields.append(f"name=${len(vals)+1}"); vals.append(req.name)
    if req.org is not None:
        fields.append(f"org=${len(vals)+1}"); vals.append(req.org)
    if req.role is not None and req.role in ("landowner", "buyer", "partner"):
        fields.append(f"role=${len(vals)+1}"); vals.append(req.role)

    if fields:
        vals.append(current_user["id"])
        await execute(
            f"UPDATE users SET {', '.join(fields)}, updated_at=NOW() WHERE id=${len(vals)}",
            *vals,
        )
    user = await fetchrow("SELECT * FROM users WHERE id=$1", current_user["id"])
    return _safe_user(dict(user))
