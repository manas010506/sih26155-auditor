"""Repo path: engine/parsers/learned.py     Owner: Manas

Persistence for the training loop. Written by POST /api/training, read by
the parsers on every audit.

A mapping teaches a parser that a line it does not recognise carries a known
attribute. Matching is by normalised token prefix, so teaching

    set system syslog host 10.10.0.200 any notice

stores the prefix `set system syslog host` and then matches any line starting
with those tokens, whatever the address. Longest prefix wins.

IMPORTANT: load_mappings() reads from disk on every call and never caches.
A mapping taught during a demo must apply to the very next audit without a
restart. Do not add caching here.
"""
from __future__ import annotations

import datetime as _dt
import json
import pathlib
import threading

MAPPINGS_PATH = pathlib.Path(__file__).resolve().parent / "learned_mappings.json"
PREFIX_TOKENS = 4
_LOCK = threading.Lock()


def normalize(text: str) -> str:
    """Collapse whitespace and lowercase, so indentation never breaks a match."""
    return " ".join(str(text).split()).lower()


def prefix_of(text: str, tokens: int = PREFIX_TOKENS) -> str:
    return " ".join(normalize(text).split()[:tokens])


def load_mappings(path: pathlib.Path | None = None) -> list[dict]:
    """Every mapping taught so far. Missing or corrupt file returns []."""
    p = path or MAPPINGS_PATH
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []
    return data.get("mappings", []) if isinstance(data, dict) else []


def add_mapping(entry: dict, path: pathlib.Path | None = None) -> dict:
    """Append a mapping, replacing any existing one with the same prefix."""
    p = path or MAPPINGS_PATH
    record = {
        "prefix": prefix_of(entry["text"]),
        "source_type": entry["source_type"],
        "resource_type": entry["resource_type"],
        "attribute": entry["attribute"],
        "value": entry["value"],
        "example_line": " ".join(str(entry["text"]).split()),
        "line": entry.get("line"),
        "created_at": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
    }
    with _LOCK:
        existing = [m for m in load_mappings(p) if m.get("prefix") != record["prefix"]]
        existing.append(record)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(
            json.dumps({"version": 1, "mappings": existing}, indent=2),
            encoding="utf-8",
        )
    return record


def match_line(text: str, mappings: list[dict], source_type: str | None = None) -> dict | None:
    """The learned mapping for this line, or None. Longest prefix wins."""
    norm = normalize(text)
    best = None
    for m in mappings:
        pref = m.get("prefix", "")
        if not pref or not norm.startswith(pref):
            continue
        if source_type and m.get("source_type") != source_type:
            continue
        if best is None or len(pref) > len(best["prefix"]):
            best = m
    return best