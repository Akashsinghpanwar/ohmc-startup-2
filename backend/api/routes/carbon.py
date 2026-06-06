from fastapi import APIRouter
from pydantic import BaseModel
from services.carbon_calculator import estimate_carbon, CarbonInputs
from models.schemas import CarbonPathway

router = APIRouter()


class CarbonCalcRequest(BaseModel):
    eligible_area_ha: float
    pathway: str = "peatland"
    peatland_condition: str = "degraded"
    woodland_productivity: str = "medium"
    crediting_years: int = None


@router.post("/estimate")
async def calculate_carbon(req: CarbonCalcRequest):
    pathway = CarbonPathway(req.pathway)
    inputs = CarbonInputs(
        eligible_area_ha=req.eligible_area_ha,
        pathway=pathway,
        peatland_condition=req.peatland_condition,
        woodland_productivity=req.woodland_productivity,
        crediting_override=req.crediting_years,
        is_scotland=True,
    )
    return estimate_carbon(inputs)
