"""
Standalone evaluation of the trained flood model (v3).

Reuses the IMERG cache from training — no new downloads unless a file is missing.

Usage:
    python evaluate.py \
        --labels C:/Users/admin/Downloads/vietnam_flood_training_v2.parquet \
        --artifacts C:/tmp/vnflood_model_v3 \
        --imerg-cache D:/imerg_cache
"""
import argparse
import json
import logging
import os
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── CLI ───────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--labels",      required=True,
                    help="Path to vietnam_flood_training_v2.parquet")
parser.add_argument("--artifacts",   default=os.getenv("ARTIFACTS_DIR", "C:/tmp/vnflood_model_v3"),
                    help="Directory containing lgbm_flood_v3.pkl etc.")
parser.add_argument("--imerg-cache", default=os.getenv("IMERG_CACHE_DIR", "/tmp/imerg_cache"),
                    help="Directory of cached IMERG HDF5 files")
args = parser.parse_args()

ART = Path(args.artifacts)
os.environ["IMERG_CACHE_DIR"] = args.imerg_cache

# ── Load artifacts ────────────────────────────────────────────────────────────
log.info("Loading artifacts from %s", ART)
model         = joblib.load(ART / "lgbm_flood_v3.pkl")
feature_cols  = joblib.load(ART / "feature_cols_v3.pkl")
train_medians = joblib.load(ART / "train_medians_v3.pkl")

with open(ART / "model_meta_v3.json") as fh:
    meta = json.load(fh)

log.info("  Trained at  : %s", meta["trained_at"])
log.info("  Train years : %s", meta["train_years"])
log.info("  Val years   : %s", meta["val_years"])
log.info("  Test years  : %s", meta["test_years"])
log.info("  Features    : %d", meta["feature_count"])
log.info("  Saved AUC   : %.4f", meta["test_auc"])
log.info("  Saved AP    : %.4f", meta["test_ap"])
log.info("  Saved thresh: %.3f", meta["best_threshold"])

# test set starts at the first year in "YYYY–YYYY"
test_year_start = int(meta["test_years"].split("–")[0])

# ── Rebuild feature matrix (reads IMERG from cache) ───────────────────────────
log.info("\nRebuilding feature matrix from cache (no re-download)…")

from features import build_features
from imerg import fetch_precip_for_basins

raw = pd.read_parquet(args.labels)
raw["date"] = pd.to_datetime(raw["date"])

for old, new in [("CHIRPS_1d", "precip_raw_1d"), ("precip_mm", "precip_raw_1d")]:
    if old in raw.columns:
        raw = raw.rename(columns={old: new})

lat_col = next((c for c in ("lat", "centroid_lat") if c in raw.columns), None)
lon_col = next((c for c in ("lon", "centroid_lon") if c in raw.columns), None)
if lat_col is None or lon_col is None:
    raise SystemExit("ERROR: parquet missing lat/lon columns.")

basins = (
    raw[["HYBAS_ID", lat_col, lon_col]]
    .drop_duplicates("HYBAS_ID")
    .rename(columns={"HYBAS_ID": "hybas_id", lat_col: "lat", lon_col: "lon"})
    .to_dict(orient="records")
)

all_dates = sorted(raw["date"].dt.date.unique())
log.info("  %d dates  |  %d basins", len(all_dates), len(basins))

imerg_frames = []
for i in range(0, len(all_dates), 90):
    batch = all_dates[i: i + 90]
    days_back = (batch[-1] - batch[0]).days + 1
    df_batch = fetch_precip_for_basins(basins, batch[-1], history_days=days_back, use_final=True)
    df_batch["date"] = pd.to_datetime(df_batch["date"])
    df_batch = df_batch[df_batch["date"].dt.date.isin(set(batch))]
    imerg_frames.append(df_batch)

imerg_df = pd.concat(imerg_frames, ignore_index=True)
imerg_df = imerg_df.rename(columns={"precip_mm": "precip_1d"})
imerg_df["date"] = pd.to_datetime(imerg_df["date"])

drop_cols = [c for c in raw.columns
             if any(k in c.lower() for k in ["chirps", "precip_1d", "precip_raw"])]
df = raw.drop(columns=drop_cols, errors="ignore")
df = df.merge(
    imerg_df[["hybas_id", "date", "precip_1d"]].rename(columns={"hybas_id": "HYBAS_ID"}),
    on=["HYBAS_ID", "date"], how="left",
)

df = build_features(df)
df = df.sort_values(["HYBAS_ID", "date"]).reset_index(drop=True)

# ── Isolate test set ──────────────────────────────────────────────────────────
test_df = df[df["year"] >= test_year_start].copy()
if test_df.empty:
    raise SystemExit(f"ERROR: no rows found for year >= {test_year_start}. Check parquet date range.")
if test_df["flood"].sum() == 0:
    raise SystemExit("ERROR: test set has no flood events — cannot compute AUC.")

log.info("\nTest set: %d rows | years %d–%d | %d flood events (%.2f%%)",
         len(test_df), test_df.year.min(), test_df.year.max(),
         test_df.flood.sum(), test_df.flood.mean() * 100)

X_test = test_df[feature_cols].fillna(train_medians).fillna(0)
y_test  = test_df["flood"].values
prob    = model.predict_proba(X_test.values)[:, 1]
thresh  = meta["best_threshold"]
pred    = (prob >= thresh).astype(int)

# ── Metrics ───────────────────────────────────────────────────────────────────
from sklearn.metrics import (
    roc_auc_score, average_precision_score,
    f1_score, precision_score, recall_score, confusion_matrix,
)

auc  = roc_auc_score(y_test, prob)
ap   = average_precision_score(y_test, prob)
f1   = f1_score(y_test, pred, zero_division=0)
prec = precision_score(y_test, pred, zero_division=0)
rec  = recall_score(y_test, pred, zero_division=0)
cm   = confusion_matrix(y_test, pred)

auc_match = abs(auc - meta["test_auc"]) < 0.001

print()
print("=" * 62)
print("  MODEL EVALUATION — HELD-OUT TEST SET")
print("=" * 62)
print(f"  AUC           : {auc:.4f}   (saved: {meta['test_auc']:.4f})  {'✓ match' if auc_match else '⚠ MISMATCH'}")
print(f"  Avg Precision : {ap:.4f}   (saved: {meta['test_ap']:.4f})")
print(f"  F1 @ {thresh:.3f}   : {f1:.4f}")
print(f"  Precision     : {prec:.4f}")
print(f"  Recall        : {rec:.4f}")
print()
print(f"  Train AUC     : {meta['train_auc']:.4f}")
print(f"  Test  AUC     : {auc:.4f}")
print(f"  Gap           : {meta['train_auc'] - auc:.4f}  {'✓ ok (<0.10)' if meta['train_auc'] - auc < 0.10 else '⚠ check overfitting'}")

print()
print(f"Confusion matrix (threshold = {thresh:.3f}):")
print(f"                  Pred NO    Pred FLOOD")
print(f"  Actual NO     {cm[0][0]:>10,}  {cm[0][1]:>10,}")
print(f"  Actual FLOOD  {cm[1][0]:>10,}  {cm[1][1]:>10,}")
tn, fp, fn, tp = cm.ravel()
print(f"\n  True Positives  (correct flood alerts) : {tp:,}")
print(f"  False Positives (false alarms)         : {fp:,}")
print(f"  False Negatives (missed floods)        : {fn:,}")
print(f"  True Negatives  (correct no-flood)     : {tn:,}")

# ── Per-year breakdown ────────────────────────────────────────────────────────
test_df = test_df.copy()
test_df["prob"] = prob
test_df["pred"] = pred

print("\nPer-year breakdown:")
print(f"  {'Year':<6}  {'AUC':>6}  {'F1':>6}  {'Prec':>6}  {'Rec':>6}  {'Floods':>8}")
for yr, grp in test_df.groupby("year"):
    if grp["flood"].sum() < 2:
        continue
    yr_auc  = roc_auc_score(grp["flood"], grp["prob"])
    yr_f1   = f1_score(grp["flood"], grp["pred"], zero_division=0)
    yr_prec = precision_score(grp["flood"], grp["pred"], zero_division=0)
    yr_rec  = recall_score(grp["flood"], grp["pred"], zero_division=0)
    print(f"  {yr:<6}  {yr_auc:>6.4f}  {yr_f1:>6.4f}  {yr_prec:>6.4f}  {yr_rec:>6.4f}  {int(grp['flood'].sum()):>8,}")

# ── Calibration ───────────────────────────────────────────────────────────────
print("\nCalibration (predicted probability vs actual flood rate):")
print(f"  {'Prob bin':<12}  {'Actual rate':>11}  {'N':>8}  Chart")
bins   = np.linspace(0, 1, 11)
labels = [f"{bins[i]:.1f}–{bins[i+1]:.1f}" for i in range(len(bins) - 1)]
test_df["_bin"] = pd.cut(prob, bins=bins, labels=labels, include_lowest=True)
cal = test_df.groupby("_bin", observed=False)["flood"].agg(["mean", "count"])
for bin_lbl, row in cal.iterrows():
    bar = "█" * int(row["mean"] * 40)
    print(f"  {str(bin_lbl):<12}  {row['mean']:>10.1%}  {int(row['count']):>8,}  {bar}")

# ── Feature importance ────────────────────────────────────────────────────────
print("\nTop 20 feature importances (gain):")
fi = pd.Series(
    model.booster_.feature_importance(importance_type="gain"),
    index=feature_cols,
).sort_values(ascending=False)
max_gain = fi.iloc[0]
for feat, gain in fi.head(20).items():
    bar = "█" * int(gain / max_gain * 35)
    print(f"  {feat:<35} {bar}")

print("\nDone.")
