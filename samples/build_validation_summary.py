"""Generate engine/validation_summary.json by running chain validation.

Run from the repo root after changing chains, rules, or fixtures:

    python samples/build_validation_summary.py

The expected verdicts are imported from tests/test_attack_chains.py rather
than restated here, so the summary and the test cannot disagree. This file is
produced by running the engine - never hand-edit it, and never edit the JSON
to make it say "passed".
"""

import json
import pathlib
import subprocess
import sys
from datetime import datetime, timezone

sys.path.insert(0, ".")

from engine.audit import run_audit
from tests.test_attack_chains import EXPECTED

ROOT = pathlib.Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "samples"
OUT = ROOT / "engine" / "validation_summary.json"


def audit(stem):
    return run_audit((SAMPLES / f"{stem}.cfg").read_text(encoding="utf-8"), "cisco_ios")


def commit():
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, cwd=ROOT, timeout=10,
        ).stdout.strip() or None
    except Exception:
        return None


def pairs():
    """Positive stems paired with their negative, from the EXPECTED table."""
    for stem, (chain_id, _) in sorted(EXPECTED.items()):
        if chain_id is None:
            continue
        neg = stem[:-4] + "_neg" if stem.endswith("_pos") else None
        if neg and neg in EXPECTED:
            yield stem, neg


def check(pos_stem, neg_stem):
    chain_id, expected_findings = EXPECTED[pos_stem]

    pos_paths = audit(pos_stem)["attack_paths"]
    positive_ok = (
        [p["chain_id"] for p in pos_paths] == [chain_id]
        and pos_paths[0]["contributing_findings"] == expected_findings
    )

    neg_report = audit(neg_stem)
    negative_ok = neg_report["attack_paths"] == []

    fix_rule = name = None
    isolation_ok = False
    if pos_paths:
        fired = pos_paths[0]
        name = fired.get("name")
        fix_rule = (fired.get("break_chain") or {}).get("fix_rule")
        neg_ids = {f["rule_id"] for f in neg_report["findings"]}
        others = [r for r in fired["contributing_findings"] if r != fix_rule]
        # The named fix stopped firing and every other link did not: the only
        # difference between the pair is the recommended remediation.
        isolation_ok = fix_rule not in neg_ids and all(r in neg_ids for r in others)

    return {
        "chain_id": chain_id,
        "name": name,
        "positive_fixture": f"{pos_stem}.cfg",
        "negative_fixture": f"{neg_stem}.cfg",
        "break_chain_rule": fix_rule,
        "positive_fires_as_expected": positive_ok,
        "negative_does_not_fire": negative_ok,
        "break_chain_fix_isolated": isolation_ok,
    }


def main():
    chains = [check(p, n) for p, n in pairs()]
    if not chains:
        print("no positive/negative fixture pairs found")
        sys.exit(1)

    all_passed = all(
        c["positive_fires_as_expected"]
        and c["negative_does_not_fire"]
        and c["break_chain_fix_isolated"]
        for c in chains
    )

    summary = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "commit": commit(),
        "method": (
            "Each chain has a minimal positive fixture and a negative that "
            "applies that chain's break_chain fix and nothing else. Expected "
            "verdicts were recorded before the engine was run."
        ),
        "positive_fixtures": len(chains),
        "negative_fixtures": len(chains),
        "all_passed": all_passed,
        "chains": chains,
    }

    OUT.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    for c in chains:
        marks = "".join(
            "." if c[k] else "F"
            for k in ("positive_fires_as_expected", "negative_does_not_fire",
                      "break_chain_fix_isolated")
        )
        print(f"  {marks}  {c['chain_id']}")
    print(f"\nall_passed={all_passed}  ->  {OUT}")

    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
