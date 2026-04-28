from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import chat, inference, upload

load_dotenv()

app = FastAPI(
    title="PhenoAgent API",
    version="0.1.0",
    description="AI-powered personal health intelligence MVP with parser, BBN, and OpenAI layers.",
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(inference.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}
