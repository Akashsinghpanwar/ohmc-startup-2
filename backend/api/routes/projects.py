import json
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel
from typing import Optional
from db import fetch, fetchrow, execute
from auth.deps import get_optional_user

router = APIRouter()


def _parse(row: dict) -> dict:
    if not row:
        return row
    for field in ["co_benefits"]:
        if field in row and isinstance(row[field], str):
            row[field] = json.loads(row[field])
    return row


@router.get("/")
async def list_projects(
    status: str = Query(None),
    pathway: str = Query(None),
    limit: int = Query(50, le=200),
):
    query = "SELECT * FROM projects WHERE 1=1"
    params = []
    if status:
        params.append(status)
        query += f" AND status = ${len(params)}"
    if pathway:
        params.append(f"%{pathway}%")
        query += f" AND (type ILIKE ${len(params)} OR methodology ILIKE ${len(params)})"
    query += f" ORDER BY created_at DESC LIMIT ${len(params)+1}"
    params.append(limit)

    rows = await fetch(query, *params)
    return [_parse(dict(r)) for r in rows]


@router.get("/{project_id}")
async def get_project(project_id: str):
    row = await fetchrow("SELECT * FROM projects WHERE id::text = $1", project_id)
    if not row:
        raise HTTPException(404, "Project not found")
    return _parse(dict(row))


class InterestRequest(BaseModel):
    buyer_name: str
    organisation: str = ""
    email: str
    volume_interest: str = ""
    notes: str = ""


@router.post("/{project_id}/interest")
async def register_interest(
    project_id: str,
    req: InterestRequest,
    authorization: str = Header(None),
):
    user = await get_optional_user(authorization)
    project = await fetchrow("SELECT id FROM projects WHERE id::text = $1", project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    row = await fetchrow(
        """
        INSERT INTO interest_registrations
            (project_id, user_id, buyer_name, organisation, email, volume_interest, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """,
        project["id"],
        user["id"] if user else None,
        req.buyer_name,
        req.organisation,
        req.email,
        req.volume_interest,
        req.notes,
    )
    return dict(row)


@router.get("/{project_id}/interest")
async def get_project_interest(project_id: str):
    rows = await fetch(
        "SELECT * FROM interest_registrations WHERE project_id::text = $1 ORDER BY created_at DESC",
        project_id
    )
    return [dict(r) for r in rows]
