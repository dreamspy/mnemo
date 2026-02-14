import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.event import EventIn, EventStored

app = FastAPI(title="Mnemo", version="0.1.0")
security = HTTPBearer()

EVENTS_FILE = Path(os.environ.get("MNEMO_EVENTS_FILE", "/var/lib/mnemo/events.jsonl"))
AUTH_TOKEN = os.environ.get("MNEMO_AUTH_TOKEN", "")


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
