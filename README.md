# OHMC CarbonOS

> **First-mile infrastructure for UK land-based carbon markets.**  
> Connecting small landowners, farmers and crofters to verified carbon income — with real satellite screening, standards-bound assessment, and integrity-first buyer matching.

![Hero](https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=85)

---

## The Problem We Are Solving

### Carbon markets exist. Small landowners can't access them.

The UK has some of the richest carbon-storing land in Europe — degraded peatland, native woodland, and upland habitats concentrated in Scotland. The policy frameworks to monetise them (the **Woodland Carbon Code** and **Peatland Code**) are mature and internationally respected. Buyers are willing to pay a **4× premium** for domestic UK credits over the global average.

Yet the vast majority of landowners who hold this land have never participated, and never will — without infrastructure.

---

### The Numbers That Define the Problem

| Metric | Value | Source |
|--------|-------|--------|
| Scottish WCC carbon pipeline (gross) | **£617 million** | Woodland Carbon Code statistics + £26.85/t avg |
| Average WCC PIU price (2024) | **£26.85 / tonne** | UK Land Carbon Registry |
| Global voluntary carbon average | **$6.37 / tonne** | Ecosystem Marketplace 2024 |
| UK price premium over global avg | **~4×** | Derived |
| Degraded peatland in Scotland | **1.4 million hectares** | IUCN UK Peatland Programme |
| Scottish peatland restoration target | **250,000 ha by 2030** | Scottish Government |
| Share of UK WCC carbon in Scotland | **~80%** | WCC project registry |
| WCC validation cost (per project) | **£10,000+** | Industry estimates |
| Break-even parcel size at current costs | **~500 ha** | OHMC analysis |
| % of UK land parcels above break-even | **< 5%** | Derived from UKCEH Land Cover |

---

### Why Can't Landowners Just Apply?

The route from raw land to a saleable carbon credit involves **at least 9 distinct steps**, each requiring specialist knowledge, third-party services, and upfront capital:

```
Raw Land
    │
    ▼
1. Determine which standard applies (WCC vs Peatland Code)
    │
    ▼
2. Commission a baseline ecological survey
    │
    ▼
3. Prepare a Project Design Document (PDD)
    │
    ▼
4. Submit to an accredited Validation & Verification Body (VVB)
    │
    ▼
5. VVB conducts desk review + site visit (cost: £8,000–£40,000)
    │
    ▼
6. Address non-conformances (can take 6–18 months)
    │
    ▼
7. Registry validation — PIUs issued on UK Land Carbon Registry
    │
    ▼
8. Find a buyer — no centralised marketplace, deals are bilateral
    │
    ▼
9. Verification every 5–10 years to convert PIUs → WCUs (tradable)
    │
    ▼
First Carbon Income (avg 3–5 years after starting)
```

**Without infrastructure**, only large estates with capital and specialist advisers can navigate this. The market has failed small landowners — not because the land isn't suitable, but because the economics don't work at small scale.

---

### The Trust & Integrity Crisis

The voluntary carbon market has a credibility problem that now affects every buyer's procurement decision:

> *"94% of Verra's rainforest offset credits — the world's leading standard — are likely 'phantom credits' that do not represent genuine carbon reductions."*  
> — The Guardian / Die Zeit / SourceMaterial investigation, 2023

![Carbon Credit Scandal](https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80)

This crisis has created a **specific, urgent demand** for domestic, land-based, standards-verified UK supply — the kind that can be physically inspected, governed by UK law, and audited independently. OHMC CarbonOS is built exactly for that supply.

---

### The Capital Concentration Problem

Investment in the voluntary carbon market has gone almost entirely to **buyer-side tools** — not to the origination side where the land and the landowners are:

| Company | Raised | Focus |
|---------|--------|-------|
| BeZero Carbon | **$100M+** | Buyer-side credit ratings |
| Sylvera | **$100M+** | Buyer-side due diligence analytics |
| South Pole | Undisclosed | Large-scale project origination (not UK small land) |
| **OHMC CarbonOS** | Bootstrapped | **Landowner-side origination — the gap** |

The integrated, trusted, jargon-free mediator for fragmented small landowners is structurally under-built. **That is the gap CarbonOS targets.**

---

## What OHMC CarbonOS Does

CarbonOS is **first-mile infrastructure** — we handle the parts that have always stopped small landowners from participating:

```
┌──────────────────────────────────────────────────────────────────┐
│                        OHMC CarbonOS                            │
│                                                                  │
│  Landowner ──► Free Scan ──► Assessment ──► Evidence Pack       │
│                    │              │               │              │
│             Sentinel-2      WCC + Peatland   Approved VVB       │
│             Satellite       Code Rules        Routing            │
│             (10m res)       Engine                               │
│                    │              │               │              │
│                    └──────────────┴───────────────┘              │
│                                   │                              │
│                            Buyer Marketplace                     │
│                     (Verra + Gold Standard + OHMC UK)            │
│                                   │                              │
│              Corporate Buyer ◄────┘                              │
│              (ESG Teams, FTSE 350)                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Platform Screens & Features

### 1. Free Land Eligibility Scanner

![Map Scanner](https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80)

Draw a boundary on the interactive Leaflet map. Within seconds:

- **Sentinel-2 L2A satellite data** is fetched at 10m resolution for your exact parcel
- **SoilGrids v2.0** returns organic carbon depth, bulk density, and pH values
- **UKCEH Land Cover Map 2023** classifies peatland %, woodland %, and grassland %
- **Rules engine** runs your land against WCC v2.1 and Peatland Code v1.1 criteria
- **LightGBM ML model** scores overall eligibility (0–100) with confidence bands
- **Random Forest** classifies peatland condition (deep/shallow/modified/marginal)
- **Carbon estimate** calculated with low/mid/high range over full crediting period

All for free. No site visit. No obligation. No jargon.

---

### 2. Eligibility Results & Analysis

Full satellite and soil data is displayed on a clean results screen:

| Data Source | What It Shows |
|-------------|---------------|
| Sentinel-2 L2A (ESA Copernicus) | NDVI, NDWI, NDMI, BSI, cloud cover, acquisition date |
| SoilGrids v2.0 (ISRIC) | Soil organic carbon, bulk density, pH at 250m resolution |
| UKCEH Land Cover Map 2023 | Peatland %, woodland %, grassland %, bare ground % |
| WCC Rules Engine | Pass/fail for 8 eligibility criteria |
| Peatland Code Rules Engine | Pass/fail for 7 eligibility criteria |
| LightGBM ML Scorer | 0–100 eligibility score + confidence level |

**Eligibility Classification:**
- 🟢 **High (70–100):** Proceed to evidence pack
- 🟡 **Moderate (40–69):** Investigate further — some criteria need review
- 🔴 **Low (0–39):** Unlikely to qualify under current standards

---

### 3. Carbon Income Estimate

For eligible parcels, CarbonOS generates a transparent estimate with confidence bands:

```
Example: 45 ha upland peatland, Sutherland

Pathway:          Peatland Code
Eligible Area:    45 ha
Crediting Period: 40 years
Annual Rate:      2.8 tCO₂e / ha / year
Net Units:        5,040 tCO₂e

              Low          Mid          High
Per Tonne:   £18.50       £26.85       £38.00
Total:       £93,240      £135,324     £191,520
Annual Avg:  £2,331       £3,383       £4,788
```

> ⚠️ **Platform estimates are preliminary screening outputs only. They do not constitute certified carbon credits, investment advice, or guaranteed revenue. Official credit issuance requires independent validation and verification by an accredited VVB under the relevant UK standard.**

---

### 4. Buyer Marketplace

![Marketplace](https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80)

A curated listing of UK carbon projects, aggregating:

- **Verra VCS** — live data from the world's largest voluntary carbon registry
- **Gold Standard** — climate and development co-benefit projects
- **OHMC UK** — domestic WCC and Peatland Code projects from the platform

**Project Status Labels (what you can and cannot claim):**

| Status | Meaning | Claim Permitted |
|--------|---------|-----------------|
| 🔘 Estimated Only | Preliminary scan result | No claim — screening only |
| 🟡 Pre-Validation | Project submitted | Register interest only |
| 🔵 Validated PIU | PIUs issued on UKLCR | Demonstrate intent, not offset |
| 🟢 Verified Credit | WCU/PCC issued, retired | Full scope 3 offset claim |

---

### 5. Partner Portal (VVBs & Ecologists)

Validation and Verification Bodies receive a pre-screened pipeline with:

- **Structured evidence pack** per project — no cold starts
- Satellite data, soil reports, and land cover classification pre-attached
- Tracked non-conformance workflow
- Collaboration portal to request additional documentation
- Standards reference (WCC v2.1, Peatland Code v1.1 built in)

---

## The Standards We Are Built On

### Woodland Carbon Code (WCC)

Governed by Scottish Forestry, the WCC is the UK standard for woodland creation projects.

- **PIUs** (Pending Issuance Units) represent potential future carbon sequestration
- PIUs are issued on the **UK Land Carbon Registry**
- PIUs **cannot** be used, retired, reported, or listed on an exchange
- **WCUs** (Woodland Carbon Units) are issued on independent verification
- Average price: £26.85 per WCU (2024 data)

### Peatland Code

Governed by IUCN UK, the Peatland Code covers peatland restoration in the UK.

- Scotland holds **~80% of UK peatland carbon**
- **1.4 million hectares** of degraded peatland in Scotland alone
- Restoration target: **250,000 ha by 2030** (Scottish Government)
- Validated by approved bodies: OF&G, Soil Association, and others
- Credits issued as **Pending Issuance Units** until independent verification

### UK Land Carbon Registry

The central registry for domestic carbon units.

- **PIUs ≠ verified credits** — the most important compliance fact on the platform
- All projects listed with registry status and audit trail
- No double-counting: OHMC checks parcel overlap on every scan

### Sentinel-2 MRV Data

Real European Space Agency Copernicus open data — not a proprietary database.

- **10m resolution** multi-spectral imagery
- **5-day revisit** cycle over UK land parcels
- Indices calculated live over every submitted boundary:
  - **NDVI** — Normalised Difference Vegetation Index (plant health)
  - **NDWI** — Normalised Difference Water Index (wetness)
  - **NDMI** — Normalised Difference Moisture Index (soil moisture)
  - **BSI** — Bare Soil Index (peat exposure)

---

## Technology Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                  │
│                                                         │
│  HomePage  AuthPage  AppShell                           │
│     │         │         │                               │
│     └─────────┴────┬────┘                               │
│                    │                                    │
│              Axios HTTP Client                          │
│           (src/services/api.js)                         │
└────────────────────┬────────────────────────────────────┘
                     │  REST API
┌────────────────────▼────────────────────────────────────┐
│                  BACKEND (FastAPI)                      │
│                                                         │
│  /api/auth        JWT + Google OAuth                    │
│  /api/eligibility Scan → satellite + soil + rules + ML  │
│  /api/marketplace Verra + Gold Standard + local DB      │
│  /api/projects    CRUD + buyer interest                 │
│  /api/parcels     Geometry storage                      │
│  /api/carbon      Carbon estimates                      │
│  /api/monitoring  Post-verification MRV                 │
└──────────────┬──────────────────┬──────────────────────┘
               │                  │
┌──────────────▼──────┐  ┌────────▼──────────────────────┐
│  EXTERNAL DATA      │  │  NEON POSTGRESQL               │
│                     │  │                                │
│  ESA Sentinel-2     │  │  users                         │
│  (10m resolution)   │  │  parcels (GeoJSON)             │
│  ISRIC SoilGrids    │  │  projects                      │
│  UKCEH Land Cover   │  │  scan_results                  │
│  Verra VCS API      │  │  buyer_interests               │
│  Gold Standard API  │  │                                │
└─────────────────────┘  └────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│                   ML MODELS                             │
│                                                         │
│  LightGBM — Eligibility Scorer (0–100)                  │
│  Random Forest — Peatland Condition Classifier          │
│  Rules Engine — Deterministic WCC + Peatland Code       │
└─────────────────────────────────────────────────────────┘
```

### Frontend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.0 | UI framework |
| Vite | 7.0 | Build tool + dev server |
| Leaflet + react-leaflet | 1.9.4 / 5.0 | Interactive map + boundary drawing |
| Lucide React | 0.468 | Icon library |
| Axios | 1.16 | HTTP client |

### Backend Stack

| Technology | Purpose |
|-----------|---------|
| FastAPI (Python) | Async REST API framework |
| Neon PostgreSQL | Serverless Postgres database |
| Shapely | Geometry operations on GeoJSON |
| Rasterio | Satellite raster data processing |
| LightGBM | ML eligibility scoring |
| scikit-learn | Random Forest peatland model |
| passlib + python-jose | JWT authentication |
| HTTPX | Async calls to Verra + Gold Standard APIs |

---

## Revenue Model

| Stream | Customer | Price |
|--------|----------|-------|
| Free land scan | Landowner | Free — lead generation |
| Eligibility report | Landowner / estate | £99 – £499 |
| Project onboarding package | Developer | £1,500 – £7,500 |
| Partner referral fee | VVB / lab | 5–15% |
| Success fee | Landowner | 3–10% of first sale |
| Marketplace commission | Buyer / seller | 2–8% of transaction |
| Monitoring subscription | Landowner / buyer | £20–£250 / month |
| ESG portfolio dashboard | Corporate buyer | £500–£5,000 / year |

---

## Product Roadmap

```
Phase 1 ──────── Phase 2 ──────── Phase 3 ──────── Phase 4 ──────── Phase 5
[LIVE NOW]        [NEXT]           [PLANNED]         [PLANNED]        [GATED]

Eligibility       Paid Reports    Certification      Buyer            Consumer
Scanner           + Partners      Workflow           Marketplace      Wallet

• Boundary        • Paid £99-499  • MRV workbench    • Curated        ⚠️ Policy +
  drawing           report        • VVB collab         listings       regulation
• Satellite       • Evidence        portal           • Retirement       required
  screening         pack gen      • Registry           evidence       • Verified
• WCC + Peat      • VVB partner     connector        • ESG              supply
  rules             routing       • Verification       dashboard        must
• Carbon          • Document        tracking                            exist
  estimate          vault                                             • Never
                                                                        first
```

> ⚠️ **Phase 5 Consumer Wallet is policy-gated.** It will not be built until verified supply exists, buyer trust is established, and the policy environment supports it. Infrastructure first. Wallet last.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- A **Neon PostgreSQL** database (free tier available at neon.tech)

### Frontend Setup

```bash
# Clone the repository
git clone <repository-url>
cd ohmc

# Install dependencies
npm install

# Start development server
npm run dev
# → Runs at http://localhost:5173
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your Neon PostgreSQL connection string and JWT secret

# Run the API server
uvicorn main:app --reload --port 8000
# → API runs at http://localhost:8000
# → Docs at http://localhost:8000/docs
```

### Environment Variables

```env
# Backend (.env)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
FRONTEND_URL=http://localhost:5173
```

### Database Seeding

```bash
cd backend
python seed_real_projects.py
# Seeds initial UK WCC and Peatland Code project listings
```

---

## Project Structure

```
ohmc/
├── backend/                    # FastAPI Python backend
│   ├── api/routes/             # Auth, eligibility, marketplace, projects, carbon, monitoring
│   ├── services/               # Sentinel-2, SoilGrids, rules engine, ML models, carbon calc
│   │   └── ml/                 # LightGBM + Random Forest models + weights
│   ├── db/                     # Neon PostgreSQL schema + connection pooling
│   ├── models/                 # Pydantic request/response schemas
│   ├── auth/                   # JWT + Google OAuth
│   ├── main.py                 # FastAPI app entry point
│   └── requirements.txt        # Python dependencies
│
├── src/                        # React 19 frontend
│   ├── pages/
│   │   ├── HomePage.jsx        # Public marketing site (12 sections)
│   │   └── AuthPage.jsx        # Login + signup
│   ├── components/
│   │   └── BoundaryMap.jsx     # Leaflet map with boundary drawing
│   ├── services/
│   │   └── api.js              # Axios HTTP client
│   ├── App.jsx                 # App shell + 7 authenticated screens
│   └── styles.css              # Global styling
│
├── package.json
├── vite.config.js
└── index.html
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Eligibility

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/eligibility/scan` | Run full satellite + rules + ML scan on a GeoJSON boundary |
| GET | `/api/eligibility/results/{id}` | Retrieve a previous scan result |

**Scan request body:**
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], [lng, lat], ...]]
  },
  "land_name": "My Sutherland Peatland"
}
```

**Scan response (summary):**
```json
{
  "eligibility_score": 78,
  "confidence": "high",
  "recommended_pathway": "peatland_code",
  "area_ha": 45.2,
  "satellite": { "ndvi": 0.61, "ndwi": 0.34, "ndmi": 0.28, "bsi": 0.08 },
  "soil": { "organic_carbon_kg_m2": 18.4, "peat_classification": "deep_peat" },
  "land_cover": { "peatland_pct": 72, "woodland_pct": 8 },
  "wcc_rules": [{ "rule": "min_area", "pass": true }, ...],
  "peatland_rules": [{ "rule": "peat_depth", "pass": true }, ...],
  "carbon_estimate": {
    "net_units_tco2e": 5040,
    "crediting_period_years": 40,
    "low_value_gbp": 93240,
    "mid_value_gbp": 135324,
    "high_value_gbp": 191520
  }
}
```

### Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketplace/projects` | All projects (Verra + Gold Standard + OHMC) |
| GET | `/api/marketplace/projects?source=ohmc` | Filter by source |
| POST | `/api/projects/{id}/interest` | Register buyer interest |

---

## Important Disclaimers

1. **Platform estimates are preliminary screening outputs only.** They do not constitute certified carbon credits, investment advice, legal advice, or guaranteed revenue.

2. **PIUs (Pending Issuance Units) are not verified credits.** They cannot be used, retired, reported in sustainability disclosures, or listed on a carbon exchange under UK Land Carbon Registry rules. Only independently verified WCUs and PCCs may be used for offset claims.

3. **Official credit issuance requires independent validation and verification** by an accredited VVB (Validation and Verification Body) under the relevant UK voluntary carbon standard.

4. **OHMC CarbonOS acts solely as a trusted mediator.** It does not issue, certify, or underwrite carbon credits.

5. **ML models are used for screening and estimation only.** Deterministic standards-bound rules are used for all credit-relevant eligibility determinations.

---

## About OHMC

**OHMC (Open Habitat Market Carbon)** is a Scotland-based carbon market infrastructure company focused on making land-based carbon income accessible to the small landowners, farmers, and crofters who hold the UK's most carbon-rich habitats.

The platform is built on the belief that **integrity, transparency, and standards-alignment are not optional extras** — they are the only foundation on which a credible voluntary carbon market can operate.

---

## Licence

© OHMC 2026. All rights reserved. Registered in Scotland.

---

*Built with real data. Aligned to real standards. For real landowners.*
