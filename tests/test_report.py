"""Repo path: tests/test_report.py     Owner: Manas

The PDF is the deliverable an auditor actually files, so these tests read the
text back out of it rather than checking that a file exists. A report that
generates but says the wrong thing is worse than one that fails loudly.

Run:  python -m pytest tests/test_report.py -v
"""
import pathlib

import pytest

from engine.audit import run_audit
from engine.report import build_report

SAMPLES = pathlib.Path(__file__).resolve().parent.parent / "samples"


def report_text(filename, source_type):
    """Build the PDF and extract its text so we can assert on content."""
    pdfminer = pytest.importorskip("pdfminer.high_level")
    import io
    text = (SAMPLES / filename).read_text(encoding="utf-8")
    pdf = build_report(run_audit(text, source_type))
    return pdfminer.extract_text(io.BytesIO(pdf))


def test_pdf_is_a_pdf():
    text = (SAMPLES / "sample_cisco_ios.cfg").read_text(encoding="utf-8")
    pdf = build_report(run_audit(text, "cisco_ios"))
    assert pdf.startswith(b"%PDF-")
    assert len(pdf) > 5000


def test_cover_carries_device_identity():
    out = report_text("sample_cisco_ios.cfg", "cisco_ios")
    assert "EDGE-RTR-01" in out
    assert "15.2" in out


def test_absent_hardware_is_stated_not_omitted():
    """The problem statement asks for serial and hardware details. We show the
    rows and say we could not find them, rather than dropping them silently."""
    out = report_text("sample_cisco_ios.cfg", "cisco_ios")
    assert "Serial number" in out
    assert "Not available in supplied configuration" in out

def test_findings_carry_evidence_and_remediation():
    out = report_text("sample_cisco_ios.cfg", "cisco_ios")
    assert "CIS-NET-001" in out
    assert "Remediation" in out


def test_attack_paths_name_the_breaking_fix():
    out = report_text("sample_cisco_ios.cfg", "cisco_ios")
    assert "Attack paths" in out
    assert "Breaks the chain" in out


def test_unparsed_lines_are_reported_as_unread():
    """17 unrecognised lines are neither passes nor failures."""
    out = report_text("demo_mikrotik.cfg", "cisco_ios")
    assert "Unrecognised configuration" in out
    assert "floor rather than a verdict" in out


def test_cloud_account_has_no_hardware_rows():
    out = report_text("main.tf", "terraform_aws")
    assert "aws-account" in out
    assert "Serial number" not in out

def test_unimplemented_frameworks_are_not_scored():
    """Three distinct states. A framework we have rules for but did not audit
    against is not the same as one we have never implemented, and a report that
    said "not implemented" for CIS on every NIST audit would understate the
    tool."""
    out = report_text("sample_cisco_ios.cfg", "cisco_ios")
    assert "CIS" in out
    assert "Evaluated" in out
    assert "No rules implemented" in out       # STIG and ISO 27001
    assert "Not selected for this audit" in out  # NIST exists, wasn't chosen