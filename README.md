# AI-Driven Multi-Vendor Network Security Compliance Auditor

SIH 2026 · Problem statement **SIH26155** · National Technical Research Organisation

Reads security configurations from network devices (Cisco IOS and Juniper JunOS)
and cloud infrastructure (Terraform/AWS), audits them against CIS benchmarks,
correlates findings into attack paths, and names the single fix that breaks each
path. Runs fully offline.

```
config file  ->  parser  ->  normalized schema  ->  rule engine
             ->  correlation  ->  narrative  ->  report
```

## What it does

- **Multi-vendor auditing:** Cisco IOS and Juniper JunOS configurations use the
  same normalized rule engine.
- **Cloud auditing:** Terraform/AWS configurations are evaluated with
  AWS-specific rules.
- **Attack-path correlation:** Individual findings are correlated into attack
  chains instead of being presented as an unrelated list.
- **Single-fix remediation:** Each attack path identifies the single fix that
  breaks the chain.
- **AI-assisted narratives:** Attack paths receive plain-English explanations
  with a deterministic fallback for offline operation.
- **PDF reporting:** Audit results can be produced as a ReportLab PDF report.
- **Bulk upload:** Multiple configuration files can be submitted for auditing.
- **Offline operation:** The core audit pipeline does not require an external
  service or AI API key.
- **Extensible parsing:** Previously unrecognised configuration lines can be
  identified through pattern/keyword matching and proposed as field mappings
  for administrator confirmation.

Current rule evaluation is based on **CIS benchmarks**. **NIST support is
pending.**

## Setup

```bash
git clone https://github.com/manas010506/sih26155-auditor.git
cd sih26155-auditor

python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

python verify.py                  # should print "all checks passed"
python -m pytest -q
```

## Try it

Audit a deliberately misconfigured Cisco router. The current sample produces **15/100**, with **27 findings** and **3 attack paths**:

```bash
python -c "from engine.audit import run_audit; \
r = run_audit(open('samples/sample_cisco_ios.cfg', encoding='utf-8').read(), 'cisco_ios'); \
print(r['compliance_score'], len(r['findings']), 'findings,', len(r['attack_paths']), 'attack paths')"
```

Or dump the whole report:

```bash
python -m engine.audit samples/sample_cisco_ios.cfg cisco_ios
```

Demo configuration scores:

- `samples/sample_cisco_ios.cfg` — **15/100**
- `samples/main.tf` — **15/100**

Regenerate the labelled test corpus and measure detection accuracy:

```bash
python tests/generate_corpus.py  # 36 labelled configs + ground truth
python -m tests.metrics
```

The evaluation shows **100% detection on the self-graded development corpus**, and **77.4% on a held-out set of 6 real configurations — 24 of 31 labelled findings detected**.

Run the API and the UI:

```bash
flask --app api/app.py run --port 5000
cd frontend && npm install && npm run dev
```

PDF reports are generated server-side through **`/api/report`**.

## How the score works

```text
compliance_score = 100 * (1 - failed_weight / total_weight)
```

`total_weight` sums the severity weight of **every rule evaluated**, not just
the failing ones. Weights: critical 20, high 10, medium 5, low 2. Every report
carries a `score_breakdown` object showing the inputs.

## Device information

Network-device reports expose seven metadata fields:

```text
hostname
vendor
os
os_version
model
serial_number
firmware
```

Values present in the supplied configuration are extracted. Hardware identity
information that is not carried in a text configuration file is reported as
`Not available in supplied configuration` rather than being invented.

Cloud infrastructure is represented as an AWS account rather than being
treated as a physical network device.

## Cross-vendor correlation

The correlation engine operates on normalized findings rather than
vendor-specific syntax.

The `NET-SNMP-CONTROL` attack chain fires against both Cisco and Juniper
configurations using the same correlation engine, without vendor-specific
correlation logic.

Adding another network vendor therefore primarily requires a parser that
produces the normalized schema.

## AI and extensibility

The security audit itself is deterministic: parsers produce a normalized
schema, rules evaluate that schema, and the correlation engine builds attack
paths.

The narrative layer adds plain-English explanations to attack paths. If an AI
API is unavailable, the deterministic template remains available, so the
audit does not depend on a network connection.

For previously unseen configuration syntax, the parser can expose unparsed
lines and propose mappings using pattern/keyword identification. An
administrator confirms the proposed mapping before it is applied. This provides
a path toward learning new vendor syntax without changing the core audit
engine.

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
config text, that cross-references resolve, and that the score follows from
its own weights.

## Layout

| Path | What | Owner |
|---|---|---|
| `engine/schema/` | normalized schema + validation | Manas |
| `engine/parsers/` | Cisco IOS, Juniper JunOS, Terraform/AWS parsers | Kashvi, Manas |
| `engine/rules/` | YAML rule definitions | Deep |
| `engine/correlation/` | attack-chain matching | Manas, Deep |
| `engine/narrative/` | explanations, LLM + fallback | Shreyash |
| `engine/audit.py` | `run_audit()` — the single entry point | Manas |
| `api/` | Flask API and reporting endpoints | Sanavi |
| `frontend/` | React dashboard + attack-path graph | Vedant, Sanavi |
| `tests/` | corpus, ground truth, metrics | Deep |
| `samples/` | shared fixtures — build against these | Manas |
| `docs/` | roadmap, per-person briefs | — |

The engine is pure Python with no web framework and no database. The API is a
thin wrapper over `run_audit()`.

## Working agreements

- `main` stays working. Branch, PR, someone else glances before merge.
- `samples/` is the shared truth. If a contract changes, change the fixture and
  tell the group — never diverge quietly.
- Changed a rule or a sample config? Re-run
  `python samples/build_fixtures.py` and
  `python samples/build_fixtures_aws.py` so the fixtures follow.
- `python verify.py` before every push.
- Any Python file reading a repo file needs `encoding="utf-8"` explicitly —
  Windows defaults to cp1252 and corrupts non-ASCII silently rather than
  erroring.

Full plan: `docs/ROADMAP.md`. Your tasks: `docs/briefs/`.
