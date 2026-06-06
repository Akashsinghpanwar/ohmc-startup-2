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


# WCC sequestration rates by yield class (tCO2e/ha/yr)
# Derived from Woodland Carbon Code yield model tables
WCC_RATE_TABLE = {
    "high":     3.8,   # Productive woodland, YC 14+
    "medium":   2.4,   # Mixed/native woodland, YC 8-14
    "low":      1.4,   # Poor conditions, YC < 8
    "default":  2.0,   # Conservative default
}

# Peatland code emission factor reduction (tCO2e/ha/yr)
# Based on Peatland Code guidance: typical avoided emission from rewetting
PEATLAND_EF_REDUCTION = {
    "degraded":   3.0,  # Heavily drained, active peat extraction
    "modified":   2.0,  # Improved grassland on peat
    "near_natural": 0.8, # Slightly modified blanket bog
    "default":    2.5,
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

# Transaction/platform costs (fraction)
F_TRANSACTION = 0.08   # 8% blended platform + broker cost
F_BUFFER = 0.20        # built into buffer above


@dataclass
class CarbonInputs:
    eligible_area_ha: float
    pathway: CarbonPathway
    peatland_condition: str = "default"
    woodland_productivity: str = "default"
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

    # Select annual rate
    if pathway == CarbonPathway.WCC:
        annual_rate = WCC_RATE_TABLE.get(
            inputs.woodland_productivity, WCC_RATE_TABLE["default"]
        )
        # Scotland uplift: better native woodland stocks
        if inputs.is_scotland:
            annual_rate *= 1.05
    else:
        annual_rate = PEATLAND_EF_REDUCTION.get(
            inputs.peatland_condition, PEATLAND_EF_REDUCTION["default"]
        )

    # Gross units over crediting period (Eq. 1 from paper, simplified)
    # C_gross = A × R_type × T × Q_condition × Q_risk
    q_condition = _condition_factor(pathway, inputs.peatland_condition, inputs.woodland_productivity)
    q_risk = 1 - buffer

    gross_units = area * annual_rate * crediting_years * q_condition
    net_units = gross_units * q_risk

    # Revenue estimates (Eq. 3 from paper)
    # V = C_eligible × P_unit × (1 − F_transaction − F_buffer)
    net_factor = 1 - F_TRANSACTION - buffer

    low_value  = net_units * PRICES["low"]  * net_factor
    mid_value  = net_units * PRICES["mid"]  * net_factor
    high_value = net_units * PRICES["high"] * net_factor

    # Uncertainty band: ±25% for pre-screening
    confidence_band = "±25%"

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
        "confidence_band": confidence_band,
        "disclaimer": (
            "Preliminary screening estimate only — not a verified credit or "
            "guarantee of revenue. Final quantities follow applicable code "
            "methodology and must be validated/verified by an accredited VVB."
        ),
    }


def _condition_factor(pathway: CarbonPathway, peat_condition: str, woodland_prod: str) -> float:
    """Quality/condition adjustment factor Q_condition."""
    if pathway == CarbonPathway.PEATLAND:
        return {"degraded": 1.0, "modified": 0.75, "near_natural": 0.4, "default": 0.85}.get(
            peat_condition, 0.85
        )
    else:
        return {"high": 1.0, "medium": 0.85, "low": 0.65, "default": 0.8}.get(
            woodland_prod, 0.8
        )


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
