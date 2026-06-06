import json
import uuid
from datetime import datetime
from pathlib import Path

DB_FILE = Path(__file__).parent / "carbonos_db.json"


def _load():
    if DB_FILE.exists():
        with open(DB_FILE) as f:
            return json.load(f)
    return {"parcels": {}, "scans": {}, "projects": _seed_projects()}


def _save(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _seed_projects():
    return {
        "proj-001": {
            "id": "proj-001",
            "title": "Strathview Moor Peatland",
            "location": "Sutherland, Scotland",
            "type": "Peatland Restoration",
            "status": "Estimated Only",
            "area_ha": 1245,
            "volume_tco2e": "Est. 28,500–36,700 tCO2e",
            "total_tco2e": "Over 30-year project life",
            "methodology": "Peatland Code",
            "co_benefits": ["Biodiversity", "Water quality", "Flood regulation"],
            "centroid_lat": 58.0,
            "centroid_lon": -4.5,
            "claim_guidance": "Estimate only - no offset claim permitted",
        },
        "proj-002": {
            "id": "proj-002",
            "title": "Glenfinnan Woodland Restoration",
            "location": "Scotland, UK",
            "type": "Woodland Carbon Code",
            "status": "Pre-Validation",
            "area_ha": 320,
            "volume_tco2e": "28,500 tCO2e",
            "total_tco2e": "36,700 tCO2e",
            "methodology": "Woodland Carbon Code v2.1",
            "co_benefits": ["Biodiversity", "Soil carbon"],
            "centroid_lat": 56.87,
            "centroid_lon": -5.43,
            "claim_guidance": "Interest only - no offset claim permitted yet",
        },
        "proj-003": {
            "id": "proj-003",
            "title": "Cairngorms Rewilding Project",
            "location": "Highlands, Scotland",
            "type": "Reforestation",
            "status": "Verified Credit",
            "area_ha": 450,
            "volume_tco2e": "45,000 tCO2e",
            "total_tco2e": "120,000 tCO2e",
            "price_per_tco2e": 26.85,
            "methodology": "Woodland Carbon Code",
            "co_benefits": ["Biodiversity", "Recreation"],
            "centroid_lat": 57.1,
            "centroid_lon": -3.7,
            "claim_guidance": "Claims permitted after retirement",
        },
    }


def create_parcel(data: dict) -> dict:
    db = _load()
    parcel_id = str(uuid.uuid4())[:8]
    record = {
        "id": parcel_id,
        "created_at": datetime.utcnow().isoformat(),
        **data,
    }
    db["parcels"][parcel_id] = record
    _save(db)
    return record


def get_parcel(parcel_id: str) -> dict | None:
    return _load()["parcels"].get(parcel_id)


def list_parcels() -> list:
    return list(_load()["parcels"].values())


def save_scan(parcel_id: str, scan: dict):
    db = _load()
    db["scans"][parcel_id] = scan
    if parcel_id in db["parcels"]:
        db["parcels"][parcel_id]["last_scan"] = datetime.utcnow().isoformat()
        db["parcels"][parcel_id]["eligibility_score"] = scan.get("eligibility_score")
        db["parcels"][parcel_id]["pathway"] = scan.get("recommended_pathway")
    _save(db)


def list_projects() -> list:
    return list(_load()["projects"].values())


def get_project(project_id: str) -> dict | None:
    return _load()["projects"].get(project_id)
