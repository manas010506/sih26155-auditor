"""Repo path: api/app.py     Owner: Sanavi

STAGE 1 (today, 15 min): returns the sample report no matter what you send.
This unblocks Vedant - he wires api.js against real HTTP immediately instead
of during integration week.

STAGE 2 (Tue 1 Sep): uncomment the run_audit import and swap ONE line.

Run:  pip install flask flask-cors
      flask --app api/app.py run --port 5000
"""
import json
import pathlib

from engine.parsers.learned import add_mapping, load_mappings

from flask import Flask, jsonify, request
from flask_cors import CORS

from engine.audit import available_frameworks, run_audit

app = Flask(__name__)
CORS(app)

SAMPLE = pathlib.Path("samples/sample_report.json")
MAX_BYTES = 2 * 1024 * 1024
VALID_TYPES = {"cisco_ios", "terraform_aws","juniper_junos"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/audit")
def audit():
    body = request.get_json(silent=True) or {}
    config_text = body.get("config_text", "")
    source_type = body.get("source_type", "")

    if not isinstance(config_text, str):
        return jsonify(error="config_text must be a string"), 400
    if not config_text.strip():
        return jsonify(error="config_text is required"), 400
    if len(config_text.encode()) > MAX_BYTES:
        return jsonify(error="config file too large (2MB limit)"), 413
    if source_type not in VALID_TYPES:
        return jsonify(error=f"source_type must be one of {sorted(VALID_TYPES)}"), 400

    try:
        return jsonify(run_audit(config_text, source_type, framework=body.get("framework")))
    except Exception as exc:                      # never leak a stack trace
        app.logger.exception("audit failed")
        return jsonify(error=f"audit failed: {type(exc).__name__}"), 500

@app.get("/api/training")
def training_list():
    return jsonify(mappings=load_mappings())


@app.post("/api/training")
def training_add():
    body = request.get_json(silent=True) or {}

    for field in ("text", "source_type", "resource_type", "attribute", "value"):
        val = body.get(field)
        if not isinstance(val, str) or not val.strip():
            return jsonify(error=f"{field} is required and must be a non-empty string"), 400

    if body["source_type"] not in VALID_TYPES:
        return jsonify(error=f"source_type must be one of {sorted(VALID_TYPES)}"), 400

    line = body.get("line")
    if line is not None and not isinstance(line, int):
        return jsonify(error="line must be an integer when provided"), 400

    try:
        return jsonify(add_mapping(body)), 201
    except Exception as exc:                      # never leak a stack trace
        app.logger.exception("training save failed")
        return jsonify(error=f"could not save mapping: {type(exc).__name__}"), 500

@app.get("/api/schema")
def schema_types():
    """Resource types and their attributes, straight from the schema.

    The training UI reads this to populate its dropdowns, so a user can only
    ever create a mapping the rule engine can actually read.
    """
    from engine.schema.schema import known_attributes
    return jsonify({t: sorted(a) for t, a in known_attributes().items()})

MAX_BATCH = 25


@app.post("/api/audit/batch")
def audit_batch():
    """Audit several configurations in one request.

    Returns a summary per file plus the full report, so the UI can show a table
    and let the operator drill into any row. A file that fails to parse is
    reported with its error rather than failing the whole batch — one bad file
    in twenty shouldn't lose the other nineteen.
    """
    body = request.get_json(silent=True) or {}
    files = body.get("files")
    framework = body.get("framework")

    if not isinstance(files, list) or not files:
        return jsonify(error="files must be a non-empty list"), 400
    if len(files) > MAX_BATCH:
        return jsonify(error=f"at most {MAX_BATCH} files per request"), 413

    results = []
    for entry in files:
        name = (entry or {}).get("filename", "unnamed")
        try:
            report = run_audit(
                entry["config_text"],
                entry["source_type"],
                name,
                framework=framework,
            )
            results.append({
                "filename": name,
                "ok": True,
                "compliance_score": report["compliance_score"],
                "findings": len(report["findings"]),
                "critical": sum(1 for f in report["findings"]
                                if f["severity"] == "critical"),
                "attack_paths": len(report["attack_paths"]),
                "unparsed": len(report["unparsed"]),
                "report": report,
            })
        except Exception as exc:
            # One unreadable file must not lose the rest of the batch.
            results.append({
                "filename": name,
                "ok": False,
                "error": f"{type(exc).__name__}: {exc}",
            })

    audited = [r for r in results if r["ok"]]
    return jsonify({
        "count": len(results),
        "audited": len(audited),
        "failed": len(results) - len(audited),
        # Worst score first — that's the device to look at.
        "results": sorted(results, key=lambda r: r.get("compliance_score", 999)),
    })

@app.get("/api/frameworks")
def frameworks():
    """Frameworks the loaded rulesets actually cover.

    Derived from the rules rather than hardcoded, so the selector can only offer
    something we can genuinely evaluate against. Today that is CIS alone —
    adding NIST means authoring YAML, not changing code.
    """
    return jsonify(frameworks=available_frameworks())

if __name__ == "__main__":
    app.run(port=5000, debug=True)

