"""
POST /api/eligibility/scan — Real satellite + soil + rules + ML + PostgreSQL
"""
import json
import time
import uuid
import asyncio
import logging
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from models.schemas import BoundaryScanRequest, CarbonPathway
from auth.deps import get_optional_user
from services.sentinel import get_satellite_indices
from services.soil import get_soil_data
from services.eligibility_engine import (
    run_wcc_rules, run_peatland_rules, classify_land_cover,
    recommend_pathway, peatland_condition_from_indices, apply_hard_gates,
)
from services.carbon_calculator import estimate_carbon, compute_area_ha, CarbonInputs
from services.ml.eligibility_scorer import get_eligibility_score
from services.ml.peatland_model import classify_peatland_condition
from services.land_cover_ukceh import get_ukceh_land_cover
from services.registry_fetcher import check_parcel_overlap
from db import execute, fetchrow, fetch

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/scan")
async def scan_boundary(req: BoundaryScanRequest, authorization: str = Header(None)):
    user = await get_optional_user(authorization)
    user_id = user["id"] if user else None
    t0 = time.time()
    geometry = req.geometry.dict()

    # ── Area ─────────────────────────────────────────────────────────────────
    area_ha = compute_area_ha(geometry)
    if area_ha < 0.1:
        raise HTTPException(400, "Area too small (< 0.1 ha)")
    if area_ha > 50_000:
        raise HTTPException(400, "Area too large (> 50,000 ha)")

    # ── Satellite + Soil + UKCEH land cover + registry overlap (parallel) ──────
    sentinel_raw, soil_raw, ukceh_lc, overlap = await asyncio.gather(
        get_satellite_indices(geometry),
        get_soil_data(geometry),
        get_ukceh_land_cover(geometry),
        check_parcel_overlap(geometry),
    )

    # ── Land cover: prefer UKCEH LCM, fall back to Sentinel-2 spectral ──────────
    land_cover = classify_land_cover(sentinel_raw)
    if ukceh_lc.get("configured"):
        land_cover["dominant_class"] = ukceh_lc["dominant_class"]
        land_cover["data_source"] = ukceh_lc["data_source"]
        land_cover["source_status"] = "ukceh_lcm"
    else:
        land_cover["source_status"] = "spectral_fallback"
        land_cover["source_note"] = ukceh_lc.get("note")

    # ── Rules engines ─────────────────────────────────────────────────────────
    wcc_rules, wcc_score   = run_wcc_rules(area_ha, sentinel_raw, soil_raw, land_cover)
    peat_rules, peat_score = run_peatland_rules(area_ha, sentinel_raw, soil_raw, land_cover)

    # ── Pathway (provisional) ─────────────────────────────────────────────────
    pathway = recommend_pathway(wcc_score, peat_score, soil_raw)

    # ── ML scoring ────────────────────────────────────────────────────────────
    ml_elig = get_eligibility_score(area_ha, sentinel_raw, soil_raw, wcc_score, peat_score)

    # ── Hard gates: enforce disqualifiers, settle final pathway/score/band ──────
    pathway, score, band, gate_reasons = apply_hard_gates(
        area_ha, soil_raw, land_cover, pathway, ml_elig["eligibility_score"]
    )

    # ── Carbon estimate (uses the gated pathway) ───────────────────────────────
    peat_cond = classify_peatland_condition(sentinel_raw) if pathway == CarbonPathway.PEATLAND else {}
    peat_condition = peat_cond.get("condition", peatland_condition_from_indices(sentinel_raw))
    carbon_inputs = CarbonInputs(
        eligible_area_ha=area_ha,
        pathway=pathway,
        peatland_condition=peat_condition,
        woodland_productivity="medium",
        is_scotland=_is_scotland(geometry),
    )
    carbon_est = estimate_carbon(carbon_inputs)

    # ── Centroid ──────────────────────────────────────────────────────────────
    coords = geometry.get("coordinates", [[]])[0] if geometry.get("type") == "Polygon" else []
    lat = sum(c[1] for c in coords) / len(coords) if coords else 0
    lon = sum(c[0] for c in coords) / len(coords) if coords else 0

    # ── Reverse geocode centroid (Nominatim, free) ─────────────────────────────
    place_name = await _reverse_geocode(lat, lon)

    # ── Boundary coordinates list ─────────────────────────────────────────────
    # Exclude the closing duplicate point (first == last in a closed polygon)
    boundary_pts = coords[:-1] if (coords and coords[0] == coords[-1]) else coords
    boundary_coordinates = [
        {"point": i + 1, "lat": round(c[1], 6), "lon": round(c[0], 6)}
        for i, c in enumerate(boundary_pts)
    ]

    ms = round((time.time() - t0) * 1000)

    next_steps = _next_steps(pathway, score)

    wcc_rules_dict   = [r.dict() for r in wcc_rules]
    peat_rules_dict  = [r.dict() for r in peat_rules]

    # ── Integrity checks (transparent status — not fabricated results) ─────────
    anomaly_flags = []
    if overlap.get("status") != "clear":
        anomaly_flags.append(f"Registry double-counting check: {overlap.get('status', 'unknown')}")
    if soil_raw.get("requires_peat_depth_survey") and pathway == CarbonPathway.PEATLAND:
        anomaly_flags.append("Peat depth survey required to confirm Peatland Code eligibility")

    integrity_checks = {
        "double_counting": overlap,
        "peat_depth": {
            "required": soil_raw.get("requires_peat_depth_survey", True),
            "status": soil_raw.get("peat_status", "unknown"),
            "note": soil_raw.get("peat_note"),
        },
        "land_cover_source": land_cover.get("source_status"),
        "validation": "Independent VVB validation/verification required before any registry action.",
    }

    ml_scores = {
        "eligibility_score": score,
        "eligibility_band": band,
        "gate_reasons": gate_reasons,
        "peatland_condition": peat_cond.get("condition"),
        "woodland_suitability": round(wcc_score, 2) if pathway == CarbonPathway.WCC else None,
        "confidence_level": ml_elig["confidence_level"],
        "confidence_factors": ml_elig.get("confidence_factors", []),
        "anomaly_flags": anomaly_flags,
    }

    # ── Save scan to PostgreSQL ───────────────────────────────────────────────
    row = await fetchrow(
        """
        INSERT INTO scans (
            user_id, land_name, area_ha, centroid_lat, centroid_lon,
            eligibility_score, confidence, recommended_pathway,
            sentinel_indices, soil_data, land_cover,
            wcc_rules, peatland_rules, carbon_estimate,
            ml_scores, next_steps, processing_time_ms
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,
            $9::jsonb,$10::jsonb,$11::jsonb,
            $12::jsonb,$13::jsonb,$14::jsonb,
            $15::jsonb,$16::jsonb,$17
        ) RETURNING id::text
        """,
        user_id,
        req.land_name or "Unnamed Parcel",
        area_ha, round(lat, 6), round(lon, 6),
        score,
        ml_elig["confidence_level"],
        pathway.value,
        json.dumps(sentinel_raw),
        json.dumps(soil_raw),
        json.dumps(land_cover),
        json.dumps(wcc_rules_dict),
        json.dumps(peat_rules_dict),
        json.dumps(carbon_est) if pathway != CarbonPathway.NONE else None,
        json.dumps(ml_scores),
        json.dumps(next_steps),
        ms,
    )

    scan_id = row["id"] if row else str(uuid.uuid4())

    return {
        "parcel_id": scan_id,
        "land_name": req.land_name or "Unnamed Parcel",
        "area_ha": area_ha,
        "centroid_lat": round(lat, 6),
        "centroid_lon": round(lon, 6),
        "place_name": place_name,
        "boundary_coordinates": boundary_coordinates,
        "geometry": geometry,
        "recommended_pathway": pathway.value,
        "eligibility_score": score,
        "eligibility_band": band,
        "gate_reasons": gate_reasons,
        "confidence": ml_elig["confidence_level"],
        "sentinel_indices": {**sentinel_raw},
        "soil_data": {**soil_raw},
        "land_cover": land_cover,
        "wcc_rules": wcc_rules_dict,
        "peatland_rules": peat_rules_dict,
        "carbon_estimate": carbon_est if pathway != CarbonPathway.NONE else None,
        "ml_scores": ml_scores,
        "integrity_checks": integrity_checks,
        "next_steps": next_steps,
        "processing_time_ms": ms,
    }


@router.get("/history")
async def scan_history(limit: int = 20):
    """Recent scans from DB."""
    rows = await fetch(
        """
        SELECT id::text, land_name, area_ha, eligibility_score,
               confidence, recommended_pathway, processing_time_ms, created_at
        FROM scans
        ORDER BY created_at DESC
        LIMIT $1
        """,
        limit
    )
    return [dict(r) for r in rows]


@router.get("/scan/{scan_id}")
async def get_scan(scan_id: str):
    """Retrieve full scan result by ID."""
    row = await fetchrow("SELECT * FROM scans WHERE id::text = $1", scan_id)
    if not row:
        raise HTTPException(404, "Scan not found")
    r = dict(row)
    # Parse JSONB fields
    for f in ["sentinel_indices","soil_data","land_cover","wcc_rules","peatland_rules","carbon_estimate","ml_scores","next_steps"]:
        if isinstance(r.get(f), str):
            r[f] = json.loads(r[f])
    r["id"] = str(r["id"])
    return r


async def _reverse_geocode(lat: float, lon: float) -> str:
    """Nominatim reverse geocode — returns a human-readable place name."""
    try:
        async with httpx.AsyncClient(timeout=5, headers={"User-Agent": "OHMC-CarbonOS/1.0"}) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "json", "zoom": 10},
            )
            data = resp.json()
            addr = data.get("address", {})
            parts = []
            for key in ("village", "town", "city", "county", "state_district", "state", "country"):
                val = addr.get(key)
                if val and val not in parts:
                    parts.append(val)
                if len(parts) == 3:
                    break
            return ", ".join(parts) if parts else data.get("display_name", "Unknown location")
    except Exception as e:
        logger.warning(f"Reverse geocode failed: {e}")
        return "Location unavailable"


def _is_scotland(geometry: dict) -> bool:
    coords = geometry.get("coordinates", [[]])[0] if geometry.get("type") == "Polygon" else []
    if coords:
        lat = sum(c[1] for c in coords) / len(coords)
        lon = sum(c[0] for c in coords) / len(coords)
        return lat > 54.5 and -8 < lon < -1
    return True


def _next_steps(pathway: CarbonPathway, score: int) -> list:
    if pathway == CarbonPathway.PEATLAND:
        return [
            "Commission independent peat depth survey (Peatland Code requirement)",
            "Engage an approved VVB from the IUCN UK Peatland Programme list",
            "Prepare hydrological assessment and drainage mapping",
            "Register your parcel on OHMC to track your project journey",
            "Download this preliminary report and review with a land agent",
        ]
    elif pathway == CarbonPathway.WCC:
        return [
            "Engage a Woodland Carbon Code registered project developer",
            "Commission forest management plan and yield class assessment",
            "Submit project design document to UK Land Carbon Registry",
            "Register your parcel on OHMC to track your project journey",
            "Download this preliminary report and review with a land agent",
        ]
    return [
        "Land may not meet current eligibility thresholds for WCC or Peatland Code",
        "Consider alternative nature market routes (biodiversity net gain, nutrient neutrality)",
        "Request expert review from OHMC team for a full assessment",
    ]
