"""
/api/marketplace/ — aggregates real registry data + local DB projects.
Sources: Verra VCS, Gold Standard, local PostgreSQL.
"""
import json
import asyncio
import logging
from fastapi import APIRouter, Query
from db import fetch
from services.registry_fetcher import fetch_verra, fetch_gold_standard

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def get_marketplace(
    source: str  = Query("all",  description="all | verra | goldstandard | local"),
    limit:  int  = Query(60,     le=200),
):
    """
    Returns carbon credit projects from:
    - Verra VCS public registry (real live data)
    - Gold Standard public registry (real live data)
    - Local OHMC database (seeded UK WCC / Peatland Code projects)
    """
    tasks = []
    use_verra = source in ("all", "verra")
    use_gs    = source in ("all", "goldstandard")
    use_local = source in ("all", "local")

    if use_verra:
        tasks.append(fetch_verra(max_results=30))
    if use_gs:
        tasks.append(fetch_gold_standard(max_results=20))

    # Fetch remote registries concurrently
    remote_results = await asyncio.gather(*tasks, return_exceptions=True)
    projects = []
    for res in remote_results:
        if isinstance(res, list):
            projects.extend(res)
        elif isinstance(res, Exception):
            logger.warning(f"Registry fetch error: {res}")

    # Local DB always included (or as sole source if remote fails / source=local)
    if use_local or not projects:
        rows = await fetch(
            "SELECT * FROM projects ORDER BY created_at DESC LIMIT $1", limit
        )
        for r in rows:
            d = dict(r)
            if isinstance(d.get("co_benefits"), str):
                try:
                    d["co_benefits"] = json.loads(d["co_benefits"])
                except Exception:
                    d["co_benefits"] = []
            d["source"]      = "local"
            d["registry"]    = "OHMC UK Registry"
            d["registry_url"] = None
            projects.append(d)

    logger.info(f"Marketplace: returning {min(len(projects), limit)} projects")
    return projects[:limit]


@router.get("/sources")
async def get_sources():
    """List available data sources and their status."""
    return [
        {"id": "verra",       "name": "Verra VCS Registry",       "url": "https://registry.verra.org",             "type": "Global voluntary"},
        {"id": "goldstandard","name": "Gold Standard Registry",    "url": "https://registry.goldstandard.org",      "type": "Global voluntary"},
        {"id": "local",       "name": "OHMC UK Registry",          "url": None,                                     "type": "UK WCC / Peatland Code"},
    ]
