"""Repo path: tests/test_training.py     Owner: Manas

The training seam: POST stores a mapping, GET returns it, and a taught
prefix matches a line with different arguments.
"""
import pytest

from api.app import app
from engine.parsers import learned


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(learned, "MAPPINGS_PATH", tmp_path / "learned_mappings.json")
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def post(client, **body):
    return client.post("/api/training", json=body)


VALID = dict(
    line=87,
    text="set system syslog host 10.10.0.200 any notice",
    source_type="cisco_ios",
    resource_type="logging",
    attribute="hosts",
    value="10.10.0.200",
)


def test_post_stores_a_mapping(client):
    r = post(client, **VALID)
    assert r.status_code == 201
    assert r.get_json()["prefix"] == "set system syslog host"


def test_get_returns_stored_mappings(client):
    post(client, **VALID)
    body = client.get("/api/training").get_json()
    assert len(body["mappings"]) == 1
    assert body["mappings"][0]["attribute"] == "hosts"


def test_same_prefix_replaces_rather_than_duplicates(client):
    post(client, **VALID)
    post(client, **{**VALID, "value": "10.10.0.99"})
    mappings = client.get("/api/training").get_json()["mappings"]
    assert len(mappings) == 1
    assert mappings[0]["value"] == "10.10.0.99"


@pytest.mark.parametrize("missing", ["text", "source_type", "resource_type", "attribute", "value"])
def test_missing_field_is_400(client, missing):
    assert post(client, **{k: v for k, v in VALID.items() if k != missing}).status_code == 400


def test_whitespace_only_field_is_400(client):
    assert post(client, **{**VALID, "attribute": "   "}).status_code == 400


def test_unknown_source_type_is_400(client):
    assert post(client, **{**VALID, "source_type": "arista_eos"}).status_code == 400


def test_non_string_field_is_400_not_500(client):
    assert post(client, **{**VALID, "attribute": {"nested": "object"}}).status_code == 400


def test_taught_prefix_matches_a_line_with_different_arguments(client):
    """The point of prefix matching: a judge changing the IP must still match."""
    post(client, **VALID)
    mappings = client.get("/api/training").get_json()["mappings"]
    hit = learned.match_line("set system syslog host 192.0.2.55 any info", mappings)
    assert hit is not None and hit["attribute"] == "hosts"


def test_unrelated_line_does_not_match(client):
    post(client, **VALID)
    mappings = client.get("/api/training").get_json()["mappings"]
    assert learned.match_line("set system login user admin class super-user", mappings) is None


def test_missing_file_returns_empty_not_an_error(client, tmp_path, monkeypatch):
    monkeypatch.setattr(learned, "MAPPINGS_PATH", tmp_path / "nope.json")
    assert client.get("/api/training").get_json()["mappings"] == []