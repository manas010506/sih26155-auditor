"""Repo path: engine/audit.py     Owner: Manas

The single entry point. Everything above this file is a library; everything
below it (the Flask API, the UI) calls only this.

    config text  ->  parser  ->  normalized schema  ->  rule engine
                 ->  correlation  ->  report

No parsing, matching or scoring logic lives here. This is assembly.
"""
import importlib
import pathlib

from engine.correlation.correlator import correlate
from engine.rules.engine import evaluate, load_rules, score
from engine.schema.schema import validate

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHAINS = ROOT / "engine" / "correlation" / "attack_chains.yaml"

# source_type -> (module path, class name, rules file, default filename)
# Parsers are imported lazily so an unfinished one can't break the whole engine.
SOURCES = {
    "cisco_ios": ("engine.parsers.cisco_ios", "CiscoIOSParser",
                  ROOT / "engine/rules/cisco_rules.yaml", "config.cfg"),
    "terraform_aws": ("engine.parsers.terraform_aws", "TerraformAWSParser",
                      ROOT / "engine/rules/aws_rules.yaml", "main.tf"),
}


def _parser_for(source_type: str):
    module_path, class_name, _, _ = SOURCES[source_type]
    module = importlib.import_module(module_path)
    cls = getattr(module, class_name, None)
    if cls is None:
        raise NotImplementedError(
            f"the {source_type} parser is not implemented yet "
            f"({module_path}.{class_name} does not exist)")
    return cls()


def _device_block(doc: dict, source_type: str) -> dict:
    """Identify the audited thing. The PDF report requires this section."""
    if source_type == "terraform_aws":
        return {"hostname": "aws-account", "vendor": "aws", "os": "terraform",
                "version": "provider ~> 5.0", "role": "cloud_account"}

    g = next((r for r in doc["resources"] if r["type"] == "global_settings"), None)
    attrs = g["attributes"] if g else {}
    return {
        "hostname": attrs.get("hostname") or "unknown",
        "vendor": "cisco",
        "os": "IOS",
        "version": attrs.get("os_version") or "unknown",
        "role": "network_device",
    }


def _enrich_narratives(attack_paths: list[dict]) -> None:
    """Upgrade attack-path prose from the template to the LLM, in place.

    Attack paths only - never findings. Narrating 27 findings would be 27
    network calls and a 30-second audit.

    Every path already carries deterministic template text from the chain
    definition, so this can only improve the report, never break it.
    generate_narrative() returns the template on any failure, and a failure here
    must not fail the audit - the offline demo depends on that.
    """
    from engine.narrative.generator import generate_narrative

    for path in attack_paths:
        try:
            text = generate_narrative(path, "attack_path")
            if text:
                path["narrative"] = text
        except Exception:                      # never let prose break an audit
            continue


def run_audit(config_text: str, source_type: str, filename: str | None = None,
              enrich: bool = True) -> dict:
    """Audit one configuration file. Returns the Report shape (Handbook 4.2).

    Raises ValueError on an unknown source_type or empty input — the API turns
    that into a clean 400 rather than a 500.

    enrich=False skips the LLM narrative pass. Tests use it so their results
    never depend on a network call or a cache state.
    """
    if source_type not in SOURCES:
        raise ValueError(
            f"unknown source_type {source_type!r}; expected one of {sorted(SOURCES)}")
    if not config_text or not config_text.strip():
        raise ValueError("config_text is empty")

    _, _, rules_path, default_name = SOURCES[source_type]
    filename = filename or default_name

    doc = _parser_for(source_type).parse(config_text, filename)

    # A parser bug should surface here, not three layers down as a KeyError.
    problems = validate(doc)
    if problems:
        raise ValueError(f"{source_type} parser produced an invalid document: "
                         f"{problems[0]}")

    rules = load_rules(str(rules_path))
    findings = evaluate(doc, rules)
    attack_paths = correlate(findings, str(CHAINS))
    scored = score(findings, rules)

    if enrich:
        _enrich_narratives(attack_paths)

    return {
        "source": {"type": source_type, "filename": filename},
        "device": _device_block(doc, source_type),
        "compliance_score": scored["compliance_score"],
        "score_breakdown": scored["score_breakdown"],
        "findings": findings,
        "attack_paths": attack_paths,
        # Lines the parser did not recognise. This is what the training
        # interface reads: unknown vendor syntax surfaces here instead of being
        # silently dropped.
        "unparsed": doc.get("_unparsed", []),
    }


if __name__ == "__main__":
    import json
    import sys

    text = open(sys.argv[1], encoding="utf-8").read()
    print(json.dumps(run_audit(text, sys.argv[2], pathlib.Path(sys.argv[1]).name), indent=2))