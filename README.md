# AI-Driven Multi-Vendor Network Security Compliance Auditor

SIH 2026 · Problem statement **SIH26155** · National Technical Research Organisation

Reads security configurations from network devices (Cisco IOS and Juniper JunOS) and cloud
infrastructure (Terraform/AWS), audits them against CIS and NIST benchmarks, correlates
findings into attack paths, and names the single fix that breaks each path. Vendors with no
parser (demonstrated with MikroTik RouterOS and Aruba AOS-CX) are handled through a training
loop: the tool proposes what each unrecognised line means, an administrator confirms it, and
the next audit uses it, with no code change and no redeploy.

Runs fully offline. CVE data is pre-fetched from NVD into a committed cache; the audit path
only ever reads from disk.

```
config file  ->  parser  ->  normalized schema  ->  evidence gate  ->  rule engine
             ->  correlation  ->  narrative  ->  report (PDF / DOCX)

unrecognised lines  ->  training UI (suggest.py proposes, admin confirms)
                    ->  learned mappings  ->  applied on the next audit
```

## Setup

**Requires Python 3.12.** `ciscoconfparse2` depends on `scrypt`, a C extension that ships
prebuilt wheels for specific Python versions only; on others, pip attempts a source build and
needs a C compiler. Verified from a clean clone on Python 3.12.10 (Windows): 147 tests passing.

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

Run the API and the UI:

```bash
flask --app api/app.py run --port 5000
cd frontend && npm install && npm run dev
```

## Demo walkthrough

1. `.\reset_demo.ps1` clears any learned mappings. Restart Flask after any backend change.
2. Upload `samples/sample_cisco_ios.cfg`: **15/100**, 27 failed, 5 passed, 3 attack paths.
   Every finding shows the config line it came from and the fix.
3. Upload `samples/demo_mikrotik.cfg`: **Not assessed**. There is no MikroTik parser, and
   none of its 16 lines is recognised, so the tool claims nothing.
4. On **Training**, confirm the proposals for lines 3, 5 and 7 (Telnet, web server, SNMP).
5. Upload the same file again: **Partial, 3 of 32 controls**, with one critical and two high
   findings, each pointing at the line that was taught.
6. The Report page exports the result as PDF or DOCX.

`samples/demo_aruba.cfg` shows the partially readable case: 9 of 21 lines are recognised, so
it starts at **Partial, 6 of 32** with two real SNMP findings at line 15.

## How the score works

```
compliance_score = 100 * (1 - failed_weight / total_weight)
```

`total_weight` sums the severity weight of **every rule evaluated**, not just the failing
ones; a subtract-from-100 approach floors at zero on any realistic config. Weights: critical
20, high 10, medium 5, low 2. Scoring is per framework (CIS by default). Every report carries a
`score_breakdown` object showing the inputs.

A score is only reported for files the parser natively reads. For anything else the score is
withheld and the result is **Partial (N of 32 controls)** or **Not assessed**; see the
evidence gate below.

| Demo config | Result |
|---|---|
| `sample_cisco_ios.cfg` | **15/100**: 27 failed, 5 passed, 32 rules evaluated, 3 attack paths |
| `sample_juniper.conf` | **25/100**: 24 failed, 7 passed, 31 rules evaluated |
| `main.tf` | **11/100**: 15 failed, 3 passed, 18 rules evaluated, 3 attack paths |
| `demo_aruba.cfg` | **Partial, 6 of 32** |
| `demo_mikrotik.cfg` | **Not assessed** (Partial, 3 of 32 after teaching three lines) |
| `unknown_cloud.tf` | **Not assessed** (no rule applies to EFS, Elasticsearch or Redshift) |

## Coverage

- **54 rules.** Cisco: 32 cite the **CIS Cisco IOS 15 Benchmark v4.1.0**, and 4 map to
  **NIST 800-53** (AC-2, AC-3, AU-2, SC-8). AWS: 18 cite the **CIS AWS Foundations Benchmark
  v1.5.0**. JunOS is audited with the Cisco rule file.
- Three Cisco checks and four AWS checks are standard hardening outside the benchmark; they are
  labelled "Not in CIS … benchmark" rather than given invented numbers.
- Two AWS rules (`AWS-S3-001`, `AWS-LOG-003`) are parked in `engine/rules/backlog/` until the
  Terraform parser emits the attributes they check.
- DISA STIG and ISO/IEC 27001 are supported by the architecture (rules carry a `framework`
  field; `GET /api/frameworks` reports coverage) but are not implemented.

## Accuracy

| Set | Result |
|---|---|
| Generated corpus, 37 configs | 74 of 74 seeded misconfigurations detected, 18 false positives (0 on the clean baseline) |
| Held-out real configs | **27 of 31 labelled issues detected (87.1%)**, all 27 at the labelled line |

```bash
python tests/generate_corpus.py      # 37 labelled configs + ground truth
python -m tests.metrics              # corpus detection rate + false positives
python -m tests.holdout_metrics      # held-out detection
```

Run `.\reset_demo.ps1` first, so no learned mapping affects the result.

The corpus number is a regression check, not an accuracy claim: the configs were generated
with the same misconfigurations the rules look for, so 100% is the floor we expect, and a drop
means something broke.

**The held-out number is the one to judge us on.** Six real-world configurations were never
used while writing rules. Five carry 31 hand-labelled issues; each label names the rule that
should catch it and the config line, and the labels were committed before the scoring script
ran (`tests/test_holdout_labels.py` keeps them valid). The four misses are RSA key size and
proxy-ARP (no rule yet), and two configs with no `exec-timeout` line, where IOS's default
10-minute timeout is treated as compliant. The sixth config is a hardened baseline; both
findings raised on it are correct. The other rule hits on the labelled configs have not been
manually reviewed, so no false-positive rate is claimed for them.

The 18 corpus false positives are concentrated in absence-based checks, where a control present
in a form the parser does not yet recognise reads as missing. That is the cost of treating
absence as a finding on native configs, and we would rather over-report a missing control than
silently pass a device.

## Design decisions worth knowing

**Rules are data, not code.** Every check lives in `engine/rules/*.yaml` with a fixed
vocabulary of 13 operators. Adding a control means adding YAML, never touching Python.
`load_rules()` rejects a rule whose `applies_to` names a resource type no parser emits.

**Absence is a finding, but only where the parser can read.** Cisco's insecure defaults are
silent: a config with no `no ip http server` line has HTTP *enabled*. Parsers emit those facts
with `raw_ref: null`, and `None` fails every positive operator, so the missing line raises the
finding. That reasoning only holds for a file the parser actually understands.

**The evidence gate.** `run_audit()` measures the share of code lines the parser itself
recognised. At or above `NATIVE_THRESHOLD` (0.6) the file is audited normally. Below it, only
attributes backed by a real config line are evaluated (including any `when` condition), and
the score is withheld. Across every tracked config, real ones measure 76% or more and probe
files 43% or less. A rule whose resource type was never parsed is never counted as a pass.
Without this, any unreadable file, even a paragraph of prose, scored 7/100 with 23 findings.

**The training loop.** Unrecognised lines are kept with their line numbers. `suggest.py`
proposes a mapping by security concept (Telnet, syslog, SNMP, NTP), not vendor syntax; an
administrator confirms it; the mapping is stored as a normalised prefix, so it applies to any
line starting the same way; and parsers reload mappings on every audit. Safeguards: values are
typed before rules see them, list attributes accumulate so a later line cannot erase a
finding, a disabled service is never proposed as enabled, and taught lines count as evidence
but never make a foreign file native. Remediation stays in Cisco IOS syntax and is labelled
as reference syntax for other vendors.

**One source of line numbers.** `schema.resolve_ref()` decides what a finding points at: the
per-attribute line if the parser recorded one, otherwise the resource's own anchor. Nothing
else constructs a line number. Config text is untrusted and is escaped in every export.

**Fixtures are generated, not hand-written.** `samples/build_fixtures*.py` and
`samples/build_frontend_sample.py` run the engine to produce the sample reports, so the
fixtures cannot drift from the rules. `verify.py` independently checks every line number
against the raw config text, that cross-references resolve, and that the score follows from
its own weights.

**Attack paths are validated, not asserted.** Each network chain has a minimal positive
fixture and a negative that applies that chain's own `break_chain` fix and changes nothing
else. Expected verdicts were written down before the engine was run. Nine tests in
`tests/test_attack_chains.py` cover three chains: the positive fires exactly one chain with the
expected findings, the negative fires nothing, and the named fix is the only link that stopped
firing. The report carries a generated line naming the commit that was validated.

**AI proposes, a human decides, deterministic rules audit.** There is no trained model in the
scoring path. An LLM writes attack-path narratives only, with a deterministic template
fallback; `sanitize()` is a whitelist, and raw config never leaves the machine.

**CVE context is version-level and out of the scoring path.** `engine/cve.py` reads a
committed cache built from NVD's `virtualMatchString` API, filtered to CVSS v3 critical and
high, top five by base score. It runs after scoring and never influences findings or the
compliance score. The match is on OS major.minor, so a specific maintenance train may already
carry the fix; the report says so rather than implying a vulnerability assessment. Cisco IOS
only.

## Known limitations

- A taught line sets one attribute, so rules that also depend on a second setting (for example
  a plaintext password's privilege level) are reported as not evaluated rather than guessed.
- A real config dense with unsupported syntax could fall below the native threshold and be
  reported as partial.
- Remediation is Cisco IOS syntax for every network device, labelled as reference syntax for
  non-Cisco devices.
- CIS AWS Foundations v1.5.0 has been superseded by v5.0.0; moving to it is a relabelling.

## Layout

| Path | What | Owner |
|---|---|---|
| `engine/schema/` | normalized schema + validation | Manas |
| `engine/parsers/` | `cisco_ios.py`, `juniper_junos.py`, `terraform_aws.py`; `suggest.py` and `learned.py` for training | Kashvi, Manas |
| `engine/rules/` | `cisco_rules.yaml`, `aws_rules.yaml`, `backlog/` | Deep |
| `engine/correlation/` | attack-chain matching | Manas, Deep |
| `engine/narrative/` | explanations, LLM + fallback | Shreyas |
| `engine/audit.py` | `run_audit()`, the single entry point, and the evidence gate | Manas |
| `engine/report.py` | PDF report | Manas |
| `api/` | Flask API, 8 routes: audit, batch audit, PDF report, training (GET/POST), schema, frameworks, health | Sanavi |
| `frontend/` | React dashboard, attack-path graph, training UI, DOCX export | Vedant, Sanavi |
| `tests/` | corpus, ground truth, holdout labels, metrics | Deep |
| `samples/` | shared fixtures and demo configs; build against these | Manas |
| `docs/` | roadmap, per-person briefs, architecture document | — |

The engine is pure Python with no web framework and no database. The API is a thin wrapper
over `run_audit()`.

## Working agreements

- `main` stays working. One priority per branch, full suite before every merge, and only Manas
  merges to `main`.
- `samples/` is the shared truth. If a contract changes, change the fixture and tell the group;
  never diverge quietly.
- Run `.\reset_demo.ps1` before regenerating fixtures or running metrics, so no learned mapping
  leaks in.
- Changed a rule, a parser or a sample config? Re-run `python samples/build_fixtures.py`,
  `python samples/build_fixtures_aws.py` and `python samples/build_frontend_sample.py`.
- Changed a rule, a chain, or a chain fixture? Re-run
  `python samples/build_validation_summary.py`; the validation line in the report names the
  commit it was generated from, and goes stale otherwise. Never hand-edit
  `engine/validation_summary.json`.
- Added an OS version to the corpus? Re-run `python samples/build_cve_cache.py <version>`. The
  cache is committed; the audit path only ever reads it.
- Holdout labels are set before measuring, never adjusted after.
- Restart Flask after any backend change before checking in the browser.
- `python verify.py` before every push. Never `git add -A`.
- Any Python file reading a repo file needs `encoding="utf-8"` explicitly: Windows defaults to
  cp1252 and corrupts non-ASCII silently rather than erroring.

Full plan: `docs/ROADMAP.md`. Your tasks: `docs/briefs/`.