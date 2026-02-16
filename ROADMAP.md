	# Mnemo Build Roadmap

## Phase 1 — Local Backend ✅

- [x] Set up Python venv and install dependencies
- [x] Run uvicorn locally
- [x] Test `POST /events` with curl
- [x] Test `GET /health` with curl
- [x] Verify events.jsonl gets appended correctly

## Phase 2 — Local Frontend ✅

- [x] Build PWA (log button, category picker, text input, metrics)
- [x] Wire frontend to local backend
- [x] Add CORS middleware for local dev
- [x] Test full flow: log → category → entry → submit → verify in JSONL

## Phase 3 — Server Setup

- [x] Provision EC2 instance (Ubuntu 24.04, eu-west-1)
- [x] Create mnemo user and directory structure (`/opt`, `/var/lib`, `/var/log`, `/etc`)
- [x] Clone repo to `/opt/mnemo/`
- [x] Set up Python venv on server
- [x] Copy config and set auth token
- [x] Install and start systemd service
- [x] Install and configure Nginx
- [ ] Point Cloudflare DNS to the instance (deferred — using EC2 hostname for now)
- [x] Test `POST /events` against live server

## Phase 4 — Deploy Frontend ✅

- [x] Decide hosting: serve static files from Nginx
- [x] Deploy PWA to server
- [x] Test full flow over the internet

## Phase 4.5 — iPhone Quick Logging

- [x] Add to Home Screen on iPhone (PWA)
- [x] Test full logging flow on mobile
- [x] Optimize for frictionless mobile use (PWA in dock)

## Phase 4.6 — AI Query ✅

- [x] Add `POST /query` endpoint (GPT-4o-mini against event log)
- [x] Add query input + answer display in frontend

## Phase 4.7 — Diary Feature ✅

- [x] Structured daily diary with step-by-step wizard (scale + text questions)
- [x] `POST /diary` and `GET /diary/{date}` endpoints
- [x] Date picker with Yesterday/Today shortcuts
- [x] AI-generated daily summary from logged events
- [x] Review screen before saving

## Phase 4.8 — History View ✅

- [x] History screen with Events and Diary tabs
- [x] Single date and date range filtering

## Phase 4.9 — Diary Quick Entry ✅

- [x] Bulk mode: all scale questions on one screen, single textarea for text answers
- [x] AI parsing of free-form text into structured diary fields (`POST /diary/parse-text`)
- [x] Edit from review goes to step-by-step wizard pre-filled with parsed answers
- [x] Removed Diary from event type categories

## Phase 5 — Offline Queue

- [ ] Queue events in IndexedDB/localStorage when offline
- [ ] Sync queued events when connection is restored
- [ ] Show pending/synced status indicators
- [ ] Handle conflicts gracefully

## Phase 6 — Syncthing

- [ ] Install Syncthing on server and Mac
- [ ] Share `/var/lib/mnemo/`
- [ ] Verify events.jsonl syncs to Mac
- [ ] Test running scripts and Claude CLI against synced file

## Phase 7 — Harden

- [ ] Review auth token handling
- [ ] Set up Cloudflare TLS (Full strict)
- [ ] Add basic rate limiting in Nginx
- [ ] Set up log rotation
- [ ] Automated backups of events.jsonl
