# Mnemo Frontend

Web-first PWA for the Mnemo event engine. Vanilla HTML/CSS/JS — no build step, no dependencies.

## Running Locally

Serve the `public/` directory with any static file server:

```bash
cd 03_frontend/public && python3 -m http.server 3000
```

Then open http://localhost:3000.

## Setup

On first use, the app prompts for a bearer token. Enter the same value as the backend's `MNEMO_AUTH_TOKEN`.

For local dev with the backend:

```bash
cd 02_backend
MNEMO_EVENTS_FILE=./events.jsonl MNEMO_AUTH_TOKEN=dev-token ./venv/bin/uvicorn app.main:app --reload --port 8000
```

## UI Flow

### Event Logging
1. Tap **Log**
2. Pick a category (Event, Intervention, Symptom, Decision, Diary)
3. Enter text, optionally add metrics as JSON
4. Submit

### Structured Diary
1. Tap **Diary**
2. Pick a date (defaults to today, "Yesterday" shortcut available)
3. View AI summary of the day's logged events
4. Step through 9 health/wellness questions (scale 1-10 or free text)
5. Review all answers
6. Save — entry is appended to diary.jsonl

## PWA

The app includes a web manifest and service worker for Add to Home Screen support and app-shell caching.
