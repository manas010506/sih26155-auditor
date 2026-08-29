import yaml
import os

def move_rules(source_path, backlog_path, rules_to_move):
    with open(source_path, 'r', encoding='utf-8') as f:
        all_rules = yaml.safe_load(f)
    
    if not all_rules:
        return 0

    staying = [r for r in all_rules if r['id'] not in rules_to_move]
    moving = [r for r in all_rules if r['id'] in rules_to_move]
    
    header = "# Rules that are correct but cannot run yet: no parser emits the resource types\n# they inspect. Do not load these. They exist so the coverage table can show\n# them as \"written, pending parser support\".\n\n"
    
    with open(source_path, 'w', encoding='utf-8') as f:
        yaml.dump(staying, f, sort_keys=False)
        
    with open(backlog_path, 'w', encoding='utf-8') as f:
        f.write(header)
        yaml.dump(moving, f, sort_keys=False)
        
    return len(moving)

# AWS Rules to move
aws_move = [
    'AWS-EFS-001', 'AWS-IAM-001', 'AWS-IAM-002', 'AWS-IAM-003', 
    'AWS-IAM-004', 'AWS-IAM-005', 'AWS-IAM-006', 'AWS-IAM-007', 
    'AWS-IAM-008', 'AWS-IAM-010', 'AWS-IAM-011', 'AWS-IAM-012', 
    'AWS-IAM-013', 'AWS-LOG-003', 'AWS-NET-001', 'AWS-NET-002', 
    'AWS-NET-003', 'AWS-NET-004'
]

# Cisco Rules to move
cisco_move = ['CIS-NET-035', 'CIS-NET-036']

aws_path = 'engine/rules/aws_rules.yaml'
cisco_path = 'engine/rules/cisco_rules.yaml'
aws_backlog = 'engine/rules/backlog/aws_pending.yaml'
cisco_backlog = 'engine/rules/backlog/cisco_pending.yaml'

aws_count = move_rules(aws_path, aws_backlog, aws_move)
cisco_count = move_rules(cisco_path, cisco_backlog, cisco_move)

print(f"Moved {aws_count} AWS rules and {cisco_count} Cisco rules to backlog.")
