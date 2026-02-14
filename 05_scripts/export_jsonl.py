"""
Export events from events.jsonl with optional filtering.

Usage:
    python export_jsonl.py /path/to/events.jsonl --type Intervention
    python export_jsonl.py /path/to/events.jsonl --since 2026-02-01
    python export_jsonl.py /path/to/events.jsonl --type Symptom --since 2026-02-01
"""

import argparse
import json
import sys


def export_events(filepath: str, event_type: str | None = None, since: str | None = None):
    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            event = json.loads(line)

            if event_type and event["type"] != event_type:
                continue
            if since and event["client_timestamp"] < since:
                continue

            print(json.dumps(event))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export filtered events from JSONL")
    parser.add_argument("filepath", help="Path to events.jsonl")
    parser.add_argument("--type", dest="event_type", help="Filter by event type")
    parser.add_argument("--since", help="Filter events on or after this date (YYYY-MM-DD)")
    args = parser.parse_args()

    export_events(args.filepath, args.event_type, args.since)
