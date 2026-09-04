
"""Detection rate against configs we did not generate.

tests/metrics.py measures rule correctness against seeded mutations.
This measures coverage against real-world configurations we had never seen,
hand-labelled before the auditor was run on them.
"""

import json
import pathlib
import sys
from engine.rules.engine import load_rules, evaluate
from engine.parsers.cisco_ios import CiscoIOSParser

# Mapping from CIS Control (Label) to our Rule ID
CIS_TO_RULE = {
    "CIS 1.1.1": "CIS-NET-007",   # Privilege 15 / Enable Secret
    "CIS 1.1.4": "CIS-NET-011",   # VTY login/auth
    "CIS 1.2.1": "CIS-NET-014",   # HTTP Server
    "CIS 1.2.2": "CIS-NET-016",   # Transport input SSH
    "CIS 1.2.8": "CIS-NET-023",   # Exec-timeout
    "CIS 1.3.1": "CIS-NET-024",   # Login banner
    "CIS 1.3.3": "CIS-NET-025",   # MOTD banner
    "CIS 1.4.2": "CIS-NET-026",   # Password encryption
    "CIS 1.5.2": "CIS-NET-022",   # SNMP Communities
    "CIS 1.5.4": "CIS-NET-022",   # SNMP RW
    "CIS 2.1.2": "CIS-NET-027",   # CDP Run
    "CIS 2.3.1": "CIS-NET-028",   # NTP Authenticate
    "CIS 3.1.2": "CIS-NET-029",   # Proxy-ARP
}

def run_holdout_audit():
    holdout_dir = pathlib.Path("tests/holdout")
    configs = sorted(list(holdout_dir.glob("*.cfg")))
    
    # Load the rules once
    rules_path = "engine/rules/cisco_rules.yaml"
    rules = load_rules(rules_path)
    
    total_labelled = 0
    total_detected = 0
    false_positives = 0
    missed_list = []

    print(f"{'Config':<15} | {'Labelled':<10} | {'Detected':<10} | {'FPs':<5}")
    print("-" * 50)

    for cfg_path in configs:
        name = cfg_path.name
        expected_path = cfg_path.with_suffix(".expected.json")
        
        if not expected_path.exists():
            continue

        # 1. Load Hand-Labels
        with open(expected_path, "r") as f:
            expected = json.load(f)
        
        labelled_controls = [i["control"] for i in expected["issues"]]
        total_labelled += len(labelled_controls)

        # 2. Run Auditor
        with open(cfg_path, "r") as f:
            config_text = f.read()
        
        parser = CiscoIOSParser()
        normalized = parser.parse(config_text, name)
        findings = evaluate(normalized, rules)
        
        # 3. Compare
        detected_rule_ids = {f["rule_id"] for f in findings}
        expected_rule_ids = {CIS_TO_RULE.get(c) for c in labelled_controls if CIS_TO_RULE.get(c)}
        
        found_count = 0
        for rid in expected_rule_ids:
            if rid in detected_rule_ids:
                found_count += 1
            else:
                for c in labelled_controls:
                    if CIS_TO_RULE.get(c) == rid:
                        missed_list.append(f"{name:<12} {c:<12} (Missing Rule: {rid})")

        total_detected += found_count
        
        fps = 0
        for f in findings:
            if f["rule_id"] not in expected_rule_ids:
                fps += 1
        
        false_positives += fps
        print(f"{name:<15} | {len(labelled_controls):<10} | {found_count:<10} | {fps:<5}")

    rate = (total_detected / total_labelled * 100) if total_labelled > 0 else 0
    
    print("\n" + "="*30)
    print("HOLDOUT VALIDATION SUMMARY")
    print("="*30)
    print(f"Holdout configs   : {len(configs)}")
    print(f"Issues labelled    : {total_labelled}")
    print(f"Detected           : {total_detected}")
    print(f"Missed             : {total_labelled - total_detected}")
    print(f"Detection rate     : {rate:.1f}%")
    print(f"False positives    : {false_positives}")
    print("\nMissed Breakdown:")
    for m in missed_list:
        print(f"  {m}")

if __name__ == "__main__":
    run_holdout_audit()
