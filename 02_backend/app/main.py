import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from openai import OpenAI

from app.models.event import (
    EventIn, EventStored, QueryIn, QueryOut,
    DiaryIn, DiaryOut, DiarySummaryOut,
)

import uuid

app = FastAPI(title="Mnemo", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
security = HTTPBearer()

EVENTS_FILE = Path(os.environ.get("MNEMO_EVENTS_FILE", "/var/lib/mnemo/events.jsonl"))
DIARY_FILE = Path(os.environ.get("MNEMO_DIARY_FILE", "/var/lib/mnemo/diary.jsonl"))
AUTH_TOKEN = os.environ.get("MNEMO_AUTH_TOKEN", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_TOKEN:
        return  # No token configured — skip auth (local dev)
    if credentials.credentials != AUTH_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/events", status_code=201, dependencies=[Depends(verify_token)])
def create_event(event: EventIn) -> EventStored:
    received_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    stored = EventStored(
        id=event.id,
        client_timestamp=event.client_timestamp,
        received_at=received_at,
        type=event.type,
        text=event.text,
        metrics=event.metrics,
        meta=event.meta,
    )

    EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(EVENTS_FILE, "a") as f:
        f.write(json.dumps(stored.model_dump(), default=str) + "\n")

    return stored


@app.post("/query", dependencies=[Depends(verify_token)])
def query_events(q: QueryIn) -> QueryOut:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured",
        )

    events_text = ""
    if EVENTS_FILE.exists():
        events_text = EVENTS_FILE.read_text()

    if not events_text.strip():
        return QueryOut(answer="No events have been logged yet.")

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are analyzing a personal event log. Each line below is a JSON event "
                    "with fields: id, client_timestamp, received_at, type, text, metrics, meta. "
                    "Answer the user's question based on these events. Be concise and helpful."
                ),
            },
            {
                "role": "user",
                "content": f"Events:\n{events_text}\n\nQuestion: {q.question}",
            },
        ],
    )

    return QueryOut(answer=response.choices[0].message.content)


@app.get("/diary/{date}", dependencies=[Depends(verify_token)])
def get_diary(date: str) -> DiaryOut:
    if not DIARY_FILE.exists():
        raise HTTPException(status_code=404, detail="No diary entry for this date")

    latest = None
    for line in DIARY_FILE.read_text().strip().splitlines():
        entry = json.loads(line)
        if entry["date"] == date:
            latest = entry

    if not latest:
        raise HTTPException(status_code=404, detail="No diary entry for this date")

    return DiaryOut(**latest)


@app.post("/diary", status_code=201, dependencies=[Depends(verify_token)])
def create_diary(diary: DiaryIn) -> DiaryOut:
    saved_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    stored = DiaryOut(
        id=str(uuid.uuid4()),
        date=diary.date,
        answers=diary.answers,
        saved_at=saved_at,
        meta={"version": 1},
    )

    DIARY_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(DIARY_FILE, "a") as f:
        f.write(json.dumps(stored.model_dump(), default=str) + "\n")

    return stored


@app.get("/diary/{date}/summary", dependencies=[Depends(verify_token)])
def get_diary_summary(date: str) -> DiarySummaryOut:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured",
        )

    events = []
    if EVENTS_FILE.exists():
        for line in EVENTS_FILE.read_text().strip().splitlines():
            entry = json.loads(line)
            if entry.get("type") == "Diary":
                continue
            ts = entry.get("client_timestamp", "")
            if ts.startswith(date):
                events.append(entry)

    if not events:
        return DiarySummaryOut(summary="No events logged for this date.")

    events_text = "\n".join(json.dumps(e) for e in events)

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Summarize these personal log events as a brief context for a daily diary entry. "
                    "Be concise — a few sentences at most."
                ),
            },
            {
                "role": "user",
                "content": events_text,
            },
        ],
    )

    return DiarySummaryOut(summary=response.choices[0].message.content)
