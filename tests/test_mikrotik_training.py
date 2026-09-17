"""MikroTik has no parser. Teaching its lines must produce real, traceable
findings, and never a false pass."""
import pathlib

import pytest

from engine.audit import run_audit
from engine.parsers import learned
from engine.parsers.learned import add_mapping
from engine.parsers.suggest import suggest

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEXT = (ROOT / "samples" / "demo_mikrotik.cfg").read_text(encoding="utf-8")
LINES = TEXT.splitlines()


@pytest.fixture(autouse=True)
def _isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(learned, "MAPPINGS_PATH", tmp_path / "mappings.json")


def teach(*numbers):
    for n in numbers:
        s = suggest(LINES[n - 1])
        assert s, f"no suggestion for line {n}"
        add_mapping({"text": LINES[n - 1], "source_type": "cisco_ios",
                     "resource_type": s["resource_type"], "attribute": s["attribute"],
                     "value": s["value"], "line": n})


def audit():
    return run_audit(TEXT, "cisco_ios", "demo_mikrotik.cfg", enrich=False)


def findings(r):
    return {f["rule_id"]: f["raw_ref"]["line"] for f in r["findings"]}


def passed(r):
    return {p["rule_id"] for p in r["passed"]}


def test_untaught_is_not_assessed_and_skips_comments():
    r = audit()
    assert r["score_breakdown"]["not_assessable"] is True
    assert 1 not in {u["line"] for u in r["unparsed"]}


def test_teaching_telnet_raises_a_critical_at_that_line():
    teach(3)
    r = audit()
    assert r["score_breakdown"]["partial"] is True
    assert findings(r) == {"CIS-NET-001": 3}


def test_teaching_ssh_after_telnet_keeps_the_telnet_finding():
    teach(3, 4)
    r = audit()
    assert findings(r).get("CIS-NET-001") == 3
    assert "CIS-NET-001" not in passed(r)


def test_remote_logging_to_0000_is_not_a_syslog_host():
    teach(11)
    assert findings(audit()).get("CIS-NET-011") == 11


def test_enabling_snmp_without_v3_fails_the_snmpv3_check():
    teach(7)
    assert findings(audit()).get("CIS-NET-022") == 7


def test_teaching_every_suggestion_gives_no_false_pass():
    teach(*[n for n in range(1, len(LINES) + 1) if suggest(LINES[n - 1])])
    r = audit()
    assert r["score_breakdown"]["partial"] is True
    assert {"CIS-NET-001", "CIS-NET-002", "CIS-NET-011", "CIS-NET-022"} <= set(findings(r))
    assert not passed(r) & {"CIS-NET-001", "CIS-NET-011", "CIS-NET-022"}


def test_suggestions_keep_case_and_respect_disabled_services():
    assert suggest("/system identity set name=EDGE-MT-01")["value"] == "EDGE-MT-01"
    assert suggest("/ip service set telnet disabled=yes") is None
    assert suggest("/ip service set www disabled=yes")["value"] == "false"
