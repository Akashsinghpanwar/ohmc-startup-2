<div align="center">

<img src="https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=900&h=300&q=85" alt="Scottish Highlands" width="100%" style="border-radius:12px"/>

# 🌿 OHMC CarbonOS

**First-mile infrastructure for UK land-based carbon markets**

*Connecting small landowners to verified carbon income — with real satellite data, standards-bound rules, and integrity-first design*

[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Sentinel-2](https://img.shields.io/badge/Sentinel--2-L2A%20Real%20Data-16a34a?logo=satellite&logoColor=white)](#sentinel-2)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-4169e1?logo=postgresql&logoColor=white)](https://neon.tech)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

---

### 🎯 What does this do?

> A farmer in Sutherland has 80 hectares of degraded peatland worth **£135,000** in carbon income.  
> He doesn't know it. He can't access it. OHMC CarbonOS changes that — in under 60 seconds.

---

[🚀 Quick Start](#-quick-start) · [🛰️ How It Works](#%EF%B8%8F-how-it-works) · [📊 The Problem](#-the-problem) · [🏗️ Architecture](#%EF%B8%8F-architecture) · [📖 API Docs](#-api-reference)

</div>

---

## 📊 The Problem

### UK carbon markets exist. Small landowners can't access them.

The UK has some of the richest carbon-storing land in Europe — but the route from raw land to a saleable carbon credit involves **9 specialist steps**, years of waiting, and £10,000+ in upfront costs that only large estates can afford.

```
Without OHMC                          With OHMC CarbonOS
─────────────────────────────────     ──────────────────────────────────
Step 1: Which standard applies?  ──►  Draw boundary on map        (30s)
Step 2: Ecological survey        ──►  Real satellite scan          (45s)
Step 3: Project Design Document  ──►  Eligibility score + report   (60s)
Step 4: Find a VVB               ──►  Matched partner routing       (1d)
Step 5: VVB desk review          ──►  Pre-screened evidence pack    (1w)
Step 6: Address non-conformances ──►  Structured workflow           ...
Step 7: Registry validation      ──►  Tracked journey               ...
Step 8: Find a buyer             ──►  Marketplace matching          ...
Step 9: Verification (5-10 yrs)  ──►  Ongoing MRV monitoring        ...

Average without help: 3–5 YEARS     Average first result: < 60 SECONDS
Average upfront cost: £10,000+      Cost for first scan: FREE
```

### The numbers behind the problem

| What | How Much | Source |
|------|----------|--------|
| Scottish WCC carbon pipeline | **£617 million** | Woodland Carbon Code registry |
| Average WCC credit price (2024) | **£26.85 / tonne** | UK Land Carbon Registry |
| Degraded peatland in Scotland | **1.4 million ha** | IUCN UK Peatland Programme |
| Projects accessible to small landowners | **< 5%** | OHMC analysis |
| Average validation cost per project | **£10,000+** | Industry estimates |
| Break-even parcel size (current costs) | **~500 ha** | OHMC analysis |

> **The gap:** BeZero Carbon and Sylvera have each raised $100M+ for *buyer-side* tools.  
> Nobody has built the *landowner-side* infrastructure. That is what CarbonOS does.

---

## 🛰️ How It Works

### Step 1 — Draw Your Land Boundary

![Map Drawing](https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=900&h=300&q=80)

Open the interactive map, click around your land parcel, and close the boundary. That's it.

```
You click 5 points on a map.
We send a GeoJSON polygon to the backend.
```

---

### Step 2 — Real Satellite Data Is Fetched

The moment you click **Run Eligibility Scan**, two things happen in parallel:

```
Your Browser                  OHMC Backend                   External APIs
─────────────                 ────────────                   ─────────────
Draw polygon ──► POST /api/eligibility/scan
                         │
                         ├──► Element84 STAC API ──► Sentinel-2 C1 L2A
                         │         Find least-cloudy scene
                         │         Download 64×64 pixel chips for bbox
                         │         Compute: NDVI · NDWI · NDMI · BSI
                         │
                         └──► UK Regional Soil Model
                                   (Cranfield NSRI / James Hutton Inst.)
                                   Lookup by lat/lon zone:
                                   SOC · Bulk Density · pH · Peat class
                         │
                         ├──► Eligibility Rules Engine
                         │         WCC rules (6 checks)
                         │         Peatland Code rules (6 checks)
                         │
                         ├──► LightGBM ML Scorer → score 0-100
                         │
                         ├──► Carbon Calculator → £ estimate
                         │
                         └──► Nominatim → Place name
                                   Save to Neon PostgreSQL
                                   Return full JSON result ──► Your Screen
```

**This all happens in under 60 seconds. No login required for the first scan.**

---

### Step 3 — Real Indices From Real Pixels

The platform reads **actual satellite pixels** over your drawn boundary — not a database lookup.

| Index | Formula | What It Tells Us |
|-------|---------|-----------------|
| **NDVI** | `(NIR - Red) / (NIR + Red)` | Vegetation density. Low = degraded / bare peat |
| **NDWI** | `(Green - NIR) / (Green + NIR)` | Water content. Negative = dry/drained peat |
| **NDMI** | `(NIR - SWIR1) / (NIR + SWIR1)` | Canopy moisture. Peat proxy |
| **BSI** | `((SWIR1+Red)-(NIR+Blue)) / ...` | Bare soil / exposed peat |

> Satellite: **Sentinel-2 Collection 1 L2A** via Element84 STAC (AWS)  
> Resolution: **10 metres** · Data: **ESA Copernicus Open Access** · Cost: **Free**

---

### Step 4 — Standards-Bound Rules Engine

Every scan is run through the two UK standards that actually matter:

```
Woodland Carbon Code (WCC)          Peatland Code
────────────────────────────        ─────────────────────────────��
✓ Area ≥ 1 ha                       ✓ Area ≥ 2 ha
✓ Not already dense woodland        ✓ Peat / peaty soil present
✓ Not deep peat (use Peatland Code) ✓ Degraded condition (NDWI < 0)
✓ NDVI suitable for afforestation   ✓ Bare peat present (BSI)
✓ Soil pH 3.5–7.5                   ✓ Not predominantly woodland
✓ Not waterlogged (NDWI < 0.3)      ✓ Peatland land cover ≥ 30%
```

Each rule shows **pass / fail**, the measured value, and what it means.

---

### Step 5 — Carbon Estimate With Full Workings

```
Example output for 80 ha upland peat, Sutherland:

Pathway:          Peatland Code
Eligible Area:    80 ha
Crediting Period: 30 years
Annual Rate:      3.0 tCO₂e / ha / year  (degraded condition)
Gross Units:      7,200 tCO₂e
Risk Buffer:      -25%
Net Units:        5,400 tCO₂e

              Low (£15/t)    Mid (£26.85/t)    High (£38/t)
              ──────────     ──────────────    ────────────
Total:        £60,750        £108,742          £153,900
Per year:     £2,025         £3,625            £5,130
```

> ⚠️ Preliminary pre-screening estimate only. Not a verified credit or guaranteed revenue.

---

### Step 6 — Download a Professional PDF Report

Click **Download PDF Report** and get a 4-page professional PDF with:

- Cover page with OHMC logo, parcel name, score
- Your exact boundary coordinates (every vertex you drew)
- Full satellite indices with interpretations
- Soil properties table
- WCC + Peatland Code rules (pass/fail)
- Financial projections table
- Next steps + legal disclaimer

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND  (React 19 + Vite 7)                │
│                                                                 │
│   HomePage    AuthPage    AppShell (7 authenticated screens)    │
│      │           │              │                               │
│  Marketing    Login/Signup   BoundaryMap  EligibilityScreen     │
│  site (12       (JWT +       (Leaflet.js)  ReportScreen         │
│  sections)     Google        draw tool)   MarketplaceScreen     │
│                OAuth)                     PartnerPortal         │
│                                                                 │
│   jsPDF + autoTable ──► 4-page PDF generation in browser       │
└──────────────────────────┬──────────────────────────────────────┘
                           │  Axios REST
┌──────────────────────────▼──────────────────────────────────────┐
│                  BACKEND  (FastAPI + Python)                    │
│                                                                 │
│  POST /api/eligibility/scan  ← main endpoint                   │
│       │                                                         │
│       ├── pyproj Geod ──► Geodesic area (ha)                   │
│       │                                                         │
│       ├── Sentinel-2 pipeline:                                  │
│       │     Element84 STAC search → pick least cloudy scene    │
│       │     rasterio COG reads (thread pool, 64×64 overview)   │
│       │     NDVI · NDWI · NDMI · BSI computation               │
│       │                                                         │
│       ├── Soil pipeline:                                        │
│       │     SoilGrids v2 REST API (primary)                    │
│       │     UK Regional Soil Model (fallback)                  │
│       │     Cranfield NSRI + James Hutton Institute zones      │
│       │                                                         │
│       ├── Rules Engine (deterministic):                         │
│       │     WCC v2.1 rules · Peatland Code v1.1 rules          │
│       │                                                         │
│       ├── ML scoring (LightGBM + Random Forest)                │
│       │                                                         │
│       ├── Carbon Calculator (WCC rate tables + Peatland EF)    │
│       │                                                         │
│       └── Nominatim reverse geocode → save to Neon PostgreSQL  │
│                                                                 │
│  GET  /api/eligibility/history                                  │
│  GET  /api/marketplace/projects                                 │
│  POST /api/auth/signup · /login · /google                      │
└──────────────────────────────────────────────────────���───────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
  │ Sentinel-2  │  │  Neon        │  │  Nominatim  │
  │ C1 L2A COGs │  │  PostgreSQL  │  │  (OSM)      │
  │ AWS S3      │  │  (serverless)│  │  Geocoding  │
  └─────────────┘  └──────────────┘  └─────────────┘
```

---

## 📁 Project Structure

```
ohmc/
│
├── 📂 src/                          React 19 frontend
│   ├── 📂 pages/
│   │   ├── HomePage.jsx             Public marketing site (12 sections)
│   │   └── AuthPage.jsx             Login + signup
│   ├── 📂 components/
│   │   └── BoundaryMap.jsx          Leaflet interactive map + polygon drawing
│   ├── 📂 services/
│   │   └── api.js                   Axios HTTP client
│   ├── 📂 utils/
│   │   └── generatePDF.js           4-page jsPDF report generator
│   ├── App.jsx                      App shell + all authenticated screens
│   └── styles.css                   Global CSS (government-style green/white)
│
├── 📂 backend/                      FastAPI Python backend
│   ├── 📂 api/routes/
│   │   ├── eligibility.py           Main scan endpoint + reverse geocoding
│   │   ├── marketplace.py           Carbon project listings
│   │   ├── auth.py                  JWT + Google OAuth
│   │   ├── projects.py              Project CRUD
│   │   └── parcels.py               Geometry storage
│   ├── 📂 services/
│   │   ├── sentinel.py              Sentinel-2 STAC + COG pipeline
│   │   ├── soil.py                  SoilGrids + UK regional model fallback
│   │   ├── eligibility_engine.py    WCC + Peatland Code rules
│   │   ├── carbon_calculator.py     Carbon + revenue estimates
│   │   └── 📂 ml/
│   │       ├── eligibility_scorer.py  LightGBM scorer
│   │       └── peatland_model.py      Random Forest classifier
│   ├── 📂 models/
│   │   └── schemas.py               Pydantic request/response models
│   ├── 📂 db/
│   │   ├── schema.py                PostgreSQL table definitions
│   │   └── pool.py                  Neon connection pooling
│   ├── main.py                      FastAPI app entry point
│   └── requirements.txt
│
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚀 Quick Start

### What you need

- **Node.js** 18+ and npm
- **Python** 3.11+
- A free **[Neon PostgreSQL](https://neon.tech)** database

---

### 1. Clone & install frontend

```bash
git clone https://github.com/Akashsinghpanwar/ohmc-startup-2.git
cd ohmc
npm install
npm run dev
# → Opens at http://localhost:5173
```

---

### 2. Set up backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt
```

---

### 3. Configure environment

Create `backend/.env` (never commit this file — it's in `.gitignore`):

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your-secret-key-here-make-it-long-and-random
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=168
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=          # optional — for Google OAuth
GOOGLE_CLIENT_SECRET=      # optional — for Google OAuth
```

---

### 4. Start backend

```bash
cd backend
uvicorn main:app --reload --port 8000
# → API at http://localhost:8000
# → Swagger docs at http://localhost:8000/docs
```

---

### 5. Seed the marketplace (optional)

```bash
cd backend
python seed_real_projects.py
# Adds sample UK WCC and Peatland Code project listings
```

---

### 6. Try a scan

1. Open `http://localhost:5173`
2. Sign up or log in
3. Go to **Scan Land**
4. Click around any area in Scotland on the map
5. Click **Close & Finish Boundary**
6. Click **Run Eligibility Scan**
7. See real satellite data from that exact location

---

## 📖 API Reference

### Core endpoint: `POST /api/eligibility/scan`

**Request:**
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [[-4.5, 57.0], [-4.0, 57.0], [-4.0, 57.5], [-4.5, 57.5], [-4.5, 57.0]]
    ]
  },
  "land_name": "North Moor, Sutherland"
}
```

**Response:**
```json
{
  "parcel_id": "uuid",
  "land_name": "North Moor, Sutherland",
  "area_ha": 2187.4,
  "centroid_lat": 57.25,
  "centroid_lon": -4.25,
  "place_name": "Lairg, Highland, Scotland",
  "boundary_coordinates": [
    {"point": 1, "lat": 57.0, "lon": -4.5},
    {"point": 2, "lat": 57.0, "lon": -4.0}
  ],
  "eligibility_score": 74,
  "confidence": "high",
  "recommended_pathway": "peatland",
  "sentinel_indices": {
    "ndvi": 0.1714,
    "ndwi": -0.1672,
    "ndmi": 0.1365,
    "bare_soil_index": -0.0716,
    "acquisition_date": "2026-06-05",
    "cloud_cover": 63.3,
    "scene_id": "S2B_T30VVJ_20260605T113321_L2A",
    "data_source": "Sentinel-2 L2A · sentinel-2-c1-l2a (Element84/AWS)"
  },
  "soil_data": {
    "organic_carbon_g_per_kg": 185,
    "bulk_density_kg_per_m3": 200,
    "ph": 4.2,
    "is_peat": false,
    "is_peaty": true,
    "data_source": "UK Regional Soil Model (Cranfield NSRI)"
  },
  "wcc_rules": [
    {"rule": "Minimum area (≥ 1 ha)", "passed": true, "value": "2187.4 ha", "note": "..."}
  ],
  "peatland_rules": [...],
  "carbon_estimate": {
    "pathway": "peatland",
    "eligible_area_ha": 2187.4,
    "crediting_years": 30,
    "net_units_tco2e": 4593,
    "mid_value_gbp": 98195
  },
  "next_steps": ["Commission independent peat depth survey", ...],
  "processing_time_ms": 4821
}
```

### Other endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/eligibility/history` | Previous scans |
| GET | `/api/eligibility/scan/{id}` | Get scan by ID |
| GET | `/api/marketplace/projects` | All carbon projects |
| POST | `/api/projects/{id}/interest` | Register buyer interest |
| GET | `/api/health` | API health check |

---

## 🌱 Standards We Are Built On

### Woodland Carbon Code (WCC)
- UK standard for new woodland creation
- Credits: **PIUs** (Pending Issuance Units) → **WCUs** (Woodland Carbon Units after verification)
- Registry: **UK Land Carbon Registry**
- Average price: **£26.85 / WCU** (2024)
- Governed by: **Scottish Forestry**

### Peatland Code
- UK standard for peatland restoration
- Scotland has **80% of UK peatland carbon** across **1.4 million degraded hectares**
- Restoration target: **250,000 ha by 2030** (Scottish Government)
- Governed by: **IUCN UK Peatland Programme**

> ⚠️ **PIUs ≠ verified credits.** They cannot be used for offset claims, reported in net-zero disclosures, or listed on an exchange until independently verified by an accredited VVB.

---

## 🗺️ Roadmap

```
Phase 1          Phase 2          Phase 3          Phase 4          Phase 5
[LIVE NOW]       [BUILDING]       [PLANNED]        [PLANNED]        [POLICY-GATED]
────────────     ────────────     ────────────     ────────────     ────────────
Free Eligibility Paid Reports     Certification    Buyer            Consumer
Scanner          & Partners       Workflow         Marketplace      Wallet

✅ Boundary      📋 £99-£499      📋 MRV           📋 Curated       ⛔ Requires:
   drawing          paid report      workbench         listings        Verified
✅ Sentinel-2    📋 Evidence      📋 VVB collab    📋 Retirement       supply
   scan             pack gen         portal            evidence        Policy
✅ WCC + Peat    📋 VVB partner   📋 Registry      📋 ESG              clearance
   rules            routing          connector         dashboard       Trust
✅ Carbon        📋 Document                                           established
   estimate         vault
✅ PDF report
✅ Boundary map
   + coords
```

---

## ⚠️ Important Disclaimers

1. **All platform outputs are preliminary screening estimates.** They do not constitute certified carbon credits, verified units, investment advice, or guaranteed revenue.

2. **PIUs are not verified credits** and may not be used for offset claims or sustainability disclosures under UK Land Carbon Registry rules.

3. **Carbon credit issuance requires independent VVB validation.** OHMC CarbonOS pre-screens land — it does not certify or issue credits.

4. **OHMC acts as a trusted mediator only.** We do not underwrite, certify, or guarantee any carbon project outcome.

5. **ML models are for screening only.** All eligibility determinations for standards compliance use deterministic rules, not machine learning.

---

## 🔧 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + Vite 7 | Fast, modern SPA |
| Map | Leaflet + react-leaflet | Free, open, no API key |
| PDF | jsPDF + autotable | Client-side PDF, no server needed |
| HTTP | Axios | Simple REST client |
| Backend | FastAPI (Python) | Fast async API, auto docs |
| Database | Neon PostgreSQL | Serverless, free tier |
| Satellite | Sentinel-2 C1 L2A | Real ESA Copernicus data, free |
| STAC | Element84 Earth Search | Free Sentinel-2 scene catalog |
| Rasterio | COG range reads | Read satellite pixels without download |
| Soil | SoilGrids v2 + UK model | Real published soil survey data |
| Geocoding | Nominatim (OSM) | Free reverse geocoding |
| Area calc | pyproj Geod WGS84 | Geodesic accuracy |
| ML | LightGBM + scikit-learn | Fast, lightweight models |
| Auth | JWT + Google OAuth | Standard secure auth |

---

<div align="center">

---

*Built with real satellite data · Aligned to real UK standards · For real landowners*

**© OHMC 2026 · Registered in Scotland · All rights reserved**

[![GitHub](https://img.shields.io/badge/GitHub-ohmc--startup--2-181717?logo=github)](https://github.com/Akashsinghpanwar/ohmc-startup-2)

</div>
