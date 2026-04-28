from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Threshold:
    low: float | None
    high: float
    critical: float
    unit: str


LAB_THRESHOLDS = {
    "glucose": Threshold(low=70, high=100, critical=126, unit="mg/dL"),
    "hba1c": Threshold(low=None, high=5.7, critical=6.5, unit="%"),
    "ldl": Threshold(low=None, high=130, critical=190, unit="mg/dL"),
    "hdl": Threshold(low=40, high=60, critical=30, unit="mg/dL"),
    "triglycerides": Threshold(low=None, high=150, critical=500, unit="mg/dL"),
    "crp": Threshold(low=None, high=3, critical=10, unit="mg/L"),
    "alt": Threshold(low=None, high=55, critical=150, unit="U/L"),
    "ast": Threshold(low=None, high=40, critical=120, unit="U/L"),
    "creatinine": Threshold(low=None, high=1.3, critical=2.0, unit="mg/dL"),
}

WEARABLE_THRESHOLDS = {
    "resting_hr": Threshold(low=45, high=75, critical=95, unit="bpm"),
    "hrv_ms": Threshold(low=35, high=70, critical=20, unit="ms"),
    "sleep_hours": Threshold(low=6.5, high=8.5, critical=5.0, unit="hours"),
    "deep_sleep_pct": Threshold(low=12, high=25, critical=8, unit="%"),
}

RISK_STATE_PRIOR = {
    "low": 0.25,
    "normal": 0.45,
    "high": 0.22,
    "critical": 0.08,
}

DOMAIN_WEIGHTS = {
    "metabolic": {
        "glucose_state": 1.2,
        "hba1c_state": 1.4,
        "bmi_state": 0.8,
        "triglycerides_state": 1.0,
        "hdl_state": 1.0,
    },
    "cardiovascular": {
        "ldl_state": 1.2,
        "hdl_state": 1.0,
        "crp_state": 0.9,
        "resting_hr_state": 0.7,
        "hrv_state": 0.7,
    },
    "sleep": {
        "sleep_hours_state": 1.3,
        "deep_sleep_state": 1.0,
        "hrv_state": 0.7,
    },
}
