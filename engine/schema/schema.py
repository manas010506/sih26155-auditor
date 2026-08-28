"""Repo path: engine/schema/schema.py     Owner: Manas
Dicts and a validator. No class hierarchy - Kashvi calls validate() to check
her parser output, so the error messages have to be useful.
"""
from typing import Any

SOURCE_TYPES = {"cisco_ios", "terraform_aws"}

# Every resource type a parser may emit. Adding one is a contract change:
# update this, update samples/, tell the group.
RESOURCE_TYPES = {
    # cisco_ios
    "global_settings", "enable_secret", "local_user", "snmp_community",
    "snmp_settings", "vty_line", "console_line", "ssh_settings",
    "logging", "ntp", "interface", "access_list",
    # terraform_aws
    "s3_bucket", "security_group_rule", "iam_policy", "kms_key",
    "cloudtrail", "rds_instance",
}


def empty(source_type: str, filename: str) -> dict:
    return {"source": {"type": source_type, "filename": filename},
            "resources": [], "_unparsed": []}


def validate(doc: Any) -> list[str]:
    """Return a list of human-readable problems. Empty list means valid."""
    errs: list[str] = []
    if not isinstance(doc, dict):
        return ["document is not an object"]

    src = doc.get("source")
    if not isinstance(src, dict):
        errs.append("missing 'source' object")
    else:
        if src.get("type") not in SOURCE_TYPES:
            errs.append(f"source.type must be one of {sorted(SOURCE_TYPES)}, got {src.get('type')!r}")
        if not src.get("filename"):
            errs.append("source.filename is empty")

    resources = doc.get("resources")
    if not isinstance(resources, list):
        return errs + ["'resources' must be a list"]

    seen = set()
    for i, r in enumerate(resources):
        where = f"resources[{i}]"
        if not isinstance(r, dict):
            errs.append(f"{where} is not an object"); continue
        rid = r.get("id")
        if not rid:
            errs.append(f"{where} missing 'id'")
        elif rid in seen:
            errs.append(f"{where} duplicate id {rid!r}")
        else:
            seen.add(rid)
        if r.get("type") not in RESOURCE_TYPES:
            errs.append(f"{where} unknown type {r.get('type')!r} "
                        f"(add it to RESOURCE_TYPES and tell the group)")
        if not isinstance(r.get("attributes"), dict):
            errs.append(f"{where} 'attributes' must be an object")

        ref = r.get("raw_ref", "MISSING")
        if ref == "MISSING":
            errs.append(f"{where} missing 'raw_ref' (use null for absence-based facts)")
        elif ref is not None:
            if not isinstance(ref, dict):
                errs.append(f"{where}.raw_ref must be an object or null")
            else:
                if not isinstance(ref.get("line"), int) or ref["line"] < 1:
                    errs.append(f"{where}.raw_ref.line must be a 1-based integer")
                if not isinstance(ref.get("snippet"), str):
                    errs.append(f"{where}.raw_ref.snippet must be a string")

    if not isinstance(doc.get("_unparsed", []), list):
        errs.append("'_unparsed' must be a list")
    return errs


if __name__ == "__main__":
    import json, sys
    problems = validate(json.load(open(sys.argv[1])))
    print("\n".join(problems) if problems else "valid")
