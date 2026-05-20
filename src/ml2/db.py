import os
from datetime import date, timedelta
from sqlalchemy import create_engine, text

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = os.environ["DATABASE_URL"]
        _engine = create_engine(url, pool_pre_ping=True, pool_size=4, max_overflow=2)
    return _engine


def fetch_basins():
    sql = text("""
        SELECT hybas_id, lat, lon, region_id,
               elev_m, slope_deg, twi,
               basin_area_km2, up_area_km2, river_order
        FROM basins
    """)
    with get_engine().connect() as conn:
        return conn.execute(sql).mappings().all()


def fetch_weather_history(hybas_ids: list[int], days: int = 45, end_date: date | None = None):
    if end_date is None:
        end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)
    sql = text("""
        SELECT hybas_id, date, precip_mm
        FROM basin_weather
        WHERE hybas_id = ANY(:ids)
          AND date >= :start_date
          AND date <= :end_date
        ORDER BY hybas_id, date
    """)
    with get_engine().connect() as conn:
        return conn.execute(sql, {"ids": hybas_ids, "start_date": start_date, "end_date": end_date}).mappings().all()


def upsert_weather(rows: list[dict]):
    if not rows:
        return
    # Only overwrite existing data with a non-NULL value — never let a failed
    # download blank out a previously good reading in the DB.
    sql = text("""
        INSERT INTO basin_weather (hybas_id, date, precip_mm)
        VALUES (:hybas_id, :date, :precip_mm)
        ON CONFLICT (hybas_id, date) DO UPDATE
            SET precip_mm = EXCLUDED.precip_mm
            WHERE EXCLUDED.precip_mm IS NOT NULL
    """)
    with get_engine().begin() as conn:
        conn.execute(sql, rows)


def upsert_predictions(rows: list[dict]):
    sql = text("""
        INSERT INTO predictions (hybas_id, forecast_date, run_date, flood_prob, risk_level)
        VALUES (:hybas_id, :forecast_date, :run_date, :flood_prob, :risk_level)
        ON CONFLICT (hybas_id, forecast_date, run_date)
        DO UPDATE SET flood_prob = EXCLUDED.flood_prob,
                      risk_level = EXCLUDED.risk_level
    """)
    with get_engine().begin() as conn:
        conn.execute(sql, rows)
