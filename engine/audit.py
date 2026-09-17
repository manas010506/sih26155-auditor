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
from engine.parsers.suggest import suggest_all
from engine.rules.engine import evaluate, load_rules, score
from engine.schema.schema import validate
from engine.rules.engine import DEFAULT_FRAMEWORK, evaluate, load_rules, score
from engine import cve

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHAINS = ROOT / "engine" / "correlation" / "attack_chains.yaml"

# source_type -> (module path, class name, rules file, default filename)
# Parsers are imported lazily so an unfinished one can't break the whole engine.
SOURCES = {
    "cisco_ios": ("engine.parsers.cisco_ios", "CiscoIOSParser",
                  ROOT / "engine/rules/cisco_rules.yaml", "config.cfg"),
    # Juniper uses the SAME ruleset as Cisco. The rules read the normalized
    # model, not vendor syntax, so a second network vendor costs a parser and
    # nothing else.
    "juniper_junos": ("engine.parsers.juniper_junos", "JuniperJunOSParser",
                      ROOT / "engine/rules/cisco_rules.yaml", "config.conf"),
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
                "os_version": "provider ~> 5.0", "role": "cloud_account"}

    if source_type == "juniper_junos":
        g = next((r for r in doc["resources"] if r["type"] == "global_settings"), None)
        a = g["attributes"] if g else {}
        return {
            "hostname": a.get("hostname") or "Not available in supplied configuration",
            "vendor": "juniper",
            "os": "JunOS",
            "os_version": a.get("os_version") or "Not available in supplied configuration",
            "model": a.get("model") or "Not available in supplied configuration",
            "serial_number": a.get("serial_number") or "Not available in supplied configuration",
            "firmware": a.get("firmware") or "Not available in supplied configuration",
            "role": "network_device",
        }

    g = next((r for r in doc["resources"] if r["type"] == "global_settings"), None)
    attrs = g["attributes"] if g else {}
    na = "Not available in supplied configuration"

    # The IOS parser is also the fallback for vendors with no parser of their
    # own (Aruba, MikroTik). Claim Cisco IOS only when an IOS version line was
    # actually found; otherwise say we don't know, and say how it was audited.
    identified = bool(attrs.get("os_version"))

    return {
        "hostname": attrs.get("hostname") or na,
        "vendor": "cisco" if identified else "Not identified",
        "os": "IOS" if identified else "Not identified (audited with the Cisco IOS parser)",
        "os_version": attrs.get("os_version") or na,
        "model": attrs.get("model") or na,
        "serial_number": attrs.get("serial_number") or na,
        "firmware": attrs.get("firmware") or na,
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


def available_frameworks() -> list[str]:
    """Frameworks the loaded rulesets actually cover.

    Derived from the rules, not hardcoded, so the selector can only ever offer
    something we can genuinely evaluate against.
    """
    seen: set[str] = set()
    for _, _, rules_path, _ in SOURCES.values():
        try:
            for rule in load_rules(str(rules_path)):
                seen.add(rule.get("framework", "CIS"))
        except Exception:
            continue
    return sorted(seen)

# Share of a file's code lines the parser must recognise before the file is
# treated as that parser's own format. Measured 16 Sep across all 59 tracked
# configs: every real config is at 76% or above, every probe/demo file at 43%
# or below. A real config dense with unsupported syntax could fall under this.
NATIVE_THRESHOLD = 0.6


def _code_lines(text: str) -> list[str]:
    return [l for l in text.splitlines()
            if l.strip() and not l.lstrip().startswith(("!", "#"))]


def _learned_lines(doc: dict) -> set:
    """Lines recognised only through a learned mapping."""
    from_refs = {ref["line"]
                 for r in doc["resources"]
                 for ref in (r.get("attribute_refs") or {}).values()
                 if isinstance(ref, dict) and ref.get("learned")}
    return from_refs | set(doc.get("_learned_lines") or [])


def _recognised_share(text: str, doc: dict) -> float:
    """Share of code lines the parser itself recognised. A taught line is
    evidence, but it does not make a file the parser's native format:
    otherwise teaching a few lines would switch a foreign file back to being
    scored against the parser's defaults."""
    total = len(_code_lines(text))
    if total == 0:
        return 0.0
    not_native = len(doc.get("_unparsed", [])) + len(_learned_lines(doc))
    return max(0.0, 1 - not_native / total)


def _needed_attributes(rule: dict) -> set:
    when = rule.get("when") or {}
    return {rule["check"]["attribute"], *(when if isinstance(when, dict) else {})}


def _evidenced_only(doc: dict, rules: list[dict]) -> tuple[dict, list[dict]]:
    """For a file the parser does not natively understand, keep only what a
    line in the file supports. A rule is evaluated only when every attribute
    it reads, its `when` condition included, is backed by a line; otherwise
    a missing condition lets the rule pass on nothing."""
    kept = [r for r in doc["resources"]
            if r.get("raw_ref") is not None or r.get("attribute_refs")]
    evidenced = [rule for rule in rules
                 if any(r["type"] == rule["applies_to"]
                        and _needed_attributes(rule) <= set(r.get("attribute_refs") or {})
                        for r in kept)]
    return {**doc, "resources": kept}, evidenced

def run_audit(config_text: str, source_type: str, filename: str | None = None,
              enrich: bool = True, framework: str | None = None) -> dict:
    """Audit one configuration file. Returns the Report shape (Handbook 4.2).

    Raises ValueError on an unknown source_type or empty input — the API turns
    that into a clean 400 rather than a 500.

    enrich=False skips the LLM narrative pass. Tests use it so their results
    never depend on a network call or a cache state.

    framework filters the ruleset to one benchmark (CIS, NIST, STIG,
    ISO27001). None means DEFAULT_FRAMEWORK (CIS); each framework is
    scored on its own, so results never mix benchmarks.
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

    rules = load_rules(str(rules_path), framework=framework or DEFAULT_FRAMEWORK)
    if not rules:
        raise ValueError(
            f"no rules for framework {framework!r} and source type {source_type!r}")
    all_rules = rules
    recognised = _recognised_share(config_text, doc)
    native = recognised >= NATIVE_THRESHOLD
    if not native:
        doc, rules = _evidenced_only(doc, rules)

    findings = evaluate(doc, rules) if rules else []
    attack_paths = correlate(findings, str(CHAINS))
    if rules:
        scored = score(findings, rules, {r["type"] for r in doc["resources"]})
    else:
        scored = score([], all_rules, set())      # existing not-assessable path

    breakdown = scored["score_breakdown"]
    breakdown["recognised_share"] = round(recognised, 2)
    breakdown["controls_total"] = len(all_rules)
    # Lines recognised only because an administrator taught them. The
    # training page counts them, so progress survives a re-audit.
    breakdown["lines_taught"] = len(_learned_lines(doc))
    compliance_score = scored["compliance_score"]
    if not native and rules:
        # A few evidenced checks are not a compliance verdict: a percentage
        # over three rules reads 100/100 on a device with a plaintext password.
        # Report the checks, withhold the score.
        breakdown["partial"] = True
        compliance_score = None

    if enrich:
        _enrich_narratives(attack_paths)


        
    report = {
        "source": {"type": source_type, "filename": filename},
        "device": _device_block(doc, source_type),
        "compliance_score": compliance_score,
        "score_breakdown": scored["score_breakdown"],
        "findings": findings,
        "attack_paths": attack_paths,
        "passed": scored["passed"],
        # Lines the parser did not recognise, each with a proposed mapping.
        # The problem statement asks for pattern matching to identify keywords
        # in configurations the system has not been pre-trained on: the
        # suggestion is that step. It only ever proposes - an administrator
        # confirms, and the confirmed mapping is what the parser applies.
        "unparsed": suggest_all(doc.get("_unparsed", [])),
    }

    # Version-level CVE context from the offline cache. Read-only, runs after
    # scoring, never influences findings or the compliance score.
    if enrich:
        cve.enrich(report)

    return report


if __name__ == "__main__":
    import json
    import sys

    text = open(sys.argv[1], encoding="utf-8").read()
    print(json.dumps(run_audit(text, sys.argv[2], pathlib.Path(sys.argv[1]).name), indent=2))
