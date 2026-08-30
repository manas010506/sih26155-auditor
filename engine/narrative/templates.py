"""Repo path: engine/narrative/templates.py     Owner: Shreyas

The floor, not the fallback-of-last-resort. If Gemini fails on stage this is

what the judges read, so make it good enough to ship alone.

"""

SEVERITY_LEAD = {
    "critical": "This is an immediate risk.",
    "high":     "This needs fixing before the next change window.",
    "medium":   "This weakens the device's security posture.",
    "low":      "This is a hardening gap.",
}

FAMILY_LEAD = {
    "management": "This weakens the security of the device's management access and can increase the chance of unauthorized administration.",
    "credentials": "This can expose administrative credentials or make privileged access easier for an attacker to obtain.",
    "snmp": "This can expose sensitive device information or allow unauthorized users to modify the device remotely.",
    "aaa": "This weakens administrator authentication and makes privileged activity harder to control or attribute.",
    "logging": "This reduces the visibility needed to detect, investigate, and attribute security events.",
    "ssh": "This weakens the security of remote SSH administration and can increase exposure to session or protocol attacks.",
    "hardening": "This leaves an unnecessary security exposure or weakens a defensive control on the device.",
}

RULE_FAMILY = {
    "CIS-NET-001": "management",
    "CIS-NET-002": "management",
    "CIS-NET-003": "management",
    "CIS-NET-004": "management",
    "CIS-NET-005": "credentials",
    "CIS-NET-006": "credentials",
    "CIS-NET-007": "credentials",
    "CIS-NET-008": "snmp",
    "CIS-NET-009": "snmp",
    "CIS-NET-011": "logging",
    "CIS-NET-012": "hardening",
    "CIS-NET-013": "aaa",
    "CIS-NET-014": "hardening",
    "CIS-NET-015": "hardening",
    "CIS-NET-016": "ssh",
    "CIS-NET-022": "snmp",
    "CIS-NET-023": "ssh",
    "CIS-NET-024": "hardening",
    "CIS-NET-025": "hardening",
    "CIS-NET-027": "aaa",
    "CIS-NET-028": "aaa",
    "CIS-NET-029": "logging",
    "CIS-NET-030": "logging",
    "CIS-NET-031": "logging",
    "CIS-NET-032": "logging",
    "CIS-NET-033": "logging",
    "CIS-NET-034": "credentials",
}


def finding_text(item: dict) -> str:
    family = RULE_FAMILY.get(item["rule_id"])
    lead = FAMILY_LEAD.get(
        family,
        SEVERITY_LEAD.get(item["severity"], ""),
    )

    where = ""
    if item.get("raw_ref"):
        where = f" Found at line {item['raw_ref']['line']}."
    else:
        where = " Detected by the absence of the required configuration."

    return (
        f"{item['title']}. {lead}{where} "
        f"Benchmark reference: {item['cis_control']}."
    )


def path_text(item: dict) -> str:
    n = len(item["contributing_findings"])
    ids = ", ".join(item["contributing_findings"])
    return (
        f"{item['name']}. {n} findings chain together here ({ids}). "
        f"Fixing {item['break_chain']['fix_rule']} breaks the chain: "
        f"{item['break_chain']['why']}"
    )