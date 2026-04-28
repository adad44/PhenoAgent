from __future__ import annotations

import csv
import math
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import date, datetime, timedelta
from io import StringIO
from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import linregress

from models.schemas import WearableDailyAggregate, WearableFeatureStats, WearableTimeSeries


APPLE_TYPE_MAP = {
    "HKQuantityTypeIdentifierRestingHeartRate": "resting_hr",
    "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": "hrv_ms",
    "HKQuantityTypeIdentifierStepCount": "steps",
    "HKQuantityTypeIdentifierOxygenSaturation": "spo2_avg",
    "HKQuantityTypeIdentifierActiveEnergyBurned": "active_calories",
}

CSV_ALIASES = {
    "resting_hr": ["resting_hr", "resting hr", "resting heart rate", "resting_heart_rate"],
    "hrv_ms": ["hrv_ms", "hrv ms", "hrv", "heart rate variability"],
    "steps": ["steps", "step_count"],
    "sleep_hours": ["sleep_hours", "sleep hours", "sleep", "asleep_hours"],
    "deep_sleep_pct": ["deep_sleep_pct", "deep sleep pct", "deep sleep %"],
    "rem_sleep_pct": ["rem_sleep_pct", "rem sleep pct", "rem sleep %"],
    "spo2_avg": ["spo2_avg", "spo2 avg", "spo2", "oxygen saturation"],
    "active_calories": ["active_calories", "active calories", "active energy", "calories"],
}


def _date_from_any(value: Any) -> date | None:
    if value is None:
        return None
    try:
        return pd.to_datetime(value).date()
    except Exception:
        return None


def _metric_from_column(column: str) -> str | None:
    normalized = re.sub(r"[_\-]+", " ", column.strip().lower())
    for metric, aliases in CSV_ALIASES.items():
        if any(alias in normalized for alias in aliases):
            return metric
    return None


def _stats(values: list[float | None]) -> WearableFeatureStats:
    series = pd.Series([v for v in values if v is not None], dtype="float64").dropna()
    if series.empty:
        return WearableFeatureStats()
    recent_7 = series.tail(7)
    recent_30 = series.tail(30)
    slope = None
    if len(series) >= 2:
        regression = linregress(np.arange(len(series)), series.to_numpy())
        slope = float(regression.slope)
    mean = float(series.mean())
    cv = float(series.std(ddof=0) / mean) if mean else None
    return WearableFeatureStats(
        avg_7d=float(recent_7.mean()) if not recent_7.empty else None,
        avg_30d=float(recent_30.mean()) if not recent_30.empty else None,
        trend_slope=slope,
        coefficient_of_variation=cv,
    )


def _finalize_daily(daily_metrics: dict[date, dict[str, list[float]]], source: str) -> WearableTimeSeries:
    cutoff = date.today() - timedelta(days=90)
    rows: list[WearableDailyAggregate] = []
    for day in sorted(daily_metrics):
        if day < cutoff:
            continue
        payload: dict[str, Any] = {"date": day}
        for metric, values in daily_metrics[day].items():
            if metric == "steps" or metric == "active_calories":
                payload[metric] = float(np.sum(values))
            else:
                payload[metric] = float(np.mean(values))
        rows.append(WearableDailyAggregate(**payload))

    features = {
        metric: _stats([getattr(row, metric) for row in rows])
        for metric in CSV_ALIASES
    }
    return WearableTimeSeries(source=source, daily=rows, features=features)


def parse_wearable_csv(text: str) -> WearableTimeSeries:
    sample = text[:2048]
    dialect = csv.Sniffer().sniff(sample) if sample.strip() else csv.excel
    frame = pd.read_csv(StringIO(text), dialect=dialect)
    date_column = next((c for c in frame.columns if c.strip().lower() in {"date", "day", "startdate", "start_date"}), None)
    if date_column is None:
        date_column = frame.columns[0]

    daily: dict[date, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    metric_columns = {column: _metric_from_column(column) for column in frame.columns}
    for _, row in frame.iterrows():
        day = _date_from_any(row.get(date_column))
        if day is None:
            continue
        for column, metric in metric_columns.items():
            if metric is None:
                continue
            try:
                value = float(row[column])
            except (TypeError, ValueError):
                continue
            if math.isfinite(value):
                daily[day][metric].append(value)
    return _finalize_daily(daily, source="csv")


def parse_apple_health_xml(text: str) -> WearableTimeSeries:
    root = ET.fromstring(text)
    daily: dict[date, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for record in root.iter("Record"):
        metric = APPLE_TYPE_MAP.get(record.attrib.get("type", ""))
        if metric is None:
            continue
        day = _date_from_any(record.attrib.get("startDate"))
        if day is None:
            continue
        try:
            value = float(record.attrib.get("value", "nan"))
        except ValueError:
            continue
        if metric == "spo2_avg" and value <= 1:
            value *= 100
        if math.isfinite(value):
            daily[day][metric].append(value)
    return _finalize_daily(daily, source="apple_health_xml")


def parse_wearable_export(filename: str, content: bytes) -> WearableTimeSeries:
    text = content.decode("utf-8", errors="ignore")
    if filename.lower().endswith(".xml") or "<HealthData" in text[:500]:
        return parse_apple_health_xml(text)
    return parse_wearable_csv(text)
