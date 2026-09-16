import pathlib

import pytest

from engine.audit import run_audit

SAMPLES = pathlib.Path(__file__).resolve().parent.parent / "samples"
PROSE = "Minutes of the weekly meeting. The team discussed the budget."


def sample(name):
    return (SAMPLES / name).read_text(encoding="utf-8")


def audit(text, src):
    return run_audit(text, src, enrich=False)


@pytest.mark.parametrize("src", ["cisco_ios", "juniper_junos"])
def test_prose_is_not_assessed(src):
    r = audit(PROSE, src)
    assert r["compliance_score"] is None
    assert r["score_breakdown"]["not_assessable"] is True
    assert r["findings"] == []


@pytest.mark.parametrize("name", ["demo_mikrotik.cfg", "unknown_vendor.cfg",
                                  "unknown_juniper.cfg"])
def test_unreadable_vendor_is_not_assessed(name):
    r = audit(sample(name), "cisco_ios")
    assert r["compliance_score"] is None
    assert r["findings"] == []


def test_partial_parse_withholds_the_score():
    r = audit(sample("demo_aruba.cfg"), "cisco_ios")
    b = r["score_breakdown"]
    assert b.get("partial") is True
    assert r["compliance_score"] is None
    assert b["rules_evaluated"] < b["controls_total"]


def test_native_configs_are_unchanged():
    assert audit(sample("sample_cisco_ios.cfg"), "cisco_ios")["compliance_score"] == 15
    assert audit(sample("sample_juniper.conf"), "juniper_junos")["compliance_score"] == 25

def test_pdf_builds_for_unscored_results():
    from engine.report import build_report
    for name in ("demo_aruba.cfg", "demo_mikrotik.cfg"):
        pdf = build_report(audit(sample(name), "cisco_ios"))
        assert bytes(pdf[:4]) == b"%PDF"

# --- Taught lines, evidenced conditions, and IOS community defaults ---------
from engine.parsers import learned
from engine.parsers.learned import add_mapping

TOY = "hostname X\nsnmp-community public\n"
TOY_MAPPING = {"text": "snmp-community public", "source_type": "cisco_ios",
               "resource_type": "snmp_community", "attribute": "is_default_string",
               "value": "true", "line": 2}


@pytest.fixture(autouse=True)
def _no_saved_mappings(tmp_path, monkeypatch):
    """Every test here sees only the mappings it adds, never a demo session's."""
    monkeypatch.setattr(learned, "MAPPINGS_PATH", tmp_path / "mappings.json")


def test_taught_lines_do_not_make_a_file_native():
    """Once every line is recognised (one parsed, one taught), the file must
    still not be scored against the parser's defaults."""
    add_mapping(TOY_MAPPING)
    r = audit(TOY, "cisco_ios")
    assert r["compliance_score"] is None
    assert all((f.get("raw_ref") or {}).get("line") for f in r["findings"])


def test_rule_with_unevidenced_condition_is_not_passed():
    """CIS-NET-008 applies only when access is RO. A taught line that sets
    is_default_string alone says nothing about access, so the rule must not
    be reported as passed."""
    add_mapping(TOY_MAPPING)
    passed = {p["rule_id"] for p in audit(TOY, "cisco_ios")["passed"]}
    assert not passed & {"CIS-NET-008", "CIS-NET-009"}


def test_community_without_access_keyword_is_read_as_ro():
    """`snmp-server community public` with no RO/RW is RO on IOS, and Aruba's
    line 15 must be checked for a default string."""
    r = audit(sample("demo_aruba.cfg"), "cisco_ios")
    f = next(f for f in r["findings"] if f["rule_id"] == "CIS-NET-008")
    assert f["raw_ref"]["line"] == 15
