# SIH26155 — Day 0 Start Guide

Companion to the Project Handbook. This answers one question only: **what do I type first?**

Read the "Everyone" section, then your own. Everything below assumes the repo exists —
Manas creates it first, and until he pushes `samples/`, five of you are blocked.

---

## Everyone — first 20 minutes

```bash
git clone <repo-url> sih26155-auditor
cd sih26155-auditor
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
git checkout -b feature/<your-area>
```

Branch names: `feature/engine`, `feature/cisco-parser`, `feature/dashboard`,
`feature/attack-graph`, `feature/narrative`, `feature/rules`.

Set the daily sync time tonight. 10 minutes, same time every day, three sentences each.

**Day 0 done check.** By tonight every person should be able to run one command that
proves they're unblocked. Those commands are listed per-person below. If yours doesn't
run, say so in the group before you sleep — not tomorrow afternoon.

---

## Manas — Engine lead

You block five people. Nothing else you do today matters as much as pushing `samples/`.

### Order for today

**1. Repo skeleton (15 min)**

```bash
mkdir -p engine/{schema,parsers,rules,correlation,narrative} api \
         frontend tests/{corpus,expected} samples docs
touch engine/schema/schema.py engine/parsers/base.py engine/report.py engine/audit.py
git add -A && git commit -m "skeleton" && git push
```

Invite the other five as collaborators now, before you forget.

**2. `requirements.txt`, pinned**

```
python-hcl2==7.2.1
ciscoconfparse2==0.8.6
PyYAML==6.0.2
Flask==3.1.0
flask-cors==5.0.0
google-genai==1.38.0
pytest==8.3.4
```

Check the current versions on PyPI before you pin — those are starting points, not gospel.
Pin whatever actually installs cleanly on your machine, then everyone gets the same.

**3. `engine/schema/schema.py`**

The normalized shape from Handbook 4.1, plus a `validate(doc) -> list[str]` that returns
human-readable errors. Keep it dead simple — dicts and a validator function, not a class
hierarchy. Kashvi will call `validate()` to check her parser output, so it needs to give
useful messages, not just `True`/`False`.

**4. `engine/parsers/base.py`**

```python
from abc import ABC, abstractmethod

class Parser(ABC):
    source_type: str          # "cisco_ios" | "terraform_aws"

    @abstractmethod
    def parse(self, config_text: str, filename: str) -> dict:
        """Return a normalized-schema dict (Handbook 4.1)."""
```

That's the whole file. Kashvi subclasses it.

**5. The rule YAML format — this is the one the handbook missed**

Deep cannot start writing rules until this exists. Commit
`engine/rules/aws_rules.yaml` with two or three real rules and a comment block at the top
explaining every field. Something in this shape:

```yaml
# Rule format
#   id            : stable, unique. CIS-<DOMAIN>-<NNN>
#   applies_to    : resource "type" this rule inspects
#   check         : attribute path + operator + expected value
#   severity      : critical | high | medium | low
#   remediation   : template text, {placeholders} filled from the resource
- id: CIS-CLOUD-004
  title: S3 bucket has a public ACL
  applies_to: s3_bucket
  cis_control: "CIS AWS - Ensure S3 buckets are not public"
  check:
    attribute: acl
    operator: not_in
    value: ["public-read", "public-read-write"]
  severity: critical
  remediation: 'Set acl = "private" on {resource_id} and add an aws_s3_bucket_public_access_block.'

- id: CIS-NET-011
  title: VTY lines permit Telnet
  applies_to: vty_line
  cis_control: "CIS Cisco IOS - Restrict transport input to SSH"
  check:
    attribute: transport_input
    operator: not_contains
    value: telnet
  severity: high
  remediation: "line {resource_id}\n transport input ssh"
```

Decide your operator vocabulary now and write it in the comment: `equals`, `not_equals`,
`contains`, `not_contains`, `in`, `not_in`, `exists`, `not_exists`, `gte`, `lte`. Deep
writes rules using only those. If he needs a new operator, he asks you — he doesn't invent one.

Do the same for `engine/correlation/attack_chains.yaml`: one worked chain, every field
commented.

**6. `samples/` — the unblock**

Five files. Do not push a half-finished set; push all five together, then message the group.

| File | Purpose | Who consumes it |
|---|---|---|
| `sample_cisco_ios.cfg` | deliberately bad Cisco config, ~120 lines | Kashvi, Deep |
| `main.tf` | deliberately bad Terraform, pin AWS provider `~> 5.0` | you, Deep |
| `normalized_examples.json` | `cisco_example` + `terraform_example` blocks | Kashvi (her acceptance test) |
| `sample_report.json` | full report, **15 findings, 3 attack paths**, score 20 | Vedant, Sanavi, Shreyas |
| `sample_attack_paths.json` | just the `attack_paths` array | Sanavi |

`sample_report.json` is the most important file you write today. Vedant and Sanavi build
their entire UI against it, and if it's thin — three findings, one path — they'll build a
UI that looks empty and you'll discover it on the 3rd. Fifteen findings across all four
severities, realistic titles, real-looking config snippets in `raw_ref`.

**7. Then, days 1–3:** rule engine before the Terraform parser. The engine is what Deep's
work plugs into and what proves the "data-driven, not hardcoded" story to judges.

**Day 0 done check:**
```bash
git log --oneline -1 && ls samples/ && python -c "import json;d=json.load(open('samples/sample_report.json'));print(len(d['findings']),'findings',len(d['attack_paths']),'paths')"
```

---

## Kashvi — Cisco IOS parser

Your target is written down before you start, which is the best position on the team.
`samples/normalized_examples.json` contains a `cisco_example` block. Your job: make your
parser produce exactly that from `samples/sample_cisco_ios.cfg`.

### Start here

```bash
pip install ciscoconfparse2
python -c "from ciscoconfparse2 import CiscoConfParse; p=CiscoConfParse('samples/sample_cisco_ios.cfg', syntax='ios'); [print(o.linenum, o.text) for o in p.find_objects(r'^line vty')]"
```

**Write the test before the parser.** `tests/test_cisco_parser.py`:

```python
import json
from engine.parsers.cisco_ios import CiscoIOSParser

def test_matches_golden():
    cfg = open("samples/sample_cisco_ios.cfg").read()
    golden = json.load(open("samples/normalized_examples.json"))["cisco_example"]
    assert CiscoIOSParser().parse(cfg, "sample_cisco_ios.cfg") == golden
```

It fails immediately. Make it pass. That's your whole day-to-day loop.

### Resource types, in this order

1. `vty_line` — `transport input`, `exec-timeout`, `access-class`, `login`
2. `snmp_community` — string, `RO`/`RW`, ACL
3. `global_settings` — `service password-encryption`, `ip http server`, `banner`, `enable secret` type
4. `snmp_settings`, `local_user`, `logging`, `ntp`

Useful pattern for nested config:

```python
for line in parse.find_objects(r"^line vty"):
    transport = [c.text.strip() for c in line.children if "transport input" in c.text]
```

### The part that will cost you time

**Absence-based facts.** Cisco's insecure defaults are silent. A config with no
`no ip http server` line has HTTP *enabled* — the vulnerability is the missing line. You
can't attach a line number to something that isn't there, so emit the resource with
`raw_ref: null` and set the attribute to the insecure default. Write a short list of
every default you're assuming and put it in a comment at the top of the file — Deep needs
it to write matching rules, and a judge will ask.

**Day 0 done check:** `pytest tests/test_cisco_parser.py` runs and fails with a real
assertion error (not an import error).

---

## Vedant — Dashboard

You need zero backend today. `import` the sample JSON directly.

```bash
npm create vite@latest frontend -- --template react
cd frontend && npm install && npm i recharts
cp ../samples/sample_report.json src/sample_report.json
npm run dev
```

```jsx
import report from "./sample_report.json";
```

Swap that import for a `fetch()` on Sep 1–3. Nothing else changes.

### Build order

1. **App shell** — sidebar + main panel, dark, fixed. Do the layout before any component.
2. **`FindingsTable.jsx`** — build this first and build it properly. It's the densest
   screen, the one judges read, and the one that exposes layout problems early. Severity
   pill, rule ID in monospace, sortable by severity, click a row to expand the `raw_ref`
   snippet with the line number.
3. **`SeverityDashboard.jsx`** — counts by severity. Recharts bar or donut.
4. **`ComplianceGauge.jsx`** — the score. A custom SVG arc reads far better than a
   library gauge and takes about an hour.

### On the look (Handbook §10, hard rule 2)

Pick your palette and type scale in the first hour and write them into
`src/styles/tokens.css` as CSS variables. Every component reads from those. Consistency is
what separates "designed" from "generated," and you only get it by deciding once.

Concretely: dark background, one accent colour, severity colours that are *only* used for
severity (red/orange/amber/grey — never for decoration), a monospace face for rule IDs,
config snippets and line numbers, tight row heights. No gradients, no emoji in headers, no
centered hero. Look at a real tool for reference — Wazuh, Splunk, or Nessus screenshots.

**Day 0 done check:** `npm run dev` shows all 15 findings from the sample JSON in a table.

---

## Sanavi — Attack-path graph + API

You have two jobs. The graph is today; Flask is Sep 1–3. But do the 15-minute mock API
first, because it unblocks Vedant from ever having to wait for the real engine.

### Do this first (15 minutes)

```python
# api/app.py
import json
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/audit")
def audit():
    _ = request.json                       # ignored for now
    return jsonify(json.load(open("samples/sample_report.json")))
```

```bash
flask --app api/app.py run --port 5000
```

The real engine drops in on Sep 1–3 — you replace one line with
`run_audit(body["config_text"], body["source_type"])`. Tell Vedant the endpoint is live
today so he wires `api.js` against it now instead of during integration week.

### Then the graph

```bash
cd frontend && npm i @xyflow/react
```

(v12 is `@xyflow/react`; older tutorials say `reactflow` — same library, different package name.)

Model each attack path as a left-to-right chain: one node per entry in
`contributing_findings`, ending in a terminal "impact" node. Then the part that makes it
yours — highlight the node matching `break_chain.fix_rule` and label the edge it cuts.
That single visual ("fix this one thing and the chain dies") is the moment that wins the
demo. Everything else on screen is a table someone else also built.

Custom node components, not defaults. Severity drives the border colour.

**Day 0 done check:** `curl -X POST localhost:5000/api/audit -H 'Content-Type: application/json' -d '{}'` returns the report, and one attack path renders as a graph.

---

## Shreyas — Narrative layer

Build the fallback first. Today needs no API key and no engine.

### `engine/narrative/templates.py`

```python
def finding_text(item: dict) -> str:
    return (f"{item['title']} ({item['severity']}). "
            f"Checked against {item['cis_control']}. "
            f"{item['remediation_template']}")

def path_text(item: dict) -> str:
    n = len(item["contributing_findings"])
    return (f"{item['name']}: {n} misconfigurations chain together here. "
            f"Fixing {item['break_chain']['fix_rule']} breaks the chain — "
            f"{item['break_chain']['why']}")
```

### `engine/narrative/generator.py`

```python
def generate_narrative(item: dict, kind: str) -> str:
    fallback = templates.path_text(item) if kind == "attack_path" else templates.finding_text(item)
    try:
        return _llm(sanitize(item), kind)
    except Exception:
        return fallback
```

That signature is the contract (Handbook 4.4). Get it returning template text today, then
everything downstream works whether or not the LLM ever arrives.

### Sanitization — write this before you touch Gemini

Whitelist, never blacklist:

```python
ALLOWED = {"rule_id", "title", "severity", "cis_control", "resource_type",
           "chain_id", "name", "contributing_findings", "break_chain"}

def sanitize(item: dict) -> dict:
    return {k: v for k, v in item.items() if k in ALLOWED}
```

`raw_ref` never leaves the machine. Neither do hostnames, IPs, or config text. A judge
*will* ask what you send to Google — being able to point at a whitelist and say "these
fields, nothing else" is a much better answer than describing a regex that strips IPs.

### Then Gemini

`pip install google-genai`, get a key from AI Studio, keep it in `.env`, add `.env` to
`.gitignore` on your first commit. Check the current quickstart for the exact call shape —
the SDK changed recently and older snippets won't run.

Narrate **attack paths only** (3–5 per report), not all 15 findings. Cache on a hash of the
sanitized item, write the cache to `engine/narrative/cache.json`, and **commit the cache
for the demo config**. On the 7th your demo must produce full narratives with the wifi off.
Test that before the 6th.

**Day 0 done check:**
```bash
python -c "import json;from engine.narrative.generator import generate_narrative as g;r=json.load(open('samples/sample_report.json'));print(g(r['attack_paths'][0],'attack_path'))"
```

---

## Deep — Rules, corpus, metrics

You're partly blocked: ask Manas for the rule YAML format first thing this morning. While
you wait, the corpus needs no format at all — start there.

### 1. Get the benchmarks (do this first, it takes a while)

CIS Cisco IOS 17 Benchmark and CIS AWS Foundations Benchmark are free PDFs from
cisecurity.org, but they need a registration form and an email confirmation. Start that
download now so it's not blocking you at 11pm.

### 2. Build the corpus — the trick that gives you ground truth for free

Don't hand-label 40 random configs. Instead:

1. Write **one clean, fully hardened** baseline config (`tests/corpus/clean_baseline.cfg`).
2. Write a small script that produces N variants, each with exactly one known
   misconfiguration injected — remove `service password-encryption`, add
   `transport input telnet`, insert an RW community string, and so on.
3. The injection *is* the ground truth. Emit `tests/expected/bad_007.json` automatically
   when you emit `bad_007.cfg`.

That gets you 30–50 labelled configs in an evening instead of two days, and the labels are
exactly right by construction. Keep 4–5 hand-written realistic messy configs too — the
generated ones are too clean and won't surface parser edge cases.

Structure:
```
tests/corpus/clean_baseline.cfg
tests/corpus/bad_001.cfg      -> tests/expected/bad_001.json
tests/generate_corpus.py
```

### 3. Rules, once Manas gives you the format

Work rule-family by rule-family, not benchmark-section by benchmark-section: all VTY rules,
then all SNMP rules, then all logging. Faster, and you catch overlaps.

Only use the operators in Manas's comment block. If a CIS control needs something the
vocabulary can't express, note it and ask — don't invent syntax.

### 4. `tests/metrics.py`

```
detection rate = seeded misconfigs found / seeded misconfigs total
false positives = findings raised against clean_baseline.cfg
```

The second number is the one that impresses. Any tool can flag everything. Report both:
*"Caught 94% of 47 seeded misconfigurations across 38 configs, with 2 false positives."*
That sentence goes on a slide, so get it real and get it early — a made-up metric is worse
than no metric, and judges do ask how you measured.

**Day 0 done check:** `ls tests/corpus/ | wc -l` shows at least 10 files, each with a
matching `tests/expected/` entry.

---

## Tonight's checklist

- [ ] Manas: repo pushed, all five invited
- [ ] Manas: `samples/` complete (all five files) + rule YAML format + chain YAML format
- [ ] Everyone: cloned, venv up, deps installed, on their branch
- [ ] Sanavi: mock Flask endpoint running, Vedant told
- [ ] Deep: CIS benchmark downloads started
- [ ] Daily sync time agreed
- [ ] Everyone posts their Day 0 done-check output in the group

If Manas hasn't pushed `samples/` by tonight, tomorrow is a wasted day for five people.
That's the only thing on this list that can't slip.
