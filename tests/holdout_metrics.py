"""Detection rate on hand-labelled configs we did not generate.

Each labelled issue names the rule that should catch it ("rule"), chosen from
the issue's note and the config line before the engine is run. "rule": null
means no rule implements that check yet; it counts as a miss.

Findings that match no label are reported as unlabelled. They have not been
reviewed, so this script makes no false-positive claim.

Run:  $env:PYTHONPATH = "."; python tests/holdout_metrics.py
"""
import json
import pathlib
import tempfile

from engine.audit import run_audit
from engine.parsers import learned

HOLDOUT = pathlib.Path("tests/holdout")


def main():
    # Measure the shipped engine, not whatever a demo session taught it.
    learned.MAPPINGS_PATH = pathlib.Path(tempfile.mkdtemp()) / "none.json"

    total = detected = at_line = unlabelled = configs = contributing = 0
    misses = []

    print(f"{'Config':<15} | {'Labelled':>8} | {'Detected':>8} | {'At line':>7} | {'Unlabelled':>10}")
    print("-" * 62)

    for cfg in sorted(HOLDOUT.glob("*.cfg")):
        exp = cfg.with_suffix(".expected.json")
        if not exp.exists():
            continue
        issues = json.loads(exp.read_text(encoding="utf-8"))["issues"]
        missing = [i for i in issues if "rule" not in i]
        if missing:
            raise SystemExit(f"{exp}: {len(missing)} issue(s) have no 'rule' field")

        configs += 1
        contributing += bool(issues)
        r = run_audit(cfg.read_text(encoding="utf-8"), "cisco_ios", cfg.name,
                      enrich=False, framework="CIS")

        fired = {}
        for f in r["findings"]:
            fired.setdefault(f["rule_id"], set()).add((f.get("raw_ref") or {}).get("line"))

        hit = hit_line = 0
        for i in issues:
            rule = i["rule"]
            if rule and rule in fired:
                hit += 1
                # line 0 means the setting is absent: any firing counts.
                if not i.get("line") or i["line"] in fired[rule]:
                    hit_line += 1
            else:
                why = "no rule implements this" if rule is None else f"{rule} did not fire"
                misses.append(f"{cfg.name:<14} {i['control']:<14} {i['note']}  ({why})")

        extra = len(set(fired) - {i["rule"] for i in issues if i["rule"]})
        total += len(issues)
        detected += hit
        at_line += hit_line
        unlabelled += extra
        print(f"{cfg.name:<15} | {len(issues):>8} | {hit:>8} | {hit_line:>7} | {extra:>10}")

    rate = detected / total * 100 if total else 0.0
    print(f"\nholdout configs       : {configs} ({contributing} with labelled issues)")
    print(f"labelled issues       : {total}")
    print(f"detected (rule fired) : {detected}  ({rate:.1f}%)")
    print(f"  at the labelled line: {at_line}")
    print(f"unlabelled rule hits  : {unlabelled}  (not reviewed: no false-positive claim)")
    print(f"\nmissed ({len(misses)}):")
    for m in misses:
        print(f"  {m}")


if __name__ == "__main__":
    main()
