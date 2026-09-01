"""Repo path: tests/generate_corpus.py     Owner: Deep

The time-saver. Do NOT hand-label 40 configs.

One hardened baseline, N variants each with a known misconfiguration injected.
The injection IS the ground truth, so expected/ is emitted automatically and is
correct by construction.

Run:  python tests/generate_corpus.py
Out:  tests/corpus/*.cfg  +  tests/expected/*.json
"""
import itertools
import json
import pathlib
import random

HERE = pathlib.Path(__file__).parent
BASELINE = HERE / "corpus" / "clean_baseline.cfg"
CORPUS = HERE / "corpus"
EXPECTED = HERE / "expected"
SEED = 26155                     # deterministic - same corpus for everyone


def sub(old, new):
    return lambda ls: [new if l.strip() == old else l for l in ls]


def drop(*startswith):
    return lambda ls: [l for l in ls if not l.strip().startswith(startswith)]


def add_after(anchor, *added):
    def f(ls):
        out = []
        for l in ls:
            out.append(l)
            if l.strip() == anchor:
                out.extend(added)
        return out
    return f


def drop_child(parent, child):
    """Remove `child` only where it sits under `parent`."""
    def f(ls):
        out, inside = [], False
        for l in ls:
            if l.strip() == parent:
                inside = True
            elif not l.startswith(" ") and l.strip():
                inside = False
            if inside and l.strip() == child:
                continue
            out.append(l)
        return out
    return f


def sub_child(parent, old, new):
    def f(ls):
        out, inside = [], False
        for l in ls:
            if l.strip() == parent:
                inside = True
            elif not l.startswith(" ") and l.strip():
                inside = False
            out.append(new if (inside and l.strip() == old) else l)
        return out
    return f


# rule_id -> mutation that makes that rule FAIL
MUTATIONS = {
    "CIS-NET-001": sub_child("line vty 0 4", "transport input ssh",
                             " transport input telnet ssh"),
    "CIS-NET-002": sub("no ip http server", "ip http server"),
    "CIS-NET-003": sub_child("line vty 0 4", "exec-timeout 10 0", " exec-timeout 0 0"),
    "CIS-NET-004": drop_child("line vty 0 4", "access-class MGMT-HOSTS in"),
    "CIS-NET-005": sub("service password-encryption", "no service password-encryption"),
    "CIS-NET-006": sub("enable secret 9 $9$PLACEHOLDERHASHvalue0",
                       "enable password cisco123"),
    "CIS-NET-007": sub("username admin privilege 1 secret 9 $9$PLACEHOLDERHASHvalue1",
                       "username admin privilege 15 password 0 admin123"),
    "CIS-NET-008": add_after("snmp-server group SECURE v3 priv",
                             "snmp-server community public RO"),
    "CIS-NET-009": add_after("snmp-server group SECURE v3 priv",
                             "snmp-server community private RW"),
    "CIS-NET-011": drop("logging host", "logging trap"),
    "CIS-NET-012": drop("ntp authenticate", "ntp authentication-key", "ntp trusted-key"),
    "CIS-NET-013": sub("aaa new-model", "no aaa new-model"),
    "CIS-NET-014": drop("banner login", "Authorised access only", "^C"),
    "CIS-NET-015": sub("no cdp run", "cdp run"),
    "CIS-NET-016": drop("ip ssh version"),
}


def apply(lines, rule_ids):
    for rid in rule_ids:
        lines = MUTATIONS[rid](lines)
    return lines


def write(name, lines, rule_ids):
    (CORPUS / f"{name}.cfg").write_text("\n".join(lines) + "\n")
    (EXPECTED / f"{name}.json").write_text(json.dumps({
        "config": f"{name}.cfg",
        "expected_rule_ids": sorted(rule_ids),
        "seeded_count": len(rule_ids),
    }, indent=2) + "\n")


def main():
    CORPUS.mkdir(parents=True, exist_ok=True)
    EXPECTED.mkdir(parents=True, exist_ok=True)
    base = BASELINE.read_text().splitlines()
    rng = random.Random(SEED)
    ids = sorted(MUTATIONS)

    # 1. the clean one - this is where false positives are measured
    write("clean_000", base, [])

    # 2. one file per rule - isolates every detection
    for i, rid in enumerate(ids, 1):
        write(f"single_{i:03d}", apply(base, [rid]), [rid])

    # 3. realistic combinations of 2-4
    for i in range(1, 21):
        k = rng.choice([2, 2, 3, 3, 4])
        combo = rng.sample(ids, k)
        write(f"combo_{i:03d}", apply(base, combo), combo)

    n = len(list(CORPUS.glob("*.cfg")))
    seeded = sum(json.loads(p.read_text())["seeded_count"]
                 for p in EXPECTED.glob("*.json"))
    print(f"{n} configs, {seeded} seeded misconfigurations, {len(ids)} distinct rules")
    print("NOTE: add 4-5 hand-written messy real configs by hand. Generated ones")
    print("      are too clean and will not surface parser edge cases.")


if __name__ == "__main__":
    main()
