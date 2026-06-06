"""
Real soil data via SoilGrids v2.0 REST API (ISRIC World Soil Information).
Completely free, no authentication required.
https://rest.soilgrids.org/soilgrids/v2.0/properties/query
"""
import logging
import httpx

logger = logging.getLogger(__name__)

SOILGRIDS_URL = "https://rest.soilgrids.org/soilgrids/v2.0/properties/query"


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
    Query SoilGrids for soil organic carbon, bulk density, pH at parcel centroid.

    Returns:
        organic_carbon_g_per_kg: SOC in g/kg (multiply by 0.1 for % or 10 for g/kg)
        bulk_density_kg_per_m3
        ph
        is_peat: True if SOC > 200 g/kg
        is_peaty: True if SOC 40-200 g/kg
    """
    lat, lon = _centroid(geometry)

    params = {
        "lon": round(lon, 6),
        "lat": round(lat, 6),
        "property": ["oc", "bdod", "phh2o"],
        "depth": ["0-5cm", "5-15cm", "15-30cm"],
        "value": ["mean", "Q0.05", "Q0.95"],
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(SOILGRIDS_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        props = data.get("properties", {})
        layers = props.get("layers", [])

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
            if not depths:
                continue
            # Average the top two depth layers (0-5cm, 5-15cm)
            vals = []
            for depth in depths[:2]:
                v = depth.get("values", {}).get("mean")
                if v is not None:
                    vals.append(v)
            if not vals:
                continue
            mean_val = sum(vals) / len(vals)

            if name == "oc":
                # SoilGrids OC is in dg/kg (decigrams per kg) → convert to g/kg
                soc_g_per_kg = mean_val / 10.0
                result["organic_carbon_g_per_kg"] = round(soc_g_per_kg, 1)
                result["is_peat"] = soc_g_per_kg >= 200
                result["is_peaty"] = 40 <= soc_g_per_kg < 200
            elif name == "bdod":
                # SoilGrids bdod is in cg/cm³ → convert to kg/m³ (* 10)
                result["bulk_density_kg_per_m3"] = round(mean_val * 10, 0)
            elif name == "phh2o":
                # SoilGrids pH is x10 → divide by 10
                result["ph"] = round(mean_val / 10.0, 1)

        return result

    except httpx.HTTPStatusError as e:
        logger.warning(f"SoilGrids HTTP error {e.response.status_code}: {e}")
        return _fallback_soil(lat, lon)
    except Exception as e:
        logger.error(f"SoilGrids error: {e}")
        return _fallback_soil(lat, lon)


def _fallback_soil(lat: float, lon: float) -> dict:
    """Return a cautious fallback when SoilGrids is unavailable."""
    return {
        "organic_carbon_g_per_kg": None,
        "bulk_density_kg_per_m3": None,
        "ph": None,
        "is_peat": False,
        "is_peaty": False,
        "centroid_lat": lat,
        "centroid_lon": lon,
        "data_source": "SoilGrids v2.0 (unavailable - offline fallback)",
        "error": "Could not retrieve soil data",
    }
