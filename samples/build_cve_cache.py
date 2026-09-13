"""
Build the offline CVE cache.

Run manually when OS versions in the corpus change. NEVER called from
run_audit - the audit path reads the JSON this produces and nothing else.

    python tools/build_cve_cache.py 15.2 15.4 12.4

Writes engine/cve_cache.json keyed by normalized major.minor version.
Unkeyed NVD requests are throttled to one per ~6s.
"""

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
DELAY = 6.5
KEEP_SEVERITIES = {"CRITICAL", "HIGH"}
MAX_PER_VERSION = 5
CACHE_PATH = Path(__file__).resolve().parents[1] / "engine" / "cve_cache.json"

UNKNOWN = ("", "n/a", "none", "unknown")


def normalize(version):
    """'15.2(4)M11' -> '15.2'. NVD 404s on encoded parens, and train
    designators are finer-grained than NVD's CPE list. Returns None for
    anything we can't turn into major.minor."""
    if not version:
        return None
    v = str(version).strip().lower()
    if v in UNKNOWN or v.startswith("not available"):
        return None
    v = v.split("(")[0].strip().rstrip(".")
    m = re.match(r"^(\d+)\.(\d+)", v)
    return f"{m.group(1)}.{m.group(2)}" if m else None


def severity_of(cve):
    """Prefer CVSS v3.1, fall back to v3.0. v2-only CVEs are dropped -
    we are not going to present a severity we can't state consistently."""
    metrics = cve.get("metrics", {})
    for key in ("cvssMetricV31", "cvssMetricV30"):
        entries = metrics.get(key)
        if entries:
            data = entries[0]["cvssData"]
            return data.get("baseSeverity"), data.get("baseScore")
    return None, None


def english(cve):
    for d in cve.get("descriptions", []):
        if d.get("lang") == "en":
            text = " ".join(d.get("value", "").split())
            return text[:200] + ("..." if len(text) > 200 else "")
    return ""


def fetch(version):
    params = {
        "virtualMatchString": f"cpe:2.3:o:cisco:ios:{version}",
        "resultsPerPage": 2000,
    }
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "sih26155-cache-builder"})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read().decode()
    if not body.lstrip().startswith("{"):
        raise RuntimeError("non-JSON response - rate limited, wait and rerun")
    return json.loads(body)


def build(version):
    data = fetch(version)
    total = data.get("totalResults", 0)
    rows = []
    for item in data.get("vulnerabilities", []):
        cve = item["cve"]
        sev, score = severity_of(cve)
        if sev not in KEEP_SEVERITIES:
            continue
        rows.append(
            {
                "id": cve["id"],
                "severity": sev,
                "score": score,
                "published": cve.get("published", "")[:10],
                "summary": english(cve),
            }
        )
    rows.sort(key=lambda r: (r["score"] or 0), reverse=True)
    kept = rows[:MAX_PER_VERSION]
    print(f"  {version}: {total} total, {len(rows)} critical/high, keeping {len(kept)}")
    return {"total_matched": total, "high_and_critical": len(rows), "cves": kept}


def main():
    raw = sys.argv[1:]
    if not raw:
        print(__doc__)
        sys.exit(1)

    versions = []
    for r in raw:
        n = normalize(r)
        if n is None:
            print(f"  skipping unusable version: {r!r}")
        elif n not in versions:
            versions.append(n)

    if not versions:
        print("nothing to fetch")
        sys.exit(1)

    cache = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "NVD API 2.0, virtualMatchString, cpe:2.3:o:cisco:ios",
        "filter": f"CVSS v3.x {'/'.join(sorted(KEEP_SEVERITIES))}, top {MAX_PER_VERSION} by base score",
        "versions": {},
    }

    for i, v in enumerate(versions):
        if i:
            time.sleep(DELAY)
        cache["versions"][v] = build(v)

    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {CACHE_PATH}")


if __name__ == "__main__":
    main()
