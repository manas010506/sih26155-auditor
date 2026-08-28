"""Repo path: tests/test_cisco_parser.py     Owner: Kashvi
Run:  pytest tests/test_cisco_parser.py -v
Red today, green by Sunday night.
"""
import json
import pytest

from engine.parsers.cisco_ios import CiscoIOSParser

CFG = "samples/sample_cisco_ios.cfg"
GOLDEN = "samples/normalized_examples.json"


@pytest.fixture
def parsed():
    return CiscoIOSParser().parse(open(CFG).read(), "sample_cisco_ios.cfg")


@pytest.fixture
def golden():
    return json.load(open(GOLDEN))["cisco_example"]


def _by_id(doc):
    return {r["id"]: r for r in doc["resources"]}


@pytest.mark.parametrize("rid", [
    "global", "enable-password", "user-admin", "user-netops",
    "snmp-public", "snmp-private", "snmp", "vty-0-4", "vty-5-15",
    "con-0", "ssh", "logging", "ntp",
])
def test_resource_matches(parsed, golden, rid):
    """One test per resource so you can see exactly what is left to do."""
    got, want = _by_id(parsed), _by_id(golden)
    assert rid in got, f"{rid} not produced yet"
    assert got[rid] == want[rid]


def test_full_document(parsed, golden):
    assert parsed == golden


def test_never_raises_on_garbage():
    doc = CiscoIOSParser().parse("\x00\x01 not a config at all", "junk.bin")
    assert doc["resources"] == [] or isinstance(doc["resources"], list)
