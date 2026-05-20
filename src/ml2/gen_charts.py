"""
Generate all thesis charts for VNFlood ML model.
Run from: e:/Dev/vnflood/src/ml2/
"""
import warnings; warnings.filterwarnings("ignore")
import pandas as pd, joblib, json, numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.ticker as mtick
from sklearn.metrics import (
    roc_auc_score, average_precision_score, roc_curve,
    precision_recall_curve, f1_score, precision_score, recall_score,
    confusion_matrix,
)
from pathlib import Path

ART = Path("C:/tmp/vnflood_model_v3")
OUT = Path("e:/Dev/vnflood/latex/figures")

model         = joblib.load(ART / "lgbm_flood_v3.pkl")
feature_cols  = joblib.load(ART / "feature_cols_v3.pkl")
train_medians = joblib.load(ART / "train_medians_v3.pkl")
meta          = json.load(open(ART / "model_meta_v3.json"))

df = pd.read_parquet("C:/Users/admin/Downloads/vietnam_flood_training_v2.parquet")
df["date"] = pd.to_datetime(df["date"])

TRAIN_END = 2020; VAL_END = 2021; TEST_START = 2022
train_df = df[df["year"] <= TRAIN_END].copy()
val_df   = df[(df["year"] > TRAIN_END) & (df["year"] <= VAL_END)].copy()
test_df  = df[df["year"] > VAL_END].copy()

X_test = test_df[feature_cols].fillna(train_medians).fillna(0)
y_test  = test_df["flood"].values
prob    = model.predict_proba(X_test.values)[:, 1]
thresh  = meta["best_threshold"]
pred    = (prob >= thresh).astype(int)

BLUE="#1565C0"; GREEN="#2E7D32"; RED="#C62828"; ORANGE="#E65100"; GRAY="#616161"
LBLUE="#90CAF9"; LRED="#EF9A9A"

plt.rcParams.update({
    "font.size": 9, "axes.titlesize": 10,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.dpi": 100,
})

region_names = {0: "Mien Bac", 1: "Mien Trung", 2: "Mien Nam"}
region_monsoon = {0: list(range(5,11)), 1: [9,10,11,12], 2: list(range(6,12))}
mo_names = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"]

# ─── 1. DATA FLOOD STATISTICS ────────────────────────────────────────────────
fig, axes = plt.subplots(2, 2, figsize=(11, 7.5))
fig.suptitle("Thong ke bo du lieu VNFlood (2012-2023, 208 luu vuc)", fontsize=12)

ax = axes[0,0]
n_flood = int(df["flood"].sum()); n_nf = len(df) - n_flood
ax.bar(["Khong lu", "Co lu"], [n_nf/1e6, n_flood/1e6], color=[BLUE, RED], width=0.5)
ax.set_ylabel("So mau (trieu)"); ax.set_title("(a) Phan phoi nhan nhi phan")
for bar, val in zip(ax.patches, [n_nf, n_flood]):
    ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.01,
            f"{val/1e6:.2f}M\n({val/len(df)*100:.1f}%)", ha="center", fontsize=8.5)
ax.set_ylim(0, n_nf/1e6*1.18)

ax = axes[0,1]
yr_rate = df.groupby("year")["flood"].mean()*100
colors = [RED if y>=TEST_START else (ORANGE if y>TRAIN_END else BLUE) for y in yr_rate.index]
ax.bar(yr_rate.index, yr_rate.values, color=colors, edgecolor="white", linewidth=0.3)
ax.set_xlabel("Nam"); ax.set_ylabel("Ty le co lu (%)"); ax.set_title("(b) Ty le lu theo nam")
patches = [mpatches.Patch(color=BLUE, label="Train 2012-2020"),
           mpatches.Patch(color=ORANGE, label="Val 2021"),
           mpatches.Patch(color=RED, label="Test 2022-2023")]
ax.legend(handles=patches, fontsize=7.5)
ax.yaxis.set_major_formatter(mtick.PercentFormatter(decimals=1))

ax = axes[1,0]
mo_rate = df.groupby("month")["flood"].mean()*100
bar_colors = [RED if m in [8,9,10,11] else (ORANGE if m in [5,6,7,12] else BLUE) for m in range(1,13)]
ax.bar(mo_names, mo_rate.values, color=bar_colors, edgecolor="white", linewidth=0.2)
ax.set_xlabel("Thang"); ax.set_ylabel("Ty le co lu (%)"); ax.set_title("(c) Tinh mua vu lu (toan quoc)")
ax.yaxis.set_major_formatter(mtick.PercentFormatter(decimals=1))
ax.tick_params(axis="x", labelsize=7.5)

ax = axes[1,1]
rc = {0: BLUE, 1: RED, 2: GREEN}
for rid, rname in region_names.items():
    sub = df[df["region_id"]==rid]
    mr = sub.groupby("month")["flood"].mean()*100
    ax.plot(range(1,13), mr.values, "o-", ms=3, lw=1.5, color=rc[rid], label=rname)
ax.set_xticks(range(1,13)); ax.set_xticklabels(mo_names, fontsize=7.5)
ax.set_xlabel("Thang"); ax.set_ylabel("Ty le co lu (%)")
ax.set_title("(d) Tinh mua vu theo vung dia ly")
ax.legend(fontsize=8); ax.yaxis.set_major_formatter(mtick.PercentFormatter(decimals=1))

plt.tight_layout()
plt.savefig(OUT/"data_flood_statistics.png", dpi=150, bbox_inches="tight")
plt.close(); print("  data_flood_statistics.png")

# ─── 2. TEMPORAL SPLIT TIMELINE ──────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 2.8))
ax.barh(0, 9, left=2012, height=0.55, color=BLUE,   alpha=0.85)
ax.barh(0, 1, left=2021, height=0.55, color=ORANGE, alpha=0.85)
ax.barh(0, 2, left=2022, height=0.55, color=RED,    alpha=0.85)
ax.text(2016,   0, "Train (2012-2020)\n1,299,360 mau", ha="center", va="center", fontsize=8.5, color="white", fontweight="bold")
ax.text(2021.5, 0, "Val\n(2021)", ha="center", va="center", fontsize=7.5, color="white", fontweight="bold")
ax.text(2023,   0, "Test\n(2022-2023)", ha="center", va="center", fontsize=8, color="white", fontweight="bold")
ax.set_xlim(2011, 2024.5); ax.set_yticks([]); ax.set_xlabel("Nam")
ax.set_title("Phan chia du lieu theo thoi gian (Temporal Split) - Khong ro ri thong tin (no leakage)")
ax.set_xticks(range(2012, 2024))
yr_rate2 = df.groupby("year")["flood"].mean()*100
ax2 = ax.twinx()
ax2.plot(yr_rate2.index, yr_rate2.values, "k-^", ms=4, lw=1.2, alpha=0.7, label="Ty le lu")
ax2.set_ylabel("Ty le lu (%)", fontsize=8); ax2.set_ylim(0, yr_rate2.max()*1.6)
ax2.yaxis.set_major_formatter(mtick.PercentFormatter(decimals=1))
ax2.legend(fontsize=8, loc="upper left")
for yr in [2021, 2022]:
    ax.axvline(yr, color="white", lw=1.5)
plt.tight_layout()
plt.savefig(OUT/"data_temporal_split.png", dpi=150, bbox_inches="tight")
plt.close(); print("  data_temporal_split.png")

# ─── 3. PRECIPITATION FEATURE DISTRIBUTIONS ──────────────────────────────────
fig, axes = plt.subplots(2, 3, figsize=(12, 7))
fig.suptitle("Phan phoi dac trung mua - Ngay co lu vs khong lu (tap huan luyen 2012-2020)", fontsize=11)
precip_feats = [
    ("precip_1d",   "Mua ngay precip_1d (mm)"),
    ("precip_3d",   "Mua tich luy 3 ngay (mm)"),
    ("precip_7d",   "Mua tich luy 7 ngay (mm)"),
    ("precip_14d",  "Mua tich luy 14 ngay (mm)"),
    ("precip_30d",  "Mua tich luy 30 ngay (mm)"),
    ("precip_7d_anomaly", "Bat thuong mua 7 ngay (mm)"),
]
for ax, (feat, label) in zip(axes.flat, precip_feats):
    p99 = train_df[feat].quantile(0.98)
    fl  = train_df[train_df.flood==1][feat].dropna().clip(upper=p99)
    nf  = train_df[train_df.flood==0][feat].dropna().clip(upper=p99)
    ax.hist(nf, bins=40, alpha=0.5, color=BLUE, density=True, label="Khong lu", linewidth=0)
    ax.hist(fl, bins=40, alpha=0.65, color=RED,  density=True, label="Co lu",    linewidth=0)
    ax.axvline(fl.mean(), color=RED,  ls="--", lw=1.2)
    ax.axvline(nf.mean(), color=BLUE, ls="--", lw=1.2)
    ax.set_xlabel(label, fontsize=8.5); ax.set_ylabel("Mat do", fontsize=8)
    ax.set_title(f"mean: co lu={fl.mean():.1f}  khong lu={nf.mean():.1f}", fontsize=7.5)
    ax.legend(fontsize=7.5)
plt.tight_layout()
plt.savefig(OUT/"feat_precip_distributions.png", dpi=150, bbox_inches="tight")
plt.close(); print("  feat_precip_distributions.png")

# ─── 4. ANOMALY FEATURE DISTRIBUTIONS ────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(12, 4.5))
fig.suptitle("Dac trung bat thuong (anomaly) - Co so chon anomaly thay vi gia tri tuyet doi", fontsize=11)
anomaly_feats = [
    ("discharge_proxy_anomaly", "Bat thuong luu luong\ndischarge_proxy_anomaly (m3/s)"),
    ("api_anomaly",             "Bat thuong do am dat\napi_anomaly"),
    ("precip_7d_anomaly",       "Bat thuong mua 7 ngay\nprecip_7d_anomaly (mm)"),
]
for ax, (feat, label) in zip(axes, anomaly_feats):
    p1, p99 = train_df[feat].quantile(0.01), train_df[feat].quantile(0.99)
    fl = train_df[train_df.flood==1][feat].dropna().clip(p1, p99)
    nf = train_df[train_df.flood==0][feat].dropna().clip(p1, p99)
    ax.hist(nf, bins=50, alpha=0.5, color=BLUE, density=True, label=f"Khong lu (n={len(nf)//1000}K)", linewidth=0)
    ax.hist(fl, bins=50, alpha=0.65, color=RED,  density=True, label=f"Co lu (n={len(fl)//1000}K)",    linewidth=0)
    ax.axvline(0, color="black", ls="-", lw=0.8, alpha=0.5)
    ax.axvline(fl.mean(), color=RED,  ls="--", lw=1.3, label=f"mean={fl.mean():.1f}")
    ax.axvline(nf.mean(), color=BLUE, ls="--", lw=1.3, label=f"mean={nf.mean():.1f}")
    ax.set_xlabel(label, fontsize=9); ax.set_ylabel("Mat do", fontsize=8.5)
    ax.legend(fontsize=7.5)
plt.tight_layout()
plt.savefig(OUT/"feat_anomaly_distributions.png", dpi=150, bbox_inches="tight")
plt.close(); print("  feat_anomaly_distributions.png")

# ─── 5. SEASONAL PATTERN BY REGION ───────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(12, 4.5))
fig.suptitle("Tinh mua vu lu lut theo vung - Co so thiet ke dac trung is_monsoon + month_sin/cos", fontsize=11)
rlong = {0: "Mien Bac (mua mua: T5-T10)", 1: "Mien Trung (mua mua: T9-T12)", 2: "Mien Nam (mua mua: T6-T11)"}
for ax, (rid, rname) in zip(axes, rlong.items()):
    sub = df[df["region_id"]==rid]
    mo_rate = sub.groupby("month")["flood"].mean()*100
    bar_colors = [RED if m in region_monsoon[rid] else BLUE for m in range(1,13)]
    ax.bar(mo_names, mo_rate.values, color=bar_colors, edgecolor="white", linewidth=0.2)
    ax.set_title(rname, fontsize=9); ax.set_xlabel("Thang"); ax.set_ylabel("Ty le co lu (%)")
    ax.yaxis.set_major_formatter(mtick.PercentFormatter(decimals=1))
    ax.tick_params(axis="x", labelsize=7.5)
    p_m = mpatches.Patch(color=RED, label="Mua mua (is_monsoon=1)")
    p_d = mpatches.Patch(color=BLUE, label="Mua kho (is_monsoon=0)")
    ax.legend(handles=[p_m, p_d], fontsize=7.5)
plt.tight_layout()
plt.savefig(OUT/"feat_seasonal_pattern.png", dpi=150, bbox_inches="tight")
plt.close(); print("  feat_seasonal_pattern.png")

# ─── 6. TOPOGRAPHIC FEATURES VS FLOOD RATE ───────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(12, 4.5))
fig.suptitle("Ty le lu theo dac trung dia hinh - Co so dua dia hinh vao mo hinh", fontsize=11)

def flood_by_bin(series, col, nbins=8, label=""):
    percentiles = np.linspace(0, 100, nbins+1)
    edges = np.percentile(series[col].dropna(), percentiles)
    edges = np.unique(edges)
    df_c = series.copy()
    df_c["_bin"] = pd.cut(df_c[col], bins=edges, include_lowest=True)
    grouped = df_c.groupby("_bin", observed=False)["flood"].agg(["mean","count"])
    return grouped

topo_feats = [
    ("elevation_m",  "Do cao (m)",           False),
    ("twi",          "Chi so am dia hinh TWI", True),
    ("slope_deg",    "Do doc trung binh (do)", False),
]
for ax, (feat, label, expect_pos) in zip(axes, topo_feats):
    g = flood_by_bin(df, feat)
    mid_labels = [f"{iv.left:.0f}-{iv.right:.0f}" for iv in g.index]
    flood_rates = g["mean"].values * 100
    bar_colors = [GREEN if v > df["flood"].mean()*100*1.2 else BLUE for v in flood_rates]
    bars = ax.bar(range(len(flood_rates)), flood_rates, color=bar_colors, edgecolor="white", linewidth=0.2)
    ax.axhline(df["flood"].mean()*100, color="black", ls="--", lw=1, alpha=0.6, label="Trung binh")
    ax.set_xticks(range(len(mid_labels))); ax.set_xticklabels(mid_labels, rotation=30, ha="right", fontsize=7)
    ax.set_xlabel(label, fontsize=9); ax.set_ylabel("Ty le co lu (%)")
    ax.set_title(f"(Phan vi deu - {len(flood_rates)} nhom)")
    ax.yaxis.set_major_formatter(mtick.PercentFormatter(decimals=1))
    ax.legend(fontsize=7.5)
plt.tight_layout()
plt.savefig(OUT/"topo_flood_rate.png", dpi=150, bbox_inches="tight")
plt.close(); print("  topo_flood_rate.png")

# ─── 7. TOPOGRAPHIC FEATURE DISTRIBUTIONS ACROSS 208 BASINS ─────────────────
basins = df.drop_duplicates("HYBAS_ID").copy()
fig, axes = plt.subplots(2, 3, figsize=(12, 7))
fig.suptitle("Phan phoi dac trung dia hinh tren 208 luu vuc song Viet Nam (Level-7)", fontsize=11)
topo_hist = [
    ("elevation_m",    "Do cao trung binh (m)",          BLUE),
    ("slope_deg",      "Do doc trung binh (do)",          GREEN),
    ("twi",            "Chi so am dia hinh (TWI)",        ORANGE),
    ("centroid_lat",   "Vi do tam luu vuc (°N)",          RED),
    ("centroid_lon",   "Kinh do tam luu vuc (°E)",        BLUE),
    ("region_id",      "Vung dia ly (0=Bac 1=Trung 2=Nam)", GREEN),
]
for ax, (feat, label, color) in zip(axes.flat, topo_hist):
    vals = basins[feat].dropna()
    if feat == "region_id":
        rnames = ["Mien Bac", "Mien Trung", "Mien Nam"]
        cnts = [int((vals==i).sum()) for i in range(3)]
        ax.bar(rnames, cnts, color=[BLUE, RED, GREEN], edgecolor="white")
        for bar, cnt in zip(ax.patches, cnts):
            ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.5, str(cnt), ha="center", fontsize=9)
        ax.set_ylabel("So luu vuc")
    else:
        ax.hist(vals, bins=25, color=color, edgecolor="white", linewidth=0.2)
        ax.set_xlabel(label, fontsize=8.5); ax.set_ylabel("So luu vuc")
    ax.set_title(f"mean={vals.mean():.1f}  std={vals.std():.1f}", fontsize=8)
plt.tight_layout()
plt.savefig(OUT/"topo_distributions.png", dpi=150, bbox_inches="tight")
plt.close(); print("  topo_distributions.png")

# ─── 8. THRESHOLD ANALYSIS ───────────────────────────────────────────────────
thresholds = np.linspace(0.01, 0.99, 200)
f1s   = [f1_score(y_test, (prob>=t).astype(int), zero_division=0) for t in thresholds]
precs = [precision_score(y_test, (prob>=t).astype(int), zero_division=0) for t in thresholds]
recs  = [recall_score(y_test, (prob>=t).astype(int), zero_division=0) for t in thresholds]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
fig.suptitle("Phan tich nguong phan loai - Co so chon nguong van hanh 0.857", fontsize=11)

ax1.plot(thresholds, f1s,   lw=2, color=GREEN,  label="F1-score")
ax1.plot(thresholds, precs, lw=2, color=BLUE,   label="Precision")
ax1.plot(thresholds, recs,  lw=2, color=RED,    label="Recall")
ax1.axvline(thresh, color="black", ls="--", lw=1.5, label=f"Nguong chon ({thresh:.3f})")
best_t_idx = np.argmax(f1s)
ax1.scatter([thresholds[best_t_idx]], [f1s[best_t_idx]], color=GREEN, s=80, zorder=5)
ax1.set_xlabel("Nguong phan loai (threshold)"); ax1.set_ylabel("Gia tri chi so")
ax1.set_title("F1 / Precision / Recall theo nguong"); ax1.legend(fontsize=8.5); ax1.grid(alpha=0.2)

# Confusion matrix at chosen threshold
cm = confusion_matrix(y_test, pred)
tn, fp, fn, tp = cm.ravel()
labels_cm = np.array([[f"TN\n{tn:,}", f"FP\n{fp:,}"],
                       [f"FN\n{fn:,}", f"TP\n{tp:,}"]])
colors_cm = np.array([[0.2, 0.9], [0.9, 0.2]])
im = ax2.imshow(colors_cm, cmap="RdYlGn", vmin=0, vmax=1, aspect="auto")
for i in range(2):
    for j in range(2):
        ax2.text(j, i, labels_cm[i,j], ha="center", va="center", fontsize=11, fontweight="bold")
ax2.set_xticks([0,1]); ax2.set_yticks([0,1])
ax2.set_xticklabels(["Du doan: Khong lu", "Du doan: Co lu"])
ax2.set_yticklabels(["Thuc te: Khong lu", "Thuc te: Co lu"])
ax2.set_title(f"Ma tran nham lan tai nguong {thresh:.3f}\n"
              f"Precision={tp/(tp+fp)*100:.1f}%  Recall={tp/(tp+fn)*100:.1f}%  F1={2*tp/(2*tp+fp+fn)*100:.1f}%")

plt.tight_layout()
plt.savefig(OUT/"model_threshold_analysis.png", dpi=150, bbox_inches="tight")
plt.close(); print("  model_threshold_analysis.png")

# ─── 9. CALIBRATION DIAGRAM ──────────────────────────────────────────────────
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.5))
fig.suptitle("Kiem tra doc lap (calibration) - Mo hinh du bao xac suat co tinh chinh xac?", fontsize=11)

n_bins = 10
bin_edges = np.linspace(0, 1, n_bins+1)
bin_centers, actual_rates, bin_counts = [], [], []
for i in range(n_bins):
    mask = (prob >= bin_edges[i]) & (prob < bin_edges[i+1])
    if mask.sum() > 0:
        bin_centers.append((bin_edges[i]+bin_edges[i+1])/2)
        actual_rates.append(y_test[mask].mean())
        bin_counts.append(mask.sum())

ax1.plot([0,1], [0,1], "k--", lw=1.2, alpha=0.5, label="Xac suat hoan hao")
ax1.plot(bin_centers, actual_rates, "o-", color=BLUE, lw=2, ms=6, label="Mo hinh VNFlood")
ax1.fill_between(bin_centers, actual_rates, bin_centers, alpha=0.15, color=RED, label="Do lech")
ax1.set_xlabel("Xac suat du bao trung binh trong nhom")
ax1.set_ylabel("Ty le co lu thuc te trong nhom")
ax1.set_title("Bieu do doc lap (Reliability Diagram)"); ax1.legend(fontsize=8.5)
ax1.set_xlim(0,1); ax1.set_ylim(-0.02, 1.02); ax1.grid(alpha=0.2)

ax2.bar(range(len(bin_counts)), bin_counts, color=[BLUE if b<0.857 else RED for b in bin_centers],
        edgecolor="white", linewidth=0.2)
ax2.set_xticks(range(len(bin_centers)))
ax2.set_xticklabels([f"{b:.1f}" for b in bin_centers], rotation=30, fontsize=7.5)
ax2.set_xlabel("Nhom xac suat du bao"); ax2.set_ylabel("So luong mau")
ax2.set_title("Phan phoi du bao theo nhom xac suat")
ax2.axvline(len([b for b in bin_centers if b<thresh])-0.5, color="black", ls="--", lw=1.2,
            label=f"Nguong {thresh:.2f}")
ax2.legend(fontsize=8)

plt.tight_layout()
plt.savefig(OUT/"model_calibration.png", dpi=150, bbox_inches="tight")
plt.close(); print("  model_calibration.png")

# ─── 10. ROC + PR (re-export, improved) ──────────────────────────────────────
fpr, tpr, _ = roc_curve(y_test, prob)
prec_c, rec_c, _ = precision_recall_curve(y_test, prob)
auc = roc_auc_score(y_test, prob)
ap  = average_precision_score(y_test, prob)
flood_rate = y_test.mean()

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9, 4.2))

ax1.plot(fpr, tpr, color=BLUE, lw=2, label=f"LightGBM v3 (AUC={auc:.4f})")
ax1.plot([0,1],[0,1],"--",color=GRAY,lw=0.8,label="Random")
# mark operating point
op_idx = np.argmin(np.abs(prob[np.argsort(prob)] - thresh))
ax1.set_xlabel("Ty le duong tinh gia (FPR)"); ax1.set_ylabel("Ty le duong tinh that (TPR / Recall)")
ax1.set_title(f"Duong cong ROC — AUC = {auc:.4f}"); ax1.legend(fontsize=9)
ax1.set_xlim([0,1]); ax1.set_ylim([0,1.02]); ax1.grid(alpha=0.2)

ax2.plot(rec_c, prec_c, color=GREEN, lw=2, label=f"LightGBM v3 (AP={ap:.4f})")
ax2.axhline(flood_rate, color=GRAY, ls="--", lw=0.8, label=f"Phan loai ngau nhien ({flood_rate*100:.1f}%)")
ax2.set_xlabel("Recall (Do nhay)"); ax2.set_ylabel("Precision (Do chinh xac)")
ax2.set_title(f"Duong cong Precision-Recall — AP = {ap:.4f}"); ax2.legend(fontsize=9)
ax2.set_xlim([0,1]); ax2.set_ylim([0,1.02]); ax2.grid(alpha=0.2)

plt.tight_layout()
plt.savefig(OUT/"model_roc_pr.png", dpi=150, bbox_inches="tight")
plt.close(); print("  model_roc_pr.png (updated)")

# ─── 11. FEATURE IMPORTANCE (re-export, improved, Vietnamese labels) ──────────
fi = pd.Series(model.booster_.feature_importance(importance_type="gain"), index=feature_cols)
fi = fi.sort_values(ascending=True).tail(15)
name_map = {
    "discharge_proxy_anomaly": "Bat thuong luu luong (discharge anomaly)",
    "discharge_proxy_m3s":     "Luu luong nuoc uoc tinh (Rational Method)",
    "twi":                     "Chi so am dia hinh (TWI)",
    "api_anomaly":             "Bat thuong chi so API (soil moisture)",
    "centroid_lat":            "Vi do tam luu vuc",
    "discharge_proxy_7d":      "Luu luong trung binh 7 ngay",
    "precip7d_x_low_elev":     "Tuong tac: mua 7 ngay x dia hinh thap",
    "month_sin":               "Mua vu - sin(thang)",
    "centroid_lon":            "Kinh do tam luu vuc",
    "precip_30d":              "Mua tich luy 30 ngay",
    "precip_7d":               "Mua tich luy 7 ngay",
    "api_30d":                 "Chi so API 30 ngay (proxy do am dat)",
    "precip_14d":              "Mua tich luy 14 ngay",
    "sm_top_7d":               "Do am dat tang mat 7 ngay",
    "precip7d_x_api":          "Tuong tac: mua 7 ngay x API",
    "precip7d_x_discharge":    "Tuong tac: mua 7 ngay x luu luong",
    "typhoon_exposure_3d":     "Phoi nhiem bao tich luy 3 ngay",
    "precip_7d_anomaly":       "Bat thuong mua 7 ngay",
    "precip7d_x_sm_top":       "Tuong tac: mua 7 ngay x do am dat",
    "typhoon_x_precip7d":      "Tuong tac: bao x mua 7 ngay",
    "precip_1d":               "Mua ngay (precip_1d)",
}
fi.index = [name_map.get(i, i) for i in fi.index]
fi_pct = fi / fi.sum() * 100

group_colors = []
for orig_name in [list(name_map.keys())[list(name_map.values()).index(n)] if n in name_map.values() else "" for n in fi.index]:
    if "discharge" in orig_name: group_colors.append(RED)
    elif "api" in orig_name or "sm_" in orig_name: group_colors.append(ORANGE)
    elif "precip" in orig_name or "typhoon" in orig_name: group_colors.append(BLUE)
    else: group_colors.append(GREEN)

fig, ax = plt.subplots(figsize=(8, 5.5))
bars = ax.barh(fi_pct.index, fi_pct.values, color=group_colors, edgecolor="white", linewidth=0.3)
ax.set_xlabel("Tam quan trong tuong doi (%)")
ax.set_title("Top 15 dac trung quan trong nhat - LightGBM v3 (theo gain)\n"
             "Mau: do=luu luong | cam=do am dat | xanh=mua/bao | xanh la=dia ly")
ax.xaxis.set_major_formatter(mtick.PercentFormatter(decimals=0))
ax.tick_params(axis="y", labelsize=8)
for bar, val in zip(bars, fi_pct.values):
    ax.text(val+0.15, bar.get_y()+bar.get_height()/2, f"{val:.1f}%", va="center", fontsize=7.5)
ax.set_xlim(0, fi_pct.max()*1.18)
patches = [mpatches.Patch(color=RED, label="Luu luong nuoc"),
           mpatches.Patch(color=ORANGE, label="Do am dat (API/SM)"),
           mpatches.Patch(color=BLUE, label="Mua / Bao"),
           mpatches.Patch(color=GREEN, label="Dia ly")]
ax.legend(handles=patches, fontsize=8, loc="lower right")
plt.tight_layout()
plt.savefig(OUT/"model_feature_importance.png", dpi=150, bbox_inches="tight")
plt.close(); print("  model_feature_importance.png (updated)")

print("\nAll charts saved to:", OUT)
