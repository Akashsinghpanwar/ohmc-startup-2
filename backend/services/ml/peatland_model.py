"""
ML Model 2: Peatland Condition Classifier (Random Forest).

Classifies peatland condition from Sentinel-2 spectral indices:
  - degraded: heavily drained, active peat erosion
  - modified: improved grassland on peat, drained
  - near_natural: largely intact, high water table

This is the AI estimation layer per CarbonOS design principles.
It informs (but does not replace) the deterministic rules engine.
"""
import numpy as np
import logging
import pickle
from pathlib import Path

logger = logging.getLogger(__name__)
MODEL_PATH = Path(__file__).parent / "weights" / "peatland_rf.pkl"

CONDITIONS = ["degraded", "modified", "near_natural"]

# Known spectral profiles from field surveys / literature
# Source: adapted from Sentinel-2 peatland mapping literature
SPECTRAL_PROFILES = {
    # condition: [ndvi_mean, ndvi_std, ndwi_mean, ndwi_std, ndmi_mean, bsi_mean, swir_ratio]
    "degraded":    [0.22, 0.08, -0.20, 0.08, -0.05, 0.05, 1.7],
    "modified":    [0.35, 0.10, -0.05, 0.08,  0.08, -0.02, 1.5],
    "near_natural":[0.42, 0.09,  0.15, 0.06,  0.22, -0.08, 1.3],
}


def _features(sentinel: dict) -> list[float]:
    return [
        sentinel.get("ndvi") or 0.3,
        sentinel.get("ndwi") or -0.1,
        sentinel.get("ndmi") or 0.1,
        sentinel.get("bare_soil_index") or -0.05,
        sentinel.get("swir_ratio") or 1.5,
    ]


def _rule_classify(sentinel: dict) -> str:
    """Rule-based fallback using known spectral thresholds."""
    ndwi = sentinel.get("ndwi", 0)
    ndmi = sentinel.get("ndmi", 0)
    ndvi = sentinel.get("ndvi", 0.3)

    if ndwi < -0.12 and ndmi < 0.0:
        return "degraded"
    if ndwi < 0.05 and ndmi < 0.15:
        return "modified"
    return "near_natural"


def train_peatland_model():
    """Train RF classifier on synthetic peatland condition data."""
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.preprocessing import LabelEncoder

        rng = np.random.RandomState(7)
        n_per_class = 500
        X, y = [], []

        for condition, profile in SPECTRAL_PROFILES.items():
            ndvi_mu, ndvi_s, ndwi_mu, ndwi_s, ndmi_mu, bsi_mu, swir_mu = profile
            n = n_per_class
            samples = np.column_stack([
                rng.normal(ndvi_mu, ndvi_s, n),
                rng.normal(ndwi_mu, ndwi_s, n),
                rng.normal(ndmi_mu, abs(ndmi_mu) * 0.3 + 0.05, n),
                rng.normal(bsi_mu, 0.05, n),
                rng.normal(swir_mu, 0.15, n),
            ])
            X.append(samples)
            y.extend([condition] * n)

        X = np.vstack(X)
        y = np.array(y)

        clf = RandomForestClassifier(
            n_estimators=150,
            max_depth=8,
            min_samples_leaf=10,
            random_state=42,
            class_weight="balanced",
        )
        clf.fit(X, y)

        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(clf, f)
        logger.info("Peatland condition model trained and saved")
        return clf

    except ImportError:
        logger.warning("scikit-learn not available")
        return None
    except Exception as e:
        logger.error(f"Peatland model training failed: {e}")
        return None


_model = None


def classify_peatland_condition(sentinel: dict) -> dict:
    """
    Classify peatland condition from Sentinel-2 indices.
    Returns condition label + probability breakdown.
    """
    global _model
    if _model is None:
        _model = MODEL_PATH.exists() and pickle.load(open(MODEL_PATH, "rb")) or train_peatland_model()

    features = _features(sentinel)

    if _model is not None:
        try:
            proba = _model.predict_proba([features])[0]
            classes = list(_model.classes_)
            condition = classes[np.argmax(proba)]
            probabilities = dict(zip(classes, [round(float(p), 3) for p in proba]))
        except Exception:
            condition = _rule_classify(sentinel)
            probabilities = {condition: 1.0}
    else:
        condition = _rule_classify(sentinel)
        probabilities = {condition: 1.0}

    return {
        "condition": condition,
        "probabilities": probabilities,
        "description": {
            "degraded": "Heavily drained; active peat erosion; high emissions",
            "modified": "Drained/converted; moderate emissions; restoration viable",
            "near_natural": "Largely intact; low emissions; limited additionality",
        }.get(condition, ""),
    }
