"""
Train LightGBM flood model v3 using IMERG Final precipitation.

Mirrors the approach from flood_model_training.ipynb (v2 notebook):
  - Same LightGBM + Optuna hyperparameter search
  - Same feature engineering (features.py)
  - Same MODIS MCDWD flood labels
  - Only difference: CHIRPS replaced with IMERG Final

Usage
-----
# Install deps first:
pip install -r requirements.txt

# Set credentials:
export EARTHDATA_USERNAME=your_nasa_username   # https://urs.earthdata.nasa.gov
export EARTHDATA_PASSWORD=your_nasa_password

# Run (takes 2-6h depending on internet speed for IMERG download):
python train.py

# With custom paths:
python train.py --labels /path/to/vietnam_flood_training_v2.parquet \
                --out-dir /path/to/output \
                --trials 50

Outputs (saved to --out-dir):
  lgbm_flood_v3.pkl        model artifact
  feature_cols_v3.pkl      ordered feature list
  train_medians_v3.pkl     NaN imputation values
  model_meta_v3.json       training metadata and metrics

Upload to GCS after training:
  gsutil -m cp /tmp/vnflood_model_v3/*.pkl /tmp/vnflood_model_v3/*.json \\
    gs://vietnam-flood-models/
"""
import argparse
import json
import logging
import os
import warnings
from datetime import date, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── CLI args ──────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Train VNFlood IMERG model v3")
parser.add_argument(
    "--labels",
    default=None,
    help=(
        "Path to vietnam_flood_training_v2.parquet (from data_collection notebook). "
        "If omitted, downloads MODIS flood labels via earthaccess."
    ),
)
parser.add_argument(
    "--out-dir",
    default=os.getenv("ARTIFACTS_DIR", "/tmp/vnflood_model_v3"),
    help="Directory to save model artifacts",
)
parser.add_argument(
    "--imerg-cache",
    default=os.getenv("IMERG_CACHE_DIR", "/tmp/imerg_cache"),
    help="Directory to cache IMERG HDF5 files",
)
parser.add_argument(
    "--trials", type=int, default=50,
    help="Number of Optuna hyperparameter search trials",
)
parser.add_argument(
    "--start-year", type=int, default=2001,
    help="First year to download IMERG data (2001 is the IMERG start year)",
)
parser.add_argument(
    "--end-year", type=int, default=date.today().year - 1,
    help="Last year to download IMERG data (default: last complete year)",
)
parser.add_argument(
    "--seed", type=int, default=42,
)
args = parser.parse_args()

OUT_DIR = Path(args.out_dir)
OUT_DIR.mkdir(parents=True, exist_ok=True)
os.environ["IMERG_CACHE_DIR"] = args.imerg_cache
SEED = args.seed
np.random.seed(SEED)

# ── Imports that require deps ──────────────────────────────────────────────
import lightgbm as lgb
import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)

from sklearn.metrics import (
    roc_auc_score, average_precision_score,
    f1_score, precision_score, recall_score,
)

from features import build_features
from imerg import fetch_precip_for_basins

# ── Step 1: Load or build the training DataFrame ───────────────────────────
log.info("=== Step 1: Loading flood labels ===")

if args.labels:
    log.info(f"Loading existing parquet: {args.labels}")
    raw = pd.read_parquet(args.labels)
    raw["date"] = pd.to_datetime(raw["date"])

    # Rename CHIRPS column names to IMERG-neutral name
    for old, new in [
        ("CHIRPS_1d", "precip_raw_1d"),
        ("precip_mm", "precip_raw_1d"),
    ]:
        if old in raw.columns:
            raw = raw.rename(columns={old: new})

    log.info(f"  Loaded {len(raw):,} rows, {raw.HYBAS_ID.nunique()} basins")
    log.info(f"  Date range: {raw.date.min().date()} – {raw.date.max().date()}")
    log.info(f"  Flood days: {raw['flood'].sum():,} ({raw['flood'].mean()*100:.2f}%)")
else:
    raise SystemExit(
        "ERROR: --labels is required.\n"
        "Provide the path to vietnam_flood_training_v2.parquet (from data_collection.ipynb).\n"
        "That file contains HYBAS_ID, date, flood (MODIS label), and static basin features.\n"
        "The CHIRPS precipitation in that file will be replaced with IMERG data below."
    )

# ── Step 2: Download IMERG Final precip and replace CHIRPS columns ─────────
log.info("=== Step 2: Downloading IMERG Final precipitation ===")
log.info("  This downloads daily HDF5 files for Vietnam — may take 1-4 hours on first run.")
log.info("  Files are cached in: " + args.imerg_cache)

lat_col = next((c for c in ("lat", "centroid_lat") if c in raw.columns), None)
lon_col = next((c for c in ("lon", "centroid_lon") if c in raw.columns), None)
if lat_col is None or lon_col is None:
    raise SystemExit(
        "ERROR: Parquet is missing lat/lon columns (looked for 'lat'/'centroid_lat' and 'lon'/'centroid_lon').\n"
        "Ensure your parquet was produced by data_collection.ipynb."
    )
basins = (
    raw[["HYBAS_ID", lat_col, lon_col]]
    .drop_duplicates("HYBAS_ID")
    .rename(columns={"HYBAS_ID": "hybas_id", lat_col: "lat", lon_col: "lon"})
    .to_dict(orient="records")
)
log.info(f"  {len(basins)} basins extracted from parquet (lat={lat_col}, lon={lon_col})")

# Get dates needed
all_dates = sorted(raw["date"].dt.date.unique())
log.info(f"  Fetching IMERG for {len(all_dates)} dates: {all_dates[0]} – {all_dates[-1]}")

imerg_frames = []
batch_size = 90  # process 90 days at a time to show progress

for i in range(0, len(all_dates), batch_size):
    batch = all_dates[i : i + batch_size]
    start_d, end_d = batch[0], batch[-1]
    log.info(f"  Batch {i//batch_size + 1}: {start_d} – {end_d}")

    # Download the full history window ending at end_d
    days_back = (end_d - start_d).days + 1
    df_batch = fetch_precip_for_basins(
        basins, end_d, history_days=days_back, use_final=True
    )
    # Only keep dates in this batch (avoids overlap)
    df_batch["date"] = pd.to_datetime(df_batch["date"])
    df_batch = df_batch[df_batch["date"].dt.date.isin(set(batch))]
    imerg_frames.append(df_batch)

imerg_df = pd.concat(imerg_frames, ignore_index=True)
imerg_df = imerg_df.rename(columns={"precip_mm": "precip_1d"})
imerg_df["date"] = pd.to_datetime(imerg_df["date"])
log.info(f"  IMERG data: {len(imerg_df):,} rows, NaN rate: {imerg_df['precip_1d'].isna().mean()*100:.1f}%")

# ── Step 3: Merge IMERG into training DataFrame ───────────────────────────
log.info("=== Step 3: Merging IMERG into training data ===")

# Drop any existing precipitation columns (from CHIRPS)
precip_cols_to_drop = [
    c for c in raw.columns
    if any(k in c.lower() for k in ["chirps", "precip_1d", "precip_raw"])
]
log.info(f"  Dropping old precip columns: {precip_cols_to_drop}")
df = raw.drop(columns=precip_cols_to_drop, errors="ignore")

df = df.merge(
    imerg_df[["hybas_id", "date", "precip_1d"]].rename(columns={"hybas_id": "HYBAS_ID"}),
    on=["HYBAS_ID", "date"],
    how="left",
)

nan_rate = df["precip_1d"].isna().mean() * 100
log.info(f"  After merge — precip_1d NaN rate: {nan_rate:.1f}%")
if nan_rate > 30:
    log.warning(
        f"  High NaN rate ({nan_rate:.1f}%) — check IMERG download coverage. "
        f"Missing dates will be imputed with training medians at inference time."
    )

# ── Step 4: Feature engineering ──────────────────────────────────────────
log.info("=== Step 4: Feature engineering ===")
df = build_features(df)
df = df.sort_values(["HYBAS_ID", "date"]).reset_index(drop=True)
log.info(f"  DataFrame shape after features: {df.shape}")

# ── Step 5: Define feature columns ───────────────────────────────────────
log.info("=== Step 5: Defining feature columns ===")

ID_COLS = ["HYBAS_ID", "date", "year", "month"]
TARGET  = "flood"
EXCLUDE = set(ID_COLS + [TARGET, "flood_pct", "region_name", "doy", "label_src"])

feature_cols = [
    c for c in df.columns
    if c not in EXCLUDE and pd.api.types.is_numeric_dtype(df[c])
]
log.info(f"  {len(feature_cols)} features: {feature_cols[:8]}{'...' if len(feature_cols) > 8 else ''}")

for must in ["precip_7d", "api_30d", "discharge_proxy_m3s"]:
    if must not in feature_cols:
        log.warning(f"  Missing expected feature: {must}")
    else:
        log.info(f"  ✓ {must}")

# ── Step 6: Temporal train/val/test split ────────────────────────────────
log.info("=== Step 6: Temporal train/val/test split ===")

flood_years = sorted(df[df[TARGET] == 1]["year"].unique())
n = len(flood_years)
train_end_yr = flood_years[round(n * 0.75) - 1]
val_end_yr   = flood_years[round(n * 0.875) - 1]

train_df = df[df["year"] <= train_end_yr].copy()
val_df   = df[(df["year"] > train_end_yr) & (df["year"] <= val_end_yr)].copy()
test_df  = df[df["year"] > val_end_yr].copy()

X_train, y_train = train_df[feature_cols], train_df[TARGET]
X_val,   y_val   = val_df[feature_cols],   val_df[TARGET]
X_test,  y_test  = test_df[feature_cols],  test_df[TARGET]

assert y_train.sum() > 0, "Train set has no flood events — check labels"
assert y_val.sum()   > 0, "Val set has no flood events — check temporal split"
assert y_test.sum()  > 0, "Test set has no flood events — check temporal split"

log.info(f"  Train: {train_df.year.min()}–{train_end_yr}  {y_train.sum():,} flood days")
log.info(f"  Val  : {val_df.year.min()}–{val_end_yr}    {y_val.sum():,} flood days")
log.info(f"  Test : {test_df.year.min()}–{test_df.year.max()}  {y_test.sum():,} flood days")

# ── Step 7: Class imbalance + NaN imputation ──────────────────────────────
log.info("=== Step 7: Class imbalance handling ===")

n_maj = (y_train == 0).sum()
n_min = (y_train == 1).sum()
pos_weight = n_maj / n_min
log.info(f"  scale_pos_weight = {pos_weight:.1f}  ({n_min:,} flood / {n_maj:,} no-flood)")

train_medians = X_train.median().fillna(0)
X_train = X_train.fillna(train_medians).fillna(0)
X_val   = X_val.fillna(train_medians).fillna(0)
X_test  = X_test.fillna(train_medians).fillna(0)

# ── Step 8: Optuna hyperparameter search ─────────────────────────────────
log.info(f"=== Step 8: Optuna search ({args.trials} trials) ===")

def objective(trial):
    params = {
        "objective":         "binary",
        "metric":            "auc",
        "verbosity":         -1,
        "boosting_type":     "gbdt",
        "n_estimators":      800,
        "seed":              SEED,
        "scale_pos_weight":  pos_weight,
        "learning_rate":     trial.suggest_float("learning_rate", 0.01, 0.1,  log=True),
        "num_leaves":        trial.suggest_int("num_leaves",        15,  63),
        "max_depth":         trial.suggest_int("max_depth",          4,  10),
        "min_child_samples": trial.suggest_int("min_child_samples", 100, 600),
        "feature_fraction":  trial.suggest_float("feature_fraction", 0.5, 0.9),
        "bagging_fraction":  trial.suggest_float("bagging_fraction", 0.6, 0.95),
        "bagging_freq":      trial.suggest_int("bagging_freq", 1, 7),
        "reg_alpha":         trial.suggest_float("reg_alpha",  0.1, 20.0, log=True),
        "reg_lambda":        trial.suggest_float("reg_lambda", 0.1, 20.0, log=True),
    }
    model = lgb.LGBMClassifier(**params)
    model.fit(
        X_train.values, y_train.values,
        eval_set=[(X_val.values, y_val.values)],
        callbacks=[lgb.early_stopping(40, verbose=False), lgb.log_evaluation(-1)],
    )
    preds = model.predict_proba(X_val.values)[:, 1]
    if np.isnan(preds).any():
        return 0.0
    auc = roc_auc_score(y_val.values, preds)
    return float(auc) if not np.isnan(auc) else 0.0

study = optuna.create_study(
    direction="maximize",
    sampler=optuna.samplers.TPESampler(seed=SEED),
)
study.optimize(objective, n_trials=args.trials, show_progress_bar=True)
log.info(f"  Best val AUC: {study.best_value:.4f}")

# ── Step 9: Final training (train + val combined) ─────────────────────────
log.info("=== Step 9: Final model training ===")

final_params = {
    "objective":        "binary",
    "metric":           "auc",
    "verbosity":        -1,
    "boosting_type":    "gbdt",
    "n_estimators":     2000,
    "seed":             SEED,
    "scale_pos_weight": pos_weight,
    **study.best_params,
}

X_tv = pd.concat([X_train, X_val]).values
y_tv = pd.concat([y_train, y_val]).values

final_model = lgb.LGBMClassifier(**final_params)
final_model.fit(
    X_tv, y_tv,
    eval_set=[(X_test.values, y_test.values)],
    callbacks=[lgb.early_stopping(100, verbose=True), lgb.log_evaluation(100)],
)

train_auc = roc_auc_score(y_train, final_model.predict_proba(X_train.values)[:, 1])
test_prob  = final_model.predict_proba(X_test.values)[:, 1]
test_auc   = roc_auc_score(y_test, test_prob)
test_ap    = average_precision_score(y_test, test_prob)
gap        = train_auc - test_auc

log.info(f"  Train AUC : {train_auc:.4f}")
log.info(f"  Test  AUC : {test_auc:.4f}   AP: {test_ap:.4f}")
log.info(f"  Gap       : {gap:.4f}  {'✓ ok' if gap < 0.1 else '⚠ check overfitting'}")

# ── Step 10: Save artifacts ───────────────────────────────────────────────
log.info("=== Step 10: Saving artifacts ===")

joblib.dump(final_model,  OUT_DIR / "lgbm_flood_v3.pkl")
joblib.dump(feature_cols, OUT_DIR / "feature_cols_v3.pkl")
joblib.dump(train_medians, OUT_DIR / "train_medians_v3.pkl")

thresholds = np.linspace(0.01, 0.99, 200)
f1s = [f1_score(y_test, (test_prob >= t).astype(int), zero_division=0) for t in thresholds]
best_thresh = float(thresholds[np.argmax(f1s)])

meta = {
    "trained_at":        __import__("datetime").datetime.utcnow().isoformat(),
    "model_version":     "v3",
    "data_sources":      ["IMERG Final Daily v07", "IBTrACS v04", "MODIS MCDWD"],
    "precip_source":     "IMERG Early Daily v07 (inference) / IMERG Final Daily v07 (training)",
    "realtime_lag_hours": 6,
    "feature_count":     len(feature_cols),
    "feature_cols":      feature_cols,
    "train_years":       f"{train_df.year.min()}–{train_end_yr}",
    "val_years":         f"{val_df.year.min()}–{val_end_yr}",
    "test_years":        f"{test_df.year.min()}–{test_df.year.max()}",
    "train_auc":         float(train_auc),
    "test_auc":          float(test_auc),
    "test_ap":           float(test_ap),
    "train_test_gap":    float(gap),
    "best_threshold":    best_thresh,
    "scale_pos_weight":  float(pos_weight),
    "best_optuna_auc":   float(study.best_value),
    "best_params":       study.best_params,
}

with open(OUT_DIR / "model_meta_v3.json", "w") as f:
    json.dump(meta, f, indent=2)

log.info(f"  Saved to: {OUT_DIR}")
log.info(f"  lgbm_flood_v3.pkl")
log.info(f"  feature_cols_v3.pkl  ({len(feature_cols)} features)")
log.info(f"  train_medians_v3.pkl")
log.info(f"  model_meta_v3.json")
log.info("")
log.info("=== Training complete ===")
log.info(f"  Test AUC:  {test_auc:.4f}")
log.info(f"  Test AP:   {test_ap:.4f}")
log.info(f"  Best F1 threshold: {best_thresh:.3f}")
log.info("")
log.info("Next: upload artifacts to GCS")
log.info(f"  gsutil -m cp {OUT_DIR}/*.pkl {OUT_DIR}/*.json gs://vietnam-flood-models/")
