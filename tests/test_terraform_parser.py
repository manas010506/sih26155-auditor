"""Repo path: tests/test_terraform_parser.py     Owner: Manas

Your spec. Nine resource tests go green one at a time, then the full document.
Run:  python -m pytest tests/test_terraform_parser.py -v
"""
import json
import pathlib

import pytest

from engine.parsers.terraform_aws import TerraformAWSParser

SAMPLES = pathlib.Path(__file__).resolve().parent.parent / "samples"
TF = SAMPLES / "main.tf"
GOLDEN = SAMPLES / "normalized_examples.json"


def parsed():
    return TerraformAWSParser().parse(TF.read_text(encoding="utf-8"), "main.tf")


def golden():
    return json.loads(GOLDEN.read_text(encoding="utf-8"))["terraform_example"]


def _by_id(doc):
    return {r["id"]: r for r in doc["resources"]}


@pytest.mark.parametrize("rid", [
    # build in this order - s3 is the hard one, do it first
    "s3-sensitive_data",
    "s3-app_logs",
    "sg-web-ingress-22",
    "sg-web-ingress-3389",
    "sg-web-ingress-0-65535",
    "iam-app_policy",
    "rds-app_db",
    "kms-app_key",
    "cloudtrail-main",
])
def test_resource_matches(rid):
    """One test per resource so you can see exactly what is left."""
    got, want = _by_id(parsed()), _by_id(golden())
    assert rid in got, f"{rid} not produced yet"
    assert got[rid] == want[rid]


def test_source_block():
    doc = parsed()
    assert doc["source"] == {"type": "terraform_aws", "filename": "main.tf"}


def test_full_document():
    assert parsed() == golden()


def test_never_raises_on_garbage():
    """run_audit depends on this - a parser must never crash the engine."""
    doc = TerraformAWSParser().parse("this is not terraform {{{", "junk.tf")
    assert isinstance(doc["resources"], list)