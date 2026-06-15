"""
UKCEH Land Cover Map integration (SCAFFOLD).

The research paper specifies the UKCEH Land Cover Map (LCM2023) as the
authoritative land-cover baseline, instead of inferring class from Sentinel-2
indices alone. Access to LCM requires a licensed endpoint (e.g. an EDINA/
Digimap WCS/WMS or an internal raster), so this module is a wired integration
point — not a fabricated result.

Behaviour:
  * If `UKCEH_LCM_URL` is set, it queries that endpoint for the parcel centroid
    and maps the returned class to our schema.
  * If it is NOT configured, it returns {"configured": False, ...} so the caller
    can fall back to the Sentinel-2 spectral classifier and label the source
    honestly. We never invent an LCM result.

Configure with env vars:
    UKCEH_LCM_URL   e.g. a WCS GetCoverage / point-query endpoint
    UKCEH_LCM_KEY   optional API key / token
"""
import os
import logging
import httpx

logger = logging.getLogger(__name__)

UKCEH_LCM_URL = os.getenv("UKCEH_LCM_URL")
UKCEH_LCM_KEY = os.getenv("UKCEH_LCM_KEY")

# Map UKCEH LCM aggregate classes → our pathway-relevant buckets.
LCM_CLASS_MAP = {
    "broadleaf woodland": "woodland",
    "coniferous woodland": "woodland",
    "bog": "peatland/heather",
    "heather": "peatland/heather",
    "heather grassland": "peatland/heather",
    "fen, marsh and swamp": "peatland/heather",
    "acid grassland": "grassland",
    "improved grassland": "grassland",
    "neutral grassland": "grassland",
    "arable and horticulture": "arable",
}


def _centroid(geometry: dict):
    if geometry["type"] == "Polygon":
        coords = geometry["coordinates"][0]
    elif geometry["type"] == "MultiPolygon":
        coords = geometry["coordinates"][0][0]
    else:
        coords = [geometry["coordinates"]]
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return sum(ys) / len(ys), sum(xs) / len(xs)


async def get_ukceh_land_cover(geometry: dict) -> dict:
    """
    Returns {"configured": bool, ...}. When configured and successful, includes
    a 'dominant_class' and 'data_source'; otherwise configured is False and the
    caller should fall back to the spectral classifier.
    """
    if not UKCEH_LCM_URL:
        return {
            "configured": False,
            "note": "UKCEH LCM endpoint not configured (set UKCEH_LCM_URL). "
                    "Falling back to Sentinel-2 spectral classification.",
        }

    lat, lon = _centroid(geometry)
    headers = {"Authorization": f"Bearer {UKCEH_LCM_KEY}"} if UKCEH_LCM_KEY else {}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(
                UKCEH_LCM_URL,
                params={"lat": round(lat, 6), "lon": round(lon, 6)},
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        raw_class = str(data.get("class", data.get("land_cover", ""))).strip().lower()
        mapped = LCM_CLASS_MAP.get(raw_class, raw_class or "unknown")
        return {
            "configured": True,
            "dominant_class": mapped,
            "lcm_raw_class": raw_class,
            "data_source": "UKCEH Land Cover Map (LCM2023)",
        }
    except Exception as e:
        logger.warning(f"UKCEH LCM query failed: {type(e).__name__}: {e}")
        return {
            "configured": False,
            "note": f"UKCEH LCM query failed ({type(e).__name__}). "
                    "Falling back to Sentinel-2 spectral classification.",
        }
