# Architecture

## Why File-Based JSONL

Mnemo stores all events in a single append-only JSONL file. This is an intentional choice, not a shortcut.

### Advantages

**Simplicity.** No database server to install, configure, secure, back up, or upgrade. The application writes one line of JSON to a file. That's it.

**Portability.** The entire event history is a single file. It can be copied, synced, emailed, or analyzed with any tool that reads text. `grep`, `jq`, `awk`, Python, Claude CLI, Gemini CLI — all work out of the box.

**Auditability.** Every line is a complete, self-contained event. The file is a perfect audit trail. `wc -l` gives the event count. `tail -1` gives the latest event.

**Sync compatibility.** Syncthing can sync a file trivially. No replication protocols, no conflict resolution beyond what Syncthing provides. The Mac always has a current copy of the full event stream.

**AI-friendliness.** LLM tools work best with text. A JSONL file can be fed directly to Claude or Gemini for analysis without any export step.

### Tradeoffs vs Database

| Concern | JSONL | Database |
|---|---|---|
| Query performance | O(n) scan | Indexed queries |
| Concurrent writes | File lock needed | Built-in |
| Transactions | Not supported | ACID |
| Tooling | Universal (text) | Requires client |
| Backup | Copy the file | pg_dump / etc |
| Complexity | Zero | Significant |

For a single-user system logging dozens of events per day, the tradeoffs strongly favor JSONL. At scale (tens of thousands of events, concurrent users, complex queries), migration to PostgreSQL becomes worthwhile. The event schema is designed to make this migration trivial.

## Event Sourcing

Mnemo treats the event log as the source of truth. Events are immutable facts — something happened at a point in time. Any derived view (daily summaries, trend charts, pattern reports) is computed from the raw stream and stored separately in `/var/lib/mnemo/derived/`.

This means:
- The raw stream is never corrupted by derived logic
- Derived data can always be regenerated
- New analysis can be retroactively applied to the full history
- The system is trivially debuggable — the log tells the complete story

## Offline Readiness

The file-based design means the data is always available locally on any machine with a copy. In phase 1, the Mac receives the file via Syncthing. Future phases may introduce a Flutter client with local event caching and batch sync.

## Sync to Mac

Syncthing runs on both the EC2 server and the Mac. The `/var/lib/mnemo/` directory is a shared folder. Changes on the server (new appended events) propagate to the Mac within seconds.

This enables:
- Running Claude CLI against the full event history locally
- Running Gemini CLI analysis
- Custom Python scripts for personal analytics
- A backup that happens automatically

## systemd vs Manual Uvicorn

Running Uvicorn manually (e.g., in a tmux session) is fragile:
- No automatic restart on crash
- No log management
- No clean shutdown on reboot
- No resource limits

systemd solves all of these. The `mnemo.service` unit file defines:
- Working directory (`/opt/mnemo/02_backend`)
- Start command (`uvicorn app.main:app`)
- Automatic restart on failure
- Log routing to journald
- User/group isolation

This is the standard way to run services on Linux and costs zero additional complexity.

## Productization Path

Mnemo is designed to grow:

1. **v1:** JSONL + FastAPI + PWA + Syncthing sync
2. **v2:** Server-side analysis scripts (daily summaries, pattern detection)
3. **v3:** AI augmentation layer (LLM-powered insights from the event stream)
4. **v4:** PostgreSQL migration (when query patterns demand it)
5. **v5:** Flutter mobile client with offline-first architecture

Each phase builds on the previous without breaking the core append-only contract.

## Future Flutter Client

A Flutter client would:
- Cache events locally on the device
- Generate `client_timestamp` on the phone
- Batch-sync to the server when online
- Support voice input via Whisper (on-device or server-side)

The event schema and API are designed to support this without modification. The `client_timestamp` / `received_at` split already accounts for delayed event delivery.
