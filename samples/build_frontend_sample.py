"""Regenerate frontend/src/sample_report.json, the file behind the
VIEW_SAMPLE_REPORT button, from the engine.

Run after any rule, parser or chain change, alongside build_fixtures*.py.
Learned mappings are excluded so a demo session can't leak into it.
"""
import json
import pathlib
import sys
import tempfile

sys.path.insert(0, ".")

from engine.parsers import learned

learned.MAPPINGS_PATH = pathlib.Path(tempfile.mkdtemp()) / "none.json"

from engine.audit import run_audit  # noqa: E402

text = pathlib.Path("samples/sample_cisco_ios.cfg").read_text(encoding="utf-8")
report = run_audit(text, "cisco_ios", "sample_cisco_ios.cfg", enrich=True)

out = pathlib.Path("frontend/src/sample_report.json")
out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print(f"score={report['compliance_score']}  findings={len(report['findings'])}  "
      f"passed={len(report['passed'])}  paths={len(report['attack_paths'])}  "
      f"narratives={sum(1 for p in report['attack_paths'] if p.get('narrative'))}")
