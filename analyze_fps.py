
import json
import pathlib
import sys

# Add current dir to path to import engine
sys.path.insert(0, '.')
from engine.parsers.cisco_ios import CiscoIOSParser
from engine.rules.engine import load_rules, evaluate

CORPUS = pathlib.Path('tests/corpus')
EXPECTED = pathlib.Path('tests/expected')
RULES_PATH = 'engine/rules/cisco_rules.yaml'

rules = load_rules(RULES_PATH)
parser = CiscoIOSParser()
fp_counts = {}

for cfg_file in CORPUS.glob('*.cfg'):
    name = cfg_file.stem
    config_text = cfg_file.read_text()
    doc = parser.parse(config_text, name)
    findings = evaluate(doc, rules)
    found_ids = {f['rule_id'] for f in findings}
    
    exp_file = EXPECTED / f"{name}.json"
    if exp_file.exists():
        exp_data = json.loads(exp_file.read_text())
        expected_ids = set(exp_data.get('expected_rule_ids', []))
        fps = found_ids - expected_ids
        for rid in fps:
            fp_counts[rid] = fp_counts.get(rid, 0) + 1

print('False Positive Breakdown:')
for rid, count in sorted(fp_counts.items(), key=lambda x: x[1], reverse=True):
    print(f'{rid}: {count}')
print(f'Total FPs: {sum(fp_counts.values())}')
