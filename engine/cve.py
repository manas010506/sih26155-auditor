"""Repo path: engine/cve.py     Owner: Manas

Known-vulnerability lookup for the parsed device version.

This is deliberately separate from compliance. A CIS finding says "this device
is configured insecurely"; a CVE says "the software this device runs has a known
flaw". A fully patched router can still have Telnet enabled, and a hardened
router can still run a vulnerable image. They are different questions and we
report them separately rather than mixing them into one list.

Data comes from the NVD 2.0 API and is cached to disk. The cache is committed,
so the lookup works with no network — the same approach as the narrative layer.
A miss returns an empty list; it never fails an audit.

Populate or refresh the cache with:

    python -m engine.cve --refresh
"""
from __future__ import annotations

import json
import pathlib
import urllib.parse
import urllib.request

CACHE_PATH = pathlib.Path(__file__).resolve().parent / "cve_cache.json"
NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# Vendor/product pairs we can build a CPE for. Anything else returns no CVEs
# rather than guessing at a product string.
CPE_VENDORS = {
    "cisco": ("cisco", "ios"),
    "juniper": ("juniper", "junos"),
}

MAX_PER_VERSION = 8          # top N by severity - a wall of CVEs helps nobody


def cpe_for(vendor: str, version: str) -> str | None:
    """Build an NVD CPE 2.3 string, or None if we can't do it honestly."""
    pair = CPE_VENDORS.get((vendor or "").lower())
    if not pair or not version:
        return None
    v = version.strip().lower()
    if v.startswith("not available"):
        return None
    return f"cpe:2.3:o:{pair[0]}:{pair[1]}:{v}:*:*:*:*:*:*:*"


def _load_cache() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def lookup(vendor: str, version: str) -> list[dict]:
    """Known CVEs for this device's software version.

    Reads the committed cache only. Returns [] on any miss, so a device we have
    no data for reports nothing rather than something invented.
    """
    cpe = cpe_for(vendor, version)
    if not cpe:
        return []
    return _load_cache().get(cpe, [])


def summary(vendor: str, version: str) -> dict:
    """The block that goes in the report."""
    cpe = cpe_for(vendor, version)
    cves = lookup(vendor, version)

    if not cpe:
        return {
            "supported": False,
            "note": "No CVE data source for this vendor and version.",
            "cpe": None,
            "count": 0,
            "cves": [],
        }

    cached = cpe in _load_cache()
    return {
        "supported": True,
        # Distinguish "we looked and found none" from "we have no data".
        "note": ("Known vulnerabilities for the software version declared in the "
                 "configuration. Presence of a CVE does not mean it is "
                 "exploitable in this configuration."
                 if cached else
                 "No cached CVE data for this version. Run `python -m engine.cve "
                 "--refresh` with network access."),
        "cpe": cpe,
        "count": len(cves),
        "cves": cves,
    }


# ---------------------------------------------------------------------------
# Cache refresh. Needs network; run it once and commit the result.
# ---------------------------------------------------------------------------
def _fetch(cpe: str) -> list[dict]:
    url = f"{NVD_API}?cpeName={urllib.parse.quote(cpe)}&resultsPerPage=50"
    req = urllib.request.Request(url, headers={"User-Agent": "sih26155-auditor"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    out = []
    for item in data.get("vulnerabilities", []):
        c = item.get("cve", {})
        metrics = c.get("metrics", {})
        score, severity = None, "UNKNOWN"
        for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
            if metrics.get(key):
                m = metrics[key][0]
                score = m.get("cvssData", {}).get("baseScore")
                severity = (m.get("cvssData", {}).get("baseSeverity")
                            or m.get("baseSeverity") or "UNKNOWN")
                break
        desc = next((d.get("value", "") for d in c.get("descriptions", [])
                     if d.get("lang") == "en"), "")
        out.append({
            "id": c.get("id"),
            "cvss": score,
            "severity": severity.upper(),
            "published": (c.get("published") or "")[:10],
            "summary": desc[:220],
        })

    out.sort(key=lambda x: (x["cvss"] is None, -(x["cvss"] or 0)))
    return out[:MAX_PER_VERSION]


def refresh(targets: list[tuple[str, str]] | None = None) -> None:
    """Fetch and cache CVEs for the versions our sample configs declare."""
    targets = targets or [
        ("cisco", "15.2"),
        ("cisco", "12.4"),
        ("juniper", "21.4"),
    ]
    cache = _load_cache()
    for vendor, version in targets:
        cpe = cpe_for(vendor, version)
        if not cpe:
            print(f"  skip   {vendor} {version} - no CPE mapping")
            continue
        try:
            cache[cpe] = _fetch(cpe)
            print(f"  ok     {vendor} {version}: {len(cache[cpe])} CVEs")
        except Exception as exc:
            print(f"  failed {vendor} {version}: {type(exc).__name__}: {exc}")

    CACHE_PATH.write_text(json.dumps(cache, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {CACHE_PATH}")


if __name__ == "__main__":
    import sys
    if "--refresh" in sys.argv:
        refresh()
    else:
        print(json.dumps(summary("cisco", "15.2"), indent=2))
