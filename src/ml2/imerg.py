"""
NASA GPM IMERG precipitation fetcher.

Replaces CHIRPS (2-day lag) with IMERG Early Run (~4-6h lag after midnight UTC).

Three products:
  GPM_3IMERGDF  — Final Daily      (best quality, 2.5-month lag) → training
  GPM_3IMERGDE  — Early Daily      (~6h lag)                     → inference history
  GPM_3IMERGHHE — Early Half-Hourly(~4-6h lag, 30-min granules)  → today's partial sum

Requires NASA Earthdata credentials:
  export EARTHDATA_USERNAME=your_username
  export EARTHDATA_PASSWORD=your_password
  Register free at: https://urs.earthdata.nasa.gov
"""
import logging
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List

import h5py
import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

def _cache_dir() -> Path:
    return Path(os.getenv("IMERG_CACHE_DIR", "/tmp/imerg_cache"))

# IMERG product short names (version 07)
PRODUCT_EARLY    = "GPM_3IMERGDE"
PRODUCT_FINAL    = "GPM_3IMERGDF"
PRODUCT_EARLY_HH = "GPM_3IMERGHHE"  # 30-min Early Run

# Vietnam bounding box
VN_LON_MIN, VN_LAT_MIN, VN_LON_MAX, VN_LAT_MAX = 102.1, 8.33, 109.45, 23.40


def _get_earthaccess():
    import earthaccess
    # Try environment vars first, fall back to ~/.netrc, then interactive
    try:
        earthaccess.login(strategy="environment")
    except Exception:
        earthaccess.login()
    return earthaccess


def _cache_path(target_date: date, use_final: bool) -> Path:
    tag = "final" if use_final else "early"
    return _cache_dir() / f"imerg_{tag}_{target_date}.HDF5"


def _download_day(target_date: date, use_final: bool) -> Path:
    """Download one day of IMERG daily data. Returns local cache path."""
    dest = _cache_path(target_date, use_final)
    if dest.exists():
        return dest

    cache = _cache_dir()
    cache.mkdir(parents=True, exist_ok=True)
    ea = _get_earthaccess()

    product = PRODUCT_FINAL if use_final else PRODUCT_EARLY
    date_str = target_date.strftime("%Y-%m-%d")

    log.info(f"Downloading IMERG {product} for {date_str}")
    results = ea.search_data(
        short_name=product,
        version="07",
        temporal=(date_str, date_str),
        bounding_box=(VN_LON_MIN, VN_LAT_MIN, VN_LON_MAX, VN_LAT_MAX),
    )

    if not results:
        raise FileNotFoundError(
            f"IMERG {product} not found for {date_str}. "
            f"Early run is available ~6h after midnight UTC. "
            f"Try a date at least 1 day in the past."
        )

    downloaded = ea.download(results[:1], local_path=str(cache))
    if not downloaded:
        raise RuntimeError(f"IMERG download failed for {date_str}")

    actual = Path(downloaded[0])
    if not actual.exists():
        # Concurrent request already renamed it
        if dest.exists():
            return dest
        raise FileNotFoundError(f"IMERG download result missing: {actual}")
    try:
        actual.rename(dest)
    except FileNotFoundError:
        if dest.exists():
            return dest
        raise
    log.info(f"IMERG cached: {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
    return dest


def _read_imerg_precip(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Read IMERG HDF5 file.
    Returns (precip_mm_day, lat_arr, lon_arr).
    IMERG daily stores mean rate in mm/hr → multiply by 24 for mm/day.
    """
    with h5py.File(path, "r") as f:
        # v07 NetCDF4: variables at root; v06 HDF5: variables under /Grid
        grp = f["/Grid"] if "/Grid" in f else f
        precip_raw = grp["precipitation"][:]
        lat_arr    = grp["lat"][:]
        lon_arr    = grp["lon"][:]

    # Squeeze time dimension if present
    if precip_raw.ndim == 3:
        precip_raw = precip_raw[0]

    # v07 stores (lon, lat); v06 stores (lat, lon) — normalise to (lat, lon)
    n_lat, n_lon = len(lat_arr), len(lon_arr)
    if precip_raw.shape == (n_lon, n_lat):
        precip_raw = precip_raw.T

    # Convert mm/hr → mm/day; mask fill values
    precip_mm = np.where(precip_raw >= 0, precip_raw * 24.0, np.nan)
    return precip_mm, lat_arr, lon_arr


def fetch_precip_for_basins(
    basins: List[Dict],
    target_date: date,
    history_days: int = 45,
    use_final: bool = False,
) -> pd.DataFrame:
    """
    Returns DataFrame: hybas_id, date, precip_mm
    for each basin for the last `history_days` days ending on target_date.

    use_final=False  → IMERG Early (~6h lag, for inference)
    use_final=True   → IMERG Final (2.5-month lag, for training/backfill)
    """
    start = target_date - timedelta(days=history_days - 1)
    rows = []

    d = start
    while d <= target_date:
        try:
            path = _download_day(d, use_final)
            precip_mm, lat_arr, lon_arr = _read_imerg_precip(path)

            for basin in basins:
                hid = basin["hybas_id"]
                blat, blon = basin["lat"], basin["lon"]

                # Nearest-neighbour lookup
                ilat = int(np.argmin(np.abs(lat_arr - blat)))
                ilon = int(np.argmin(np.abs(lon_arr - blon)))
                val = float(precip_mm[ilat, ilon])
                if np.isnan(val) or val < 0:
                    val = np.nan

                rows.append({"hybas_id": hid, "date": d, "precip_mm": val})

        except FileNotFoundError as e:
            log.warning(f"IMERG {d}: {e}")
            for basin in basins:
                rows.append({"hybas_id": basin["hybas_id"], "date": d, "precip_mm": np.nan})

        except Exception as e:
            log.warning(f"IMERG {d} failed: {e}")
            for basin in basins:
                rows.append({"hybas_id": basin["hybas_id"], "date": d, "precip_mm": np.nan})

        d += timedelta(days=1)

    return pd.DataFrame(rows)


# ── Half-hourly (Option A) ────────────────────────────────────────────────────

def _hh_cache_path(target_date: date, minute_start: int) -> Path:
    """Cache path for one 30-min IMERG Early granule. minute_start = 0, 30, …, 1410."""
    return _cache_dir() / f"imerg_hh_{target_date}_{minute_start:04d}.HDF5"


def _download_halfhourly(target_date: date, minute_start: int) -> Path:
    """Download one 30-min IMERG Early granule. Returns local cache path."""
    dest = _hh_cache_path(target_date, minute_start)
    if dest.exists():
        return dest

    cache = _cache_dir()
    cache.mkdir(parents=True, exist_ok=True)
    ea = _get_earthaccess()

    date_str = target_date.strftime("%Y-%m-%d")
    hh,  mm      = divmod(minute_start,      60)
    hhe, mme     = divmod(minute_start + 29, 60)
    t_start = f"{date_str}T{hh:02d}:{mm:02d}:00"
    t_end   = f"{date_str}T{hhe:02d}:{mme:02d}:59"

    results = ea.search_data(
        short_name=PRODUCT_EARLY_HH,
        version="07",
        temporal=(t_start, t_end),
        bounding_box=(VN_LON_MIN, VN_LAT_MIN, VN_LON_MAX, VN_LAT_MAX),
    )
    if not results:
        raise FileNotFoundError(
            f"IMERG HH not found for {date_str} {hh:02d}:{mm:02d}. "
            f"Half-hourly Early has ~4-6h lag — slot may not be published yet."
        )

    downloaded = ea.download(results[:1], local_path=str(cache))
    if not downloaded:
        raise RuntimeError(f"IMERG HH download failed for {date_str} {hh:02d}:{mm:02d}")

    actual = Path(downloaded[0])
    if not actual.exists():
        if dest.exists():
            return dest
        raise FileNotFoundError(f"IMERG HH download result missing: {actual}")
    try:
        actual.rename(dest)
    except FileNotFoundError:
        if dest.exists():
            return dest
        raise
    log.info(f"IMERG HH cached: {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
    return dest


def _read_imerg_hh_precip(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Read one IMERG half-hourly HDF5.
    Returns (precip_mm_per_30min, lat_arr, lon_arr).
    Half-hourly stores mean rate in mm/hr → multiply by 0.5 for mm per 30-min interval.
    """
    with h5py.File(path, "r") as f:
        grp = f["/Grid"] if "/Grid" in f else f
        var = "precipitationCal" if "precipitationCal" in grp else "precipitation"
        precip_raw = grp[var][:]
        lat_arr    = grp["lat"][:]
        lon_arr    = grp["lon"][:]

    if precip_raw.ndim == 3:
        precip_raw = precip_raw[0]

    n_lat, n_lon = len(lat_arr), len(lon_arr)
    if precip_raw.shape == (n_lon, n_lat):
        precip_raw = precip_raw.T

    precip_mm = np.where(precip_raw >= 0, precip_raw * 0.5, np.nan)
    return precip_mm, lat_arr, lon_arr


def fetch_precip_today_partial(
    basins: List[Dict],
    target_date: date,
    lag_hours: int = 6,
) -> pd.DataFrame:
    """
    Aggregate all available IMERG Early half-hourly slots for target_date
    up to (UTC now − lag_hours). Returns a partial-day precipitation sum.

    DataFrame columns: hybas_id, date, precip_mm
    precip_mm is the running mm accumulation for the day so far (not extrapolated).
    """
    utc_now    = datetime.now(timezone.utc)
    cutoff_utc = utc_now - timedelta(hours=lag_hours)
    target_dt  = datetime(target_date.year, target_date.month, target_date.day,
                          tzinfo=timezone.utc)

    # Slots whose full 30-min window has passed the cutoff
    available = [
        m for m in range(0, 1440, 30)
        if target_dt + timedelta(minutes=m + 30) <= cutoff_utc
    ]

    if not available:
        log.warning(f"  No HH slots available yet for {target_date} (cutoff {cutoff_utc:%H:%M} UTC)")
        return pd.DataFrame([
            {"hybas_id": b["hybas_id"], "date": target_date, "precip_mm": np.nan}
            for b in basins
        ])

    log.info(f"  Half-hourly: {len(available)}/48 slots available for {target_date}")

    accum = {b["hybas_id"]: 0.0 for b in basins}
    count = {b["hybas_id"]: 0   for b in basins}

    for minute_start in available:
        try:
            path = _download_halfhourly(target_date, minute_start)
            precip_hh, lat_arr, lon_arr = _read_imerg_hh_precip(path)
            for basin in basins:
                hid  = basin["hybas_id"]
                ilat = int(np.argmin(np.abs(lat_arr - basin["lat"])))
                ilon = int(np.argmin(np.abs(lon_arr - basin["lon"])))
                val  = float(precip_hh[ilat, ilon])
                if not np.isnan(val) and val >= 0:
                    accum[hid] += val
                    count[hid] += 1
        except FileNotFoundError:
            log.debug(f"  HH slot {minute_start:04d} not yet published for {target_date}")
        except Exception as e:
            log.warning(f"  HH slot {minute_start:04d} failed: {e}")

    rows = [
        {
            "hybas_id":  b["hybas_id"],
            "date":      target_date,
            "precip_mm": accum[b["hybas_id"]] if count[b["hybas_id"]] > 0 else np.nan,
        }
        for b in basins
    ]
    mean_val = np.nanmean([r["precip_mm"] for r in rows])
    log.info(f"  HH accumulation done — {len(available)} slots, mean {mean_val:.2f} mm (partial day)")
    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────────────────────

def fetch_ibtracs_active(target_date: date, radius_km: float = 1000) -> pd.DataFrame:
    """
    Identical to ml/chirps.py — IBTrACS is unchanged between ml and ml2.
    Returns active typhoon positions for target_date.
    """
    import time
    import requests

    IBTRACS_URL = (
        "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs"
        "/v04r01/access/csv/ibtracs.WP.list.v04r01.csv"
    )
    IBTRACS_CACHE = _cache_dir() / "ibtracs_WP.csv"

    _cache_dir().mkdir(parents=True, exist_ok=True)
    if not IBTRACS_CACHE.exists() or (time.time() - IBTRACS_CACHE.stat().st_mtime) > 43200:
        log.info("Downloading IBTrACS...")
        r = requests.get(IBTRACS_URL, timeout=120)
        r.raise_for_status()
        IBTRACS_CACHE.write_bytes(r.content)

    df = pd.read_csv(IBTRACS_CACHE, skiprows=[1], low_memory=False, na_values=[" "])
    df["ISO_TIME"] = pd.to_datetime(df["ISO_TIME"], errors="coerce")
    df["date_only"] = df["ISO_TIME"].dt.normalize()
    df["WIND"] = pd.to_numeric(df.get("USA_WIND", 0), errors="coerce").fillna(0)
    df["LAT"]  = pd.to_numeric(df["LAT"], errors="coerce")
    df["LON"]  = pd.to_numeric(df["LON"], errors="coerce")

    target_dt = pd.Timestamp(target_date)
    today_storms = df[df["date_only"] == target_dt].dropna(subset=["LAT", "LON"])

    nearby = today_storms[
        (today_storms["LAT"] > 0) & (today_storms["LAT"] < 35) &
        (today_storms["LON"] > 90) & (today_storms["LON"] < 130) &
        (today_storms["WIND"] > 0)
    ]

    return nearby[["SID", "LAT", "LON", "WIND"]].rename(
        columns={"SID": "sid", "LAT": "lat", "LON": "lon", "WIND": "wind_kt"}
    ).reset_index(drop=True)
