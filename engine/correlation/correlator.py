"""Repo path: engine/correlation/correlator.py     Owner: Manas
 
Groups individual findings into attack paths.
 
A finding says "this one setting is wrong". A chain says "these three wrong
settings combine into a route an attacker can walk, and here is the single fix
that breaks it". The chain definitions live in attack_chains.yaml — no chain
logic is hardcoded here, same principle as the rule engine.
"""
import yaml
 
REQUIRED_FIELDS = ("chain_id", "name", "severity", "requires",
                   "break_chain", "narrative_template")
 
 
class ChainError(ValueError):
    """A chain file the correlator refuses to load."""
 
 
def load_chains(path: str) -> list[dict]:
    """Read attack_chains.yaml and fail loudly on anything malformed."""
    chains = yaml.safe_load(open(path, encoding="utf-8"))
    if not isinstance(chains, list):
        raise ChainError(f"{path}: expected a list of chains")
 
    seen = set()
    for i, chain in enumerate(chains):
        where = chain.get("chain_id", f"chain #{i + 1}") if isinstance(chain, dict) else f"chain #{i + 1}"
        if not isinstance(chain, dict):
            raise ChainError(f"{path}: {where} is not a mapping")
 
        missing = [f for f in REQUIRED_FIELDS if f not in chain]
        if missing:
            raise ChainError(f"{path}: {where} is missing {', '.join(missing)}")
 
        if chain["chain_id"] in seen:
            raise ChainError(f"{path}: duplicate chain_id {chain['chain_id']}")
        seen.add(chain["chain_id"])
 
        if not chain["requires"]:
            raise ChainError(f"{path}: {where} has an empty requires list")
 
        fix = chain["break_chain"].get("fix_rule")
        if fix not in chain["requires"]:
            raise ChainError(
                f"{path}: {where} break_chain.fix_rule {fix!r} is not in its own "
                f"requires list. The fix has to be one of the links in the chain.")
 
        n = chain.get("min_matches", len(chain["requires"]))
        if not isinstance(n, int) or not 1 <= n <= len(chain["requires"]):
            raise ChainError(
                f"{path}: {where} min_matches must be between 1 and "
                f"{len(chain['requires'])}, got {n!r}")
 
    return chains
 
 
def correlate(findings: list[dict], chains_path: str) -> list[dict]:
    """Return the attack_paths list for a set of findings."""
    fired = {f["rule_id"] for f in findings}
    paths = []
 
    for chain in load_chains(chains_path):
        # Only the links that actually fired. Order follows `requires` so the
        # graph reads left to right as the attacker would walk it.
        present = [rid for rid in chain["requires"] if rid in fired]
 
        if len(present) < chain.get("min_matches", len(chain["requires"])):
            continue
 
        # A path whose recommended fix isn't part of the problem is nonsense.
        # This can happen when min_matches is satisfied by other links.
        if chain["break_chain"]["fix_rule"] not in present:
            continue
 
        paths.append({
            "chain_id": chain["chain_id"],
            "name": chain["name"],
            "severity": chain["severity"],
            "contributing_findings": present,
            "narrative": chain["narrative_template"],
            "break_chain": chain["break_chain"],
        })
 
    return paths
 
 
if __name__ == "__main__":
    import json
    import sys
 
    report = json.load(open(sys.argv[1], encoding="utf-8"))
    print(json.dumps(correlate(report["findings"], sys.argv[2]), indent=2))