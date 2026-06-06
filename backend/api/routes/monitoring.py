from fastapi import APIRouter
from pydantic import BaseModel
from services.ml.change_detection import ewma_change_detection, assess_monitoring_flags

router = APIRouter()


class MonitoringRequest(BaseModel):
    parcel_id: str
    ndvi_series: list[float]
    ndwi_series: list[float] = []


@router.post("/analyze")
async def analyze_monitoring(req: MonitoringRequest):
    ewma_result = ewma_change_detection(req.ndvi_series) if len(req.ndvi_series) >= 4 else {}
    history = [{"ndvi": n, "ndwi": w} for n, w in zip(req.ndvi_series, req.ndwi_series or [0]*len(req.ndvi_series))]
    flags = assess_monitoring_flags(history)
    return {
        "parcel_id": req.parcel_id,
        "ewma_analysis": ewma_result,
        "alert_flags": flags,
        "alert": ewma_result.get("alert", False) or len(flags) > 0,
    }
