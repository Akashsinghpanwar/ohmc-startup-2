from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class CarbonPathway(str, Enum):
    WCC = "wcc"
    PEATLAND = "peatland"
    NONE = "none"


class ProjectStatus(str, Enum):
    ESTIMATED_ONLY = "Estimated Only"
    PRE_VALIDATION = "Pre-Validation"
    VALIDATED_PIU = "Validated PIU"
    VERIFIED_CREDIT = "Verified Credit"
    RETIRED = "Retired"


class GeoJSONGeometry(BaseModel):
    type: str
    coordinates: Any


class BoundaryScanRequest(BaseModel):
    geometry: GeoJSONGeometry
    land_name: Optional[str] = "Unnamed Parcel"
    intent: Optional[str] = "assessment"


class SentinelIndices(BaseModel):
    ndvi: Optional[float] = None          # Vegetation
    ndwi: Optional[float] = None          # Water/wetness
    ndmi: Optional[float] = None          # Moisture
    bare_soil_index: Optional[float] = None
    swir_ratio: Optional[float] = None
    acquisition_date: Optional[str] = None
    cloud_cover: Optional[float] = None
    data_source: str = "Sentinel-2 L2A (Element84 STAC)"


class SoilData(BaseModel):
    organic_carbon_g_per_kg: Optional[float] = None  # SOC in g/kg
    bulk_density_kg_per_m3: Optional[float] = None
    ph: Optional[float] = None
    is_peat: bool = False                  # SOC > 200 g/kg
    is_peaty: bool = False                 # SOC 40-200 g/kg
    data_source: str = "SoilGrids v2.0 (ISRIC)"


class LandCoverInfo(BaseModel):
    dominant_class: str
    peatland_fraction: float = 0.0
    woodland_fraction: float = 0.0
    grassland_fraction: float = 0.0
    data_source: str = "Sentinel-2 spectral classification"


class EligibilityRuleResult(BaseModel):
    rule: str
    passed: bool
    value: Optional[str] = None
    note: str


class CarbonEstimate(BaseModel):
    pathway: CarbonPathway
    eligible_area_ha: float
    crediting_years: int
    annual_rate_tco2e_per_ha: float
    gross_units_tco2e: float
    net_units_tco2e: float           # after buffer/risk deduction
    buffer_fraction: float
    low_value_gbp: float
    mid_value_gbp: float
    high_value_gbp: float
    price_low: float = 15.0
    price_mid: float = 26.85
    price_high: float = 35.0
    confidence_band: str             # e.g. "±25%"
    disclaimer: str = (
        "Preliminary screening estimate only. Not a verified credit or "
        "guarantee of revenue. Final quantities require independent VVB validation."
    )


class MLScores(BaseModel):
    eligibility_score: float          # 0-100
    peatland_condition: Optional[str] = None   # degraded/modified/near-natural
    woodland_suitability: Optional[float] = None  # 0-1
    confidence_level: str             # low/medium/high
    anomaly_flags: List[str] = []


class EligibilityResponse(BaseModel):
    parcel_id: str
    land_name: str
    area_ha: float
    centroid_lat: float
    centroid_lon: float
    recommended_pathway: CarbonPathway
    eligibility_score: int            # 0-100
    confidence: str
    sentinel_indices: SentinelIndices
    soil_data: SoilData
    land_cover: LandCoverInfo
    wcc_rules: List[EligibilityRuleResult]
    peatland_rules: List[EligibilityRuleResult]
    carbon_estimate: Optional[CarbonEstimate]
    ml_scores: MLScores
    next_steps: List[str]
    processing_time_ms: Optional[int] = None


class ParcelCreate(BaseModel):
    land_name: str
    geometry: GeoJSONGeometry
    owner_name: Optional[str] = None
    notes: Optional[str] = None


class ParcelResponse(BaseModel):
    id: str
    land_name: str
    area_ha: float
    centroid_lat: float
    centroid_lon: float
    status: str
    created_at: str
    last_scan: Optional[str] = None
    eligibility_score: Optional[int] = None
    pathway: Optional[str] = None


class ProjectListing(BaseModel):
    id: str
    title: str
    location: str
    type: str
    status: ProjectStatus
    area_ha: float
    volume_tco2e: str
    total_tco2e: str
    price_per_tco2e: Optional[float] = None
    vintage: Optional[str] = None
    methodology: str
    co_benefits: List[str] = []
    centroid_lat: float
    centroid_lon: float
    claim_guidance: str
