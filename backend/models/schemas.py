from __future__ import annotations

from datetime import date as date_type
from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


RiskState = Literal["low", "normal", "high", "critical"]
RiskDomain = Literal["metabolic", "cardiovascular", "sleep"]


class LabResult(BaseModel):
    name: str
    value: float
    unit: str | None = None
    ref_low: float | None = None
    ref_high: float | None = None
    flag: Literal["L", "H", "N"] = "N"
    date: date_type | None = None
    source: str | None = None


class LabParseResponse(BaseModel):
    results: list[LabResult]
    failed_values: list[str] = Field(default_factory=list)
    source: str = "unknown"
    raw_text_preview: str | None = None


class WearableDailyAggregate(BaseModel):
    date: date_type
    resting_hr: float | None = None
    hrv_ms: float | None = None
    steps: float | None = None
    sleep_hours: float | None = None
    deep_sleep_pct: float | None = None
    rem_sleep_pct: float | None = None
    spo2_avg: float | None = None
    active_calories: float | None = None


class WearableFeatureStats(BaseModel):
    avg_7d: float | None = None
    avg_30d: float | None = None
    trend_slope: float | None = None
    coefficient_of_variation: float | None = None


class WearableTimeSeries(BaseModel):
    source: str
    daily: list[WearableDailyAggregate]
    features: dict[str, WearableFeatureStats]


class SNPProfile(BaseModel):
    snp_count: int
    source: str = "23andMe"
    notable_snps: dict[str, str] = Field(default_factory=dict)


class RiskPosterior(BaseModel):
    low: float
    normal: float
    high: float
    critical: float


class InferenceResult(BaseModel):
    user_id: str
    created_at: datetime
    bbn_posteriors: dict[RiskDomain, RiskPosterior]
    confidence_intervals: dict[RiskDomain, tuple[float, float]]
    openai_interpretation: "OpenAIInterpretation"
    status: Literal["complete", "partial", "failed"] = "complete"


class OpenAIInterpretation(BaseModel):
    summary: str
    key_findings: list[str]
    recommendations: list[str]
    follow_up_questions: list[str]
    disclaimer: str = (
        "For informational purposes only. Consult a healthcare provider for medical decisions."
    )


class InferenceRunRequest(BaseModel):
    user_id: str
    lab_results: list[LabResult] | None = None
    wearable_summary: WearableTimeSeries | None = None


class ChatRequest(BaseModel):
    user_id: str
    message: str
    session_id: UUID | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    session_id: UUID | None = None


class UploadRecord(BaseModel):
    user_id: str
    payload: dict[str, Any]
    source: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


InferenceResult.model_rebuild()
