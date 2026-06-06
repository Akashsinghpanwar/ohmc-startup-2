"""
Soil data service for OHMC CarbonOS.

Priority order:
  1. SoilGrids v2.0 REST API (ISRIC) — rest.soilgrids.org
  2. UK National Soil Map regional model — lat/lon lookup
     Based on published National Soil Inventory data and Cranfield NSRI
     generalised soil type zones for Great Britain.

All values are estimates for pre-screening only.
"""
import logging
import httpx

logger = logging.getLogger(__name__)

# ── SoilGrids endpoints to try in order ────────────────────────────────────────
SOILGRIDS_URLS = [
    "https://rest.soilgrids.org/soilgrids/v2.0/properties/query",
    "https://soilgrids.org/soilgrids/v2.0/properties/query",
]


def _centroid(geometry: dict) -> tuple[float, float]:
    coords = []
    if geometry["type"] == "Polygon":
        coords = geometry["coordinates"][0]
    elif geometry["type"] == "MultiPolygon":
        coords = geometry["coordinates"][0][0]
    else:
        coords = [geometry["coordinates"]]
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return sum(ys) / len(ys), sum(xs) / len(xs)


async def get_soil_data(geometry: dict) -> dict:
    """
    Fetch soil properties for the parcel centroid.
    Returns organic carbon, bulk density, pH and peat classification.
    """
    lat, lon = _centroid(geometry)

    # ── Try SoilGrids REST API ─────────────────────────────────────────────────
    result = await _try_soilgrids(lat, lon)
    if result:
        return result

    # ── UK regional fallback ───────────────────────────────────────────────────
    logger.info(f"SoilGrids unavailable — using UK regional soil model for ({lat:.4f}, {lon:.4f})")
    return _uk_regional_model(lat, lon)


async def _try_soilgrids(lat: float, lon: float) -> dict | None:
    """Try each SoilGrids URL. Returns None if all fail."""
    params = {
        "lon": round(lon, 6),
        "lat": round(lat, 6),
        "property": ["oc", "bdod", "phh2o"],
        "depth": ["0-5cm", "5-15cm"],
        "value": ["mean"],
    }

    for base_url in SOILGRIDS_URLS:
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                resp = await client.get(base_url, params=params)
                resp.raise_for_status()
                data = resp.json()

            props = data.get("properties", {})
            layers = props.get("layers", [])
            if not layers:
                continue

            result = {
                "organic_carbon_g_per_kg": None,
                "bulk_density_kg_per_m3": None,
                "ph": None,
                "is_peat": False,
                "is_peaty": False,
                "centroid_lat": lat,
                "centroid_lon": lon,
                "data_source": "SoilGrids v2.0 (ISRIC)",
            }

            for layer in layers:
                name = layer.get("name", "")
                depths = layer.get("depths", [])
                vals = [
                    d.get("values", {}).get("mean")
                    for d in depths[:2]
                    if d.get("values", {}).get("mean") is not None
                ]
                if not vals:
                    continue
                mean_val = sum(vals) / len(vals)

                if name == "oc":
                    soc = mean_val / 10.0          # dg/kg → g/kg
                    result["organic_carbon_g_per_kg"] = round(soc, 1)
                    result["is_peat"]  = soc >= 200
                    result["is_peaty"] = 40 <= soc < 200
                elif name == "bdod":
                    result["bulk_density_kg_per_m3"] = round(mean_val * 10, 0)
                elif name == "phh2o":
                    result["ph"] = round(mean_val / 10.0, 1)

            logger.info(f"SoilGrids data fetched from {base_url}")
            return result

        except Exception as e:
            logger.warning(f"SoilGrids failed ({base_url}): {type(e).__name__}: {e}")
            continue

    return None


# ── UK Regional Soil Model ─────────────────────────────────────────────────────
#
# Based on:
#   - Cranfield University / NSRI National Soil Map (LandIS)
#   - Defra / NatureScot published soil carbon stock estimates
#   - JNCC UK Peatland Programme extent maps
#
# Zones are simplified from the 1:250,000 National Soil Map of England & Wales
# and the James Hutton Institute 1:250,000 soils of Scotland.
# All values are typical ranges — not point measurements.

def _uk_regional_model(lat: float, lon: float) -> dict:
    """
    Estimate soil properties from location within GB using regional soil zones.
    Returns estimates flagged as modelled, not measured.
    """
    zone = _classify_uk_zone(lat, lon)
    soc, bdod, ph, is_peat, is_peaty = _zone_properties(zone)

    return {
        "organic_carbon_g_per_kg": soc,
        "bulk_density_kg_per_m3": bdod,
        "ph": ph,
        "is_peat": is_peat,
        "is_peaty": is_peaty,
        "centroid_lat": lat,
        "centroid_lon": lon,
        "soil_zone": zone,
        "data_source": f"UK Regional Soil Model (Cranfield NSRI / James Hutton Institute) — zone: {zone}",
        "note": "Estimated from published UK soil survey regional data. SoilGrids API unavailable.",
    }


def _classify_uk_zone(lat: float, lon: float) -> str:
    """
    Classify location into UK soil zone.
    Priority: most specific first.
    """
    # ── Scotland ──────────────────────────────────────────────────────────────
    if lat >= 57.5 and lon <= -4.0:
        # Flow Country / NW Highland blanket bog — deepest peat in UK
        return "scotland_flow_country"

    if lat >= 56.5 and lon <= -3.5:
        # Highland peat and peaty gleys — Cairngorms, Grampians
        return "scotland_highland_peat"

    if lat >= 55.5 and lat < 56.5 and lon <= -3.0:
        # Southern Uplands / Galloway — peaty mineral
        return "scotland_southern_uplands"

    if lat >= 55.0 and lon > -3.0:
        # Scottish Borders / Central Belt — mineral / peaty
        return "scotland_central_belt"

    if lat >= 54.5 and lat < 55.0:
        # Northern England uplands — Pennines, North York Moors
        return "england_north_upland"

    # ── Wales ─────────────────────────────────────────────────────────────────
    if lat >= 51.3 and lat < 53.5 and lon <= -3.0:
        return "wales_upland"

    # ── England ───────────────────────────────────────────────────────────────
    if lat >= 53.0 and lon <= -1.5:
        # Pennines / Peak District / Lake District
        return "england_pennines"

    if lat >= 50.5 and lat < 53.0 and lon <= -1.0:
        # West England / Devon / Somerset Levels
        return "england_west"

    if lat >= 50.5 and lon > -1.0:
        # SE/E England — arable lowlands
        return "england_east_lowland"

    # Default: UK mineral grassland
    return "uk_mineral_grassland"


def _zone_properties(zone: str) -> tuple:
    """
    Returns (soc_g_per_kg, bulk_density_kg_per_m3, ph, is_peat, is_peaty).
    Values are typical zone medians from published UK soil surveys.
    """
    #                               SOC   BDOD    pH    peat    peaty
    table = {
        "scotland_flow_country":   (320,  110,   4.0,  True,  False),   # >200 g/kg deep blanket peat
        "scotland_highland_peat":  (185,  200,   4.2,  False, True),    # Peaty gleys, organic mineral
        "scotland_southern_uplands":(90,  500,   4.8,  False, True),    # Peaty mineral
        "scotland_central_belt":   ( 55,  850,   5.5,  False, True),    # Brown forest soils / peaty
        "england_north_upland":    (120,  350,   4.5,  False, True),    # Peat/peaty — Pennines
        "wales_upland":            (140,  300,   4.3,  False, True),    # Welsh blanket peat
        "england_pennines":        ( 80,  550,   5.0,  False, True),    # Peaty gleyed
        "england_west":            ( 35,  1050,  5.8,  False, False),   # Mineral pasture
        "england_east_lowland":    ( 18,  1350,  6.5,  False, False),   # Arable mineral
        "uk_mineral_grassland":    ( 28,  1100,  5.9,  False, False),   # Default mineral
    }
    props = table.get(zone, table["uk_mineral_grassland"])
    soc, bdod, ph, is_peat, is_peaty = props
    return soc, int(bdod), ph, is_peat, is_peaty
