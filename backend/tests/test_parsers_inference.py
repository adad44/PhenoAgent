from __future__ import annotations

import json
from pathlib import Path

from inference.bbn import run_bbn_inference
from inference.features import lab_feature_states
from parsers.lab_parser import parse_lab_json_fixture, parse_lab_text
from parsers.wearable_parser import parse_wearable_csv


def test_lab_text_parser_extracts_common_markers():
    text = """
    Quest Diagnostics
    Collected 04/01/2026
    Glucose 108 H mg/dL 70-99
    Hemoglobin A1c 5.8 H % 4.0-5.6
    LDL Cholesterol 142 H mg/dL 0-129
    HDL Cholesterol 38 L mg/dL 40-60
    Triglycerides 195 H mg/dL 0-149
    """
    parsed = parse_lab_text(text, source="quest")
    names = {item.name for item in parsed.results}
    assert {"glucose", "hba1c", "ldl", "hdl", "triglycerides"}.issubset(names)
    assert parsed.source == "quest"


def test_wearable_csv_features():
    csv_text = "\n".join(
        ["date,resting_hr,hrv_ms,steps,sleep_hours,deep_sleep_pct"]
        + [f"2026-04-{day:02d},68,42,{7000 + day},7.2,16" for day in range(1, 15)]
    )
    parsed = parse_wearable_csv(csv_text)
    assert len(parsed.daily) == 14
    assert parsed.features["resting_hr"].avg_7d == 68
    assert parsed.features["hrv_ms"].avg_30d == 42


def test_bbn_returns_domain_posteriors_from_fixture():
    fixture = Path(__file__).resolve().parents[1] / "fixtures" / "sample_lab.json"
    labs = parse_lab_json_fixture(json.loads(fixture.read_text()))
    evidence = lab_feature_states(labs)
    posteriors, intervals = run_bbn_inference(evidence)
    assert set(posteriors) == {"metabolic", "cardiovascular", "sleep"}
    assert posteriors["metabolic"].high > posteriors["metabolic"].low
    assert 0 <= intervals["metabolic"][0] <= intervals["metabolic"][1] <= 1
