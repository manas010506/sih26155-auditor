"""
CVE context from the offline cache.

Read-only and offline. This module never makes a network call - the cache
is built ahead of time by samples/build_cve_cache.py. Enrichment runs after
scoring and never feeds back into findings or the compliance score.

Absence is a fact: every path returns a status the report can render, and
no path raises.
"""

import json
import re
from pathlib import Path

CACHE_PATH = Path(__file__).resolve().parent / "cve_cache.json"

SUPPORTED_VENDORS = {"cisco", "cisco_ios"}
UNKNOWN = ("", "n/a", "none", "unknown")

CAVEAT = (
    "Matched on OS major.minor version against NVD applicability data. "
    "A specific maintenance train may already carry the fix, so this is "
    "version-level context, not a confirmed vulnerability assessment."
)

_cache = None


def normalize(version):
    """'15.2(4)M11' -> '15.2'. NVD rejects encoded parentheses and its CPE
    list is coarser than IOS train designators. Returns None when there is
    no usable version."""
    if not version:
        return None
    v = str(version).strip().lower()
    if v in UNKNOWN or v.startswith("not available"):
        return None
    v = v.split("(")[0].strip().rstrip(".")
    m = re.match(r"^(\d+)\.(\d+)", v)
    return f"{m.group(1)}.{m.group(2)}" if m else None


def load_cache(path=None):
    """Lazy-load and memoize. A missing or malformed cache degrades to
    empty rather than breaking an audit."""
    global _cache
    if path is not None:
        return _read(path)
    if _cache is None:
        _cache = _read(CACHE_PATH)
    return _cache


def _read(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:
        return {"versions": {}}


def _result(status, **extra):
    out = {"status": status, "cves": [], "caveat": CAVEAT}
    out.update(extra)
    return out


def lookup(vendor, os_version, cache=None):
    """Return a cve_context block. Never raises."""
    try:
        data = cache if cache is not None else load_cache()

        if str(vendor or "").lower() not in SUPPORTED_VENDORS:
            return _result(
                "unsupported_vendor",
                detail="CVE context is currently built for Cisco IOS only.",
            )

        normalized = normalize(os_version)
        if normalized is None:
            return _result(
                "no_version",
                detail="No OS version available in the supplied configuration.",
            )

        entry = data.get("versions", {}).get(normalized)
        if entry is None:
            return _result(
                "not_in_cache",
                normalized_version=normalized,
                detail=f"No cached CVE data for OS version {normalized}.",
            )

        return _result(
            "matched",
            normalized_version=normalized,
            os_version_raw=os_version,
            total_matched=entry.get("total_matched", 0),
            high_and_critical=entry.get("high_and_critical", 0),
            cves=entry.get("cves", []),
            generated=data.get("generated"),
        )
    except Exception:
        return _result("unavailable", detail="CVE context could not be loaded.")


def enrich(report):
    """Attach cve_context to a finished AuditReport. Mutates and returns it.
    Call after scoring; this must not influence findings or score."""
    device = report.get("device", {}) or {}
    report["cve_context"] = lookup(device.get("vendor"), device.get("os_version"))
    return report
