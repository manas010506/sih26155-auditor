"""Learned mappings: values from the training UI are typed before rules see
them, and a learned line is traceable on both parsers.

The Aruba test is the demo's training beat. Before the fix, confirming
`cli-session timeout 0` stored the text "0" and crashed CIS-NET-003's
in_range check on the next upload.
"""
import pathlib

import pytest

from engine.audit import _parser_for, run_audit
from engine.parsers import learned
from engine.parsers.learned import add_mapping, coerce_value, load_mappings

ROOT = pathlib.Path(__file__).resolve().parent.parent


@pytest.mark.parametrize("raw,want", [
    ("0", 0), ("15", 15), ("true", True), ("False", False),
    ("ssh telnet", "ssh telnet"), (3, 3),
])
def test_coerce_value(raw, want):
    got = coerce_value(raw)
    assert got == want and type(got) is type(want)


def test_saved_value_is_typed(tmp_path):
    p = tmp_path / "mappings.json"
    add_mapping({"text": "cli-session timeout 0", "source_type": "cisco_ios",
                 "resource_type": "vty_line", "attribute": "exec_timeout_minutes",
                 "value": "0", "line": 36}, path=p)
    assert load_mappings(p)[0]["value"] == 0


def test_learned_timeout_is_evaluated_not_crashed(tmp_path, monkeypatch):
    """The demo's training beat: confirming `cli-session timeout 0` on Aruba
    must raise CIS-NET-003 at line 36 and make exactly one more control
    evaluable, not crash the audit."""
    monkeypatch.setattr(learned, "MAPPINGS_PATH", tmp_path / "mappings.json")
    text = (ROOT / "samples" / "demo_aruba.cfg").read_text(encoding="utf-8")
    before = run_audit(text, "cisco_ios", "demo_aruba.cfg", enrich=False)

    add_mapping({"text": "cli-session timeout 0", "source_type": "cisco_ios",
                 "resource_type": "vty_line", "attribute": "exec_timeout_minutes",
                 "value": "0", "line": 36})
    after = run_audit(text, "cisco_ios", "demo_aruba.cfg", enrich=False)

    f = next(f for f in after["findings"] if f["rule_id"] == "CIS-NET-003")
    assert f["raw_ref"]["line"] == 36
    assert (after["score_breakdown"]["rules_evaluated"]
            == before["score_breakdown"]["rules_evaluated"] + 1)
    assert len(after["unparsed"]) == len(before["unparsed"]) - 1
    assert after["score_breakdown"]["partial"] is True


def test_juniper_learned_value_is_typed_and_traceable(tmp_path, monkeypatch):
    monkeypatch.setattr(learned, "MAPPINGS_PATH", tmp_path / "mappings.json")
    add_mapping({"text": "demo-idle-timeout 0", "source_type": "juniper_junos",
                 "resource_type": "vty_line", "attribute": "exec_timeout_minutes",
                 "value": "0"})
    base = (ROOT / "samples" / "sample_juniper.conf").read_text(encoding="utf-8")
    text = base.rstrip("\n") + "\ndemo-idle-timeout 0\n"
    line_no = len(text.splitlines())

    doc = _parser_for("juniper_junos").parse(text, "sample_juniper.conf")
    vty = next(r for r in doc["resources"] if r["type"] == "vty_line")
    assert vty["attributes"]["exec_timeout_minutes"] == 0
    assert type(vty["attributes"]["exec_timeout_minutes"]) is int
    assert vty["attribute_refs"]["exec_timeout_minutes"]["line"] == line_no
    assert all(u["line"] != line_no for u in doc["_unparsed"])