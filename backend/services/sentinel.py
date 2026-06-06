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
# Collection 1 (current) → legacy fallback order
COLLECTIONS = ["sentinel-2-c1-l2a", "sentinel-2-l2a", "sentinel-2-pre-c1-l2a"]

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
    """
    Query Element84 STAC for Sentinel-2 L2A scenes covering bbox.
    Tries each collection in order, returns first non-empty result.
    Date range: 2 years rolling window to always capture recent data.
    """
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    date_from = (now - timedelta(days=730)).strftime("%Y-%m-%dT00:00:00Z")
    date_to   = now.strftime("%Y-%m-%dT23:59:59Z")

    async with httpx.AsyncClient(timeout=30) as client:
        for collection in COLLECTIONS:
            try:
                params = {
                    "collections": collection,
                    "bbox": ",".join(str(v) for v in bbox),
                    "datetime": f"{date_from}/{date_to}",
                    "limit": max_items,
                }
                resp = await client.get(f"{STAC_BASE}/search", params=params)
                resp.raise_for_status()
                features = resp.json().get("features", [])
                # Filter by cloud cover, then sort by date descending (most recent first)
                features = [
                    f for f in features
                    if f.get("properties", {}).get("eo:cloud_cover", 100) <= max_cloud
                ]
                features.sort(
                    key=lambda f: f.get("properties", {}).get("datetime", ""),
                    reverse=True,
                )
                if features:
                    logger.info(f"Found {len(features)} scenes in {collection}")
                    return features
            except Exception as e:
                logger.warning(f"STAC search failed for {collection}: {e}")
                continue

    return []


def _read_cog_chip(href: str, bbox: list[float]) -> Optional[np.ndarray]:
    """
    Read a spatial chip from a COG using the lowest available overview level
    to minimise data transfer.  Returns float32 array of raw DN values.
    """
    try:
        import rasterio
        from rasterio.windows import from_bounds
        from rasterio.warp import transform_bounds
        from rasterio.enums import Resampling

        with rasterio.open(href) as src:
            # Transform bbox to dataset CRS
            if src.crs and src.crs.to_epsg() != 4326:
                minx, miny, maxx, maxy = transform_bounds(
                    "EPSG:4326", src.crs, bbox[0], bbox[1], bbox[2], bbox[3]
                )
            else:
                minx, miny, maxx, maxy = bbox

            window = from_bounds(minx, miny, maxx, maxy, src.transform)
            window = window.intersection(
                rasterio.windows.Window(0, 0, src.width, src.height)
            )
            if window.width < 1 or window.height < 1:
                return None

            # Use lowest overview (≤128px wide) to minimise bytes transferred
            # COG overviews allow fast statistics without reading the full tile
            out_size = 64   # read as tiny thumbnail — enough for mean reflectance
            data = src.read(
                1,
                window=window,
                out_shape=(out_size, out_size),
                resampling=Resampling.average,
            ).astype(np.float32)

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


def _read_band_mean(item: dict, band_keys: list[str], bbox: list[float]) -> Optional[float]:
    """Read a single band and return its mean reflectance (0-1), or None on failure."""
    href = _resolve_asset_href(item, band_keys)
    if not href:
        return None
    chip = _read_cog_chip(href, bbox)
    if chip is None or chip.size == 0:
        return None
    chip = chip / 10000.0
    chip = np.where((chip <= 0) | (chip > 1), np.nan, chip)
    if np.all(np.isnan(chip)):
        return None
    return float(np.nanmean(chip))


async def _compute_indices_async(item: dict, bbox: list[float]) -> dict:
    """
    Compute spectral indices running each COG band read in a thread executor
    so we don't block the asyncio event loop.
    """
    import asyncio
    loop = asyncio.get_event_loop()

    band_map = {
        "nir":   ["nir", "B08", "B8", "nir08"],
        "red":   ["red", "B04", "B4"],
        "green": ["green", "B03", "B3"],
        "blue":  ["blue", "B02", "B2"],
        "swir1": ["swir16", "B11", "SWIR16"],
        "swir2": ["swir22", "B12", "SWIR22"],
    }

    # Read all bands concurrently in thread pool — 20s timeout per band
    tasks = {
        band: loop.run_in_executor(None, _read_band_mean, item, keys, bbox)
        for band, keys in band_map.items()
    }
    bands = {}
    for band, task in tasks.items():
        try:
            val = await asyncio.wait_for(task, timeout=40)
            if val is not None:
                bands[band] = val
        except asyncio.TimeoutError:
            logger.warning(f"Timeout reading band {band}")
        except Exception as e:
            logger.warning(f"Error reading band {band}: {e}")

    return bands


def compute_indices_from_item(item: dict, bbox: list[float]) -> dict:
    """
    Compute spectral indices from a Sentinel-2 STAC item (sync wrapper).
    Called from the async path via _compute_indices_async.
    """
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
        val = _read_band_mean(item, keys, bbox)
        if val is not None:
            bands[band] = val

    return _indices_from_bands(bands)


def _indices_from_bands(bands: dict) -> dict:
    """Compute spectral indices from a dict of {band_name: mean_reflectance}."""
    nir   = bands.get("nir")
    red   = bands.get("red")
    green = bands.get("green")
    swir1 = bands.get("swir1")
    swir2 = bands.get("swir2")
    blue  = bands.get("blue")
    indices = {}

    if nir is not None and red is not None and (nir + red) != 0:
        indices["ndvi"] = round((nir - red) / (nir + red), 4)
    if green is not None and nir is not None and (green + nir) != 0:
        indices["ndwi"] = round((green - nir) / (green + nir), 4)
    if nir is not None and swir1 is not None and (nir + swir1) != 0:
        indices["ndmi"] = round((nir - swir1) / (nir + swir1), 4)
    if swir1 and red and nir and blue:
        num = (swir1 + red) - (nir + blue)
        den = (swir1 + red) + (nir + blue)
        if den != 0:
            indices["bare_soil_index"] = round(num / den, 4)
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
        # Start permissive — UK/Scotland is frequently >50% cloud cover.
        # Always pick the least-cloudy available scene.
        items = await search_sentinel_items(bbox, max_cloud=95, max_items=10)

        if not items:
            return {"error": "No Sentinel-2 scenes available for this location", "data_source": "Sentinel-2 (no scenes found)"}

        # Pick least cloudy scene
        best = min(items, key=lambda x: x.get("properties", {}).get("eo:cloud_cover", 100))
        props = best.get("properties", {})

        indices = _indices_from_bands(await _compute_indices_async(best, bbox))

        collection_id = best.get("collection", "sentinel-2-c1-l2a")
        cloud_cover = props.get("eo:cloud_cover")
        cloud_note = f" · {cloud_cover:.0f}% cloud" if cloud_cover is not None else ""
        return {
            **indices,
            "acquisition_date": props.get("datetime", "")[:10],
            "cloud_cover": cloud_cover,
            "scene_id": best.get("id", ""),
            "collection": collection_id,
            "data_source": f"Sentinel-2 L2A · {collection_id}{cloud_note} (Element84/AWS)",
        }

    except Exception as e:
        logger.error(f"Sentinel-2 fetch error: {e}")
        return {
            "error": str(e),
            "data_source": "Sentinel-2 (fetch failed)",
        }
