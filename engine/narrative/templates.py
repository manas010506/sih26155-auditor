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


def finding_text(item: dict) -> str:
    lead = SEVERITY_LEAD.get(item["severity"], "")
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
