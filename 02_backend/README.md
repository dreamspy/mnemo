# Mnemo Backend

FastAPI application for the Mnemo event engine.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/events` | Bearer token | Append a new event |

## Local Development

```bash
cd 02_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export MNEMO_EVENTS_FILE=./events.jsonl
export MNEMO_AUTH_TOKEN=dev-token

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Environment Variables

| Variable | Description |
|---|---|
| `MNEMO_EVENTS_FILE` | Path to events.jsonl (default: `/var/lib/mnemo/events.jsonl`) |
| `MNEMO_AUTH_TOKEN` | Bearer token for authentication |
| `MNEMO_CONFIG` | Path to config.json (optional) |
