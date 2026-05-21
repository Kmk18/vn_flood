"""
Model inference — identical to ml/model.py except artifact names use v3
(trained on IMERG instead of CHIRPS).
"""
import os
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", "/tmp/vnflood_model_v3"))
GCS_BUCKET    = os.getenv("GCS_BUCKET", "")
ARTIFACT_FILES = [
    "lgbm_flood_v3.pkl",
    "feature_cols_v3.pkl",
    "train_medians_v3.pkl",
]

RISK_THRESHOLDS = {
    "critical": 0.75,
    "high":     0.50,
    "medium":   0.25,
    "low":      0.10,
}

_model         = None
_feature_cols  = None
_train_medians = None


def _download_from_gcs():
    from google.cloud import storage
    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    for fname in ARTIFACT_FILES:
        dest = ARTIFACTS_DIR / fname
        if dest.exists():
            continue
        log.info(f"Downloading {fname} from gs://{GCS_BUCKET}/{fname}")
        bucket.blob(fname).download_to_filename(str(dest))
        log.info(f"Downloaded {fname}")


def load_artifacts():
    global _model, _feature_cols, _train_medians

    if _model is not None:
        return

    if not all((ARTIFACTS_DIR / f).exists() for f in ARTIFACT_FILES):
        if not GCS_BUCKET:
            raise RuntimeError(
                "Model artifacts not found locally and GCS_BUCKET is not set. "
                "Run train.py first or set GCS_BUCKET."
            )
        _download_from_gcs()

    _model         = joblib.load(ARTIFACTS_DIR / "lgbm_flood_v3.pkl")
    _feature_cols  = joblib.load(ARTIFACTS_DIR / "feature_cols_v3.pkl")
    _train_medians = joblib.load(ARTIFACTS_DIR / "train_medians_v3.pkl")
    log.info(f"Model v3 loaded — {len(_feature_cols)} features")


def get_risk_level(prob: float) -> str:
    if prob >= RISK_THRESHOLDS["critical"]: return "critical"
    if prob >= RISK_THRESHOLDS["high"]:     return "high"
    if prob >= RISK_THRESHOLDS["medium"]:   return "medium"
    return "low"


def predict(feature_df: pd.DataFrame) -> pd.DataFrame:
    load_artifacts()

    X = pd.DataFrame(index=feature_df.index)
    for col in _feature_cols:
        if col in feature_df.columns:
            X[col] = feature_df[col]
        else:
            X[col] = _train_medians.get(col, 0.0)

    for col in _feature_cols:
        med = _train_medians.get(col, 0.0)
        X[col] = X[col].fillna(med if not np.isnan(float(med)) else 0.0)
    X = X.fillna(0.0)

    probs = _model.predict_proba(X.values)[:, 1]
    probs = probs.clip(0, 1)

    matched = sum(1 for c in _feature_cols if c in feature_df.columns)
    log.info(f"Feature coverage: {matched}/{len(_feature_cols)} matched")

    return pd.DataFrame({
        "hybas_id":   feature_df["HYBAS_ID"].values,
        "flood_prob": probs.round(4),
        "risk_level": [get_risk_level(p) for p in probs],
    })
