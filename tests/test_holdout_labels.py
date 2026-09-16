import json
import pathlib

from engine.rules.engine import load_rules

ROOT = pathlib.Path(__file__).resolve().parent.parent


def test_every_holdout_label_names_a_real_rule_or_null():
    ids = {r["id"] for r in load_rules(str(ROOT / "engine/rules/cisco_rules.yaml"))}
    for p in (ROOT / "tests/holdout").glob("*.expected.json"):
        data = json.loads(p.read_text(encoding="utf-8"))
        lines = (ROOT / "tests/holdout" / data["config"]).read_text(encoding="utf-8").splitlines()
        for issue in data["issues"]:
            assert "rule" in issue, f"{p.name}: {issue['note']} has no rule"
            assert issue["rule"] is None or issue["rule"] in ids, \
                f"{p.name}: {issue['rule']} is not a rule"
            assert 0 <= issue["line"] <= len(lines), \
                f"{p.name}: line {issue['line']} is outside {data['config']}"
