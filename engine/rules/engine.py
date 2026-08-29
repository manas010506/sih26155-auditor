"""Repo path: engine/rules/engine.py     Owner: Manas

Loads YAML rules and evaluates them against a normalized document.

The flow, end to end:
    rule (YAML)  +  resource (normalized schema)
      -> does this rule apply?          _matches_when
      -> does the resource satisfy it?  _check_passes
      -> if not, build a finding        _to_finding
      -> collect, dedupe                evaluate
      -> weight and score               score

No check logic lives in this file. Every condition comes from YAML, which is
what makes the ruleset extensible without a code change.
"""
import re

import yaml

from engine.schema.schema import resolve_ref

SEVERITY_WEIGHT = {"critical": 20, "high": 10, "medium": 5, "low": 2}

REQUIRED_FIELDS = ("id", "title", "applies_to", "severity",
                   "cis_control", "check", "remediation", "explanation")

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


class RuleError(ValueError):
    """A rule file the engine refuses to load."""


def load_rules(path: str) -> list[dict]:
    """Read a rules YAML file and fail loudly on anything malformed.

    A rule the engine silently skips is worse than one that crashes: Deep would
    never know it wasn't running, and the metrics would quietly under-count.
    """
    rules = yaml.safe_load(open(path, encoding="utf-8"))
    if not isinstance(rules, list):
        raise RuleError(f"{path}: expected a list of rules")

    seen = set()
    for i, rule in enumerate(rules):
        where = rule.get("id", f"rule #{i + 1}") if isinstance(rule, dict) else f"rule #{i + 1}"
        if not isinstance(rule, dict):
            raise RuleError(f"{path}: {where} is not a mapping")

        missing = [f for f in REQUIRED_FIELDS if f not in rule]
        if missing:
            raise RuleError(f"{path}: {where} is missing {', '.join(missing)}")

        if rule["id"] in seen:
            raise RuleError(f"{path}: duplicate rule id {rule['id']}")
        seen.add(rule["id"])

        if rule["severity"] not in SEVERITY_WEIGHT:
            raise RuleError(f"{path}: {where} has severity {rule['severity']!r}; "
                            f"expected one of {sorted(SEVERITY_WEIGHT)}")

        check = rule["check"]
        if not isinstance(check, dict) or "attribute" not in check or "operator" not in check:
            raise RuleError(f"{path}: {where} check needs both attribute and operator")
        if check["operator"] not in OPS:
            raise RuleError(f"{path}: {where} uses unknown operator "
                            f"{check['operator']!r}; expected one of {sorted(OPS)}")

        if rule.get("dedupe", "by_rule") not in ("by_rule", "per_resource"):
            raise RuleError(f"{path}: {where} dedupe must be by_rule or per_resource")

    return rules


def _matches_when(resource: dict, when: dict | None) -> bool:
    """True if the rule's `when` filter applies to this resource.

    No filter means the rule applies to every resource of the right type.
    Otherwise every key in `when` must equal the attribute of the same name.
    """
    if not when:
        return True
    attrs = resource["attributes"]
    return all(attrs.get(key) == value for key, value in when.items())


def _check_passes(resource: dict, check: dict) -> bool:
    """Evaluate one check against one resource using OPS.

    .get() on both sides is deliberate: the attribute may be legitimately
    absent, and exists/not_exists rules carry no `value` key at all.
    """
    actual = resource["attributes"].get(check["attribute"])
    operator = OPS[check["operator"]]
    return operator(actual, check.get("value"))


def _to_finding(rule: dict, resource: dict) -> dict:
    """Build a finding matching samples/sample_report.json.

    raw_ref is resolved, never constructed. resolve_ref() prefers the line
    recorded for this specific attribute and falls back to the resource's own
    anchor, so a finding about cdp_enabled points at `cdp run` rather than at
    the hostname line.
    """
    return {
        "rule_id": rule["id"],
        "title": rule["title"],
        "severity": rule["severity"],
        "resource_id": resource["id"],
        "raw_ref": resolve_ref(resource, rule["check"]["attribute"]),
        "cis_control": rule["cis_control"],
        "remediation_template": rule["remediation"],
        "explanation": rule["explanation"],
    }


def evaluate(doc: dict, rules: list[dict]) -> list[dict]:
    """Run every rule against the document and return findings."""
    findings = []

    for rule in rules:
        matching = [r for r in doc["resources"]
                    if r["type"] == rule["applies_to"]
                    and _matches_when(r, rule.get("when"))]

        failing = [r for r in matching if not _check_passes(r, rule["check"])]
        if not failing:
            continue

        # by_rule: the misconfiguration is a property of the device, so report
        # it once and point at the first instance. per_resource: the operator
        # needs every instance listed separately.
        if rule.get("dedupe", "by_rule") == "by_rule":
            findings.append(_to_finding(rule, failing[0]))
        else:
            findings.extend(_to_finding(rule, r) for r in failing)

    return findings


def score(findings: list[dict], rules: list[dict]) -> dict:
    """Compliance score and the arithmetic behind it.

        100 * (1 - failed_weight / total_weight)

    total_weight sums EVERY rule loaded, not just the failing ones. Summing
    only failures makes the ratio 1 and the score 0 on every input.
    """
    failed_weight = sum(SEVERITY_WEIGHT[f["severity"]] for f in findings)
    total_weight = sum(SEVERITY_WEIGHT[r["severity"]] for r in rules)

    if total_weight == 0:
        raise RuleError("cannot score against an empty ruleset")

    return {
        "compliance_score": round(100 * (1 - failed_weight / total_weight)),
        "score_breakdown": {
            "formula": "100 * (1 - failed_weight / total_weight)",
            "severity_weights": SEVERITY_WEIGHT,
            "rules_evaluated": len(rules),
            "rules_failed": len(findings),
            "failed_weight": failed_weight,
            "total_weight": total_weight,
        },
    }


if __name__ == "__main__":
    import json
    import sys

    doc = json.load(open(sys.argv[1], encoding="utf-8"))
    rules = load_rules(sys.argv[2])
    fs = evaluate(doc, rules)
    print(json.dumps({**score(fs, rules), "findings": fs}, indent=2))