"""
Summarize events for a given day from events.jsonl.

Usage:
    python summarize_day.py /path/to/events.jsonl 2026-02-14
"""

import json
import sys
from collections import Counter


def summarize_day(filepath: str, date: str):
    counts = Counter()
    events = []

    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            event = json.loads(line)
            if event["client_timestamp"].startswith(date):
                counts[event["type"]] += 1
                events.append(event)

    print(f"Summary for {date}")
    print(f"Total events: {len(events)}")
    print()
    for event_type, count in counts.most_common():
        print(f"  {event_type}: {count}")
    print()
    for event in events:
        print(f"  [{event['type']}] {event['text']}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <events.jsonl> <YYYY-MM-DD>")
        sys.exit(1)
    summarize_day(sys.argv[1], sys.argv[2])
