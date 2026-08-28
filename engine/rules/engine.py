"""Repo path: engine/rules/engine.py     Owner: Manas     Build: Sat 29 Aug

Loads YAML rules and evaluates them against a normalized document.

The operator table below is mechanical, so it's written for you. Everything
under "YOUR JOB" you write yourself — on the 7th you're the one explaining the
engine end to end, and this is the part judges probe. Use the acceptance test
(tests/test_rule_engine.py) as your spec: it fails now, it goes green when
you're done.
"""
import re

import yaml

from engine.schema.schema import resolve_ref

SEVERITY_WEIGHT = {"critical": 20, "high": 10, "medium": 5, "low": 2}

# =============================================================================
# Operators. `a` is the attribute value from the resource, `v` is the rule's
# expected value. The check describes the COMPLIANT state, so returning False
# means a finding is raised.
#
# THE RULE THAT MAKES ABSENCE DETECTION WORK: None fails every positive check.
# exec_timeout_minutes=None fails in_range [1,10]. version=None fails equals 2.
# That is how three findings in the cisco fixture get raised at all.
# =============================================================================
OPS = {
    "equals":       lambda a, v: a == v,
    "not_equals":   lambda a, v: a != v,
    "contains":     lambda a, v: a is not None and v in a,
    "not_contains": lambda a, v: a is None or v not in a,
    "in":           lambda a, v: a in v,
    "not_in":       lambda a, v: a not in v,
    "exists":       lambda a, v: a is not None,
    "not_exists":   lambda a, v: a is None,
    "gte":          lambda a, v: a is not None and a >= v,
    "lte":          lambda a, v: a is not None and a <= v,
    "in_range":     lambda a, v: a is not None and v[0] <= a <= v[1],
    "min_length":   lambda a, v: a is not None and len(a) >= v,
    "matches":      lambda a, v: a is not None and re.fullmatch(v, str(a)) is not None,
}


def load_rules(path: str) -> list[dict]:
    """Read a rules YAML file and fail loudly on anything malformed.

    Validate before returning: every rule needs id/title/applies_to/severity/
    check/remediation/explanation, severity must be a known key, and
    check.operator must be in OPS. A rule the engine silently skips is worse
    than one that crashes — Deep will never know it isn't running.
    """
    rules = yaml.safe_load(open(path))
    # TODO validate, then return
    return rules


# =============================================================================
# YOUR JOB — Sat 29 Aug
# =============================================================================

def _matches_when(resource: dict, when: dict | None) -> bool:
    """True if the rule's `when` filter applies to this resource.

    Every key in `when` must equal the resource's attribute of the same name.
    No `when` means the rule applies to every resource of the right type.
    """
    raise NotImplementedError


def _check_passes(resource: dict, check: dict) -> bool:
    """Evaluate one check against one resource using OPS."""
    raise NotImplementedError


def _to_finding(rule: dict, resource: dict) -> dict:
    """Build a finding dict matching samples/sample_report.json.

    Two field renames that will cost you 20 minutes if you miss them:
        rule["id"]          -> finding["rule_id"]
        rule["remediation"] -> finding["remediation_template"]

    raw_ref comes from resolve_ref(resource, rule["check"]["attribute"]).
    Never compute a line number here.
    """
    raise NotImplementedError


def evaluate(doc: dict, rules: list[dict]) -> list[dict]:
    """Run every rule against the document and return findings.

    For each rule: select resources whose type == applies_to, drop those failing
    the `when` filter, evaluate `check`, collect failures.

    Then dedupe. Default is `by_rule`: one finding per rule even when several
    resources fail, resource_id taken from the first match. `per_resource`
    emits one per failing resource.

    The cisco fixture has two vty_line resources that both fail CIS-NET-001 and
    expects ONE finding. If you get two, dedupe is the bug.
    """
    raise NotImplementedError


def score(findings: list[dict], rules: list[dict]) -> dict:
    """Compliance score + breakdown, matching sample_report.json.

        100 * (1 - failed_weight / total_weight)

    total_weight sums the severity weight of EVERY rule loaded, not just the
    failing ones. That is what stops the score flooring at zero.
    Returns {"compliance_score": int, "score_breakdown": {...}}.
    """
    raise NotImplementedError


if __name__ == "__main__":
    import json
    import sys

    doc = json.load(open(sys.argv[1]))
    rules = load_rules(sys.argv[2])
    fs = evaluate(doc, rules)
    print(json.dumps({**score(fs, rules), "findings": fs}, indent=2))
