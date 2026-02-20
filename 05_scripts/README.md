# Mnemo Scripts

Utility scripts for working with Mnemo's JSONL data files locally.

## Scripts

### dev_server.sh

Start both the backend (port 8000) and frontend (port 3000) for local development. Sets up the venv automatically on first run. Data is stored in `/tmp/mnemo_dev/` so it won't touch production files.

```bash
bash 05_scripts/dev_server.sh
```

Loads `02_backend/.env` if it exists, otherwise uses sensible defaults (token: `dev-token`).

### summarize_day.py

Print a summary of all events for a given date — counts by type and a list of entries.

```bash
python summarize_day.py /path/to/events.jsonl 2026-02-14
```

### export_jsonl.py

Export events with optional filtering by type and/or date.

```bash
python export_jsonl.py /path/to/events.jsonl --type Intervention
python export_jsonl.py /path/to/events.jsonl --since 2026-02-01
python export_jsonl.py /path/to/events.jsonl --type Symptom --since 2026-02-01
```

Output is JSONL to stdout, so you can pipe it to a file or `jq`.

### import_diary.py

Batch-import Obsidian diary `.md` files into `diary.jsonl` format. Uses OpenAI (`gpt-4o-mini`) to extract structured fields from free-form markdown.

Requires `OPENAI_API_KEY` in the environment.

```bash
python import_diary.py /path/to/obsidian/diary/ -o diary_import.jsonl
```

The output file can then be appended to the production diary:

```bash
cat diary_import.jsonl >> /var/lib/mnemo/diary.jsonl
```

### read_events.sh

Quick one-liner to pretty-print `events.jsonl` with `jq`.

```bash
bash read_events.sh
```

### setup_shortcuts.sh

Creates convenience symlinks in `~/mnemo/` pointing to the server's runtime directories (`/opt/mnemo`, `/var/lib/mnemo`, `/var/log/mnemo`, `/etc/mnemo`). Run once on the Ubuntu server after deployment.

```bash
bash setup_shortcuts.sh
```
