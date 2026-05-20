"""
FastAPI service for ml2 — identical to ml/app.py except:
  - /ingest/latest uses yesterday (IMERG Early is ready by ~06:00 UTC same day)
  - Model artifacts are v3 (lgbm_flood_v3.pkl etc.)
"""
import logging
import os
from datetime import date, timedelta
from typing import List, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from features import build_features
from model import load_artifacts, predict

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(title="VNFlood ML Service v3 (IMERG)", version="3.0.0")


@app.on_event("startup")
def startup():
    try:
        load_artifacts()
    except Exception as e:
        log.error(f"Could not load model artifacts: {e}. /predict will fail until artifacts are available.")


@app.get("/health")
def health():
    return {"status": "ok", "model": "v3-imerg"}


class BasinFeatures(BaseModel):
    hybas_id: int
    precip_1d: Optional[float] = None
    precip_3d: Optional[float] = None
    precip_7d: Optional[float] = None
    precip_14d: Optional[float] = None
    precip_30d: Optional[float] = None
    precip_7d_anomaly: Optional[float] = None
    discharge_proxy_m3s: Optional[float] = None
    discharge_proxy_7d: Optional[float] = None
    discharge_proxy_anomaly: Optional[float] = None
    api_30d: Optional[float] = None
    api_anomaly: Optional[float] = None
    typhoon_wind_kt: Optional[float] = 0.0
    typhoon_dist_km: Optional[float] = 1000.0
    is_typhoon_nearby: Optional[int] = 0
    typhoon_exposure_3d: Optional[float] = 0.0
    is_monsoon: Optional[int] = None
    month_sin: Optional[float] = None
    month_cos: Optional[float] = None
    elevation_m: Optional[float] = None
    slope_deg: Optional[float] = None
    twi: Optional[float] = None
    region_id: Optional[int] = None
    up_area_km2: Optional[float] = None
    basin_area_km2: Optional[float] = None


class PredictRequest(BaseModel):
    basins: List[BasinFeatures]


class PredictResult(BaseModel):
    hybas_id: int
    flood_prob: float
    risk_level: str


@app.post("/predict", response_model=List[PredictResult])
def predict_endpoint(req: PredictRequest):
    if not req.basins:
        raise HTTPException(422, "basins list is empty")
    df = pd.DataFrame([b.model_dump() for b in req.basins])
    df = df.rename(columns={"hybas_id": "HYBAS_ID"})
    try:
        results = predict(df)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    return results.to_dict(orient="records")


@app.post("/ingest/latest")
def ingest_latest():
    return ingest(str(date.today()))


@app.post("/ingest/{target_date}")
def ingest(target_date: str):
    try:
        d = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(422, "target_date must be YYYY-MM-DD")

    if d > date.today():
        raise HTTPException(422, "Cannot ingest future dates")

    if "DATABASE_URL" not in os.environ:
        raise HTTPException(503, "DATABASE_URL not configured — ingestion unavailable")

    try:
        from ingest import run_ingestion
        result = run_ingestion(d)
        return result
    except Exception as e:
        log.exception("Ingestion failed")
        raise HTTPException(500, str(e))
