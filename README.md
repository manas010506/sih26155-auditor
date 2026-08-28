# AI-Driven Multi-Vendor Network Security Compliance Auditor

SIH 2026 · Problem statement **SIH26155** · National Technical Research Organisation

Reads security configurations from network devices (Cisco IOS) and cloud
infrastructure (Terraform/AWS), audits them against CIS benchmarks, correlates
findings into attack paths, and names the single fix that breaks each path.
Runs fully offline.

```
config file  ->  parser  ->  normalized schema  ->  rule engine
             ->  correlation  ->  narrative  ->  report
```

## Setup

```bash
git clone <this-repo> && cd sih26155-auditor
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# API (returns the sample report until the engine lands)
flask --app api/app.py run --port 5000

# frontend
cd frontend && npm install && npm run dev
```

## Try it

```bash
python -c "from engine.audit import run_audit; \
           print(run_audit(open('samples/sample_cisco_ios.cfg').read(), 'cisco_ios'))"
python tests/generate_corpus.py     # 37 labelled test configs
python tests/metrics.py             # detection rate + false positives
pytest -q
```

## Layout

| Path | What | Owner |
|---|---|---|
| `engine/schema/` | normalized schema + validation | Manas |
| `engine/parsers/` | `cisco_ios.py`, `terraform_aws.py` | Kashvi, Manas |
| `engine/rules/` | YAML rule definitions | Deep |
| `engine/correlation/` | attack-chain matching | Manas, Deep |
| `engine/narrative/` | explanations, LLM + fallback | Shreyas |
| `api/` | Flask, 2 endpoints | Sanavi |
| `frontend/` | React dashboard + attack-path graph | Vedant, Sanavi |
| `tests/` | corpus, ground truth, metrics | Deep |
| `samples/` | shared fixtures — build against these | Manas |
| `docs/` | roadmap, per-person briefs | — |

## Working agreements

- `main` stays working. Branch, PR, someone else glances before merge.
- `samples/` is the shared truth. If a contract changes, change the fixture and
  tell the group — never diverge quietly.
- Edited a sample config? Re-run `python samples/build_fixtures.py` and
  `python samples/build_fixtures_aws.py` so line numbers regenerate.
- `python verify.py` before every push.

Full plan: `docs/ROADMAP.md`. Your tasks: `docs/briefs/`.
