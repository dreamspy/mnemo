# Mnemo Backend

FastAPI application for the Mnemo event engine.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/events` | Bearer token | Append a new event |
| POST | `/query` | Bearer token | Ask a question about events (OpenAI) |
| GET | `/diary/{date}` | Bearer token | Get latest diary entry for a date |
| POST | `/diary` | Bearer token | Save a diary entry |
| GET | `/diary/{date}/summary` | Bearer token | AI summary of the day's events |

## Local Development

```bash
cd 02_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file (gitignored):

```bash
MNEMO_AUTH_TOKEN=dev-token
MNEMO_EVENTS_FILE=/tmp/mnemo_events.jsonl
MNEMO_DIARY_FILE=/tmp/mnemo_diary.jsonl
OPENAI_API_KEY=sk-...
```

Run the backend:

```bash
set -a && source .env && set +a
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Environment Variables

| Variable | Description |
|---|---|
| `MNEMO_EVENTS_FILE` | Path to events.jsonl (default: `/var/lib/mnemo/events.jsonl`) |
| `MNEMO_DIARY_FILE` | Path to diary.jsonl (default: `/var/lib/mnemo/diary.jsonl`) |
| `MNEMO_AUTH_TOKEN` | Bearer token for authentication |
| `OPENAI_API_KEY` | OpenAI API key (required for `/query` and `/diary/{date}/summary`) |
| `MNEMO_CONFIG` | Path to config.json (optional) |
