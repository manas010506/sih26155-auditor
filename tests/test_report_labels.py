import pathlib

import pytest

from engine.audit import run_audit
from engine.parsers import learned
from engine.report import _remediation_label, build_report

ROOT = pathlib.Path(__file__).resolve().parent.parent


@pytest.fixture(autouse=True)
def _isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(learned, "MAPPINGS_PATH", tmp_path / "mappings.json")


def audit(name, src):
    text = (ROOT / "samples" / name).read_text(encoding="utf-8")
    return run_audit(text, src, name, enrich=False)


def test_remediation_label_follows_the_audited_device():
    assert _remediation_label(audit("sample_cisco_ios.cfg", "cisco_ios")) == "Remediation:"
    assert "Terraform" in _remediation_label(audit("main.tf", "terraform_aws"))
    assert "reference syntax" in _remediation_label(audit("sample_juniper.conf", "juniper_junos"))
    assert "reference syntax" in _remediation_label(audit("demo_aruba.cfg", "cisco_ios"))


def test_pdf_survives_markup_characters_from_the_config():
    """Config text is untrusted: `policy = <<EOF` is ordinary Terraform."""
    r = audit("sample_cisco_ios.cfg", "cisco_ios")
    r["findings"][0]["raw_ref"] = {"line": 1, "snippet": "policy = <<EOF & <b>"}
    r["unparsed"] = [{"line": 2, "text": "<weird> & stuff", "suggestion": None}]
    assert bytes(build_report(r)[:4]) == b"%PDF"
