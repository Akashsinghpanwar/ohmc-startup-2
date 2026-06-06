"""
Real Sentinel-2 data via Element84 Earth Search STAC API.
No authentication required. COG band data via rasterio range requests.
"""
import os
import logging
from typing import Optional
import httpx
import numpy as np

logger = logging.getLogger(__name__)

STAC_BASE = "https://earth-search.aws.element84.com/v1"
COLLECTION = "sentinel-2-l2a"

# GDAL config for COG range requests (set before rasterio import)
os.environ.setdefault("GDAL_HTTP_MERGE_CONSECUTIVE_RANGES", "YES")
os.environ.setdefault("GDAL_HTTP_MULTIPLEX", "YES")
os.environ.setdefault("CPL_VSIL_CURL_CACHE_SIZE", "200000000")
os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")  # public S3 buckets


def _bbox_from_geometry(geometry: dict) -> list[float]:
    """Extract bounding box [minx, miny, maxx, maxy] from GeoJSON geometry."""
    coords = []
    if geometry["type"] == "Polygon":
        coords = geometry["coordinates"][0]
    elif geometry["type"] == "MultiPolygon":
        for ring in geometry["coordinates"]:
            coords.extend(ring[0])
    else:
        raise ValueError(f"Unsupported geometry type: {geometry['type']}")
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return [min(xs), min(ys), max(xs), max(ys)]


def _centroid(geometry: dict) -> tuple[float, float]:
    bbox = _bbox_from_geometry(geometry)
    return (bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2


async def search_sentinel_items(bbox: list[float], max_cloud: int = 25, max_items: int = 10) -> list:
    """Query Element84 STAC for Sentinel-2 L2A scenes covering bbox."""
    params = {
        "collections": COLLECTION,
        "bbox": ",".join(str(v) for v in bbox),
        "datetime": "2024-01-01T00:00:00Z/2025-06-01T00:00:00Z",
        "limit": max_items,
        "sortby": "-datetime",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{STAC_BASE}/search", params=params)
        resp.raise_for_status()
        features = resp.json().get("features", [])

    # Filter by cloud cover
    features = [
        f for f in features
        if f.get("properties", {}).get("eo:cloud_cover", 100) <= max_cloud
    ]
    return features


def _read_cog_chip(href: str, bbox: list[float]) -> Optional[np.ndarray]:
    """Read a small spatial chip from a COG file using rasterio range requests."""
    try:
        import rasterio
        from rasterio.windows import from_bounds
        from rasterio.crs import CRS
        from rasterio.warp import transform_bounds

        with rasterio.open(href) as src:
            # Transform bbox to dataset CRS if needed
            if src.crs and src.crs != CRS.from_epsg(4326):
                minx, miny, maxx, maxy = transform_bounds(
                    "EPSG:4326", src.crs, bbox[0], bbox[1], bbox[2], bbox[3]
                )
            else:
                minx, miny, maxx, maxy = bbox

            window = from_bounds(minx, miny, maxx, maxy, src.transform)
            # Clamp window to dataset bounds
            window = window.intersection(
                rasterio.windows.Window(0, 0, src.width, src.height)
            )
            if window.width < 1 or window.height < 1:
                return None
            data = src.read(1, window=window).astype(np.float32)
            # Replace nodata
            nodata = src.nodata if src.nodata is not None else 0
            data = np.where(data == nodata, np.nan, data)
            return data
    except Exception as e:
        logger.warning(f"COG read failed for {href[:60]}...: {e}")
        return None


def _resolve_asset_href(item: dict, band_names: list[str]) -> Optional[str]:
    """Find asset href trying multiple possible key names."""
    assets = item.get("assets", {})
    for name in band_names:
        if name in assets:
            href = assets[name].get("href", "")
            if href:
                return href
    return None


def compute_indices_from_item(item: dict, bbox: list[float]) -> dict:
    """
    Compute spectral indices from a Sentinel-2 STAC item.
    Returns dict of computed values (float means, nan-safe).
    """
    # Asset key alternatives: Element84 uses common names like "red", "nir"
    band_map = {
        "nir":   ["nir", "B08", "B8", "nir08"],
        "red":   ["red", "B04", "B4"],
        "green": ["green", "B03", "B3"],
        "blue":  ["blue", "B02", "B2"],
        "swir1": ["swir16", "B11", "SWIR16"],
        "swir2": ["swir22", "B12", "SWIR22"],
    }

    bands = {}
    for band, keys in band_map.items():
        href = _resolve_asset_href(item, keys)
        if href:
            chip = _read_cog_chip(href, bbox)
            if chip is not None and chip.size > 0:
                # Normalise Sentinel-2 L2A reflectance (0-10000 scale to 0-1)
                chip = chip / 10000.0
                chip = np.where(chip > 1, np.nan, chip)
                chip = np.where(chip < 0, np.nan, chip)
                mean_val = float(np.nanmean(chip)) if not np.all(np.isnan(chip)) else None
                bands[band] = mean_val

    indices = {}

    nir = bands.get("nir")
    red = bands.get("red")
    green = bands.get("green")
    swir1 = bands.get("swir1")
    swir2 = bands.get("swir2")
    blue = bands.get("blue")

    # NDVI: (NIR - Red) / (NIR + Red)
    if nir is not None and red is not None and (nir + red) != 0:
        indices["ndvi"] = round((nir - red) / (nir + red), 4)

    # NDWI (McFeeters): (Green - NIR) / (Green + NIR) — water presence
    if green is not None and nir is not None and (green + nir) != 0:
        indices["ndwi"] = round((green - nir) / (green + nir), 4)

    # NDMI: (NIR - SWIR1) / (NIR + SWIR1) — moisture content
    if nir is not None and swir1 is not None and (nir + swir1) != 0:
        indices["ndmi"] = round((nir - swir1) / (nir + swir1), 4)

    # Bare Soil Index (BSI): ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
    if swir1 and red and nir and blue:
        num = (swir1 + red) - (nir + blue)
        den = (swir1 + red) + (nir + blue)
        if den != 0:
            indices["bare_soil_index"] = round(num / den, 4)

    # SWIR ratio (B11/B12) — peat burn indicator
    if swir1 and swir2 and swir2 != 0:
        indices["swir_ratio"] = round(swir1 / swir2, 4)

    return indices


async def get_satellite_indices(geometry: dict) -> dict:
    """
    Main entry point: fetch real Sentinel-2 indices for a GeoJSON geometry.
    Returns indices dict or fallback with data_source note.
    """
    try:
        bbox = _bbox_from_geometry(geometry)
        items = await search_sentinel_items(bbox, max_cloud=30, max_items=5)

        if not items:
            logger.info("No Sentinel-2 scenes found, trying wider cloud tolerance")
            items = await search_sentinel_items(bbox, max_cloud=60, max_items=5)

        if not items:
            return {"error": "No Sentinel-2 scenes available for this location", "data_source": "Sentinel-2 (no scenes found)"}

        # Pick least cloudy
        best = min(items, key=lambda x: x.get("properties", {}).get("eo:cloud_cover", 100))
        props = best.get("properties", {})

        indices = compute_indices_from_item(best, bbox)

        return {
            **indices,
            "acquisition_date": props.get("datetime", "")[:10],
            "cloud_cover": props.get("eo:cloud_cover"),
            "scene_id": best.get("id", ""),
            "data_source": "Sentinel-2 L2A (Element84 STAC / AWS)",
        }

    except Exception as e:
        logger.error(f"Sentinel-2 fetch error: {e}")
        return {
            "error": str(e),
            "data_source": "Sentinel-2 (fetch failed)",
        }
