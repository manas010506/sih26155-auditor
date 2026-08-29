"""Repo path: tests/test_rule_engine.py     Owner: Manas
Your spec for Saturday. Red now, green when the engine works.

    pytest tests/test_rule_engine.py -v
"""
import json

import pytest

from engine.rules.engine import OPS, evaluate, load_rules, score
from engine.schema.schema import resolve_ref

CISCO_RULES = "engine/rules/cisco_rules.yaml"
AWS_RULES = "engine/rules/aws_rules.yaml"


def norm(key):
    return json.load(open("samples/normalized_examples.json"))[key]


def report(path):
    return json.load(open(path))


# ----------------------------------------------------------------- operators
@pytest.mark.parametrize("op", sorted(OPS))
def test_none_fails_every_positive_check(op):
    """None must never satisfy a positive check - absence detection depends
    on it. not_contains and not_exists are the two that accept None."""
    sample = {"equals": 2, "not_equals": 2, "contains": "x", "not_contains": "x",
              "in": [1, 2], "not_in": [1, 2], "exists": None, "not_exists": None,
              "gte": 1, "lte": 1, "in_range": [1, 10], "min_length": 1,
              "matches": r"\d+"}[op]
    result = OPS[op](None, sample)
    if op in {"not_contains", "not_exists", "not_equals", "not_in"}:
        assert result is True
    else:
        assert result is False


def test_in_range_rejects_zero_timeout():
    assert OPS["in_range"](0, [1, 10]) is False
    assert OPS["in_range"](10, [1, 10]) is True


# --------------------------------------------------------------- resolve_ref
def test_resolve_prefers_attribute_ref():
    doc = norm("cisco_example")
    g = next(r for r in doc["resources"] if r["id"] == "global")
    assert resolve_ref(g, "cdp_enabled")["snippet"] == "cdp run"


def test_resolve_falls_through_to_resource_ref():
    doc = norm("cisco_example")
    vty = next(r for r in doc["resources"] if r["id"] == "vty-0-4")
    assert resolve_ref(vty, "access_class")["snippet"] == "line vty 0 4"


def test_resolve_returns_none_for_absent_feature():
    doc = norm("cisco_example")
    ssh = next(r for r in doc["resources"] if r["id"] == "ssh")
    assert resolve_ref(ssh, "version") is None


# ------------------------------------------------------------------- loading
@pytest.mark.parametrize("rules_path", [CISCO_RULES, AWS_RULES])
def test_rules_load(rules_path):
    """No hardcoded count - the ruleset grows as Deep adds rules."""
    rules = load_rules(rules_path)
    assert rules, "no rules loaded"
    assert all(r["check"]["operator"] in OPS for r in rules)
    assert len({r["id"] for r in rules}) == len(rules), "duplicate rule ids"


# ------------------------------------------------------- the acceptance test
@pytest.mark.parametrize("key,rules_path,report_path", [
    ("cisco_example", CISCO_RULES, "samples/sample_report.json"),
    ("terraform_example", AWS_RULES, "samples/sample_report_aws.json"),
])
def test_engine_reproduces_the_fixture(key, rules_path, report_path):
    want = report(report_path)["findings"]
    got = evaluate(norm(key), load_rules(rules_path))

    assert {f["rule_id"] for f in got} == {f["rule_id"] for f in want}, \
        "wrong set of rules fired"

    by = {f["rule_id"]: f for f in got}
    for w in want:
        assert by[w["rule_id"]] == w, f"{w['rule_id']} does not match the fixture"


def test_dedupe_by_rule():
    """Two vty_line resources both fail CIS-NET-001. Expect ONE finding."""
    got = evaluate(norm("cisco_example"), load_rules(CISCO_RULES))
    assert sum(f["rule_id"] == "CIS-NET-001" for f in got) == 1


@pytest.mark.parametrize("key,rules_path,report_path", [
    ("cisco_example", CISCO_RULES, "samples/sample_report.json"),
    ("terraform_example", AWS_RULES, "samples/sample_report_aws.json"),
])
def test_score(key, rules_path, report_path):
    """Compared against the fixture, not a hardcoded number. If this fails after
    a rule change, the fixture wasn't regenerated - run samples/build_fixtures*.py
    """
    rules = load_rules(rules_path)
    rep = report(report_path)
    got = score(evaluate(norm(key), rules), rules)
    assert got["compliance_score"] == rep["compliance_score"]
    assert got["score_breakdown"] == rep["score_breakdown"]
