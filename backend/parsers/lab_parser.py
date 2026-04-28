from __future__ import annotations

import json
import os
import re
from datetime import date
from io import BytesIO
from typing import Iterable

import pdfplumber

from models.schemas import LabParseResponse, LabResult


COMMON_LABS = {
    "glucose": ["glucose"],
    "hba1c": ["hba1c", "hemoglobin a1c", "a1c"],
    "tsh": ["tsh"],
    "t4": ["t4", "thyroxine"],
    "testosterone": ["testosterone"],
    "cortisol": ["cortisol"],
    "ferritin": ["ferritin"],
    "vitamin d": ["vitamin d", "25-hydroxy"],
    "crp": ["crp", "c-reactive protein"],
    "ldl": ["ldl"],
    "hdl": ["hdl"],
    "triglycerides": ["triglycerides"],
    "alt": ["alt"],
    "ast": ["ast"],
    "creatinine": ["creatinine"],
}

DATE_RE = re.compile(r"(?P<date>\d{1,2}/\d{1,2}/\d{2,4})")
LAB_LINE_RE = re.compile(
    r"(?P<name>[A-Za-z][A-Za-z0-9\-/ %().]+?)\s+"
    r"(?P<value>-?\d+(?:\.\d+)?)\s*"
    r"(?P<flag>[HL])?\s+"
    r"(?P<unit>[a-zA-Z/%0-9.\-]+)?\s*"
    r"(?:(?P<low>-?\d+(?:\.\d+)?)\s*[-–]\s*(?P<high>-?\d+(?:\.\d+)?))?",
    re.IGNORECASE,
)


def extract_pdf_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _canonical_name(raw_name: str) -> str | None:
    normalized = re.sub(r"\s+", " ", raw_name.strip().lower())
    for canonical, aliases in COMMON_LABS.items():
        if any(alias in normalized for alias in aliases):
            return canonical
    return None


def _parse_date(text: str) -> date | None:
    match = DATE_RE.search(text)
    if not match:
        return None
    month, day, year = match.group("date").split("/")
    year_int = int(year)
    if year_int < 100:
        year_int += 2000
    try:
        return date(year_int, int(month), int(day))
    except ValueError:
        return None


def parse_lab_text(text: str, source: str = "unknown") -> LabParseResponse:
    lab_date = _parse_date(text)
    results: dict[str, LabResult] = {}
    failed_values: set[str] = set(COMMON_LABS)

    for line in text.splitlines():
        clean = re.sub(r"\s+", " ", line).strip()
        if not clean:
            continue
        match = LAB_LINE_RE.search(clean)
        if not match:
            continue
        canonical = _canonical_name(match.group("name"))
        if canonical is None:
            continue
        try:
            value = float(match.group("value"))
            low = float(match.group("low")) if match.group("low") else None
            high = float(match.group("high")) if match.group("high") else None
        except (TypeError, ValueError):
            continue
        flag = match.group("flag") or "N"
        if flag == "N" and high is not None and value > high:
            flag = "H"
        if flag == "N" and low is not None and value < low:
            flag = "L"
        results[canonical] = LabResult(
            name=canonical,
            value=value,
            unit=match.group("unit"),
            ref_low=low,
            ref_high=high,
            flag=flag,
            date=lab_date,
            source=source,
        )
        failed_values.discard(canonical)

    return LabParseResponse(
        results=list(results.values()),
        failed_values=sorted(failed_values),
        source=source,
        raw_text_preview=text[:1000],
    )


def detect_lab_source(text: str) -> str:
    lowered = text.lower()
    if "quest diagnostics" in lowered or "questdiagnostics" in lowered:
        return "quest"
    if "labcorp" in lowered or "laboratory corporation" in lowered:
        return "labcorp"
    return "unknown"


LAB_EXTRACTION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"},
                    "value": {"type": "number"},
                    "unit": {"type": ["string", "null"]},
                    "ref_low": {"type": ["number", "null"]},
                    "ref_high": {"type": ["number", "null"]},
                    "flag": {"type": "string", "enum": ["L", "H", "N"]},
                    "date": {"type": ["string", "null"]},
                    "source": {"type": ["string", "null"]},
                },
                "required": ["name", "value", "unit", "ref_low", "ref_high", "flag", "date", "source"],
            },
        }
    },
    "required": ["results"],
}


def _extract_response_text(response) -> str:
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


async def _openai_json_fallback(text: str) -> list[LabResult]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return []
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        response = await client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-5.2"),
            instructions="Extract common lab values from lab report text. Return structured JSON only.",
            input=(
                "Return common biomarkers with name, value, unit, ref_low, ref_high, flag, date, and source. "
                "Only include common biomarkers. Text:\n" + text[:12000]
            ),
            max_output_tokens=1200,
            text={
                "format": {
                    "type": "json_schema",
                    "name": "lab_extraction",
                    "schema": LAB_EXTRACTION_SCHEMA,
                    "strict": True,
                }
            },
        )
        content = _extract_response_text(response)
        payload = json.loads(content)
        return [LabResult.model_validate(item) for item in payload.get("results", [])]
    except Exception:
        return []


async def parse_lab_pdf(pdf_bytes: bytes) -> LabParseResponse:
    text = extract_pdf_text(pdf_bytes)
    source = detect_lab_source(text)
    parsed = parse_lab_text(text, source=source)
    if parsed.results:
        return parsed
    fallback = await _openai_json_fallback(text)
    return LabParseResponse(
        results=fallback,
        failed_values=[] if fallback else sorted(COMMON_LABS),
        source=source,
        raw_text_preview=text[:1000],
    )


def parse_lab_json_fixture(items: Iterable[dict]) -> list[LabResult]:
    return [LabResult.model_validate(item) for item in items]
