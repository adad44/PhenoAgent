from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from openai_layer.interpreter import deidentified_payload, interpret_with_openai
from db.supabase_client import local_store, require_user
from inference.bbn import run_bbn_inference
from inference.features import lab_feature_states, notable_biomarker_flags, wearable_feature_states
from models.schemas import InferenceResult, InferenceRunRequest, LabResult, WearableTimeSeries
from parsers.lab_parser import parse_lab_json_fixture

router = APIRouter(prefix="/inference", tags=["inference"])


def _demo_labs() -> list[LabResult]:
    fixture = Path(__file__).resolve().parents[1] / "fixtures" / "sample_lab.json"
    return parse_lab_json_fixture(json.loads(fixture.read_text()))


def _latest_labs(user_id: str) -> list[LabResult]:
    latest = local_store.latest("lab_results", user_id)
    if not latest:
        return _demo_labs()
    return [LabResult.model_validate(item) for item in latest.get("parsed_values", [])]


def _latest_wearable(user_id: str) -> WearableTimeSeries | None:
    latest = local_store.latest("wearable_data", user_id)
    if not latest or not latest.get("time_series_summary"):
        return None
    return WearableTimeSeries.model_validate(latest["time_series_summary"])


@router.post("/run", response_model=InferenceResult)
async def run_inference(request: InferenceRunRequest, authed_user_id: str = Depends(require_user)):
    user_id = request.user_id or authed_user_id
    labs = request.lab_results if request.lab_results is not None else _latest_labs(user_id)
    wearable = request.wearable_summary if request.wearable_summary is not None else _latest_wearable(user_id)
    evidence = {**lab_feature_states(labs), **wearable_feature_states(wearable)}
    posteriors, intervals = run_bbn_inference(evidence)
    trends = wearable.features if wearable else {}
    payload = deidentified_payload(posteriors, notable_biomarker_flags(labs), trends)
    interpretation = await interpret_with_openai(payload)
    result = InferenceResult(
        user_id=user_id,
        created_at=datetime.utcnow(),
        bbn_posteriors=posteriors,
        confidence_intervals=intervals,
        openai_interpretation=interpretation,
        status="complete",
    )
    local_store.insert("inference_results", user_id, result.model_dump(mode="json"))
    return result


@router.get("/results/{user_id}", response_model=InferenceResult)
async def get_latest_result(user_id: str, authed_user_id: str = Depends(require_user)):
    latest = local_store.latest("inference_results", user_id)
    if latest is None:
        raise HTTPException(status_code=404, detail="No inference result found")
    return InferenceResult.model_validate(latest)
