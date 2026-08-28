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

from flask import Flask, jsonify, request
from flask_cors import CORS

# STAGE 2: from engine.audit import run_audit

app = Flask(__name__)
CORS(app)

SAMPLE = pathlib.Path("samples/sample_report.json")
MAX_BYTES = 2 * 1024 * 1024
VALID_TYPES = {"cisco_ios", "terraform_aws"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/audit")
def audit():
    body = request.get_json(silent=True) or {}
    config_text = body.get("config_text", "")
    source_type = body.get("source_type", "")

    if not config_text:
        return jsonify(error="config_text is required"), 400
    if len(config_text.encode()) > MAX_BYTES:
        return jsonify(error="config file too large (2MB limit)"), 413
    if source_type not in VALID_TYPES:
        return jsonify(error=f"source_type must be one of {sorted(VALID_TYPES)}"), 400

    try:
        # STAGE 1:
        return jsonify(json.loads(SAMPLE.read_text()))
        # STAGE 2: return jsonify(run_audit(config_text, source_type))
    except Exception as exc:                      # never leak a stack trace
        app.logger.exception("audit failed")
        return jsonify(error=f"audit failed: {type(exc).__name__}"), 500


if __name__ == "__main__":
    app.run(port=5000, debug=True)
