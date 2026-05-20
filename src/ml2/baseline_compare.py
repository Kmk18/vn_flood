"""
Baseline model comparison: Random Forest vs XGBoost vs LightGBM (tuned v3).

Uses the same parquet dataset and temporal split as LightGBM v3 training.
Saves results to baseline_results.json and prints a comparison table.

Usage
-----
python baseline_compare.py \
    --labels C:/Users/admin/Downloads/vietnam_flood_training_v2.parquet \
    --artifacts C:/tmp/vnflood_model_v3 \
    --out baseline_results.json
"""
import argparse
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

parser = argparse.ArgumentParser()
parser.add_argument("--labels",    default="C:/Users/admin/Downloads/vietnam_flood_training_v2.parquet")
parser.add_argument("--artifacts", default="C:/tmp/vnflood_model_v3")
parser.add_argument("--out",       default="baseline_results.json")
parser.add_argument("--seed",      type=int, default=42)
args = parser.parse_args()

ARTIFACTS = Path(args.artifacts)
SEED = args.seed
np.random.seed(SEED)

# ── Load data ─────────────────────────────────────────────────────────────────
log.info("Loading parquet: %s", args.labels)
df = pd.read_parquet(args.labels)
df["date"] = pd.to_datetime(df["date"])
log.info("  %d rows, %d basins, flood rate %.2f%%",
         len(df), df.HYBAS_ID.nunique(), df.flood.mean() * 100)

# ── Load LightGBM v3 metadata (reference results) ────────────────────────────
with open(ARTIFACTS / "model_meta_v3.json") as f:
    lgbm_meta = json.load(f)

feature_cols = joblib.load(ARTIFACTS / "feature_cols_v3.pkl")
train_medians = joblib.load(ARTIFACTS / "train_medians_v3.pkl")
pos_weight = lgbm_meta["scale_pos_weight"]

log.info("  Feature cols: %d", len(feature_cols))
log.info("  LightGBM v3 train years: %s", lgbm_meta["train_years"])
log.info("  LightGBM v3 test years:  %s", lgbm_meta["test_years"])

# ── Temporal split (mirror train.py logic) ────────────────────────────────────
TARGET = "flood"
flood_years = sorted(df[df[TARGET] == 1]["year"].unique())
n = len(flood_years)
train_end_yr = flood_years[round(n * 0.75) - 1]
val_end_yr   = flood_years[round(n * 0.875) - 1]

train_df = df[df["year"] <= train_end_yr]
val_df   = df[(df["year"] > train_end_yr) & (df["year"] <= val_end_yr)]
test_df  = df[df["year"] > val_end_yr]

# Baselines trained on train+val combined (same final training window as LightGBM)
tv_df = df[df["year"] <= val_end_yr]

X_train = train_df[feature_cols].fillna(train_medians).fillna(0)
y_train = train_df[TARGET]
X_tv    = tv_df[feature_cols].fillna(train_medians).fillna(0)
y_tv    = tv_df[TARGET]
X_test  = test_df[feature_cols].fillna(train_medians).fillna(0)
y_test  = test_df[TARGET]

log.info("  Train+val: %d–%d  (%d pos)", tv_df.year.min(), val_end_yr, y_tv.sum())
log.info("  Test:      %d–%d  (%d pos)", test_df.year.min(), test_df.year.max(), y_test.sum())


def evaluate(name: str, model, X_tr, y_tr, X_te, y_te) -> dict:
    """Fit model, return metrics dict."""
    log.info("Training %s ...", name)
    model.fit(X_tr, y_tr)

    train_prob = model.predict_proba(X_tr)[:, 1]
    test_prob  = model.predict_proba(X_te)[:, 1]

    train_auc = roc_auc_score(y_tr, train_prob)
    test_auc  = roc_auc_score(y_te, test_prob)
    test_ap   = average_precision_score(y_te, test_prob)
    gap       = train_auc - test_auc

    # Best F1 threshold on test set
    thresholds = np.linspace(0.01, 0.99, 200)
    f1s = [f1_score(y_te, (test_prob >= t).astype(int), zero_division=0) for t in thresholds]
    best_t = float(thresholds[np.argmax(f1s)])
    pred   = (test_prob >= best_t).astype(int)

    result = {
        "model":       name,
        "train_auc":   round(float(train_auc), 4),
        "test_auc":    round(float(test_auc),  4),
        "test_ap":     round(float(test_ap),   4),
        "train_test_gap": round(float(gap),    4),
        "best_threshold": round(best_t,        4),
        "f1":          round(float(f1_score(y_te, pred, zero_division=0)),    4),
        "precision":   round(float(precision_score(y_te, pred, zero_division=0)), 4),
        "recall":      round(float(recall_score(y_te, pred, zero_division=0)),    4),
    }
    log.info("  %s — AUC %.4f  AP %.4f  F1 %.4f (thr %.3f)",
             name, test_auc, test_ap, result["f1"], best_t)
    return result


# ── Train baselines ───────────────────────────────────────────────────────────
n_pos = int(y_tv.sum())
n_neg = int((y_tv == 0).sum())

rf = RandomForestClassifier(
    n_estimators=500,
    max_depth=None,
    min_samples_leaf=50,
    class_weight="balanced",
    n_jobs=-1,
    random_state=SEED,
)

xgb = XGBClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.1,
    scale_pos_weight=pos_weight,
    eval_metric="auc",
    use_label_encoder=False,
    random_state=SEED,
    n_jobs=-1,
    verbosity=0,
)

results = []
results.append(evaluate("Random Forest",  rf,  X_tv, y_tv, X_test, y_test))
results.append(evaluate("XGBoost",        xgb, X_tv, y_tv, X_test, y_test))

# ── Append LightGBM v3 reference ─────────────────────────────────────────────
# F1/precision/recall from meta (computed at best_threshold during training)
import lightgbm as lgb
lgbm_model = joblib.load(ARTIFACTS / "lgbm_flood_v3.pkl")
lgbm_prob  = lgbm_model.predict_proba(X_test.values)[:, 1]
lgbm_t     = lgbm_meta["best_threshold"]
lgbm_pred  = (lgbm_prob >= lgbm_t).astype(int)

results.append({
    "model":          "LightGBM v3 (tuned)",
    "train_auc":      round(lgbm_meta["train_auc"],      4),
    "test_auc":       round(lgbm_meta["test_auc"],       4),
    "test_ap":        round(lgbm_meta["test_ap"],        4),
    "train_test_gap": round(lgbm_meta["train_test_gap"], 4),
    "best_threshold": round(lgbm_t,                      4),
    "f1":             round(float(f1_score(y_test, lgbm_pred, zero_division=0)),    4),
    "precision":      round(float(precision_score(y_test, lgbm_pred, zero_division=0)), 4),
    "recall":         round(float(recall_score(y_test, lgbm_pred, zero_division=0)),    4),
})

# ── Print comparison table ────────────────────────────────────────────────────
header = f"{'Model':<25} {'Train AUC':>10} {'Test AUC':>10} {'AP':>8} {'F1':>8} {'Prec':>8} {'Recall':>8} {'Gap':>8}"
print("\n" + "=" * len(header))
print(header)
print("-" * len(header))
for r in results:
    print(f"{r['model']:<25} {r['train_auc']:>10.4f} {r['test_auc']:>10.4f} "
          f"{r['test_ap']:>8.4f} {r['f1']:>8.4f} {r['precision']:>8.4f} "
          f"{r['recall']:>8.4f} {r['train_test_gap']:>8.4f}")
print("=" * len(header) + "\n")

# ── Save results ──────────────────────────────────────────────────────────────
out = {
    "test_years":  f"{test_df.year.min()}–{test_df.year.max()}",
    "train_years": f"{tv_df.year.min()}–{val_end_yr}",
    "n_test":      int(len(y_test)),
    "n_test_pos":  int(y_test.sum()),
    "models":      results,
}
with open(args.out, "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
log.info("Results saved to %s", args.out)
