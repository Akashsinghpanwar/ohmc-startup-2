"""
Full PostgreSQL schema for OHMC CarbonOS.
Tables: users, parcels, scans, projects, interest_registrations, evidence_documents
"""
import json
import logging
from db.pool import execute, fetchval, fetch

logger = logging.getLogger(__name__)

# ─── Schema SQL ───────────────────────────────────────────────────────────────
SCHEMA_SQL = """
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) UNIQUE NOT NULL,
    name           VARCHAR(255),
    role           VARCHAR(50) DEFAULT 'landowner',
    password_hash  VARCHAR(255),
    google_id      VARCHAR(255) UNIQUE,
    avatar_url     TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    org            VARCHAR(255),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate: add columns if upgrading from old schema
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- ── Land Parcels ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcels (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    land_name    VARCHAR(255) NOT NULL,
    geometry     JSONB NOT NULL,
    area_ha      DECIMAL(12,2),
    centroid_lat DECIMAL(10,6),
    centroid_lon DECIMAL(10,6),
    status       VARCHAR(50) DEFAULT 'registered',
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Eligibility Scans ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scans (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id            UUID REFERENCES parcels(id) ON DELETE SET NULL,
    user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    land_name            VARCHAR(255),
    area_ha              DECIMAL(12,2),
    centroid_lat         DECIMAL(10,6),
    centroid_lon         DECIMAL(10,6),
    eligibility_score    INTEGER,
    confidence           VARCHAR(20),
    recommended_pathway  VARCHAR(50),
    sentinel_indices     JSONB DEFAULT '{}',
    soil_data            JSONB DEFAULT '{}',
    land_cover           JSONB DEFAULT '{}',
    wcc_rules            JSONB DEFAULT '[]',
    peatland_rules       JSONB DEFAULT '[]',
    carbon_estimate      JSONB,
    ml_scores            JSONB DEFAULT '{}',
    next_steps           JSONB DEFAULT '[]',
    processing_time_ms   INTEGER,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Carbon Projects (Marketplace) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(255) NOT NULL,
    location         VARCHAR(255),
    type             VARCHAR(100),
    status           VARCHAR(50),
    area_ha          DECIMAL(12,2),
    volume_tco2e     VARCHAR(100),
    total_tco2e      VARCHAR(100),
    price_per_tco2e  DECIMAL(10,2),
    vintage          VARCHAR(50),
    methodology      VARCHAR(100),
    co_benefits      JSONB DEFAULT '[]',
    centroid_lat     DECIMAL(10,6),
    centroid_lon     DECIMAL(10,6),
    claim_guidance   TEXT,
    description      TEXT,
    proponent        VARCHAR(255),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Buyer Interest Registrations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interest_registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    buyer_name      VARCHAR(255),
    organisation    VARCHAR(255),
    email           VARCHAR(255),
    volume_interest VARCHAR(100),
    notes           TEXT,
    status          VARCHAR(50) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interest_registrations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- ── Evidence Documents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id     UUID REFERENCES parcels(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    status        VARCHAR(50) DEFAULT 'missing',
    file_url      TEXT,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Partner Assignments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id   UUID REFERENCES parcels(id) ON DELETE CASCADE,
    partner_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    status      VARCHAR(50) DEFAULT 'assigned',
    review_type VARCHAR(100),
    notes       TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_parcels_user_id   ON parcels(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_parcel_id   ON scans(parcel_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id     ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status   ON projects(status);
CREATE INDEX IF NOT EXISTS idx_interest_project  ON interest_registrations(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_parcel   ON evidence_documents(parcel_id);
"""

# ─── Seed Projects ────────────────────────────────────────────────────────────
SEED_PROJECTS = [
    {
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
        "description": "Large-scale peatland rewetting initiative in Sutherland. High peat depth confirmed by field survey.",
        "proponent": "Highland Carbon Trust",
    },
    {
        "title": "Glenfinnan Woodland Restoration",
        "location": "Inverness-shire, Scotland",
        "type": "Woodland Carbon Code",
        "status": "Pre-Validation",
        "area_ha": 320,
        "volume_tco2e": "28,500 tCO2e",
        "total_tco2e": "36,700 tCO2e",
        "methodology": "Woodland Carbon Code v2.1",
        "co_benefits": ["Biodiversity", "Soil carbon", "Recreation"],
        "centroid_lat": 56.87,
        "centroid_lon": -5.43,
        "claim_guidance": "Interest only - no offset claim permitted yet",
        "description": "Native woodland creation on upland mineral soil. WCC project developer assigned.",
        "proponent": "Glenfinnan Estates Ltd.",
    },
    {
        "title": "Cairngorms Rewilding Project",
        "location": "Highlands, Scotland",
        "type": "Reforestation",
        "status": "Verified Credit",
        "area_ha": 450,
        "volume_tco2e": "45,000 tCO2e",
        "total_tco2e": "120,000 tCO2e",
        "price_per_tco2e": 26.85,
        "methodology": "Woodland Carbon Code",
        "co_benefits": ["Biodiversity", "Recreation", "Water quality"],
        "centroid_lat": 57.1,
        "centroid_lon": -3.7,
        "claim_guidance": "Claims permitted after retirement",
        "description": "Verified WCC project with full registry listing. Credits available for retirement.",
        "proponent": "Cairngorms Wildland Partnership",
    },
    {
        "title": "Lochside Peatland Recovery",
        "location": "Perthshire, Scotland",
        "type": "Peatland Restoration",
        "status": "Validated PIU",
        "area_ha": 410,
        "volume_tco2e": "15,600 tCO2e",
        "total_tco2e": "42,000 tCO2e",
        "price_per_tco2e": 24.50,
        "methodology": "Peatland Code",
        "co_benefits": ["Carbon sequestration", "Flood mitigation", "Biodiversity"],
        "centroid_lat": 56.5,
        "centroid_lon": -3.9,
        "claim_guidance": "Future claim only — register interest for PIU allocation",
        "description": "Validated peatland restoration with PIUs issued. Buyer demand high.",
        "proponent": "Perthshire Rewilding CIC",
    },
    {
        "title": "South West Scotland Wind-Assisted Rewilding",
        "location": "Dumfries & Galloway",
        "type": "Reforestation",
        "status": "Pre-Validation",
        "area_ha": 280,
        "volume_tco2e": "9,800 tCO2e",
        "total_tco2e": "28,500 tCO2e",
        "methodology": "Woodland Carbon Code",
        "co_benefits": ["Biodiversity", "Soil carbon"],
        "centroid_lat": 55.2,
        "centroid_lon": -4.1,
        "claim_guidance": "Interest only - validation in progress",
        "description": "Mixed native woodland creation in Galloway. VVB site visit completed.",
        "proponent": "Galloway Forest Trust",
    },
    {
        "title": "Orkney Blanket Bog Restoration",
        "location": "Orkney Islands, Scotland",
        "type": "Peatland Restoration",
        "status": "Estimated Only",
        "area_ha": 890,
        "volume_tco2e": "Est. 18,000–24,000 tCO2e",
        "total_tco2e": "Over 25-year project life",
        "methodology": "Peatland Code",
        "co_benefits": ["Biodiversity", "Water quality", "Carbon sequestration"],
        "centroid_lat": 59.0,
        "centroid_lon": -3.0,
        "claim_guidance": "Preliminary estimate — professional survey required",
        "description": "Desktop assessment of Orkney blanket bog potential. High NDWI indicates good peat condition.",
        "proponent": "Orkney Nature Trust",
    },
]


async def init_db():
    """Create all tables and seed initial data."""
    logger.info("Initialising database schema...")

    # Run schema
    pool = None
    from db.pool import get_pool
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA_SQL)
    logger.info("Schema created/verified")

    # Seed projects if empty
    count = await fetchval("SELECT COUNT(*) FROM projects")
    if count == 0:
        logger.info("Seeding projects...")
        for p in SEED_PROJECTS:
            await execute(
                """
                INSERT INTO projects (
                    title, location, type, status, area_ha,
                    volume_tco2e, total_tco2e, price_per_tco2e, methodology,
                    co_benefits, centroid_lat, centroid_lon, claim_guidance,
                    description, proponent
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                """,
                p["title"], p["location"], p["type"], p["status"],
                p.get("area_ha"), p["volume_tco2e"], p["total_tco2e"],
                p.get("price_per_tco2e"), p["methodology"],
                json.dumps(p.get("co_benefits", [])),
                p["centroid_lat"], p["centroid_lon"], p["claim_guidance"],
                p.get("description"), p.get("proponent")
            )
        logger.info(f"Seeded {len(SEED_PROJECTS)} projects")
    else:
        logger.info(f"Projects table already has {count} rows — skipping seed")

    logger.info("Database ready")
