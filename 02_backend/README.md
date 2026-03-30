# HuXa Backend

FastAPI application for the HuXa event engine.

## Endpoints

### Events

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/events?date=YYYY-MM-DD` | Bearer token | List events for a date |
| POST | `/events` | Bearer token | Append a new event |
| PUT | `/events/{id}` | Bearer token | Soft-delete and re-append (edit) |
| DELETE | `/events/{id}` | Bearer token | Soft-delete an event |

### Diary

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/diary/{date}` | Bearer token | Get latest diary entry for a date |
| POST | `/diary` | Bearer token | Save a diary entry |
| DELETE | `/diary/{date}` | Bearer token | Soft-delete a diary entry |
| GET | `/diary/{date}/summary` | Bearer token | AI summary of the day's events |
| POST | `/diary/parse-text` | Bearer token | Parse free-form text into diary fields (AI) |

### Reports (Feedback / Bug Reports)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reports` | Bearer token | Submit a bug report or feature request |
| GET | `/reports` | Bearer token | List all reports |
| DELETE | `/reports/{id}` | Bearer token | Delete a report |
| POST | `/reports/{id}/attachment` | Bearer token | Upload an image attachment |

### Other

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/query` | Bearer token | Ask a question about events (OpenAI) |
| GET | `/attachments/{filename}` | No | Serve uploaded attachment images |

## Local Development

The easiest way to run the backend is via the dev server script, which starts both the backend and the Expo frontend:

```bash
./05_scripts/dev_server.sh          # Backend + Expo (iOS/Android)
./05_scripts/dev_server.sh --web    # Backend + Expo web (browser)
```

See `01_docs/development.md` for details.

### Running the backend standalone

```bash
cd 02_backend
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file (gitignored):

```bash
HUXA_AUTH_TOKEN=dev-token
HUXA_EVENTS_FILE=/tmp/huxa_dev/events.jsonl
HUXA_DIARY_FILE=/tmp/huxa_dev/diary.jsonl
HUXA_FEEDBACK_FILE=/tmp/huxa_dev/feedback.jsonl
OPENAI_API_KEY=sk-...
```

```bash
set -a && source .env && set +a
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Environment Variables

| Variable | Description |
|---|---|
| `HUXA_EVENTS_FILE` | Path to events.jsonl (default: `/var/lib/huxa/events.jsonl`) |
| `HUXA_DIARY_FILE` | Path to diary.jsonl (default: `/var/lib/huxa/diary.jsonl`) |
| `HUXA_FEEDBACK_FILE` | Path to feedback.jsonl (default: `/var/lib/huxa/feedback.jsonl`) |
| `HUXA_ATTACHMENTS_DIR` | Path to attachments directory (default: `/var/lib/huxa/attachments`) |
| `HUXA_AUTH_TOKEN` | Bearer token for authentication |
| `OPENAI_API_KEY` | OpenAI API key (required for `/query`, `/diary/{date}/summary`, `/diary/parse-text`) |
| `HUXA_CONFIG` | Path to config.json (optional) |
