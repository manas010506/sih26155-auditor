
import json
from engine.rules.engine import load_rules, evaluate
from engine.parsers.cisco_ios import CiscoIOSParser

rules = load_rules("engine/rules/nist_rules.yaml")
parser = CiscoIOSParser()
with open("tests/holdout/real_002.cfg", "r") as f:
    config_text = f.read()
normalized = parser.parse(config_text, "real_002.cfg")
findings = evaluate(normalized, rules)
print(json.dumps(findings, indent=2))
