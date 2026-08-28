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
            "raw_ref": {"line": ln("hostname EDGE-RTR-01"), "snippet": "hostname EDGE-RTR-01"},
        },
        {
            "id": "enable-password",
            "type": "enable_secret",
            "attributes": {"uses_secret": False, "encryption_type": 0, "encrypted": False},
            "raw_ref": ref("enable password cisco123"),
        },
        {
            "id": "user-admin",
            "type": "local_user",
            "attributes": {"name": "admin", "privilege": 15, "encryption_type": 0, "encrypted": False},
            "raw_ref": ref("username admin privilege 15 password 0 admin123"),
        },
        {
            "id": "user-netops",
            "type": "local_user",
            "attributes": {"name": "netops", "privilege": 15, "encryption_type": 0, "encrypted": False},
            "raw_ref": ref("username netops privilege 15 password 0 N3top2024"),
        },
        {
            "id": "snmp-public",
            "type": "snmp_community",
            "attributes": {"community": "public", "access": "RO", "acl": None, "is_default_string": True},
            "raw_ref": ref("snmp-server community public RO"),
        },
        {
            "id": "snmp-private",
            "type": "snmp_community",
            "attributes": {"community": "private", "access": "RW", "acl": None, "is_default_string": True},
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
            "raw_ref": ref("line vty 5 15"),
        },
        {
            "id": "con-0",
            "type": "console_line",
            "attributes": {"exec_timeout_minutes": 0, "login_method": "none", "privilege_level": 15},
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
            "raw_ref": ref("ntp server 10.10.0.250"),
        },
    ],
    "_unparsed": [],
}

# ------------------------------------------------------------------ findings
F = [
    dict(
        rule_id="CIS-NET-001",
        title="VTY lines permit Telnet",
        severity="critical",
        resource_id="vty-0-4",
        raw_ref=ref("transport input telnet ssh", 1),
        cis_control="CIS Cisco IOS 1.1.5 - Set transport input ssh on VTY lines",
        remediation_template="line vty 0 4\n transport input ssh",
        explanation="Telnet carries usernames and passwords in cleartext. Any device on the path between an administrator and this router can read the enable password and take control. Restrict VTY transport to SSH only.",
    ),
    dict(
        rule_id="CIS-NET-006",
        title="Enable password stored unencrypted",
        severity="critical",
        resource_id="enable-password",
        raw_ref=ref("enable password cisco123"),
        cis_control="CIS Cisco IOS 1.1.1 - Use enable secret instead of enable password",
        remediation_template="no enable password\nenable secret <strong-password>",
        explanation="The privileged-EXEC password is stored in the configuration in plaintext, so anyone who can read a config backup, a TFTP transfer or an SNMP dump holds full administrative control. enable secret stores an irreversible hash instead.",
    ),
    dict(
        rule_id="CIS-NET-009",
        title="SNMP read-write community uses a default string",
        severity="critical",
        resource_id="snmp-private",
        raw_ref=ref("snmp-server community private RW"),
        cis_control="CIS Cisco IOS 2.2.2 - Do not use default or read-write SNMP community strings",
        remediation_template="no snmp-server community private RW",
        explanation="A read-write community named 'private' is a guessable credential that permits configuration changes over UDP with no logging and no session. This is remote device control, not monitoring.",
    ),
    dict(
        rule_id="CIS-NET-002",
        title="HTTP management server enabled",
        severity="high",
        resource_id="global",
        raw_ref=ref("ip http server"),
        cis_control="CIS Cisco IOS 1.2.1 - Disable the HTTP server",
        remediation_template="no ip http server",
        explanation="The unencrypted web management interface is running. Credentials submitted to it travel in cleartext, and the HTTP server has historically been a source of remote code execution vulnerabilities. HTTPS is already enabled, so nothing is lost by disabling it.",
    ),
    dict(
        rule_id="CIS-NET-004",
        title="VTY lines have no access-class restriction",
        severity="high",
        resource_id="vty-0-4",
        raw_ref=ref("line vty 0 4"),
        cis_control="CIS Cisco IOS 1.1.4 - Apply an access-class to VTY lines",
        remediation_template="ip access-list standard MGMT-HOSTS\n permit 10.10.0.0 0.0.0.255\nline vty 0 4\n access-class MGMT-HOSTS in",
        explanation="No ACL limits who may open a management session, so the management plane is reachable from every network that can route to this device, including the WAN interface. An access-class restricts it to the operations subnet.",
    ),
    dict(
        rule_id="CIS-NET-007",
        title="Privilege-15 local user with unencrypted password",
        severity="high",
        resource_id="user-admin",
        raw_ref=ref("username admin privilege 15 password 0 admin123"),
        cis_control="CIS Cisco IOS 1.1.2 - Store local user passwords using irreversible encryption",
        remediation_template="no username admin\nusername admin privilege 15 secret <strong-password>",
        explanation="This account has full administrative rights and its password is stored as type 0, meaning plaintext. Two accounts on this device share the problem. Use the secret keyword so the password is hashed rather than stored.",
    ),
    dict(
        rule_id="CIS-NET-008",
        title="Default SNMP read-only community string",
        severity="high",
        resource_id="snmp-public",
        raw_ref=ref("snmp-server community public RO"),
        cis_control="CIS Cisco IOS 2.2.1 - Do not use default SNMP community strings",
        remediation_template="no snmp-server community public RO",
        explanation="The community string 'public' is the first value any scanner tries. It exposes the full running configuration, interface list, routing table and ARP cache to anyone who can reach UDP/161.",
    ),
    dict(
        rule_id="CIS-NET-011",
        title="No syslog server configured",
        severity="high",
        resource_id="logging",
        raw_ref=None,
        cis_control="CIS Cisco IOS 3.1.1 - Configure a remote syslog host",
        remediation_template="logging host 10.10.0.200\nlogging trap informational",
        explanation="Nothing is sent off-box, so administrative logins, configuration changes and interface events exist only in a buffer that is cleared on reboot and editable by anyone with privileged access. Without remote logging, a compromise leaves no evidence.",
    ),
    dict(
        rule_id="CIS-NET-003",
        title="VTY session timeout disabled",
        severity="medium",
        resource_id="vty-0-4",
        raw_ref=ref("exec-timeout 0 0", 2),
        cis_control="CIS Cisco IOS 1.1.6 - Set exec-timeout to 10 minutes or less",
        remediation_template="line vty 0 4\n exec-timeout 10 0",
        explanation="exec-timeout 0 0 disables the idle timer, so an abandoned session stays authenticated indefinitely and can be reused by anyone with access to that terminal.",
    ),
    dict(
        rule_id="CIS-NET-005",
        title="Password encryption service disabled",
        severity="medium",
        resource_id="global",
        raw_ref=ref("no service password-encryption"),
        cis_control="CIS Cisco IOS 1.1.3 - Enable service password-encryption",
        remediation_template="service password-encryption",
        explanation="Passwords that have no stronger option are written to the configuration in clear text. Type 7 encryption is reversible and is not a substitute for secret hashes, but it removes casual over-the-shoulder and config-backup exposure.",
    ),
    dict(
        rule_id="CIS-NET-013",
        title="AAA not enabled",
        severity="medium",
        resource_id="global",
        raw_ref=ref("no aaa new-model"),
        cis_control="CIS Cisco IOS 1.3.1 - Enable AAA",
        remediation_template="aaa new-model\naaa authentication login default group tacacs+ local\naaa accounting exec default start-stop group tacacs+",
        explanation="Authentication falls back to shared local passwords, so administrator actions cannot be attributed to an individual and revoking one person's access means changing credentials for everyone.",
    ),
    dict(
        rule_id="CIS-NET-016",
        title="SSH version 2 not enforced",
        severity="medium",
        resource_id="ssh",
        raw_ref=None,
        cis_control="CIS Cisco IOS 1.2.3 - Set ip ssh version 2",
        remediation_template="ip ssh version 2\nip ssh time-out 60\nip ssh authentication-retries 3",
        explanation="With no explicit version the device may negotiate SSHv1, which has known integrity weaknesses and is downgradeable by an on-path attacker.",
    ),
    dict(
        rule_id="CIS-NET-014",
        title="No login banner configured",
        severity="low",
        resource_id="global",
        raw_ref=None,
        cis_control="CIS Cisco IOS 1.4.1 - Configure a login banner",
        remediation_template='banner login ^C\nAuthorised access only. Activity is monitored.\n^C',
        explanation="No warning banner is presented before authentication. Beyond the hardening benchmark, this weakens the legal position when pursuing unauthorised access.",
    ),
    dict(
        rule_id="CIS-NET-015",
        title="CDP enabled globally",
        severity="low",
        resource_id="global",
        raw_ref=ref("cdp run"),
        cis_control="CIS Cisco IOS 2.1.1 - Disable CDP where not required",
        remediation_template="no cdp run",
        explanation="CDP advertises the model, IOS version, management address and native VLAN to any directly connected device, which hands an attacker on the local segment a free inventory.",
    ),
    dict(
        rule_id="CIS-NET-012",
        title="NTP configured without authentication",
        severity="low",
        resource_id="ntp",
        raw_ref=ref("ntp server 10.10.0.250"),
        cis_control="CIS Cisco IOS 3.2.1 - Use authenticated NTP",
        remediation_template="ntp authenticate\nntp authentication-key 1 md5 <key>\nntp trusted-key 1\nntp server 10.10.0.250 key 1",
        explanation="Time is accepted from an unauthenticated source. An attacker who can spoof NTP can shift the clock and desynchronise every timestamp used to correlate logs during an investigation.",
    ),
]

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
W = {"critical": 20, "high": 10, "medium": 5, "low": 2}
failed_weight = sum(W[f["severity"]] for f in F)
TOTAL_WEIGHT = 180          # weight of all 27 cisco_ios rules evaluated
score = round(100 * (1 - failed_weight / TOTAL_WEIGHT))

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
    "score_breakdown": {
        "formula": "100 * (1 - failed_weight / total_weight)",
        "severity_weights": W,
        "rules_evaluated": 27,
        "rules_failed": len(F),
        "failed_weight": failed_weight,
        "total_weight": TOTAL_WEIGHT,
    },
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

print(f"score={score}  findings={len(F)}  paths={len(PATHS)}  failed_weight={failed_weight}")
by = {}
for f in F:
    by[f["severity"]] = by.get(f["severity"], 0) + 1
print("severity spread:", by)
print("null raw_ref:", [f["rule_id"] for f in F if f["raw_ref"] is None])
