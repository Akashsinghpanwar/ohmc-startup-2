import json
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from db import execute, fetch, fetchrow, fetchval
from services.carbon_calculator import compute_area_ha
from auth.deps import get_optional_user

router = APIRouter()


class ParcelCreate(BaseModel):
    land_name: str
    geometry: dict
    owner_name: Optional[str] = None
    notes: Optional[str] = None
    user_id: Optional[str] = None


class EvidenceUpdate(BaseModel):
    document_name: str
    document_type: str
    status: str = "uploaded"
    notes: Optional[str] = None


@router.post("/")
async def create_parcel(req: ParcelCreate, authorization: str = Header(None)):
    user = await get_optional_user(authorization)
    user_id = user["id"] if user else None

    area_ha = compute_area_ha(req.geometry)
    coords = req.geometry.get("coordinates", [[]])[0] if req.geometry.get("type") == "Polygon" else []
    lat = sum(c[1] for c in coords) / len(coords) if coords else 0
    lon = sum(c[0] for c in coords) / len(coords) if coords else 0

    row = await fetchrow(
        """
        INSERT INTO parcels (user_id, land_name, geometry, area_ha, centroid_lat, centroid_lon, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """,
        user_id,
        req.land_name,
        json.dumps(req.geometry),
        area_ha,
        round(lat, 6),
        round(lon, 6),
        req.notes,
    )

    # Create default evidence checklist
    default_docs = [
        ("Land boundary (GIS)", "boundary", "done"),
        ("Ownership / title proof", "ownership", "missing"),
        ("Soil and baseline data", "soil", "missing"),
        ("Stakeholder engagement plan", "stakeholder", "missing"),
        ("Hydrological assessment", "hydrology", "missing"),
        ("Site photographs", "photos", "missing"),
    ]
    for doc_name, doc_type, status in default_docs:
        await execute(
            "INSERT INTO evidence_documents (parcel_id, document_name, document_type, status) VALUES ($1, $2, $3, $4)",
            row["id"], doc_name, doc_type, status
        )

    return dict(row)


@router.get("/")
async def list_parcels(limit: int = 50, authorization: str = Header(None)):
    user = await get_optional_user(authorization)
    if user:
        rows = await fetch(
            """
            SELECT p.*,
                   (SELECT COUNT(*) FROM scans s WHERE s.parcel_id = p.id) as scan_count,
                   (SELECT eligibility_score FROM scans s WHERE s.parcel_id = p.id ORDER BY created_at DESC LIMIT 1) as last_score,
                   (SELECT recommended_pathway FROM scans s WHERE s.parcel_id = p.id ORDER BY created_at DESC LIMIT 1) as last_pathway
            FROM parcels p
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
            LIMIT $2
            """,
            user["id"], limit
        )
    else:
        rows = await fetch(
            """
            SELECT p.*,
                   (SELECT COUNT(*) FROM scans s WHERE s.parcel_id = p.id) as scan_count,
                   (SELECT eligibility_score FROM scans s WHERE s.parcel_id = p.id ORDER BY created_at DESC LIMIT 1) as last_score,
                   (SELECT recommended_pathway FROM scans s WHERE s.parcel_id = p.id ORDER BY created_at DESC LIMIT 1) as last_pathway
            FROM parcels p
            ORDER BY p.created_at DESC
            LIMIT $1
            """,
            limit
        )
    return [dict(r) for r in rows]


@router.get("/{parcel_id}")
async def get_parcel(parcel_id: str):
    row = await fetchrow("SELECT * FROM parcels WHERE id::text = $1", parcel_id)
    if not row:
        raise HTTPException(404, "Parcel not found")

    # Get evidence documents
    docs = await fetch(
        "SELECT * FROM evidence_documents WHERE parcel_id::text = $1 ORDER BY created_at",
        parcel_id
    )
    # Get recent scans
    scans = await fetch(
        "SELECT id, eligibility_score, confidence, recommended_pathway, created_at FROM scans WHERE parcel_id::text = $1 ORDER BY created_at DESC LIMIT 5",
        parcel_id
    )

    result = dict(row)
    result["evidence_documents"] = [dict(d) for d in docs]
    result["recent_scans"] = [dict(s) for s in scans]
    return result


@router.patch("/{parcel_id}/evidence/{doc_id}")
async def update_evidence(parcel_id: str, doc_id: str, req: EvidenceUpdate):
    await execute(
        """
        UPDATE evidence_documents
        SET status = $1, notes = $2, updated_at = NOW()
        WHERE id::text = $3 AND parcel_id::text = $4
        """,
        req.status, req.notes, doc_id, parcel_id
    )
    return {"ok": True}


@router.delete("/{parcel_id}")
async def delete_parcel(parcel_id: str):
    await execute("DELETE FROM parcels WHERE id::text = $1", parcel_id)
    return {"ok": True}
