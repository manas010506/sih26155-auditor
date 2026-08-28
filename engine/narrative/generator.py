"""Repo path: engine/narrative/generator.py     Owner: Shreyas

Contract (Handbook 4.4):
    generate_narrative(item: dict, kind: str) -> str

Rules that do not bend:
  1. Templates work with no API key. Build them first.
  2. sanitize() is a WHITELIST. raw config never leaves this machine.
  3. Narrate attack paths only (3-5), never all 15 findings.
  4. Cache. Never call twice for the same item.
  5. run_audit() must NOT block on this - it is a separate enrichment pass.
"""
import hashlib
import json
import os
import pathlib

from . import templates   # standalone: import templates

CACHE_PATH = pathlib.Path(__file__).with_name("cache.json")

# ---------------------------------------------------------------- WHITELIST
# A judge will ask what you send to Google. Point at this list.
# Adding a key here is a decision, not a convenience. raw_ref is NEVER here.
ALLOWED_KEYS = {
    "rule_id", "title", "severity", "cis_control",
    "chain_id", "name", "contributing_findings", "break_chain",
}


def sanitize(item: dict) -> dict:
    """Strip everything that isn't explicitly allowed. Whitelist, not blacklist."""
    clean = {k: v for k, v in item.items() if k in ALLOWED_KEYS}
    if "break_chain" in clean:                       # nested - re-filter
        clean["break_chain"] = {
            k: v for k, v in clean["break_chain"].items() if k in {"fix_rule", "why"}
        }
    return clean


def _cache():
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def _key(clean: dict, kind: str) -> str:
    blob = json.dumps(clean, sort_keys=True) + kind
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


def generate_narrative(item: dict, kind: str) -> str:
    fallback = templates.path_text(item) if kind == "attack_path" else templates.finding_text(item)

    clean = sanitize(item)
    cache, k = _cache(), _key(sanitize(item), kind)
    if k in cache:
        return cache[k]

    if not os.getenv("GEMINI_API_KEY"):
        return fallback

    try:
        text = _call_llm(clean, kind)
        cache[k] = text
        CACHE_PATH.write_text(json.dumps(cache, indent=2))
        return text
    except Exception:
        return fallback


def _call_llm(clean: dict, kind: str) -> str:
    """TODO Sun 30 Aug.
    pip install google-genai, key from AI Studio, keep it in .env.
    CHECK THE CURRENT QUICKSTART - the SDK changed recently and older
    snippets will not run. Ask for 3-4 sentences, no markdown, no preamble.
    """
    raise NotImplementedError("wire Gemini here on Sun 30 Aug")
