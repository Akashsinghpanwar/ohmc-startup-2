"""
Deterministic eligibility rules engine for WCC and Peatland Code.
Rules based on Woodland Carbon Code guidance and IUCN UK Peatland Programme.

OHMC design principle: AI estimates/flags; only this deterministic engine
produces anything used in eligibility assessment. Independent VVB validation
is mandatory before any registry action.
"""
from models.schemas import CarbonPathway, EligibilityRuleResult


# ─── WCC RULES ───────────────────────────────────────────────────────────────

def run_wcc_rules(
    area_ha: float,
    sentinel: dict,
    soil: dict,
    land_cover: dict,
) -> tuple[list[EligibilityRuleResult], float]:
    """
    Apply Woodland Carbon Code eligibility rules.
    Returns (rule_results, pass_score 0-1).
    """
    rules = []
    scores = []

    # 1. Minimum area (WCC: 1 ha minimum)
    r = _rule(
        "Minimum area (≥ 1 ha)",
        area_ha >= 1.0,
        f"{area_ha:.1f} ha",
        "WCC requires minimum 1 ha eligible area"
    )
    rules.append(r); scores.append((1.0, 1.0) if r.passed else (0, 1.0))

    # 2. Land not already woodland (would need to be different project type)
    wf = land_cover.get("woodland_fraction", 0)
    r = _rule(
        "Not existing closed canopy woodland",
        wf < 0.7,
        f"{wf*100:.0f}% woodland cover detected",
        "Land should not already be dense closed-canopy woodland (additionality)"
    )
    rules.append(r); scores.append((1.0, 1.5) if r.passed else (0, 1.5))

    # 3. Not deep peat (deep peat sites should use Peatland Code instead)
    is_peat = soil.get("is_peat", False)
    r = _rule(
        "Not deep peat (use Peatland Code)",
        not is_peat,
        "Deep peat detected" if is_peat else "No deep peat",
        "Deep peat soils (SOC > 200 g/kg) should follow Peatland Code, not WCC"
    )
    rules.append(r); scores.append((1.0, 1.5) if r.passed else (0, 1.5))

    # 4. Vegetation signal (NDVI should not be too high — already dense woodland)
    ndvi = sentinel.get("ndvi")
    if ndvi is not None:
        # NDVI > 0.7 in summer = already very dense, NDVI < 0.1 = bare/degraded
        suitable = 0.05 <= ndvi <= 0.65
        r = _rule(
            "Vegetation density suitable for afforestation",
            suitable,
            f"NDVI = {ndvi:.3f}",
            "NDVI indicates land may already be dense woodland (>0.65) or completely bare (<0.05)"
        )
        rules.append(r); scores.append((1.0, 1.0) if suitable else (0.5, 1.0))
    else:
        r = _rule("Vegetation density (NDVI)", True, "No satellite data", "Unable to assess — manual check required")
        rules.append(r); scores.append((0.5, 1.0))

    # 5. Soil suitability — not rock/very shallow (pH proxy)
    ph = soil.get("ph")
    if ph is not None:
        suitable_ph = 3.5 <= ph <= 7.5
        r = _rule(
            "Soil pH suitable for woodland",
            suitable_ph,
            f"pH = {ph}",
            "Woodland establishment requires pH 3.5–7.5"
        )
        rules.append(r); scores.append((1.0, 0.8) if suitable_ph else (0.3, 0.8))
    else:
        r = _rule("Soil pH", True, "No soil data", "Manual soil assessment required")
        rules.append(r); scores.append((0.6, 0.8))

    # 6. Moisture not excessively waterlogged (NDWI proxy)
    ndwi = sentinel.get("ndwi")
    if ndwi is not None:
        # Very high NDWI (> 0.3) indicates waterlogging — bad for WCC
        suitable_drainage = ndwi < 0.3
        r = _rule(
            "Not excessively waterlogged",
            suitable_drainage,
            f"NDWI = {ndwi:.3f}",
            "High NDWI suggests waterlogging — unsuitable for most woodland species without drainage"
        )
        rules.append(r); scores.append((1.0, 1.0) if suitable_drainage else (0.2, 1.0))

    score = _weighted_score(scores)
    return rules, score


# ─── PEATLAND CODE RULES ─────────────────────────────────────────────────────

def run_peatland_rules(
    area_ha: float,
    sentinel: dict,
    soil: dict,
    land_cover: dict,
) -> tuple[list[EligibilityRuleResult], float]:
    """
    Apply Peatland Code eligibility rules.
    Returns (rule_results, pass_score 0-1).
    """
    rules = []
    scores = []

    # 1. Minimum area
    r = _rule(
        "Minimum area (≥ 2 ha for Peatland Code)",
        area_ha >= 2.0,
        f"{area_ha:.1f} ha",
        "Peatland Code typically requires ≥ 2 ha"
    )
    rules.append(r); scores.append((1.0, 1.0) if r.passed else (0, 1.0))

    # 2. Peat presence — SOC > 40 g/kg (peaty) or > 200 g/kg (deep peat)
    soc = soil.get("organic_carbon_g_per_kg")
    is_peat = soil.get("is_peat", False)
    is_peaty = soil.get("is_peaty", False)
    if soc is not None:
        has_peat = is_peat or is_peaty
        r = _rule(
            "Peat or peaty soil present (SOC ≥ 40 g/kg)",
            has_peat,
            f"SOC = {soc:.0f} g/kg {'(peat)' if is_peat else '(peaty)' if is_peaty else '(mineral)'}",
            "Peatland Code requires organic soils (peat depth ≥ 0.5m; platform proxy: SOC ≥ 40 g/kg)"
        )
        rules.append(r); scores.append((1.5 if is_peat else 1.0, 2.0) if has_peat else (0, 2.0))
    else:
        r = _rule("Peat presence (SOC)", True, "No soil data", "Manual peat survey required")
        rules.append(r); scores.append((0.5, 2.0))

    # 3. Degraded condition — NDWI should be LOW (dried-out peat)
    ndwi = sentinel.get("ndwi")
    if ndwi is not None:
        # Degraded peat: NDWI < -0.1 (dry). Rewetting restores water table.
        is_degraded = ndwi < 0.0
        r = _rule(
            "Peat in degraded/drained condition",
            is_degraded,
            f"NDWI = {ndwi:.3f} ({'dry/degraded' if is_degraded else 'wet/intact'})",
            "Peatland Code requires degraded peat (drained, modified) — already wet peat has low additionality"
        )
        rules.append(r); scores.append((1.0, 1.5) if is_degraded else (0.3, 1.5))
    else:
        r = _rule("Peatland condition (NDWI)", True, "No satellite data", "Manual condition assessment required")
        rules.append(r); scores.append((0.6, 1.5))

    # 4. Bare soil / peat exposure (BSI)
    bsi = sentinel.get("bare_soil_index")
    if bsi is not None:
        # BSI > 0 indicates bare/exposed peat — common in degraded areas
        has_bare_peat = bsi > -0.05
        r = _rule(
            "Bare peat or degraded vegetation",
            has_bare_peat,
            f"Bare Soil Index = {bsi:.3f}",
            "Exposed peat surfaces indicate degradation eligible for restoration"
        )
        rules.append(r); scores.append((1.0, 1.0) if has_bare_peat else (0.5, 1.0))

    # 5. Not already woodland (peatland rewetting incompatible with existing dense woodland)
    wf = land_cover.get("woodland_fraction", 0)
    r = _rule(
        "Not predominantly wooded (allows for plantation removal)",
        wf < 0.5,
        f"{wf*100:.0f}% woodland cover",
        "Dense conifer plantations on peat may be eligible but require plantation removal plan"
    )
    rules.append(r); scores.append((1.0, 0.8) if r.passed else (0.4, 0.8))

    # 6. Peatland land cover proxy
    pf = land_cover.get("peatland_fraction", 0)
    if pf > 0:
        r = _rule(
            "Peatland land cover detected",
            pf >= 0.3,
            f"{pf*100:.0f}% peatland/heather land cover",
            "Sentinel-2 spectral classification indicates peatland vegetation"
        )
        rules.append(r); scores.append((1.0, 1.2) if pf >= 0.3 else (0.5, 1.2))

    score = _weighted_score(scores)
    return rules, score


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def _rule(name: str, passed: bool, value: str, note: str) -> EligibilityRuleResult:
    return EligibilityRuleResult(rule=name, passed=passed, value=value, note=note)


def _weighted_score(scores: list[tuple[float, float]]) -> float:
    """Weighted average of (achieved, weight) pairs → 0-1."""
    if not scores:
        return 0.5
    total_weight = sum(w for _, w in scores)
    weighted_sum = sum(v * w for v, w in scores)
    return weighted_sum / total_weight if total_weight > 0 else 0


def classify_land_cover(sentinel: dict) -> dict:
    """
    Classify land cover from Sentinel-2 spectral indices.
    Rule-based classification — AI estimation layer per CarbonOS design.
    """
    ndvi = sentinel.get("ndvi", 0.3)
    ndwi = sentinel.get("ndwi", -0.1)
    ndmi = sentinel.get("ndmi", 0.1)
    bsi  = sentinel.get("bare_soil_index", -0.1)

    # Peatland/bog: moderate NDVI, high moisture, low BSI
    peatland_score = 0
    if ndwi is not None and ndwi > -0.2:
        peatland_score += 0.3
    if ndmi is not None and ndmi > 0.1:
        peatland_score += 0.3
    if ndvi is not None and 0.2 < ndvi < 0.6:
        peatland_score += 0.2
    if bsi is not None and bsi < 0.0:
        peatland_score += 0.2

    # Woodland: high NDVI, moderate moisture
    woodland_score = 0
    if ndvi is not None and ndvi > 0.5:
        woodland_score += 0.5
    if ndvi is not None and ndvi > 0.65:
        woodland_score += 0.3

    # Grassland: moderate NDVI, drier
    grassland_score = 0
    if ndvi is not None and 0.2 < ndvi < 0.5:
        grassland_score += 0.3
    if ndwi is not None and ndwi < 0:
        grassland_score += 0.2

    # Normalise
    total = peatland_score + woodland_score + grassland_score + 0.1
    pf = round(peatland_score / total, 2)
    wf = round(woodland_score / total, 2)
    gf = round(grassland_score / total, 2)

    classes = [("peatland/heather", pf), ("woodland", wf), ("grassland", gf)]
    dominant = max(classes, key=lambda x: x[1])[0]

    return {
        "dominant_class": dominant,
        "peatland_fraction": pf,
        "woodland_fraction": wf,
        "grassland_fraction": gf,
        "data_source": "Sentinel-2 spectral classification (AI estimation layer)",
    }


def recommend_pathway(wcc_score: float, peat_score: float, soil: dict) -> CarbonPathway:
    """Select recommended pathway based on scores and soil data."""
    is_peat = soil.get("is_peat", False)
    is_peaty = soil.get("is_peaty", False)

    if is_peat and peat_score > 0.4:
        return CarbonPathway.PEATLAND
    if peat_score > wcc_score and peat_score > 0.5:
        return CarbonPathway.PEATLAND
    if wcc_score > 0.5:
        return CarbonPathway.WCC
    if peat_score > 0.4 and (is_peat or is_peaty):
        return CarbonPathway.PEATLAND
    if wcc_score > 0.35:
        return CarbonPathway.WCC
    return CarbonPathway.NONE


def apply_hard_gates(
    area_ha: float,
    soil: dict,
    land_cover: dict,
    pathway: CarbonPathway,
    score: int,
) -> tuple[CarbonPathway, int, str, list[str]]:
    """
    Enforce non-negotiable scheme disqualifiers BEFORE a result is shown.

    A parcel that fails a scheme's hard requirements (e.g. below the minimum
    area) must not be presented as 'moderately eligible' for it. This is the
    gate that stops a 0.18 ha parcel reading as "62/100 — Woodland Carbon Code".

    Returns (pathway, score, band, reasons) where
    band ∈ {"eligible", "investigate", "not_eligible"}.
    """
    wf = land_cover.get("woodland_fraction", 0) or 0
    is_peat = soil.get("is_peat", False)
    is_peaty = soil.get("is_peaty", False)

    wcc_block: list[str] = []
    if area_ha < 1.0:
        wcc_block.append("Below Woodland Carbon Code minimum area (1 ha)")
    if wf >= 0.7:
        wcc_block.append("Already closed-canopy woodland — no additionality")
    if is_peat:
        wcc_block.append("Deep peat — Peatland Code applies, not WCC")

    peat_block: list[str] = []
    if area_ha < 2.0:
        peat_block.append("Below Peatland Code minimum area (2 ha)")
    if not (is_peat or is_peaty):
        peat_block.append("No organic / peaty soil detected")

    wcc_ok = not wcc_block
    peat_ok = not peat_block

    # Never recommend a scheme the parcel is disqualified from.
    if pathway == CarbonPathway.WCC and not wcc_ok:
        pathway = CarbonPathway.PEATLAND if peat_ok else CarbonPathway.NONE
    elif pathway == CarbonPathway.PEATLAND and not peat_ok:
        pathway = CarbonPathway.WCC if wcc_ok else CarbonPathway.NONE
    elif pathway == CarbonPathway.NONE:
        pathway = CarbonPathway.WCC if wcc_ok else (CarbonPathway.PEATLAND if peat_ok else CarbonPathway.NONE)

    if pathway == CarbonPathway.NONE:
        reasons = list(dict.fromkeys(wcc_block + peat_block))  # dedupe, keep order
        return pathway, min(score, 20), "not_eligible", reasons

    # Eligible for at least one scheme → band derived from the screening score.
    if score >= 65:
        band = "eligible"
    elif score >= 40:
        band = "investigate"
    else:
        band = "not_eligible"
        score = min(score, 35)
    return pathway, score, band, []


def peatland_condition_from_indices(sentinel: dict) -> str:
    """Classify peatland condition from spectral indices."""
    ndwi = sentinel.get("ndwi", 0)
    ndmi = sentinel.get("ndmi", 0)
    bsi = sentinel.get("bare_soil_index", -0.1)

    if ndwi < -0.15 and bsi > 0:
        return "degraded"
    if ndwi < 0.05:
        return "modified"
    return "near_natural"
