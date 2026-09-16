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