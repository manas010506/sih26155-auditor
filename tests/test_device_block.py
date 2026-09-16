import pathlib

from engine.audit import run_audit

SAMPLES = pathlib.Path(__file__).resolve().parent.parent / "samples"


def audit(name, source_type):
    text = (SAMPLES / name).read_text(encoding="utf-8")
    return run_audit(text, source_type, enrich=False)["device"]


def test_real_ios_config_is_identified_as_cisco():
    dev = audit("sample_cisco_ios.cfg", "cisco_ios")
    assert dev["vendor"] == "cisco"
    assert dev["os"] == "IOS"


def test_fallback_parse_does_not_claim_cisco():
    """Aruba has no parser. Auditing it through the IOS parser must not
    report the device as a Cisco IOS router."""
    dev = audit("demo_aruba.cfg", "cisco_ios")
    assert dev["vendor"] != "cisco"
    assert "Cisco IOS parser" in dev["os"]