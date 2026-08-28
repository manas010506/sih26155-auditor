"""Repo path: tests/metrics.py     Owner: Deep

Produces the number that goes on the slide. It has to be real.

Run:  python tests/metrics.py
"""
import json
import pathlib

from engine.audit import run_audit

HERE = pathlib.Path(__file__).parent
CORPUS, EXPECTED = HERE / "corpus", HERE / "expected"


def main():
    tp = fn = fp = 0
    clean_fp = 0
    per_rule = {}

    for exp_path in sorted(EXPECTED.glob("*.json")):
        exp = json.loads(exp_path.read_text())
        cfg = (CORPUS / exp["config"]).read_text()
        report = run_audit(cfg, "cisco_ios")

        found = {f["rule_id"] for f in report["findings"]}
        want = set(exp["expected_rule_ids"])

        tp += len(found & want)
        fn += len(want - found)
        fp += len(found - want)
        if not want:
            clean_fp += len(found)

        for rid in want:
            hit, miss = per_rule.setdefault(rid, [0, 0])
            per_rule[rid] = [hit + (rid in found), miss + (rid not in found)]

    total = tp + fn
    rate = 100 * tp / total if total else 0
    configs = len(list(CORPUS.glob("*.cfg")))

    print(f"configs            : {configs}")
    print(f"seeded misconfigs  : {total}")
    print(f"detected           : {tp}")
    print(f"missed             : {fn}")
    print(f"detection rate     : {rate:.1f}%")
    print(f"false positives    : {fp}  (on clean baseline: {clean_fp})")
    print()
    print("THE SLIDE LINE:")
    print(f'  "Caught {rate:.0f}% of {total} seeded misconfigurations across '
          f'{configs} configs, with {fp} false positives."')
    print()
    weak = [r for r, (h, m) in sorted(per_rule.items()) if m]
    if weak:
        print("rules with misses (fix these first):", ", ".join(weak))


if __name__ == "__main__":
    main()
