"""
Fetches real carbon credit projects from public registries:
  - Verra VCS (largest global voluntary carbon registry)
  - Gold Standard (second largest voluntary registry)
Falls back to local DB if APIs are unavailable.
"""
import logging
import httpx
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

VERRA_URL = "https://registry.verra.org/uiapi/resource/resourceSummary"
GS_URL    = "https://registry.goldstandard.org/projects"

HEADERS = {
    "Accept": "application/json",
    "User-Agent": "OHMC-CarbonOS/1.0 (carbon registry platform)",
}


# ── Verra VCS ─────────────────────────────────────────────────────────────────

async def fetch_verra(max_results: int = 30) -> List[Dict]:
    """Fetch UK + global carbon projects from Verra VCS public registry."""
    all_projects = []
    for country in ["United Kingdom", "Ireland"]:
        try:
            async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
                params = {
                    "resourceType": "VCS",
                    "managerID": "0",
                    "program": "VCS",
                    "maxResults": str(max_results),
                    "startIndex": "0",
                    "sortOrder": "desc",
                    "country": country,
                }
                resp = await client.get(VERRA_URL, params=params, headers=HEADERS)
                if resp.status_code == 200:
                    data = resp.json()
                    all_projects.extend(_parse_verra(data))
                    logger.info(f"Verra: fetched {len(all_projects)} projects for {country}")
        except Exception as e:
            logger.warning(f"Verra fetch failed for {country}: {e}")
    return all_projects


def _parse_verra(data: Any) -> List[Dict]:
    # Verra returns either a list or {"edges": [{"node": {...}}]}
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        edges = data.get("edges", [])
        if edges and isinstance(edges[0], dict) and "node" in edges[0]:
            items = [e["node"] for e in edges]
        else:
            items = data.get("projects", data.get("data", edges))
    else:
        return []

    out = []
    for p in items:
        if not isinstance(p, dict):
            continue
        raw_status = p.get("status", p.get("projectStatus", ""))
        vol_raw    = p.get("estimatedAnnualEmissionReductions", p.get("totalVCUs", 0)) or 0
        total_raw  = p.get("totalVCUs", p.get("totalCredits", 0)) or 0
        proj_id    = str(p.get("id", p.get("projectID", "")))
        out.append({
            "title":         p.get("name", p.get("projectName", "Unnamed Project")),
            "location":      p.get("country", p.get("projectCountry", "United Kingdom")),
            "type":          p.get("projectType", p.get("type", "AFOLU")),
            "status":        _verra_status(raw_status),
            "area_ha":       p.get("projectArea"),
            "volume_tco2e":  f"{int(vol_raw):,} tCO₂e/yr" if vol_raw else "N/A",
            "total_tco2e":   f"{int(total_raw):,} tCO₂e total" if total_raw else "N/A",
            "methodology":   p.get("methodology", p.get("projectMethodology", "")),
            "proponent":     p.get("proponent", p.get("projectProponent", "")),
            "vintage":       str(p.get("projectStart", p.get("vintage", ""))),
            "registry":      "Verra VCS",
            "registry_id":   proj_id,
            "registry_url":  f"https://registry.verra.org/app/projectDetail/VCS/{proj_id}",
            "claim_guidance": _claim_guidance(_verra_status(raw_status)),
            "description":   p.get("description", ""),
            "source":        "verra",
        })
    return out


def _verra_status(s: str) -> str:
    m = {
        "Registered":           "Verified Credit",
        "Credits Issued":       "Verified Credit",
        "Under Verification":   "Pre-Validation",
        "Under Validation":     "Pre-Validation",
        "Validation Requested": "Pre-Validation",
        "Inactive":             "Estimated Only",
        "Rejected":             "Estimated Only",
    }
    return m.get(s, "Validated PIU" if s else "Estimated Only")


# ── Gold Standard ─────────────────────────────────────────────────────────────

async def fetch_gold_standard(max_results: int = 20) -> List[Dict]:
    """Fetch UK projects from Gold Standard public registry."""
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
            params = {
                "q": "united kingdom",
                "isActive": "true",
                "page": 1,
                "per_page": max_results,
            }
            resp = await client.get(GS_URL, params=params, headers=HEADERS)
            if resp.status_code == 200:
                data = resp.json()
                projects = _parse_gs(data)
                logger.info(f"Gold Standard: fetched {len(projects)} projects")
                return projects
            logger.warning(f"Gold Standard API returned HTTP {resp.status_code}")
    except Exception as e:
        logger.warning(f"Gold Standard fetch failed: {e}")
    return []


def _parse_gs(data: Any) -> List[Dict]:
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        items = data.get("projects", data.get("data", data.get("results", [])))
    else:
        return []

    out = []
    for p in items:
        if not isinstance(p, dict):
            continue
        vol    = p.get("creditsIssued", p.get("estimatedCreditVolume", 0)) or 0
        status = p.get("projectStatus", p.get("status", "Active"))
        pid    = str(p.get("id", ""))
        mapped = "Verified Credit" if status in ("Active", "Registered", "Completed") else "Pre-Validation"
        out.append({
            "title":         p.get("name", p.get("projectName", "")),
            "location":      p.get("country", p.get("projectCountry", "United Kingdom")),
            "type":          p.get("type", p.get("projectType", "Gold Standard")),
            "status":        mapped,
            "area_ha":       p.get("projectArea"),
            "volume_tco2e":  f"{int(vol):,} tCO₂e" if vol else "N/A",
            "total_tco2e":   "N/A",
            "methodology":   p.get("methodology", "Gold Standard VER"),
            "proponent":     p.get("developer", p.get("projectDeveloper", "")),
            "vintage":       str(p.get("startYear", "")),
            "registry":      "Gold Standard",
            "registry_id":   pid,
            "registry_url":  f"https://registry.goldstandard.org/projects/{pid}",
            "claim_guidance": _claim_guidance(mapped),
            "description":   p.get("summary", p.get("description", "")),
            "source":        "goldstandard",
        })
    return out


# ── Shared helpers ────────────────────────────────────────────────────────────

def _claim_guidance(status: str) -> str:
    return {
        "Verified Credit":  "Claims permitted after credit retirement. Serialised retirement evidence issued.",
        "Validated PIU":    "Future claim only — register interest for PIU allocation. No current offset claim.",
        "Pre-Validation":   "Interest registration only — project under validation. No offset claim permitted.",
        "Estimated Only":   "Preliminary estimate — independent VVB validation required before any claim.",
    }.get(status, "No offset claim permitted. Contact OHMC for guidance.")
