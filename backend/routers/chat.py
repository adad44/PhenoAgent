from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from openai_layer.interpreter import chat_reply
from db.supabase_client import local_store, require_user
from models.schemas import ChatRequest

router = APIRouter(tags=["chat"])


@router.post("/chat")
async def chat(request: ChatRequest, authed_user_id: str = Depends(require_user)):
    latest = local_store.latest("inference_results", request.user_id or authed_user_id)
    response_text = await chat_reply(request.message, latest)
    local_store.insert(
        "chat_messages",
        request.user_id,
        {"role": "user", "content": request.message, "session_id": str(request.session_id) if request.session_id else None},
    )
    local_store.insert(
        "chat_messages",
        request.user_id,
        {"role": "assistant", "content": response_text, "session_id": str(request.session_id) if request.session_id else None},
    )

    async def stream():
        for token in response_text.split(" "):
            yield token + " "

    return StreamingResponse(stream(), media_type="text/plain")
