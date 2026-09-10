"""Repo path: tests/test_device_metadata.py     Owner: Manas

The device block that heads every PDF report. Two things matter here: values
present in the configuration are extracted, and values absent from it say so
rather than being invented. A cloud account is not a device and must not grow
device fields.

Run:  python -m pytest tests/test_device_metadata.py -v
"""
import pathlib

import pytest

from engine.audit import run_audit

SAMPLES = pathlib.Path(__file__).resolve().parent.parent / "samples"

ABSENT = "Not available in supplied configuration"

# Hardware identity is not carried in a text configuration file. These stay
# absent across the whole corpus; the report shows them so the omission is
# visible rather than silent.
UNAVAILABLE_IN_CONFIG = ("model", "serial_number", "firmware")


def device(filename, source_type):
    text = (SAMPLES / filename).read_text(encoding="utf-8")
    return run_audit(text, source_type)["device"]


@pytest.mark.parametrize("filename,source_type,hostname,os_version", [
    ("sample_cisco_ios.cfg", "cisco_ios", "EDGE-RTR-01", "15.2"),
    ("sample_juniper.conf", "juniper_junos", "EDGE-SRX-01", "21.4R3-S4.9"),
])
def test_stated_values_are_extracted(filename, source_type, hostname, os_version):
    """Different syntax, same normalized fields."""
    d = device(filename, source_type)
    assert d["hostname"] == hostname
    assert d["os_version"] == os_version


@pytest.mark.parametrize("filename,source_type", [
    ("sample_cisco_ios.cfg", "cisco_ios"),
    ("sample_juniper.conf", "juniper_junos"),
])
@pytest.mark.parametrize("field", UNAVAILABLE_IN_CONFIG)
def test_absent_values_say_so(filename, source_type, field):
    assert device(filename, source_type)[field] == ABSENT


def test_cloud_account_is_not_a_device():
    """main.tf has no hardware to identify. Adding device fields here would
    fill the report cover with seven lines of nothing."""
    d = device("main.tf", "terraform_aws")
    assert d["hostname"] == "aws-account"
    assert d["role"] == "cloud_account"
    for field in UNAVAILABLE_IN_CONFIG:
        assert field not in d