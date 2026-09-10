
import json
from engine.rules.engine import load_rules, evaluate
from engine.parsers.cisco_ios import CiscoIOSParser

rules = load_rules("engine/rules/cisco_rules.yaml")
parser = CiscoIOSParser()
with open("tests/holdout/real_004.cfg", "r") as f:
    config_text = f.read()
normalized = parser.parse(config_text, "real_004.cfg")
findings = evaluate(normalized, rules)

for f in findings[:15]:
    print(f"{f['rule_id']} | {f['title']}")
