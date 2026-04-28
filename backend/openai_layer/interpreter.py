from __future__ import annotations

import json
import os
from typing import Any

from models.schemas import OpenAIInterpretation, RiskPosterior


DISCLAIMER = "For informational purposes only. Consult a healthcare provider for medical decisions."
DEFAULT_MODEL = "gpt-5.2"

SYSTEM_PROMPT = (
    "You are a health intelligence agent. You receive Bayesian posterior probabilities "
    "from a health risk model and return clear, personalized, actionable insights. "
    "Never diagnose. Frame as: based on your data patterns, here is what stands out "
    "and what you can do about it. Always recommend consulting a healthcare provider "
    "for clinical decisions."
)


INTERPRETATION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "summary": {"type": "string"},
        "key_findings": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}},
        "follow_up_questions": {"type": "array", "items": {"type": "string"}},
        "disclaimer": {"type": "string"},
    },
    "required": ["summary", "key_findings", "recommendations", "follow_up_questions", "disclaimer"],
}


def deidentified_payload(
    posteriors: dict[str, RiskPosterior],
    notable_biomarker_flags: list[str],
    wearable_trends: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "bbn_posteriors": {domain: posterior.model_dump() for domain, posterior in posteriors.items()},
        "notable_biomarker_flags": notable_biomarker_flags,
        "wearable_trends": wearable_trends or {},
        "privacy_note": "No names, DOB, exact dates, raw files, or raw lab values are included.",
    }


def fallback_interpretation(posteriors: dict[str, RiskPosterior], flags: list[str]) -> OpenAIInterpretation:
    highest = {
        domain: max(posterior.model_dump().items(), key=lambda item: item[1])
        for domain, posterior in posteriors.items()
    }
    elevated = [domain for domain, (state, _) in highest.items() if state in {"high", "critical"}]
    summary = (
        "Your current pattern shows the strongest attention areas in "
        + (", ".join(elevated) if elevated else "routine monitoring")
        + ". This is a model-based signal, not a diagnosis."
    )
    findings = [
        f"{domain.title()} is most likely in the {state} band ({probability:.0%})."
        for domain, (state, probability) in highest.items()
    ]
    if flags:
        findings.append("Flagged biomarker categories were detected: " + ", ".join(flags) + ".")
    return OpenAIInterpretation(
        summary=summary,
        key_findings=findings,
        recommendations=[
            "Review these patterns with a licensed healthcare provider before making clinical decisions.",
            "Track sleep, resting heart rate, HRV, and follow-up lab work over time to confirm whether trends persist.",
            "Prioritize food quality, regular movement, consistent sleep timing, and medication adherence if already prescribed.",
        ],
        follow_up_questions=[
            "Which biomarkers are driving my highest risk area?",
            "What should I ask my clinician about these results?",
            "How have my wearable trends changed over the last month?",
        ],
        disclaimer=DISCLAIMER,
    )


def _extract_response_text(response: Any) -> str:
    text = getattr(response, "output_text", None)
    if text:
        return str(text)
    output = getattr(response, "output", None) or []
    parts: list[str] = []
    for item in output:
        for content in getattr(item, "content", []) or []:
            value = getattr(content, "text", None)
            if value:
                parts.append(str(value))
    return "".join(parts)


async def interpret_with_openai(payload: dict[str, Any]) -> OpenAIInterpretation:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        posteriors = {
            domain: RiskPosterior.model_validate(values)
            for domain, values in payload.get("bbn_posteriors", {}).items()
        }
        return fallback_interpretation(posteriors, payload.get("notable_biomarker_flags", []))

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        response = await client.responses.create(
            model=os.getenv("OPENAI_MODEL", DEFAULT_MODEL),
            instructions=SYSTEM_PROMPT,
            input=(
                "Return structured JSON for the health interpretation. Include this exact "
                f"disclaimer field: {DISCLAIMER}\n\nInput:\n{json.dumps(payload)}"
            ),
            max_output_tokens=1500,
            text={
                "format": {
                    "type": "json_schema",
                    "name": "health_interpretation",
                    "schema": INTERPRETATION_SCHEMA,
                    "strict": True,
                }
            },
        )
        return OpenAIInterpretation.model_validate_json(_extract_response_text(response))
    except Exception:
        posteriors = {
            domain: RiskPosterior.model_validate(values)
            for domain, values in payload.get("bbn_posteriors", {}).items()
        }
        return fallback_interpretation(posteriors, payload.get("notable_biomarker_flags", []))


async def chat_reply(message: str, latest_context: dict[str, Any] | None) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return (
            "Based on the saved analysis context, I can explain risk drivers, trend changes, "
            "and questions to bring to a clinician. " + DISCLAIMER
        )

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        response = await client.responses.create(
            model=os.getenv("OPENAI_MODEL", DEFAULT_MODEL),
            instructions=SYSTEM_PROMPT + " Use only de-identified context.",
            input=json.dumps({"context": latest_context or {}, "message": message}),
            max_output_tokens=900,
        )
        text = _extract_response_text(response)
        return text if DISCLAIMER in text else f"{text}\n\n{DISCLAIMER}"
    except Exception:
        return "I could not reach OpenAI, but the latest analysis is still available in your dashboard. " + DISCLAIMER
