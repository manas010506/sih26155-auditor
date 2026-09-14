# AI-Driven Multi-Vendor Network Security Compliance Auditor

SIH 2026 · Problem statement **SIH26155** · National Technical Research Organisation

Reads security configurations from network devices (Cisco IOS, Juniper JunOS, MikroTik) and cloud
infrastructure (Terraform/AWS), audits them against CIS and NIST benchmarks, correlates
findings into attack paths, and names the single fix that breaks each path.
Runs fully offline. CVE data is pre-fetched from NVD into a committed cache;
the audit path only ever reads from disk.

```
config file  ->  parser  ->  normalized schema  ->  rule engine
             ->  correlation  ->  narrative  ->  report
```

## Setup

**Requires Python 3.12.** `ciscoconfparse2` depends on `scrypt`, a C extension
that ships prebuilt wheels for specific Python versions only — on others, pip
attempts a source build and needs a C compiler. Verified from a clean clone on
Python 3.12.10 (Windows): 108 tests passing.


```bash
git clone https://github.com/manas010506/sih26155-auditor.git
cd sih26155-auditor

py -3.12 -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

python verify.py                  # should print "all checks passed"
python -m pytest -q
```

## Try it

Audit a deliberately misconfigured Cisco router:

```bash
python -c "from engine.audit import run_audit; \
r = run_audit(open('samples/sample_cisco_ios.cfg', encoding='utf-8').read(), 'cisco_ios'); \
print(r['compliance_score'], len(r['findings']), 'findings,', len(r['attack_paths']), 'attack paths')"
```

→ `15 27 findings, 3 attack paths`

Or dump the whole report:

```bash
python -m engine.audit samples/sample_cisco_ios.cfg cisco_ios
```

Regenerate the labelled test corpus and measure detection accuracy:

```bash
python tests/generate_corpus.py   # 37 labelled configs + ground truth
python -m tests.metrics        # detection rate + false positives
```

Run the API and the UI:

```bash
flask --app api/app.py run --port 5000
cd frontend && npm install && npm run dev
```

## How the score works

```
compliance_score = 100 * (1 - failed_weight / total_weight)
```

`total_weight` sums the severity weight of **every rule evaluated**, not just
the failing ones — a subtract-from-100 approach floors at zero on any realistic
config. Weights: critical 20, high 10, medium 5, low 2. Every report carries a
`score_breakdown` object showing the inputs.

Demo configs: `sample_cisco_ios.cfg` scores **15/100** (27 findings from 32
rules), `main.tf` scores **15/100** (20 findings from 26 rules).

## Accuracy

| Set | Result |
|---|---|
| Generated corpus, 37 configs | 74 of 74 seeded misconfigurations detected, 18 false positives (0 on the clean baseline) |
| Held-out real configs, 6 | 77.4% detection |

The corpus number is a regression check, not an accuracy claim — the configs
were generated with the same misconfigurations the rules look for, so 100% is
the floor we expect, and a drop means something broke. **77.4% on six held-out
real configurations is the number to judge us on.** Those were never used while
writing rules.

The 18 false positives are concentrated in absence-based checks, where a control
present in a form the parser does not yet recognise reads as missing. That is
the cost of treating absence as a finding, and we would rather over-report a
missing control than silently pass a device.

## Design decisions worth knowing

**Rules are data, not code.** Every check lives in
`engine/rules/*.yaml` with a fixed operator vocabulary. Adding a CIS control
means adding YAML, never touching Python. `load_rules()` rejects a rule whose
`applies_to` names a resource type no parser emits — such a rule would never
fire but would still inflate the score.

**Absence is a finding.** Cisco's insecure defaults are silent: a config with no
`no ip http server` line has HTTP *enabled*. Parsers emit those facts with
`raw_ref: null`, and `None` fails every positive operator, so the missing line
is what raises the finding.

**One source of line numbers.** `schema.resolve_ref()` decides what a finding
points at — the per-attribute line if the parser recorded one, otherwise the
resource's own anchor. Nothing else constructs a line number.

**Fixtures are generated, not hand-written.** `samples/build_fixtures*.py` run
the engine to produce `sample_report*.json`, so the fixtures cannot drift from
the rules. `verify.py` independently checks every line number against the raw
config text, that cross-references resolve, and that the score follows from its
own weights.

**Attack paths are validated, not asserted.** Each chain has a minimal positive
fixture and a negative that applies that chain's own `break_chain` fix and
changes nothing else. Expected verdicts were written down before the engine was
run — generating them from engine output would only prove the engine agrees with
itself. Nine tests in `tests/test_attack_chains.py` cover three chains: the
positive fires exactly one chain with the expected findings, the negative fires
nothing, and the named fix is the only link that stopped firing. The report
carries a generated line naming the commit that was validated.

**CVE context is version-level and out of the scoring path.** `engine/cve.py`
reads a committed cache built from NVD's `virtualMatchString` API, filtered to
CVSS v3 critical and high, top five by base score. It runs after scoring and
never influences findings or the compliance score. The match is on OS
major.minor, so a specific maintenance train may already carry the fix — the
report says so rather than implying a vulnerability assessment.

## Layout

| Path | What | Owner |
|---|---|---|
| `engine/schema/` | normalized schema + validation | Manas |
| `engine/parsers/` | `cisco_ios.py`, `terraform_aws.py` | Kashvi, Manas |
| `engine/rules/` | YAML rule definitions | Deep |
| `engine/correlation/` | attack-chain matching | Manas, Deep |
| `engine/narrative/` | explanations, LLM + fallback | Shreyas |
| `engine/audit.py` | `run_audit()` — the single entry point | Manas |
| `api/` | Flask, 3 endpoints | Sanavi |
| `frontend/` | React dashboard + attack-path graph | Vedant, Sanavi |
| `tests/` | corpus, ground truth, metrics | Deep |
| `samples/` | shared fixtures — build against these | Manas |
| `docs/` | roadmap, per-person briefs | — |

The engine is pure Python with no web framework and no database. The API is a
thin wrapper over `run_audit()`.

## Working agreements

- `main` stays working. One priority per branch, full suite before every merge,
  and only Manas merges to `main`.
- `samples/` is the shared truth. If a contract changes, change the fixture and
  tell the group — never diverge quietly.
- Changed a rule or a sample config? Re-run `python samples/build_fixtures.py`
  and `python samples/build_fixtures_aws.py` so the fixtures follow.
- Changed a rule, a chain, or a chain fixture? Re-run
  `python samples/build_validation_summary.py` — the validation line in the
  report names the commit it was generated from, and goes stale otherwise.
  Never hand-edit `engine/validation_summary.json`.
- Added an OS version to the corpus? Re-run `python samples/build_cve_cache.py <version>`.
  The cache is committed; the audit path only ever reads i
- `python verify.py` before every push.
- Any Python file reading a repo file needs `encoding="utf-8"` explicitly —
  Windows defaults to cp1252 and corrupts non-ASCII silently rather than
  erroring.

Full plan: `docs/ROADMAP.md`. Your tasks: `docs/briefs/`.
