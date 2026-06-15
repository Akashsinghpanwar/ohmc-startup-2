"""
Deterministic carbon estimation engine.
Implements equations from the OHMC CarbonOS research paper (Equations 1–3).

CRITICAL: These are PRE-SCREENING estimates only.
Final quantities follow applicable code methodology and must be
validated/verified by accredited VVBs.
"""
from dataclasses import dataclass
from typing import Optional
from models.schemas import CarbonPathway


# ── Woodland Carbon Code: sequestration rate lookup ────────────────────────────
# Representative NET sequestration averaged over the crediting period
# (tCO2e/ha/yr), keyed by (species group, productivity/yield band).
# These are representative mid-range values in the order of magnitude of the
# WCC Carbon Calculator (CARBINE-derived) lookups — NOT the calculator output
# itself. The verified figure comes from the WCC Calculator for the specific
# species, yield class, spacing, management and region, confirmed at validation.
WCC_RATES = {
    ("conifer",   "high"):   10.0,   # e.g. Sitka spruce, YC ~20+
    ("conifer",   "medium"):  7.0,   # productive conifer, YC ~12-16
    ("conifer",   "low"):     4.5,   # conifer on poorer ground, YC ~8
    ("broadleaf", "high"):    5.0,   # productive broadleaf / mixed
    ("broadleaf", "medium"):  3.5,   # native broadleaf, YC ~6
    ("broadleaf", "low"):     2.2,   # native woodland / scrub, YC ~4
}
WCC_RATE_DEFAULT = 3.5  # conservative native-broadleaf assumption when unknown

# Woodland net-credit adjustments (Eq. 2: net = (S − B − L − E)(1 − r)).
# Fractions of gross sequestration, conservative for afforestation of open land.
WOODLAND_BASELINE_FRAC   = 0.00   # bare/open land baseline ~ negligible
WOODLAND_LEAKAGE_FRAC    = 0.05   # market/activity-shifting leakage
WOODLAND_ESTABLISH_FRAC  = 0.03   # site prep / establishment emissions

# ── Peatland Code: avoided-emission factors by condition ────────────────────────
# Representative avoided emissions on restoration (tCO2e/ha/yr), by condition
# category. Conservative mid-range values aligned to the Peatland Code field
# protocol categories; the verified figure uses the project's surveyed condition.
PEATLAND_EF = {
    "actively_eroding": 6.0,   # hagg / gully / bare eroding peat
    "drained":          5.0,   # drained grassland / cropland on peat
    "degraded":         4.0,   # generic degraded (drained + erosion mix)
    "modified":         2.5,   # modified bog / rough grazing
    "near_natural":     0.5,   # near-natural — low additionality
    "default":          3.0,
}
# Back-compat: map any legacy condition strings onto the table above.
PEATLAND_CONDITION_ALIASES = {
    "degraded": "degraded", "modified": "modified",
    "near_natural": "near_natural", "default": "default",
}

# Standard crediting horizons
CREDITING_YEARS = {
    CarbonPathway.WCC: 35,
    CarbonPathway.PEATLAND: 30,
}

# Risk/buffer factors (from relevant codes)
BUFFER_FACTORS = {
    CarbonPathway.WCC: 0.20,       # 20% permanence buffer typical
    CarbonPathway.PEATLAND: 0.25,  # 25% risk buffer
}

# Indicative 2024 UK market prices (£/tCO2e)
PRICES = {
    "low":  15.0,
    "mid":  26.85,  # WCC 2024 average PIU price
    "high": 38.0,
}

# Transaction/platform cost (fraction). The permanence buffer is applied
# separately via net_units (q_risk) and must NOT be subtracted again here.
F_TRANSACTION = 0.08   # 8% blended platform + broker cost


@dataclass
class CarbonInputs:
    eligible_area_ha: float
    pathway: CarbonPathway
    peatland_condition: str = "default"
    woodland_productivity: str = "medium"
    woodland_species: str = "broadleaf"   # "broadleaf" | "conifer"
    is_scotland: bool = True
    crediting_override: Optional[int] = None


def estimate_carbon(inputs: CarbonInputs) -> dict:
    """
    Compute gross and net carbon estimates with confidence bands.

    Returns dict matching CarbonEstimate schema.
    """
    if inputs.pathway == CarbonPathway.NONE:
        return {"pathway": "none", "error": "Land not eligible for carbon project"}

    pathway = inputs.pathway
    area = inputs.eligible_area_ha
    crediting_years = inputs.crediting_override or CREDITING_YEARS[pathway]
    buffer = BUFFER_FACTORS[pathway]
    q_risk = 1 - buffer  # permanence/risk buffer

    assumptions = {}

    if pathway == CarbonPathway.WCC:
        # Rate from species × yield band (no Scotland uplift — that was unfounded).
        species = inputs.woodland_species if inputs.woodland_species in ("conifer", "broadleaf") else "broadleaf"
        prod = inputs.woodland_productivity if inputs.woodland_productivity in ("high", "medium", "low") else "medium"
        annual_rate = WCC_RATES.get((species, prod), WCC_RATE_DEFAULT)

        gross_units = area * annual_rate * crediting_years
        # Eq. 2: net = (S − B − L − E)(1 − r)
        deductible = WOODLAND_BASELINE_FRAC + WOODLAND_LEAKAGE_FRAC + WOODLAND_ESTABLISH_FRAC
        net_units = gross_units * (1 - deductible) * q_risk
        assumptions = {
            "species_group": species,
            "yield_band": prod,
            "baseline_fraction": WOODLAND_BASELINE_FRAC,
            "leakage_fraction": WOODLAND_LEAKAGE_FRAC,
            "establishment_fraction": WOODLAND_ESTABLISH_FRAC,
            "note": "Species/yield not surveyed — assumed native broadleaf, medium yield. "
                    "Verified rate comes from the WCC Carbon Calculator at validation.",
        }
    else:
        cond = PEATLAND_CONDITION_ALIASES.get(inputs.peatland_condition, inputs.peatland_condition)
        annual_rate = PEATLAND_EF.get(cond, PEATLAND_EF["default"])
        gross_units = area * annual_rate * crediting_years
        net_units = gross_units * q_risk
        assumptions = {
            "condition_category": cond,
            "note": "Avoided-emission factor is representative for the inferred condition. "
                    "Verified factor uses the surveyed peatland condition at validation.",
        }

    # Revenue (Eq. 3): net_units already has the buffer removed, so apply only
    # the transaction/platform cost here — never subtract the buffer twice.
    net_factor = 1 - F_TRANSACTION
    low_value  = net_units * PRICES["low"]  * net_factor
    mid_value  = net_units * PRICES["mid"]  * net_factor
    high_value = net_units * PRICES["high"] * net_factor

    return {
        "pathway": pathway.value,
        "eligible_area_ha": round(area, 1),
        "crediting_years": crediting_years,
        "annual_rate_tco2e_per_ha": round(annual_rate, 2),
        "gross_units_tco2e": round(gross_units, 0),
        "net_units_tco2e": round(net_units, 0),
        "buffer_fraction": buffer,
        "low_value_gbp": round(low_value, 0),
        "mid_value_gbp": round(mid_value, 0),
        "high_value_gbp": round(high_value, 0),
        "price_low": PRICES["low"],
        "price_mid": PRICES["mid"],
        "price_high": PRICES["high"],
        "confidence_band": "±25%",
        "assumptions": assumptions,
        "disclaimer": (
            "Preliminary screening estimate only — not a verified credit or "
            "guarantee of revenue. Final quantities follow applicable code "
            "methodology and must be validated/verified by an accredited VVB."
        ),
    }


def compute_area_ha(geometry: dict) -> float:
    """Compute area in hectares from GeoJSON geometry using pyproj."""
    try:
        from pyproj import Geod
        geod = Geod(ellps="WGS84")
        if geometry["type"] == "Polygon":
            coords = geometry["coordinates"][0]
            lons = [c[0] for c in coords]
            lats = [c[1] for c in coords]
            area_m2, _ = geod.polygon_area_perimeter(lons, lats)
            return round(abs(area_m2) / 10_000, 2)
        elif geometry["type"] == "MultiPolygon":
            total = 0
            for poly in geometry["coordinates"]:
                lons = [c[0] for c in poly[0]]
                lats = [c[1] for c in poly[0]]
                a, _ = geod.polygon_area_perimeter(lons, lats)
                total += abs(a)
            return round(total / 10_000, 2)
    except Exception:
        pass
    # Fallback: planar approximation
    coords = geometry["coordinates"][0] if geometry["type"] == "Polygon" else geometry["coordinates"][0][0]
    n = len(coords)
    area = 0
    for i in range(n - 1):
        area += coords[i][0] * coords[i + 1][1]
        area -= coords[i + 1][0] * coords[i][1]
    area = abs(area) / 2
    # Approximate conversion at UK latitude (~57°N): 1 degree lat ≈ 111km, lon ≈ 60km
    area_m2 = area * 111_000 * 60_000
    return round(area_m2 / 10_000, 2)
