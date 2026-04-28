from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from db.supabase_client import local_store, require_user
from parsers.genome_parser import parse_23andme
from parsers.lab_parser import parse_lab_pdf
from parsers.wearable_parser import parse_wearable_export

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/labs")
async def upload_labs(file: UploadFile = File(...), user_id: str = Depends(require_user)):
    content = await file.read()
    parsed = await parse_lab_pdf(content)
    local_store.insert(
        "lab_results",
        user_id,
        {"parsed_values": [item.model_dump(mode="json") for item in parsed.results], "source": parsed.source},
    )
    return parsed


@router.post("/wearables")
async def upload_wearables(file: UploadFile = File(...), user_id: str = Depends(require_user)):
    content = await file.read()
    parsed = parse_wearable_export(file.filename or "wearable.csv", content)
    local_store.insert(
        "wearable_data",
        user_id,
        {"time_series_summary": parsed.model_dump(mode="json"), "feature_vector": parsed.features, "source": parsed.source},
    )
    return parsed


@router.post("/genome")
async def upload_genome(file: UploadFile = File(...), user_id: str = Depends(require_user)):
    content = await file.read()
    parsed = parse_23andme(content)
    local_store.insert("wearable_data", user_id, {"genome_profile": parsed.model_dump(mode="json"), "source": parsed.source})
    return parsed
