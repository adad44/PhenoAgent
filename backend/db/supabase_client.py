from __future__ import annotations

import os
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from fastapi import Header, HTTPException

try:
    from supabase import Client, create_client
except Exception:  # pragma: no cover - optional until dependencies are installed
    Client = None  # type: ignore
    create_client = None  # type: ignore


@dataclass
class LocalStore:
    lab_results: dict[str, list[dict[str, Any]]] = field(default_factory=lambda: defaultdict(list))
    wearable_data: dict[str, list[dict[str, Any]]] = field(default_factory=lambda: defaultdict(list))
    inference_results: dict[str, list[dict[str, Any]]] = field(default_factory=lambda: defaultdict(list))
    chat_messages: dict[str, list[dict[str, Any]]] = field(default_factory=lambda: defaultdict(list))

    def insert(self, table: str, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        record = {"user_id": user_id, "created_at": datetime.utcnow().isoformat(), **payload}
        getattr(self, table)[user_id].append(record)
        return record

    def latest(self, table: str, user_id: str) -> dict[str, Any] | None:
        records = getattr(self, table)[user_id]
        return records[-1] if records else None


local_store = LocalStore()


def get_supabase_client(service_role: bool = False) -> Client | None:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY" if service_role else "SUPABASE_ANON_KEY")
    if not url or not key or create_client is None:
        return None
    return create_client(url, key)


async def require_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Supabase bearer token")

    token = authorization.split(" ", 1)[1].strip()
    client = get_supabase_client()
    if client is None:
        return "demo-user" if token == "demo" else token[:36]

    try:
        response = client.auth.get_user(token)
        if response.user is None:
            raise HTTPException(status_code=401, detail="Invalid Supabase token")
        return response.user.id
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - depends on Supabase service
        raise HTTPException(status_code=401, detail="Could not validate Supabase token") from exc
