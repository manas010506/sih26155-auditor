"""Generate the JSON fixtures from sample_cisco_ios.cfg so every raw_ref line
number is real. Run from the repo root after editing the .cfg."""
import json, pathlib

CFG = pathlib.Path("samples/sample_cisco_ios.cfg")
lines = CFG.read_text().splitlines()


def ln(needle, occurrence=1):
    """1-based line number of the occurrence-th line whose stripped text == needle."""
    hits = [i + 1 for i, l in enumerate(lines) if l.strip() == needle]
    if len(hits) < occurrence:
        raise SystemExit(f"NOT FOUND in cfg: {needle!r} (occurrence {occurrence})")
    return hits[occurrence - 1]


def ref(needle, occurrence=1):
    return {"line": ln(needle, occurrence), "snippet": needle}


# ---------------------------------------------------------------- normalized
normalized = {
    "source": {"type": "cisco_ios", "filename": "sample_cisco_ios.cfg"},
    "resources": [
        {
            "id": "global",
            "type": "global_settings",
            "attributes": {
                "hostname": "EDGE-RTR-01",
                "os_version": "15.2",
                "password_encryption": False,
                "aaa_new_model": False,
                "http_server": True,
                "https_server": True,
                "cdp_enabled": True,
                "enable_secret_present": False,
                "enable_password_present": True,
                "enable_password_type": 0,
                "login_banner": None,
                "motd_banner": None,
            },
            # raw_ref is null: this resource is a bag of settings with no single
            # anchor line. Per-attribute lines live in attribute_refs, and an
            # attribute absent from that map (login_banner) falls through to
            # null - which is exactly what an absence-based finding needs.
            "attribute_refs": {
                "hostname": ref("hostname EDGE-RTR-01"),
                "password_encryption": ref("no service password-encryption"),
                "aaa_new_model": ref("no aaa new-model"),
                "http_server": ref("ip http server"),
                "https_server": ref("ip http secure-server"),
                "cdp_enabled": ref("cdp run"),
            },
            "raw_ref": None,
        },
        {
            "id": "enable-password",
            "type": "enable_secret",
            "attributes": {"uses_secret": False, "encryption_type": 0, "encrypted": False},
            "attribute_refs": {"uses_secret": ref("enable password cisco123")},
            "raw_ref": ref("enable password cisco123"),
        },
        {
            "id": "user-admin",
            "type": "local_user",
            "attributes": {"name": "admin", "privilege": 15, "encryption_type": 0, "encrypted": False},
            "attribute_refs": {"encrypted": ref("username admin privilege 15 password 0 admin123")},
            "raw_ref": ref("username admin privilege 15 password 0 admin123"),
        },
        {
            "id": "user-netops",
            "type": "local_user",
            "attributes": {"name": "netops", "privilege": 15, "encryption_type": 0, "encrypted": False},
            "attribute_refs": {"encrypted": ref("username netops privilege 15 password 0 N3top2024")},
            "raw_ref": ref("username netops privilege 15 password 0 N3top2024"),
        },
        {
            "id": "snmp-public",
            "type": "snmp_community",
            "attributes": {"community": "public", "access": "RO", "acl": None, "is_default_string": True},
            "attribute_refs": {"is_default_string": ref("snmp-server community public RO")},
            "raw_ref": ref("snmp-server community public RO"),
        },
        {
            "id": "snmp-private",
            "type": "snmp_community",
            "attributes": {"community": "private", "access": "RW", "acl": None, "is_default_string": True},
            "attribute_refs": {"access": ref("snmp-server community private RW")},
            "raw_ref": ref("snmp-server community private RW"),
        },
        {
            "id": "snmp",
            "type": "snmp_settings",
            "attributes": {"v3_configured": False, "versions_in_use": ["v1", "v2c"], "traps_enabled": False},
            "raw_ref": None,
        },
        {
            "id": "vty-0-4",
            "type": "vty_line",
            "attributes": {
                "range": "0 4",
                "transport_input": ["telnet", "ssh"],
                "exec_timeout_minutes": 0,
                "access_class": None,
                "login_method": "password",
                "privilege_level": None,
            },
            # access_class is deliberately absent from attribute_refs: the
            # sub-command is missing but the block exists, so it falls through
            # to the block header line.
            "attribute_refs": {
                "transport_input": ref("transport input telnet ssh", 1),
                "exec_timeout_minutes": ref("exec-timeout 0 0", 2),
            },
            "raw_ref": ref("line vty 0 4"),
        },
        {
            "id": "vty-5-15",
            "type": "vty_line",
            "attributes": {
                "range": "5 15",
                "transport_input": ["telnet", "ssh"],
                "exec_timeout_minutes": 0,
                "access_class": None,
                "login_method": "password",
                "privilege_level": None,
            },
            "attribute_refs": {
                "transport_input": ref("transport input telnet ssh", 2),
                "exec_timeout_minutes": ref("exec-timeout 0 0", 3),
            },
            "raw_ref": ref("line vty 5 15"),
        },
        {
            "id": "con-0",
            "type": "console_line",
            "attributes": {"exec_timeout_minutes": 0, "login_method": "none", "privilege_level": 15},
            "attribute_refs": {
                "exec_timeout_minutes": ref("exec-timeout 0 0", 1),
                "privilege_level": ref("privilege level 15"),
                "login_method": ref("no login"),
            },
            "raw_ref": ref("line con 0"),
        },
        {
            "id": "ssh",
            "type": "ssh_settings",
            "attributes": {"version": None, "timeout_seconds": None, "auth_retries": None, "key_bits": None},
            "raw_ref": None,
        },
        {
            "id": "logging",
            "type": "logging",
            "attributes": {"hosts": [], "buffered": False, "trap_level": None, "logs_admin_access": False},
            "raw_ref": None,
        },
        {
            "id": "ntp",
            "type": "ntp",
            "attributes": {"servers": ["10.10.0.250"], "authenticated": False},
            "attribute_refs": {"servers": ref("ntp server 10.10.0.250")},
            "raw_ref": ref("ntp server 10.10.0.250"),
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

_RULES = _load_rules('engine/rules/cisco_rules.yaml')
_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
F = sorted(_evaluate(normalized, _RULES), key=lambda f: (_ORDER[f["severity"]], f["rule_id"]))

# --------------------------------------------------------------- attack paths
PATHS = [
    {
        "chain_id": "CHAIN-NET-MGMT-TAKEOVER",
        "name": "Cleartext management plane to privileged takeover",
        "severity": "critical",
        "contributing_findings": ["CIS-NET-004", "CIS-NET-001", "CIS-NET-006", "CIS-NET-011"],
        "narrative": "The management plane is reachable from any routable network because no access-class is applied, and it accepts Telnet. An attacker on the path captures credentials in cleartext, and the enable password stored in the configuration grants privileged EXEC. With no syslog host, the entire sequence leaves no off-box record.",
        "break_chain": {
            "fix_rule": "CIS-NET-004",
            "why": "Applying an access-class removes reachability for every management protocol at once, so the Telnet and credential weaknesses become unreachable while they are being fixed.",
        },
    },
    {
        "chain_id": "CHAIN-NET-SNMP-CONTROL",
        "name": "SNMP reconnaissance to device control",
        "severity": "critical",
        "contributing_findings": ["CIS-NET-008", "CIS-NET-009", "CIS-NET-011"],
        "narrative": "The default read-only community exposes the full running configuration, which reveals the read-write community. That second string permits configuration writes over UDP with no session and no authentication beyond the string itself. Neither step is logged remotely.",
        "break_chain": {
            "fix_rule": "CIS-NET-009",
            "why": "Removing the read-write community reduces the worst case from device control to information disclosure, which is the difference between an incident and an outage.",
        },
    },
    {
        "chain_id": "CHAIN-NET-CRED-EXPOSURE",
        "name": "Configuration read to credential reuse",
        "severity": "high",
        "contributing_findings": ["CIS-NET-005", "CIS-NET-006", "CIS-NET-007", "CIS-NET-003"],
        "narrative": "Every credential on this device is recoverable from the configuration text: password encryption is off, the enable password is plaintext, and both privilege-15 accounts use type 0 passwords. Anyone who obtains a config backup obtains administrative access, and disabled session timeouts widen the window for reuse.",
        "break_chain": {
            "fix_rule": "CIS-NET-006",
            "why": "Moving to enable secret replaces a readable password with an irreversible hash, so reading the configuration no longer yields privileged access.",
        },
    },
]

# ---------------------------------------------------------------------- score
# The rules YAML is the SINGLE SOURCE OF TRUTH for a finding's text. We compute
# only rule_id / resource_id / raw_ref here; everything else is copied from the
# rule, so the two files can never drift apart again.
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


F = _apply_rules(F, "engine/rules/cisco_rules.yaml")

_SCORE = _score(F, _RULES)
score = _SCORE["compliance_score"]

report = {
    "source": {"type": "cisco_ios", "filename": "sample_cisco_ios.cfg"},
    "device": {
        "hostname": "EDGE-RTR-01",
        "vendor": "cisco",
        "os": "IOS",
        "version": "15.2",
        "role": "router",
    },
    "compliance_score": score,
    "score_breakdown": _SCORE["score_breakdown"],
    "findings": F,
    "attack_paths": PATHS,
}

# merge, don't clobber - build_fixtures_aws.py writes terraform_example here too
NE = pathlib.Path("samples/normalized_examples.json")
existing = json.loads(NE.read_text()) if NE.exists() else {}
existing["cisco_example"] = normalized
NE.write_text(json.dumps(existing, indent=2) + "\n")
pathlib.Path("samples/sample_report.json").write_text(json.dumps(report, indent=2) + "\n")
pathlib.Path("samples/sample_attack_paths.json").write_text(
    json.dumps({"attack_paths": PATHS}, indent=2) + "\n")

print(f"score={score}  findings={len(F)}  paths={len(PATHS)}  rules={len(_RULES)}")
by = {}
for f in F:
    by[f["severity"]] = by.get(f["severity"], 0) + 1
print("severity spread:", by)
print("null raw_ref:", [f["rule_id"] for f in F if f["raw_ref"] is None])
