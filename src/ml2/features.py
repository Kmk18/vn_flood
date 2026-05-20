"""
Feature engineering — mirrors the logic from flood_model_training.ipynb.
Input: DataFrame with columns HYBAS_ID, date, precip_1d + basin static attrs.
Output: DataFrame with all derived features ready for prediction.
"""
import numpy as np
import pandas as pd


K_API        = 0.90
RUNOFF_COEFF = 0.40


def build_features(df: pd.DataFrame, climatology: pd.DataFrame | None = None) -> pd.DataFrame:
    """
    df columns required:
      HYBAS_ID, date, precip_1d           — per basin per day
      up_area_km2, basin_area_km2          — static basin attrs (constant per basin)
      elev_m, slope_deg, twi, region_id   — static
      typhoon_wind_kt, typhoon_dist_km,
      is_typhoon_nearby                    — per day (0 if no storm)

    climatology: optional per-(HYBAS_ID, doy) means from training data
      (columns: HYBAS_ID, doy, precip_7d_clim, discharge_proxy_clim, api_30d_clim).
      When None, anomalies are computed in-sample via transform("mean") — correct
      for training (many years per doy) but always zero during inference (one year).
    """
    df = df.copy()
    df["date"]  = pd.to_datetime(df["date"])
    df["year"]  = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["doy"]   = df["date"].dt.dayofyear
    df = df.sort_values(["HYBAS_ID", "date"]).reset_index(drop=True)

    g = df.groupby("HYBAS_ID")["precip_1d"]
    df["precip_3d"]  = g.transform(lambda x: x.rolling(3,  min_periods=1).sum())
    df["precip_7d"]  = g.transform(lambda x: x.rolling(7,  min_periods=1).sum())
    df["precip_14d"] = g.transform(lambda x: x.rolling(14, min_periods=1).sum())
    df["precip_30d"] = g.transform(lambda x: x.rolling(30, min_periods=1).sum())

    # Merge external climatology once so all three anomaly calculations can use it.
    if climatology is not None:
        clim_cols = ["HYBAS_ID", "doy", "precip_7d_clim", "discharge_proxy_clim", "api_30d_clim"]
        df = df.merge(climatology[clim_cols], on=["HYBAS_ID", "doy"], how="left")

    if climatology is not None:
        df["precip_7d_anomaly"] = df["precip_7d"] - df["precip_7d_clim"].fillna(df["precip_7d"])
    else:
        clim = df.groupby(["HYBAS_ID", "doy"])["precip_7d"].transform("mean")
        df["precip_7d_anomaly"] = df["precip_7d"] - clim

    # Discharge proxy (Rational Method)
    if "up_area_km2" in df.columns:
        up_m2 = df["up_area_km2"].fillna(df["up_area_km2"].median()) * 1e6
        df["discharge_proxy_m3s"] = (
            RUNOFF_COEFF * (df["precip_3d"].fillna(0) / 1000) / (3 * 86400) * up_m2
        ).clip(lower=0)
        df["discharge_proxy_7d"] = (
            df.groupby("HYBAS_ID")["discharge_proxy_m3s"]
              .transform(lambda x: x.rolling(7, min_periods=1).mean())
        )
        if climatology is not None:
            proxy_clim = df["discharge_proxy_clim"].fillna(df["discharge_proxy_m3s"])
        else:
            proxy_clim = df.groupby(["HYBAS_ID", "doy"])["discharge_proxy_m3s"].transform("mean")
        df["discharge_proxy_anomaly"] = (df["discharge_proxy_m3s"] - proxy_clim).clip(lower=-1e6)

    # API (soil moisture proxy)
    def _api(series):
        p   = series.fillna(0).values
        api = np.zeros(len(p))
        for i in range(1, len(p)):
            api[i] = K_API * api[i - 1] + p[i]
        return api

    df["api_30d"] = df.groupby("HYBAS_ID")["precip_1d"].transform(_api)
    if climatology is not None:
        df["api_anomaly"] = df["api_30d"] - df["api_30d_clim"].fillna(df["api_30d"])
    else:
        api_clim = df.groupby(["HYBAS_ID", "doy"])["api_30d"].transform("mean")
        df["api_anomaly"] = df["api_30d"] - api_clim

    # Seasonal
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    def _monsoon(row):
        r = row.get("region_id", -1)
        m = row["month"]
        if r == 0: return int(5 <= m <= 10)   # north
        if r == 1: return int(9 <= m <= 12)   # central
        if r == 2: return int(6 <= m <= 11)   # south
        return 0

    if "region_id" in df.columns:
        df["is_monsoon"] = df.apply(_monsoon, axis=1)

    # Typhoon exposure accumulation
    df["typhoon_wind_kt"]   = df.get("typhoon_wind_kt",   pd.Series(0.0, index=df.index)).fillna(0)
    df["typhoon_dist_km"]   = df.get("typhoon_dist_km",   pd.Series(1000.0, index=df.index)).fillna(1000)
    df["is_typhoon_nearby"] = df.get("is_typhoon_nearby", pd.Series(0, index=df.index)).fillna(0)

    df["typhoon_exposure"] = df["typhoon_wind_kt"] * (1 - df["typhoon_dist_km"].clip(0, 1000) / 1000)
    df["typhoon_exposure_3d"] = (
        df.groupby("HYBAS_ID")["typhoon_exposure"]
          .transform(lambda x: x.rolling(3, min_periods=1).sum())
    )

    # Interactions
    if "discharge_proxy_7d" in df.columns:
        df["precip7d_x_discharge"] = df["precip_7d"] * df["discharge_proxy_7d"].fillna(0)

    df["precip7d_x_api"] = df["precip_7d"] * df["api_30d"].fillna(0)
    df["typhoon_x_precip7d"] = df["typhoon_exposure_3d"] * df["precip_7d"]

    if "elev_m" in df.columns:
        elev_norm = df["elev_m"].clip(0, 500) / 500
        df["precip7d_x_low_elev"] = df["precip_7d"] * (1 - elev_norm)

    return df
