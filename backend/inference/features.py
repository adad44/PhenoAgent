from __future__ import annotations

from statistics import mean

from inference.priors import LAB_THRESHOLDS, WEARABLE_THRESHOLDS, Threshold
from models.schemas import LabResult, WearableTimeSeries


def _higher_is_risky(value: float, threshold: Threshold) -> str:
    if threshold.low is not None and value < threshold.low:
        return "low"
    if value >= threshold.critical:
        return "critical"
    if value >= threshold.high:
        return "high"
    return "normal"


def _lower_is_risky(value: float, normal_floor: float, critical_floor: float) -> str:
    if value <= critical_floor:
        return "critical"
    if value < normal_floor:
        return "high"
    return "normal"


def lab_feature_states(labs: list[LabResult]) -> dict[str, str]:
    states: dict[str, str] = {}
    latest = {lab.name.lower(): lab for lab in labs}
    for name, lab in latest.items():
        if name not in LAB_THRESHOLDS:
            continue
        threshold = LAB_THRESHOLDS[name]
        if name == "hdl":
            states["hdl_state"] = _lower_is_risky(lab.value, normal_floor=40, critical_floor=30)
        else:
            states[f"{name}_state"] = _higher_is_risky(lab.value, threshold)
    return states


def wearable_feature_states(summary: WearableTimeSeries | None) -> dict[str, str]:
    if summary is None:
        return {}
    states: dict[str, str] = {}
    features = summary.features

    resting_hr = features.get("resting_hr")
    if resting_hr and resting_hr.avg_30d is not None:
        states["resting_hr_state"] = _higher_is_risky(resting_hr.avg_30d, WEARABLE_THRESHOLDS["resting_hr"])

    hrv = features.get("hrv_ms")
    if hrv and hrv.avg_30d is not None:
        states["hrv_state"] = _lower_is_risky(hrv.avg_30d, normal_floor=35, critical_floor=20)

    sleep = features.get("sleep_hours")
    if sleep and sleep.avg_30d is not None:
        avg = sleep.avg_30d
        if avg < 5:
            states["sleep_hours_state"] = "critical"
        elif avg < 6.5 or avg > 9.5:
            states["sleep_hours_state"] = "high"
        else:
            states["sleep_hours_state"] = "normal"

    deep_sleep = features.get("deep_sleep_pct")
    if deep_sleep and deep_sleep.avg_30d is not None:
        states["deep_sleep_state"] = _lower_is_risky(deep_sleep.avg_30d, normal_floor=12, critical_floor=8)

    return states


def notable_biomarker_flags(labs: list[LabResult]) -> list[str]:
    return [f"{lab.name}:{lab.flag}" for lab in labs if lab.flag in {"H", "L"}]


def risk_input_completeness(states: dict[str, str], expected_nodes: list[str]) -> float:
    if not expected_nodes:
        return 0.0
    return sum(1 for node in expected_nodes if node in states) / len(expected_nodes)
