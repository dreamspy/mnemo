import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from openai import OpenAI

from app.models.event import EventIn, EventStored, QueryIn, QueryOut

app = FastAPI(title="Mnemo", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
security = HTTPBearer()

EVENTS_FILE = Path(os.environ.get("MNEMO_EVENTS_FILE", "/var/lib/mnemo/events.jsonl"))
AUTH_TOKEN = os.environ.get("MNEMO_AUTH_TOKEN", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth token not configured",
        )
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
