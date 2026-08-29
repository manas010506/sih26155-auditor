"""Generate the Terraform/AWS fixtures from main.tf so every raw_ref line
number is real. Run from the repo root after editing main.tf.

    python samples/build_fixtures_aws.py
"""
import json
import pathlib

TF = pathlib.Path("samples/main.tf")
lines = TF.read_text().splitlines()


def ln(needle, occurrence=1):
    hits = [i + 1 for i, l in enumerate(lines) if l.strip() == needle]
    if len(hits) < occurrence:
        raise SystemExit(f"NOT FOUND in main.tf: {needle!r} (occurrence {occurrence})")
    return hits[occurrence - 1]


def ref(needle, occurrence=1):
    return {"line": ln(needle, occurrence), "snippet": needle}


# ---------------------------------------------------------------- normalized
normalized = {
    "source": {"type": "terraform_aws", "filename": "main.tf"},
    "resources": [
        {
            "id": "s3-sensitive_data",
            "type": "s3_bucket",
            "attributes": {
                "name": "corp-sensitive-data-prod",
                "acl": "public-read",
                "public_access_block": False,
                "encrypted": False,
                "sse_algorithm": None,
                "versioning": False,
                "access_logging": False,
            },
            # raw_ref is null: the absence findings (no public access block, no
            # encryption, no versioning, no logging) must resolve to null, and
            # only `acl` has a line of its own.
            "attribute_refs": {"acl": ref('acl    = "public-read"')},
            "raw_ref": None,
        },
        {
            "id": "s3-app_logs",
            "type": "s3_bucket",
            "attributes": {
                "name": "corp-app-logs-prod",
                "acl": None,
                "public_access_block": False,
                "encrypted": True,
                "sse_algorithm": "AES256",
                "versioning": True,
                "access_logging": False,
            },
            "attribute_refs": {
                "name": ref('bucket = "corp-app-logs-prod"'),
                "sse_algorithm": ref('sse_algorithm = "AES256"'),
            },
            "raw_ref": None,
        },
        {
            "id": "sg-web-ingress-22",
            "type": "security_group_rule",
            "attributes": {
                "group": "web-tier-sg",
                "direction": "ingress",
                "protocol": "tcp",
                "from_port": 22,
                "to_port": 22,
                "cidr_blocks": ["0.0.0.0/0"],
                "open_to_internet": True,
                "is_wide_range": False,
            },
            "raw_ref": ref('description = "SSH from anywhere"'),
        },
        {
            "id": "sg-web-ingress-3389",
            "type": "security_group_rule",
            "attributes": {
                "group": "web-tier-sg",
                "direction": "ingress",
                "protocol": "tcp",
                "from_port": 3389,
                "to_port": 3389,
                "cidr_blocks": ["0.0.0.0/0"],
                "open_to_internet": True,
                "is_wide_range": False,
            },
            "raw_ref": ref('description = "RDP from anywhere"'),
        },
        {
            "id": "sg-web-ingress-0-65535",
            "type": "security_group_rule",
            "attributes": {
                "group": "web-tier-sg",
                "direction": "ingress",
                "protocol": "tcp",
                "from_port": 0,
                "to_port": 65535,
                "cidr_blocks": ["0.0.0.0/0"],
                "open_to_internet": True,
                "is_wide_range": True,
            },
            "raw_ref": ref('description = "Temporary debug access"'),
        },
        {
            "id": "iam-app_policy",
            "type": "iam_policy",
            "attributes": {
                "name": "app-runtime-policy",
                "wildcard_action": True,
                "wildcard_resource": True,
                "wildcard_principal": False,
                "statement_count": 1,
            },
            "attribute_refs": {
                "wildcard_action": ref('Action   = "*"'),
                "wildcard_resource": ref('Resource = "*"'),
            },
            "raw_ref": ref('Action   = "*"'),
        },
        {
            "id": "rds-app_db",
            "type": "rds_instance",
            "attributes": {
                "identifier": "app-db-prod",
                "engine": "postgres",
                "publicly_accessible": True,
                "storage_encrypted": False,
                "backup_retention_days": 1,
                "deletion_protection": True,
                "auto_minor_version_upgrade": True,
            },
            "attribute_refs": {
                "publicly_accessible": ref("publicly_accessible        = true"),
                "storage_encrypted": ref("storage_encrypted          = false"),
                "backup_retention_days": ref("backup_retention_period    = 1"),
                "deletion_protection": ref("deletion_protection        = true"),
                "auto_minor_version_upgrade": ref("auto_minor_version_upgrade = true"),
            },
            "raw_ref": ref("publicly_accessible        = true"),
        },
        {
            "id": "kms-app_key",
            "type": "kms_key",
            "attributes": {"description": "Application data key", "key_rotation": False},
            "attribute_refs": {"key_rotation": ref("enable_key_rotation = false")},
            "raw_ref": ref("enable_key_rotation = false"),
        },
        {
            "id": "cloudtrail-main",
            "type": "cloudtrail",
            "attributes": {
                "name": "corp-trail",
                "exists": True,
                "multi_region": False,
                "log_file_validation": False,
                "global_service_events": True,
            },
            # two rules read two different attributes of the same resource -
            # this is exactly the case attribute_refs exists for.
            "attribute_refs": {
                "exists": ref('name                          = "corp-trail"'),
                "multi_region": ref("is_multi_region_trail         = false"),
                "log_file_validation": ref("enable_log_file_validation    = false"),
            },
            "raw_ref": ref("is_multi_region_trail         = false"),
        },
    ],
    "_unparsed": [],
}

# ------------------------------------------------------------------ findings
# Findings are produced BY THE ENGINE, not hand-listed. The fixture is therefore
# engine output by construction: add a rule, re-run this, the fixture follows.
# verify.py independently checks the line numbers, cross-references and score
# arithmetic against the raw config, so this is not circular.
import sys as _sys
_sys.path.insert(0, ".")
from engine.rules.engine import load_rules as _load_rules, evaluate as _evaluate, score as _score

_RULES = _load_rules('engine/rules/aws_rules.yaml')
_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
F = sorted(_evaluate(normalized, _RULES), key=lambda f: (_ORDER[f["severity"]], f["rule_id"]))

# --------------------------------------------------------------- attack paths
PATHS = [
    {
        "chain_id": "CHAIN-CLOUD-PRIVESC",
        "name": "Internet-to-admin privilege escalation",
        "severity": "critical",
        "contributing_findings": ["CIS-CLOUD-001", "CIS-CLOUD-003", "CIS-CLOUD-009"],
        "narrative": "The security group exposes SSH and every other TCP port to the internet, so an instance in this group is reachable and brute-forceable from anywhere. Any workload on that instance carries an IAM policy granting Action \"*\" on Resource \"*\", so a single foothold becomes full account administration rather than one compromised host.",
        "break_chain": {
            "fix_rule": "CIS-CLOUD-009",
            "why": "Scoping the IAM policy to the actions the application needs caps the blast radius at one instance, so the exposed ports become a host problem rather than an account takeover.",
        },
    },
    {
        "chain_id": "CHAIN-CLOUD-DATA-EXPOSURE",
        "name": "Anonymous read to undetected data loss",
        "severity": "critical",
        "contributing_findings": ["CIS-CLOUD-004", "CIS-CLOUD-005", "CIS-CLOUD-006", "CIS-CLOUD-008"],
        "narrative": "The bucket carries a public-read ACL and has no public access block to override it, so its objects are readable anonymously. Those objects are stored unencrypted, and with access logging disabled there is no record of who read them. The exposure, the loss and the absence of evidence all land together.",
        "break_chain": {
            "fix_rule": "CIS-CLOUD-005",
            "why": "A bucket-level public access block overrides the ACL immediately and keeps overriding it, so the exposure closes now and cannot be reopened by a later policy change.",
        },
    },
    {
        "chain_id": "CHAIN-CLOUD-DB-EXPOSURE",
        "name": "Public database with unencrypted storage",
        "severity": "critical",
        "contributing_findings": ["CIS-CLOUD-011", "CIS-CLOUD-003", "CIS-CLOUD-012"],
        "narrative": "The production database has a public endpoint and sits behind a security group that permits every TCP port from the internet, so its only remaining defence is database authentication. Storage and snapshots are unencrypted, so anything obtained is immediately readable.",
        "break_chain": {
            "fix_rule": "CIS-CLOUD-011",
            "why": "Removing the public endpoint takes the database off the internet in one change, which is far faster than re-encrypting storage or untangling the security group.",
        },
    },
]


# ---------------------------------------------------------------------- rules
# The rules YAML is the SINGLE SOURCE OF TRUTH for a finding's text. We only
# compute rule_id / resource_id / raw_ref here; everything else is copied from
# the rule so the two files can never drift apart again.
import yaml as _yaml

def _apply_rules(findings, rules_path):
    rules = {r["id"]: r for r in _yaml.safe_load(open(rules_path))}
    for f in findings:
        r = rules[f["rule_id"]]
        f["title"] = r["title"]
        f["severity"] = r["severity"]
        f["cis_control"] = r["cis_control"]
        f["remediation_template"] = r["remediation"]
        f["explanation"] = r["explanation"]
    return findings

F = _apply_rules(F, 'engine/rules/aws_rules.yaml')

# ---------------------------------------------------------------------- score
_SCORE = _score(F, _RULES)
score = _SCORE["compliance_score"]

report = {
    "source": {"type": "terraform_aws", "filename": "main.tf"},
    "device": {
        "hostname": "aws-account-prod",
        "vendor": "aws",
        "os": "terraform",
        "version": "provider ~> 5.0",
        "role": "cloud_account",
    },
    "compliance_score": score,
    "score_breakdown": _SCORE["score_breakdown"],
    "findings": F,
    "attack_paths": PATHS,
}

# merge terraform_example into the existing normalized_examples.json
NE = pathlib.Path("samples/normalized_examples.json")
existing = json.loads(NE.read_text()) if NE.exists() else {}
existing["terraform_example"] = normalized
NE.write_text(json.dumps(existing, indent=2) + "\n")

pathlib.Path("samples/sample_report_aws.json").write_text(json.dumps(report, indent=2) + "\n")

print(f"score={score}  findings={len(F)}  paths={len(PATHS)}  rules={len(_RULES)}")
by = {}
for f in F:
    by[f["severity"]] = by.get(f["severity"], 0) + 1
print("severity spread:", by)
print("null raw_ref:", [f["rule_id"] for f in F if f["raw_ref"] is None])
print("normalized_examples.json keys:", sorted(existing))
