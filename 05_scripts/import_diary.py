#!/usr/bin/env python3
"""Import Obsidian diary .md files into diary.jsonl using OpenAI extraction."""

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from openai import OpenAI


EXTRACTION_PROMPT = """Extract structured diary data from this markdown. Return JSON with fields:
- date (string, YYYY-MM-DD format — infer from filename or content)
- headaches (number 1-10, omit if not present)
- energy (number 1-10, omit if not present)
- gut (string, omit if not present)
- physical (string, omit if not present)
- hip_pain (number 1-10, omit if not present)
- mental (string, omit if not present)
- life (string, omit if not present)
- gratitude (string, omit if not present)
- activity (string, omit if not present)

Return ONLY valid JSON, no markdown fences or extra text."""


def import_file(client: OpenAI, md_path: Path) -> dict | None:
    content = md_path.read_text(encoding="utf-8")
    if not content.strip():
        print(f"  Skipping empty file: {md_path.name}")
        return None

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": f"Filename: {md_path.name}\n\n{content}"},
        ],
    )

    raw = response.choices[0].message.content.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw[:-3].strip()

    extracted = json.loads(raw)
    date = extracted.pop("date", md_path.stem)

    return {
        "id": str(uuid.uuid4()),
        "date": date,
        "answers": extracted,
        "saved_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "meta": {"version": 1},
    }


def main():
    parser = argparse.ArgumentParser(description="Import Obsidian diary files to diary.jsonl")
    parser.add_argument("input_dir", help="Directory containing .md diary files")
    parser.add_argument(
        "-o", "--output",
        default="diary_import.jsonl",
        help="Output JSONL file (default: diary_import.jsonl)",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.is_dir():
        print(f"Error: {input_dir} is not a directory")
        sys.exit(1)

    md_files = sorted(input_dir.glob("*.md"))
    if not md_files:
        print(f"No .md files found in {input_dir}")
        sys.exit(1)

    client = OpenAI()  # uses OPENAI_API_KEY env var
    output_path = Path(args.output)
    count = 0

    with open(output_path, "a") as f:
        for md_path in md_files:
            print(f"Processing: {md_path.name}")
            try:
                entry = import_file(client, md_path)
                if entry:
                    f.write(json.dumps(entry) + "\n")
                    count += 1
                    print(f"  -> {entry['date']}")
            except Exception as e:
                print(f"  Error: {e}")

    print(f"\nDone. Imported {count} entries to {output_path}")
    print(f"To deploy: cat {output_path} >> /var/lib/mnemo/diary.jsonl")


if __name__ == "__main__":
    main()
