"""
Full daily ingestion pipeline.
Uses DB-cached weather history first; only downloads IMERG for dates not yet in DB.
On a warm system (daily runs) this means only ~1 file download instead of 45.
"""
import logging
from datetime import date, timedelta
from math import asin, cos, radians, sin, sqrt

import numpy as np
import pandas as pd

from imerg import fetch_ibtracs_active, fetch_precip_for_basins, fetch_precip_today_partial
from db import fetch_basins, fetch_weather_history, upsert_predictions, upsert_weather
from features import build_features
from model import get_climatology, predict

log = logging.getLogger(__name__)

INFLUENCE_KM  = 1000.0
HISTORY_DAYS  = 45


def _haversine(lon1, lat1, lon2, lat2):
    R = 6371.0
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon, dlat = lon2 - lon1, lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def _typhoon_features(basin_lat, basin_lon, storms: pd.DataFrame):
    if storms.empty:
        return {"typhoon_wind_kt": 0.0, "typhoon_dist_km": 1000.0, "is_typhoon_nearby": 0}
    min_dist, max_wind = 1000.0, 0.0
    for _, s in storms.iterrows():
        d = _haversine(basin_lon, basin_lat, s["lon"], s["lat"])
        if d < min_dist:
            min_dist = d
        if d < INFLUENCE_KM and s["wind_kt"] > max_wind:
            max_wind = s["wind_kt"]
    return {
        "typhoon_wind_kt":   max_wind,
        "typhoon_dist_km":   min_dist,
        "is_typhoon_nearby": int(min_dist < INFLUENCE_KM),
    }


def run_ingestion(target_date: date) -> dict:
    log.info(f"=== Ingestion (IMERG v3) for {target_date} ===")

    # 1. Load basins
    basin_rows = fetch_basins()
    basins = [dict(r) for r in basin_rows]
    if not basins:
        raise RuntimeError("No basins in DB. Seed the basins table first.")
    hybas_ids = [b["hybas_id"] for b in basins]
    log.info(f"  {len(basins)} basins loaded")

    # 2. Determine the 45-day window needed for rolling features
    all_dates = [target_date - timedelta(days=i) for i in range(HISTORY_DAYS - 1, -1, -1)]

    # 3. Fetch existing weather from DB for the full window
    db_history = fetch_weather_history(hybas_ids, days=HISTORY_DAYS, end_date=target_date)
    db_df = pd.DataFrame([dict(r) for r in db_history])
    if not db_df.empty:
        db_df["date"] = pd.to_datetime(db_df["date"]).dt.date

    # 4. Find dates where the majority of basins are missing real (non-null) precip.
    # "Covered" = ≥80% of basins have real data for that date.  This prevents border
    # basins that consistently return NaN from IMERG (no satellite coverage) from
    # marking every date as missing and forcing a full 45-day re-download every run.
    n_basins = len(hybas_ids)
    COVER_THRESHOLD = 0.80

    if db_df.empty:
        covered_dates: set = set()
    else:
        real = db_df[db_df["precip_mm"].notna()]
        date_counts = real.groupby("date")["hybas_id"].count()
        covered_dates = set(
            d for d, cnt in date_counts.items()
            if cnt >= COVER_THRESHOLD * n_basins
        )

    missing_dates = sorted(d for d in all_dates if d not in covered_dates)
    log.info(f"  DB covers {HISTORY_DAYS - len(missing_dates)}/{HISTORY_DAYS} days "
             f"— downloading {len(missing_dates)} missing day(s)")

    # 5. Download IMERG only for missing dates, then persist real values to DB
    new_rows: list[dict] = []
    for d in missing_dates:
        try:
            if d >= date.today():
                day_df = fetch_precip_today_partial(basins, d)
            else:
                day_df = fetch_precip_for_basins(basins, d, history_days=1, use_final=False)
            day_df["date"] = pd.to_datetime(day_df["date"]).dt.date
            new_rows.extend(day_df.to_dict("records"))
        except Exception as e:
            log.warning(f"  IMERG {d} failed: {e} — using NaN")
            new_rows.extend(
                {"hybas_id": b["hybas_id"], "date": d, "precip_mm": np.nan}
                for b in basins
            )

    real_new = [r for r in new_rows if not (isinstance(r["precip_mm"], float) and np.isnan(r["precip_mm"]))]
    if real_new:
        upsert_weather([
            {"hybas_id": int(r["hybas_id"]), "date": str(r["date"]), "precip_mm": r["precip_mm"]}
            for r in real_new
        ])
        log.info(f"  Persisted {len(real_new)} new precip rows to DB")

    # Data quality check for target date
    target_new = [r for r in new_rows if r["date"] == target_date]
    if target_new:
        nan_count  = sum(1 for r in target_new if isinstance(r["precip_mm"], float) and np.isnan(r["precip_mm"]))
        real_count = len(target_new) - nan_count
        if nan_count == len(target_new):
            log.warning(f"  DATA QUALITY: 0/{len(target_new)} basins have real precip for {target_date} "
                        f"— all NaN, model will use train_medians (too early in UTC day or IMERG lag not cleared)")
        elif nan_count > 0:
            log.warning(f"  DATA QUALITY: {real_count}/{len(target_new)} basins have real precip, "
                        f"{nan_count} NaN → will use train_medians for those")
        else:
            log.info(f"  DATA QUALITY: all {real_count} basins have real precip for {target_date} ✓")

    # 6. Build full 45-day DataFrame: DB rows + newly downloaded rows, deduped.
    # Sort NaN precip before real values so drop_duplicates(keep="last") always
    # retains the real value — prevents a failed re-download from overwriting
    # good historical data that was already persisted in the DB.
    db_rows = db_df.to_dict("records") if not db_df.empty else []
    imerg_df = pd.DataFrame(db_rows + new_rows)
    imerg_df["date"] = pd.to_datetime(imerg_df["date"])
    imerg_df = (
        imerg_df
        .sort_values(["hybas_id", "date", "precip_mm"], na_position="first")
        .drop_duplicates(subset=["hybas_id", "date"], keep="last")
        .reset_index(drop=True)
    )

    # 7. Typhoon features
    log.info("  Fetching IBTrACS typhoon data...")
    try:
        storms = fetch_ibtracs_active(target_date)
    except Exception as e:
        log.warning(f"  IBTrACS fetch failed ({e}), proceeding without typhoon data")
        storms = pd.DataFrame()

    # 8. Build feature DataFrame
    basin_static = pd.DataFrame(basins).rename(columns={"hybas_id": "HYBAS_ID"})
    imerg_df = imerg_df.rename(columns={"hybas_id": "HYBAS_ID", "precip_mm": "precip_1d"})
    df = imerg_df.merge(basin_static, on="HYBAS_ID", how="left")

    typhoon_df = pd.DataFrame([
        {**_typhoon_features(b["lat"], b["lon"], storms), "HYBAS_ID": b["hybas_id"]}
        for b in basins
    ])
    df = df.merge(typhoon_df, on="HYBAS_ID", how="left")

    log.info("  Engineering features...")
    df = build_features(df, climatology=get_climatology())

    for src, dst in [
        ("elev_m",         "elevation_m"),
        ("basin_area_km2", "SUB_AREA"),
        ("up_area_km2",    "UP_AREA"),
        ("river_order",    "ORDER_"),
        ("lat",            "centroid_lat"),
        ("lon",            "centroid_lon"),
    ]:
        if src in df.columns and dst not in df.columns:
            df[dst] = df[src]

    df["date"] = pd.to_datetime(df["date"])
    pred_df = df[df["date"] == pd.Timestamp(target_date)].copy()
    if pred_df.empty:
        raise RuntimeError(f"No data for target_date={target_date} after feature engineering")

    # 9. Predict
    log.info("  Running model inference (v3)...")
    results = predict(pred_df)

    # 10. Upsert predictions
    pred_rows = [
        {
            "hybas_id":      int(r["hybas_id"]),
            "forecast_date": str(target_date),
            "run_date":      str(date.today()),
            "flood_prob":    float(r["flood_prob"]),
            "risk_level":    r["risk_level"],
        }
        for _, r in results.iterrows()
    ]
    upsert_predictions(pred_rows)
    log.info(f"  Upserted {len(pred_rows)} predictions")

    summary = results["risk_level"].value_counts().to_dict()
    log.info(f"  Risk summary: {summary}")
    return {"date": str(target_date), "basins": len(pred_rows), "risk_summary": summary}
