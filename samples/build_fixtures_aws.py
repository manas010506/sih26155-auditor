"""Generate the Terraform/AWS fixtures from main.tf so every raw_ref line
number is real. Run from the repo root after editing main.tf.

    python samples/build_fixtures_aws.py
"""
import json
import pathlib

TF = pathlib.Path("samples/main.tf")
lines = TF.read_text().splitlines()


def ln(needle, occurrence=1):
    hits = [i + 1 for i, l in enumerate(lines) if l.strip() == needle]
    if len(hits) < occurrence:
        raise SystemExit(f"NOT FOUND in main.tf: {needle!r} (occurrence {occurrence})")
    return hits[occurrence - 1]


def ref(needle, occurrence=1):
    return {"line": ln(needle, occurrence), "snippet": needle}


# ---------------------------------------------------------------- normalized
# The normalized document is produced BY THE PARSER, not hand-written. Add an
# attribute to the parser and the fixture follows on the next run.
# verify.py independently checks every raw_ref line number against the raw
# config text, so this is a regression fixture, not a circular one.
import sys as _sys
_sys.path.insert(0, ".")
from engine.parsers.terraform_aws import TerraformAWSParser as _Parser

normalized = _Parser().parse(
    pathlib.Path('samples/main.tf').read_text(encoding="utf-8"), 'main.tf')

# The fixture follows the parser, so guard against a parser that silently stops
# emitting something. If this fires, the parser regressed - do not "fix" it by
# editing the list.
_EXPECTED_IDS = {"s3-sensitive_data", "s3-app_logs",
                "sg-web-ingress-22", "sg-web-ingress-3389", "sg-web-ingress-0-65535",
                "iam-app_policy", "rds-app_db", "kms-app_key", "cloudtrail-main"}
_got_ids = {r["id"] for r in normalized["resources"]}
if _got_ids != _EXPECTED_IDS:
    raise SystemExit(
        f"parser produced the wrong resource set.\n"
        f"  missing: {sorted(_EXPECTED_IDS - _got_ids) or 'none'}\n"
        f"  extra  : {sorted(_got_ids - _EXPECTED_IDS) or 'none'}")


# ------------------------------------------------------------------ findings
# Findings are produced BY THE ENGINE, not hand-listed. The fixture is therefore
# engine output by construction: add a rule, re-run this, the fixture follows.
# verify.py independently checks the line numbers, cross-references and score
# arithmetic against the raw config, so this is not circular.
import sys as _sys
_sys.path.insert(0, ".")
from engine.rules.engine import load_rules as _load_rules, evaluate as _evaluate, score as _score

_RULES = _load_rules('engine/rules/aws_rules.yaml')
_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
F = sorted(_evaluate(normalized, _RULES), key=lambda f: (_ORDER[f["severity"]], f["rule_id"]))

# Attack paths come from the correlator, not a hardcoded list. If a chain
# definition is missing from attack_chains.yaml, this drops to 0 and the gap
# is visible instead of being papered over by the fixture.
from engine.correlation.correlator import correlate as _correlate
PATHS = _correlate(F, "engine/correlation/attack_chains.yaml")

# --------------------------------------------------------------- attack paths
# ---------------------------------------------------------------------- rules
# The rules YAML is the SINGLE SOURCE OF TRUTH for a finding's text. We only
# compute rule_id / resource_id / raw_ref here; everything else is copied from
# the rule so the two files can never drift apart again.
import yaml as _yaml

def _apply_rules(findings, rules_path):
    rules = {r["id"]: r for r in _yaml.safe_load(open(rules_path))}
    for f in findings:
        r = rules[f["rule_id"]]
        f["title"] = r["title"]
        f["severity"] = r["severity"]
        f["cis_control"] = r["cis_control"]
        f["remediation_template"] = r["remediation"]
        f["explanation"] = r["explanation"]
    return findings

F = _apply_rules(F, 'engine/rules/aws_rules.yaml')

# ---------------------------------------------------------------------- score
_SCORE = _score(F, _RULES)
score = _SCORE["compliance_score"]

report = {
    "source": {"type": "terraform_aws", "filename": "main.tf"},
    "device": {
        "hostname": "aws-account-prod",
        "vendor": "aws",
        "os": "terraform",
        "version": "provider ~> 5.0",
        "role": "cloud_account",
    },
    "compliance_score": score,
    "score_breakdown": _SCORE["score_breakdown"],
    "findings": F,
    "attack_paths": PATHS,
}

# merge terraform_example into the existing normalized_examples.json
NE = pathlib.Path("samples/normalized_examples.json")
existing = json.loads(NE.read_text()) if NE.exists() else {}
existing["terraform_example"] = normalized
NE.write_text(json.dumps(existing, indent=2) + "\n")

pathlib.Path("samples/sample_report_aws.json").write_text(json.dumps(report, indent=2) + "\n")

print(f"score={score}  findings={len(F)}  paths={len(PATHS)}  rules={len(_RULES)}")
by = {}
for f in F:
    by[f["severity"]] = by.get(f["severity"], 0) + 1
print("severity spread:", by)
print("null raw_ref:", [f["rule_id"] for f in F if f["raw_ref"] is None])
print("normalized_examples.json keys:", sorted(existing))
