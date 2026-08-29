#!/usr/bin/env python3
"""Which Saturday file is stale? Run from the repo root:  python diagnose.py"""
import json, sys, pathlib
try:
    import yaml
except ImportError:
    sys.exit("pip install pyyaml")

R = pathlib.Path(".")
ok = True

def check(name, cond, expected, actual):
    global ok
    ok &= bool(cond)
    print(f"  {'OK  ' if cond else 'STALE'}  {name:38} expected {expected}, got {actual}")

print("file fingerprints:")
try:
    cr = yaml.safe_load(open("engine/rules/cisco_rules.yaml", encoding="utf-8"))
    check("cisco_rules.yaml rule count", len(cr) == 20, 20, len(cr))
    bad = [r["id"] for r in cr if r["remediation"].endswith("\n")]
    check("cisco_rules.yaml trailing newlines", not bad, "none", bad or "none")
except Exception as e:
    print("  ERROR reading cisco_rules.yaml:", e); ok = False

try:
    ar = yaml.safe_load(open("engine/rules/aws_rules.yaml", encoding="utf-8"))
    check("aws_rules.yaml rule count", len(ar) == 18, 18, len(ar))
    bad = [r["id"] for r in ar if r["remediation"].endswith("\n")]
    check("aws_rules.yaml trailing newlines", not bad, "none", bad or "none")
    c3 = next((r for r in ar if r["id"] == "CIS-CLOUD-003"), None)
    attr = c3 and c3["check"]["attribute"]
    check("CIS-CLOUD-003 checks", attr == "is_wide_range", "is_wide_range", attr)
except Exception as e:
    print("  ERROR reading aws_rules.yaml:", e); ok = False

for path, score, nrules in [("samples/sample_report.json", 22, 20),
                            ("samples/sample_report_aws.json", 11, 18)]:
    try:
        rep = json.load(open(path, encoding="utf-8"))
        check(f"{pathlib.Path(path).name} score", rep["compliance_score"] == score,
              score, rep["compliance_score"])
        check(f"{pathlib.Path(path).name} rules_evaluated",
              rep["score_breakdown"]["rules_evaluated"] == nrules, nrules,
              rep["score_breakdown"]["rules_evaluated"])
    except Exception as e:
        print(f"  ERROR reading {path}:", e); ok = False

try:
    norm = json.load(open("samples/normalized_examples.json", encoding="utf-8"))
    sg = [r for r in norm["terraform_example"]["resources"] if r["type"] == "security_group_rule"]
    has = all("is_wide_range" in r["attributes"] for r in sg)
    check("normalized_examples is_wide_range", has, "present on all 3 sg rules",
          "present" if has else "MISSING")
except Exception as e:
    print("  ERROR reading normalized_examples.json:", e); ok = False

print()
if not ok:
    print("^ re-download the STALE file(s) and copy them in again.")
    sys.exit(1)

print("all files current. checking the engine against both fixtures:")
sys.path.insert(0, ".")
from engine.rules.engine import load_rules, evaluate

for key, rp, wp in [("cisco_example", "engine/rules/cisco_rules.yaml", "samples/sample_report.json"),
                    ("terraform_example", "engine/rules/aws_rules.yaml", "samples/sample_report_aws.json")]:
    norm = json.load(open("samples/normalized_examples.json", encoding="utf-8"))[key]
    got = {f["rule_id"]: f for f in evaluate(norm, load_rules(rp))}
    want = {f["rule_id"]: f for f in json.load(open(wp, encoding="utf-8"))["findings"]}
    diffs = [r for r in set(got) | set(want) if got.get(r) != want.get(r)]
    print(f"  {key:18} {len(got)}/{len(want)} findings, mismatches: {diffs or 'none'}")
    for rid in diffs[:2]:
        for k in (want.get(rid) or {}):
            g, w = (got.get(rid) or {}).get(k), want[rid][k]
            if g != w:
                print(f"    {rid} field {k!r}")
                print(f"      engine produced : {g!r}")
                print(f"      fixture expects : {w!r}")
