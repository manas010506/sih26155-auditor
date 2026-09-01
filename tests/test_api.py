"""Repo path: tests/test_api.py     Owner: Manas

Guards the seam between the UI and the engine. Uses Flask's test client, so it
needs no running server.

Three tests are marked xfail because api/app.py is still STAGE 1 — it returns
samples/sample_report.json regardless of what you post. When Sanavi wires
run_audit() they turn to XPASS; remove the markers then.
"""
import pathlib

import pytest

from api.app import app

ROOT = pathlib.Path(__file__).resolve().parent.parent
CISCO = (ROOT / "samples" / "sample_cisco_ios.cfg").read_text(encoding="utf-8")
TERRAFORM = (ROOT / "samples" / "main.tf").read_text(encoding="utf-8")


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def post(client, **body):
    return client.post("/api/audit", json=body)


# ----------------------------------------------------------------- liveness
def test_health(client):
    assert client.get("/api/health").get_json() == {"status": "ok"}


# ------------------------------------------------------------- the contract
def test_cisco_returns_the_cisco_report(client):
    r = post(client, config_text=CISCO, source_type="cisco_ios")
    assert r.status_code == 200
    body = r.get_json()
    assert body["source"]["type"] == "cisco_ios"
    assert len(body["findings"]) == 27
    assert body["compliance_score"] == 15
    assert len(body["attack_paths"]) == 3


@pytest.mark.xfail(reason="api/app.py is STAGE 1 - returns the sample file "
                          "regardless of input. Remove this marker after "
                          "run_audit() is wired in.")
def test_terraform_returns_the_terraform_report(client):
    """Posting main.tf currently returns the CISCO report: 27 findings, not 20."""
    r = post(client, config_text=TERRAFORM, source_type="terraform_aws")
    body = r.get_json()
    assert body["source"]["type"] == "terraform_aws"
    assert len(body["findings"]) == 20
    assert body["compliance_score"] == 15


@pytest.mark.xfail(reason="STAGE 1 ignores config_text entirely")
def test_a_clean_config_scores_higher_than_a_bad_one(client):
    """The single clearest proof the endpoint reads its input."""
    clean = (ROOT / "tests" / "corpus" / "clean_baseline.cfg").read_text(encoding="utf-8")
    bad = post(client, config_text=CISCO, source_type="cisco_ios").get_json()
    good = post(client, config_text=clean, source_type="cisco_ios").get_json()
    assert good["compliance_score"] > bad["compliance_score"]


# ------------------------------------------------- judges upload strange things
def test_missing_config_text_is_400(client):
    assert post(client, source_type="cisco_ios").status_code == 400


@pytest.mark.xfail(reason="STAGE 1 uses `if not config_text`, so whitespace-only "
                          "input is truthy and returns a full report with a 200. "
                          "run_audit() checks .strip(), so STAGE 2 fixes this.")
def test_empty_config_text_is_400(client):
    assert post(client, config_text="   ", source_type="cisco_ios").status_code == 400


def test_unknown_source_type_is_400(client):
    r = post(client, config_text=CISCO, source_type="juniper_junos")
    assert r.status_code == 400
    assert "source_type" in r.get_json()["error"]


def test_no_body_at_all_is_400(client):
    assert client.post("/api/audit").status_code in (400, 415)


@pytest.mark.xfail(reason="config_text is not type-checked - a dict raises "
                          "AttributeError and returns 500 with a stack trace")
def test_non_string_config_text_is_400_not_500(client):
    r = post(client, config_text={"nested": "object"}, source_type="cisco_ios")
    assert r.status_code == 400


def test_oversized_config_is_413(client):
    r = post(client, config_text="x" * (3 * 1024 * 1024), source_type="cisco_ios")
    assert r.status_code == 413


def test_binary_garbage_does_not_500(client):
    """A judge will upload a .jpg at some point."""
    r = post(client, config_text="\x00\x01\x02 not a config", source_type="cisco_ios")
    assert r.status_code != 500
