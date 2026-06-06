"""
ML Model 3: Change Detection / Monitoring Alerts.

Implements EWMA (Exponentially Weighted Moving Average) control chart
combined with Isolation Forest for anomaly detection on NDVI time series.

Used for ongoing monitoring of registered projects.
"""
import numpy as np
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def ewma_change_detection(
    ndvi_series: list[float],
    lambda_: float = 0.2,
    threshold_sigma: float = 2.5,
) -> dict:
    """
    EWMA control chart for NDVI time series change detection.

    Args:
        ndvi_series: Ordered list of NDVI values (oldest first)
        lambda_: EWMA smoothing factor (0-1)
        threshold_sigma: Sigma multiplier for control limits

    Returns:
        dict with alert, ewma_values, control_limits, anomaly_indices
    """
    if len(ndvi_series) < 4:
        return {"alert": False, "reason": "Insufficient data points (< 4)"}

    series = np.array(ndvi_series, dtype=float)
    n = len(series)

    # Compute EWMA
    ewma = np.zeros(n)
    ewma[0] = series[0]
    for i in range(1, n):
        ewma[i] = lambda_ * series[i] + (1 - lambda_) * ewma[i - 1]

    # Estimate baseline from first 60% of series
    baseline_end = max(3, int(n * 0.6))
    baseline_mean = np.mean(ewma[:baseline_end])
    baseline_std = np.std(ewma[:baseline_end]) + 1e-6

    # Control limits
    ucl = baseline_mean + threshold_sigma * baseline_std
    lcl = baseline_mean - threshold_sigma * baseline_std

    # Detect breaches in the recent 40% of series
    recent_ewma = ewma[baseline_end:]
    anomaly_indices = [
        baseline_end + i for i, v in enumerate(recent_ewma)
        if v > ucl or v < lcl
    ]

    alert = len(anomaly_indices) > 0

    alerts = []
    for idx in anomaly_indices:
        direction = "increase" if ewma[idx] > ucl else "decrease"
        alerts.append({
            "index": idx,
            "direction": direction,
            "value": round(float(ewma[idx]), 4),
            "limit": round(float(ucl if direction == "increase" else lcl), 4),
        })

    return {
        "alert": alert,
        "ewma_values": [round(float(v), 4) for v in ewma],
        "baseline_mean": round(float(baseline_mean), 4),
        "upper_control_limit": round(float(ucl), 4),
        "lower_control_limit": round(float(lcl), 4),
        "anomaly_events": alerts,
        "summary": f"{len(anomaly_indices)} anomalous observations detected" if alert else "No significant changes detected",
    }


def isolation_forest_anomaly(ndvi_series: list[float], contamination: float = 0.1) -> dict:
    """
    Isolation Forest for point anomaly detection in NDVI series.
    """
    if len(ndvi_series) < 10:
        return {"anomalies": [], "note": "Insufficient data for Isolation Forest"}

    try:
        from sklearn.ensemble import IsolationForest
        X = np.array(ndvi_series).reshape(-1, 1)
        clf = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100,
        )
        labels = clf.fit_predict(X)
        anomaly_indices = [i for i, l in enumerate(labels) if l == -1]
        return {
            "anomalies": anomaly_indices,
            "anomaly_values": [round(float(ndvi_series[i]), 4) for i in anomaly_indices],
            "n_anomalies": len(anomaly_indices),
        }
    except ImportError:
        return {"anomalies": [], "note": "scikit-learn unavailable"}
    except Exception as e:
        return {"anomalies": [], "note": str(e)}


def assess_monitoring_flags(sentinel_history: list[dict]) -> list[str]:
    """
    Given a list of historical sentinel observations (each with ndvi, ndwi etc),
    produce human-readable monitoring alert flags.
    """
    flags = []

    if len(sentinel_history) < 2:
        return flags

    ndvi_series = [s.get("ndvi", 0.3) for s in sentinel_history if s.get("ndvi") is not None]
    ndwi_series = [s.get("ndwi", -0.1) for s in sentinel_history if s.get("ndwi") is not None]

    if len(ndvi_series) >= 4:
        result = ewma_change_detection(ndvi_series)
        if result.get("alert"):
            flags.append(f"NDVI change detected: {result['summary']}")

        # Simple trend — last 2 vs baseline
        recent_mean = np.mean(ndvi_series[-2:])
        early_mean = np.mean(ndvi_series[:max(2, len(ndvi_series)//3)])
        if recent_mean < early_mean - 0.1:
            flags.append("Vegetation decline trend (NDVI dropped > 0.1 from baseline)")
        elif recent_mean > early_mean + 0.15:
            flags.append("Vegetation increase detected (possible regrowth or land use change)")

    if len(ndwi_series) >= 4:
        recent_ndwi = np.mean(ndwi_series[-2:])
        early_ndwi = np.mean(ndwi_series[:max(2, len(ndwi_series)//3)])
        if recent_ndwi < early_ndwi - 0.15:
            flags.append("Moisture decrease detected — possible drainage or dry period")
        elif recent_ndwi > early_ndwi + 0.15:
            flags.append("Moisture increase detected — rewetting progress or flooding")

    return flags
