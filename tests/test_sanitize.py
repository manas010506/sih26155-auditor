"""Repo path: tests/test_sanitize.py     Owner: Shreyas
The test that lets you answer "what do you send to Google?" with confidence.
"""
import json

from engine.narrative.generator import sanitize

REPORT = json.load(open("samples/sample_report.json"))
ITEMS = REPORT["findings"] + REPORT["attack_paths"]

# Actual secrets and identifiers from the demo config. NOT generic config
# keywords - benchmark titles legitimately say things like "use enable secret
# instead of enable password", and flagging those is a false positive.
LEAK_MARKERS = [
    "cisco123", "admin123", "N3top2024", "telnet123",   # passwords
    "203.0.113", "10.10.0",                              # addresses
    "EDGE-RTR-01",                                       # hostname
    "public RO", "private RW",                           # community strings
]


def _blob(obj) -> str:
    return json.dumps(obj)


def test_no_raw_ref_survives():
    for f in REPORT["findings"]:
        assert "raw_ref" not in sanitize(f)


def test_no_remediation_or_explanation_leaves():
    for f in REPORT["findings"]:
        clean = sanitize(f)
        assert "remediation_template" not in clean
        assert "explanation" not in clean


def test_no_secrets_leak():
    for item in ITEMS:
        blob = _blob(sanitize(item))
        for marker in LEAK_MARKERS:
            assert marker not in blob, f"{marker!r} leaked from {item.get('rule_id') or item.get('chain_id')}"


def test_no_config_snippet_leaks():
    """The strongest check: no line of the actual config survives sanitize()."""
    for f in REPORT["findings"]:
        ref = f.get("raw_ref")
        if not ref:
            continue
        assert ref["snippet"] not in _blob(sanitize(f))


def test_still_useful():
    """Sanitized must retain enough for the LLM to write something real."""
    clean = sanitize(REPORT["attack_paths"][0])
    assert clean["contributing_findings"]
    assert clean["break_chain"]["fix_rule"]
