#!/usr/bin/env python3
"""SIH26155 repo self-check. Run from the repo root before every push:

    python verify.py

Checks that the fixtures and the rules still agree with each other. Catches
contract drift on the day it happens instead of on integration day.
Exit code 0 = clean.
"""
import json
import pathlib
import sys

try:
    import yaml
except ImportError:
    sys.exit("pip install PyYAML")

ROOT = pathlib.Path(__file__).parent
problems: list[str] = []
notes: list[str] = []
W = {"critical": 20, "high": 10, "medium": 5, "low": 2}


def fail(msg):
    problems.append(msg)


def load_json(rel):
    p = ROOT / rel
    if not p.exists():
        fail(f"missing file: {rel}")
        return None
    try:
        return json.loads(p.read_text())
    except json.JSONDecodeError as e:
        fail(f"{rel} is not valid JSON: {e}")
        return None


def load_yaml(rel):
    p = ROOT / rel
    if not p.exists():
        fail(f"missing file: {rel}")
        return None
    try:
        return yaml.safe_load(p.read_text())
    except yaml.YAMLError as e:
        fail(f"{rel} is not valid YAML: {e}")
        return None


def check_pair(cfg_rel, norm_key, report_rel, rules_rel, label):
    cfg_path = ROOT / cfg_rel
    if not cfg_path.exists():
        fail(f"missing file: {cfg_rel}")
        return
    lines = cfg_path.read_text().splitlines()

    norm_all = load_json("samples/normalized_examples.json")
    report = load_json(report_rel)
    rules = load_yaml(rules_rel)
    if not (norm_all and report and rules):
        return
    if norm_key not in norm_all:
        fail(f"normalized_examples.json is missing '{norm_key}' "
             f"(did a build_fixtures script overwrite instead of merge?)")
        return
    norm = norm_all[norm_key]

    # 1. every raw_ref line number matches the actual config text
    for f in report["findings"]:
        r = f.get("raw_ref")
        if r is None:
            continue
        n = r["line"]
        if not (1 <= n <= len(lines)):
            fail(f"[{label}] {f['rule_id']} raw_ref.line {n} out of range")
        elif lines[n - 1].strip() != r["snippet"]:
            fail(f"[{label}] {f['rule_id']} raw_ref.line {n} says "
                 f"{r['snippet']!r} but the file has {lines[n-1].strip()!r}")

    for res in norm["resources"]:
        r = res.get("raw_ref")
        if r and lines[r["line"] - 1].strip() != r["snippet"]:
            fail(f"[{label}] resource {res['id']} raw_ref does not match the config")

    # 2. cross-references resolve
    res_ids = {r["id"] for r in norm["resources"]}
    for f in report["findings"]:
        if f["resource_id"] not in res_ids:
            fail(f"[{label}] {f['rule_id']} points at unknown resource "
                 f"{f['resource_id']!r}")

    found = {f["rule_id"] for f in report["findings"]}
    for p in report["attack_paths"]:
        for c in p["contributing_findings"]:
            if c not in found:
                fail(f"[{label}] chain {p['chain_id']} references unknown finding {c}")
        if p["break_chain"]["fix_rule"] not in p["contributing_findings"]:
            fail(f"[{label}] chain {p['chain_id']} fix_rule is not in its own chain")

    # 3. rules and report agree
    rule_by_id = {r["id"]: r for r in rules}
    for f in report["findings"]:
        rid = f["rule_id"]
        if rid not in rule_by_id:
            fail(f"[{label}] {rid} is in the report but not in {rules_rel}")
        elif rule_by_id[rid]["severity"] != f["severity"]:
            fail(f"[{label}] {rid} severity differs: rules say "
                 f"{rule_by_id[rid]['severity']}, report says {f['severity']}")

    # 4. every rule's applies_to exists in the schema
    try:
        sys.path.insert(0, str(ROOT))
        from engine.schema.schema import RESOURCE_TYPES
        for r in rules:
            if r["applies_to"] not in RESOURCE_TYPES:
                fail(f"[{label}] rule {r['id']} applies_to {r['applies_to']!r}, "
                     f"which is not in schema.RESOURCE_TYPES")
    except Exception as e:
        notes.append(f"[{label}] could not import schema.RESOURCE_TYPES ({e})")

    # 5. the score actually follows from the weights
    sb = report.get("score_breakdown")
    if sb:
        fw = sum(W[f["severity"]] for f in report["findings"])
        if fw != sb["failed_weight"]:
            fail(f"[{label}] failed_weight is {sb['failed_weight']} but the "
                 f"findings add up to {fw}")
        expected = round(100 * (1 - sb["failed_weight"] / sb["total_weight"]))
        if expected != report["compliance_score"]:
            fail(f"[{label}] compliance_score is {report['compliance_score']} "
                 f"but the formula gives {expected}")
        if sb["rules_failed"] != len(report["findings"]):
            fail(f"[{label}] rules_failed is {sb['rules_failed']} but there are "
                 f"{len(report['findings'])} findings")

    # 6. schema validation
    try:
        from engine.schema.schema import validate
        for e in validate(norm):
            fail(f"[{label}] schema: {e}")
    except Exception as e:
        notes.append(f"[{label}] could not run schema.validate ({e})")

    sev = {}
    for f in report["findings"]:
        sev[f["severity"]] = sev.get(f["severity"], 0) + 1
    print(f"  {label:9} {len(report['findings']):>2} findings  "
          f"{len(report['attack_paths'])} paths  score {report['compliance_score']:>3}  "
          f"{sev}")


def check_secrets():
    gi = ROOT / ".gitignore"
    if not gi.exists() or ".env" not in gi.read_text():
        fail(".gitignore does not exclude .env — an API key will get committed")
    for env in ROOT.rglob(".env"):
        if "node_modules" not in str(env):
            notes.append(f"found {env.relative_to(ROOT)} — confirm it is gitignored")


def main():
    print("fixtures:")
    check_pair("samples/sample_cisco_ios.cfg", "cisco_example",
               "samples/sample_report.json", "engine/rules/cisco_rules.yaml", "cisco")
    if (ROOT / "samples/main.tf").exists():
        check_pair("samples/main.tf", "terraform_example",
                   "samples/sample_report_aws.json", "engine/rules/aws_rules.yaml", "aws")
    else:
        notes.append("samples/main.tf not present — terraform side skipped")

    check_secrets()

    print()
    for n in notes:
        print("note:", n)
    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for p in problems:
            print("  -", p)
        return 1
    print("\nall checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
