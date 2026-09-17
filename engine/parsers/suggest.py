"""Repo path: engine/parsers/suggest.py     Owner: Manas

Proposes a schema mapping for a configuration line the parsers did not
recognise.

The problem statement asks for pattern matching to "identify keywords in
configurations that the system has not been pre-trained on". This is that step.

Deliberately not a model. Compliance decisions must be deterministic and
explainable, so the AI here only ever *proposes* — an administrator confirms or
corrects, and the confirmed mapping is what the parser applies. AI suggests, a
human decides, deterministic rules audit.

The matching is vendor-independent by design: it keys off the security concept a
command expresses, not any vendor's syntax. `syslog`, `logging host` and
`/system logging action` all name the same thing, so all three suggest
`logging.hosts` without anyone having written a MikroTik or Juniper parser.
"""
from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Concept keywords -> (resource_type, attribute, optional value hint)
#
# Ordered: the first match wins, so put specific patterns above general ones.
# Each entry is a security concept, expressed in the words vendors actually use.
# ---------------------------------------------------------------------------
RULES: list[tuple[str, str, str, str | None]] = [
    # --- logging -----------------------------------------------------------
    (r"\b(syslog|logging)\b.*\b(host|server|remote|destination|target)\b",
     "logging", "hosts", None),
    (r"\blogging\b.*\b(trap|level|severity)\b", "logging", "trap_level", None),
    (r"\blogging\b.*\bbuffered\b", "logging", "buffered", "true"),
    (r"\b(syslog|logging)\b", "logging", "hosts", None),

    # --- remote administration --------------------------------------------
    (r"\btelnet\b", "vty_line", "transport_input", "telnet"),
    (r"\bssh\b.*\b(version|protocol)\b", "ssh_settings", "version", "2"),
    (r"\bssh\b.*\b(time-?out|idle)\b", "ssh_settings", "timeout_seconds", None),
    (r"\bssh\b.*\b(retry|retries|attempts)\b", "ssh_settings", "auth_retries", None),
    (r"\bssh\b", "vty_line", "transport_input", "ssh"),
    (r"\b(exec|idle|session|cli-session|cli)[-\s]?timeout\b",
     "vty_line", "exec_timeout_minutes", None),
    (r"\b(access-?class|management-?acl|allowed-?address)\b",
     "vty_line", "access_class", None),

    # --- SNMP --------------------------------------------------------------
    (r"\bsnmp\b.*\bcommunity\b", "snmp_community", "community", None),
    (r"\bsnmp\b.*\bv3\b", "snmp_settings", "v3_configured", "true"),
    (r"\bsnmp\b.*\btrap\b", "snmp_settings", "traps_enabled", "true"),
    (r"\bsnmp\b", "snmp_settings", "versions_in_use", None),

    # --- time --------------------------------------------------------------
    (r"\b(ntp|time-?server|sntp)\b.*\b(auth|key|trusted)\b",
     "ntp", "authenticated", "true"),
    (r"\b(ntp|time-?server|sntp)\b", "ntp", "servers", None),

    # --- credentials and AAA ----------------------------------------------
    (r"\b(aaa|tacacs|radius)\b.*\baccounting\b",
     "global_settings", "aaa_accounting_commands", None),
    (r"\b(aaa|tacacs|radius)\b.*\b(auth|login)\b",
     "global_settings", "aaa_auth_login", None),
    (r"\b(aaa|tacacs|radius)\b", "global_settings", "aaa_new_model", "true"),
    (r"\benable\b.*\bsecret\b", "enable_secret", "uses_secret", "true"),
    (r"\benable\b.*\bpassword\b", "enable_secret", "uses_secret", "false"),
    (r"\b(password-?encryption|service password)\b",
     "global_settings", "password_encryption", "true"),
    (r"\b(user|username|admin)\b.*\b(password|secret)\b",
     "local_user", "encrypted", "false"),

    # --- management services ----------------------------------------------
    (r"\bhttps-?server\b", "global_settings", "https_server", "true"),
    (r"\bhttp-?server\b", "global_settings", "http_server", "true"),
    (r"\bhttps?\b.*\bsecure-?server\b", "global_settings", "https_server", "true"),
    (r"\b(www|web-?management|web-?ui|webgui)\b", "global_settings", "http_server", "true"),
    (r"\bhttp\b.*\b(server|service|www)\b", "global_settings", "http_server", "true"),
    (r"\b(cdp|lldp|discovery)\b", "global_settings", "cdp_enabled", "true"),
    (r"\bsource-?route\b", "global_settings", "source_routing", "true"),
    (r"\bbanner\b.*\bmotd\b", "global_settings", "motd_banner", None),
    (r"\b(banner|login-?banner|login message|message-?of-?the-?day|note set note|show-?at-?login)\b",
     "global_settings", "login_banner", None),
    (r"\b(hostname|system identity|host-?name)\b", "global_settings", "hostname", None),
]


# A line that switches a service off must not be proposed as enabling it.
_TURNED_OFF = re.compile(r"\bdisabled\s*=\s*(?:yes|true)\b|\benabled\s*=\s*(?:no|false)\b")
_SERVICE_FLAGS = frozenset({"http_server", "https_server", "cdp_enabled"})
# 0.0.0.0 names no host: `remote=0.0.0.0` means remote logging is off.
_UNSPECIFIED = frozenset({"0.0.0.0", "255.255.255.255"})


def suggest(line: str) -> dict | None:
    """Propose a mapping for one unrecognised line, or None.

    Returns {resource_type, attribute, value, matched, confidence}.
    `matched` is the keyword that fired; the UI shows it so the administrator
    can see *why* this was proposed rather than being asked to trust it.
    """
    original = " ".join(str(line).split())
    text = original.lower()
    if not text or text.startswith(("!", "#")):
        return None
    turned_off = bool(_TURNED_OFF.search(text))

    for pattern, resource_type, attribute, value in RULES:
        m = re.search(pattern, text)
        if not m:
            continue
        if turned_off and attribute == "transport_input":
            return None  # a disabled protocol adds nothing to the allowed transports
        if turned_off and attribute in _SERVICE_FLAGS and value == "true":
            value = "false"
        if attribute == "versions_in_use":
            value = _snmp_versions(text)
        elif value is None:
            value = _guess_value(original)
        return {
            "resource_type": resource_type,
            "attribute": attribute,
            "value": value,
            "matched": m.group(0),
            # Two keyword groups matching is a stronger signal than one.
            "confidence": "high" if len(m.groups()) >= 2 else "medium",
        }
    return None


def _snmp_versions(text: str) -> str:
    """SNMP versions a line puts in use, comma-separated.

    Turning SNMP on without naming versions means the vendor defaults, which
    include v1 and v2c."""
    if _TURNED_OFF.search(text):
        return ""
    found = [v for v, pat in (("v1", r"\bv1\b|\bversion\s*1\b"),
                               ("v2c", r"\bv?2c\b"),
                               ("v3", r"\bv3\b|\bversion\s*3\b"))
             if re.search(pat, text)]
    if not found and re.search(r"\benabled?\b", text):
        found = ["v1", "v2c"]
    return ",".join(found)


def _guess_value(text: str) -> str:
    """Pull an obvious value out of the line, keeping its original case.

    An address first, then a key=value or "keyword value" pair, then a bare
    number. Order matters: `name=EDGE-MT-01` should yield the hostname, not the
    `01` a naive number match would grab. An unspecified address such as
    0.0.0.0 names no host, so it yields an empty value.
    """
    ips = re.findall(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", text)
    if ips:
        real = [ip for ip in ips if ip not in _UNSPECIFIED]
        return real[0] if real else ""

    kv = re.search(r"\b(?:name|identity|host|server|hostname)\s*=\s*([^\s;,]+)", text, re.I)
    if kv:
        return kv.group(1)

    kw = re.search(r"\b(?:hostname|host-?name|identity)\s+([^\s;,]+)", text, re.I)
    if kw:
        return kw.group(1)

    num = re.search(r"\b\d+\b", text)
    if num:
        return num.group(0)
    return ""


def suggest_all(unparsed: list[dict]) -> list[dict]:
    """Attach a suggestion to each unparsed line. Unsuggestable lines get None."""
    out = []
    for item in unparsed:
        entry = dict(item)
        entry["suggestion"] = suggest(item.get("text", ""))
        out.append(entry)
    return out