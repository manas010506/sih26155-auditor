# DEEP — Rules, test data, metrics

**Your one line:** you produce the number that goes on the slide. It has to be
real, and it has to be early.

## Files in this folder → where they go

| File | Repo path |
|---|---|
| `clean_baseline.cfg` | `tests/corpus/clean_baseline.cfg` |
| `generate_corpus.py` | `tests/generate_corpus.py` |
| `metrics.py` | `tests/metrics.py` |
| `cisco_rules_starter.yaml` | `engine/rules/cisco_rules.yaml` (Manas commits it; you extend it) |
| `attack_chains_starter.yaml` | `engine/correlation/attack_chains.yaml` |

## Tonight

**1. Start the CIS downloads now.** CIS Cisco IOS 17 Benchmark and CIS AWS
Foundations Benchmark are free from cisecurity.org but need a registration form
and an email confirmation. Begin it before you do anything else so it isn't
blocking you at 11pm.

**2. Generate the corpus — one command:**

```bash
mkdir -p tests/corpus tests/expected
cp clean_baseline.cfg tests/corpus/
python tests/generate_corpus.py
```

Verified output: **37 configs, 74 seeded misconfigurations, 15 distinct rules.**
One clean baseline (where false positives are measured), one file per rule
(isolates every detection), and 20 realistic 2–4 rule combinations. Deterministic
seed, so everyone generates the identical corpus.

## The trick, so you understand what just happened

You did **not** hand-label 40 configs. You wrote one hardened baseline, and the
generator injects a known misconfiguration into each variant. **The injection is
the ground truth**, so `expected/` is emitted automatically and is correct by
construction. Two days of work becomes twenty minutes, and the labels can't be
wrong.

Still add **4–5 hand-written messy realistic configs** with hand-written
expected files. The generated ones are too clean and won't surface parser edge
cases.

## Task order

- **Sat 29:** corpus done (above). Then rules — `cisco_rules_starter.yaml`
  already has 15 working rules with the full format spec commented at the top.
  Extend from there. Work **rule-family by rule-family** (all VTY, then all
  SNMP, then all logging), not benchmark-section by section — faster, and you
  catch overlaps.
- **Sun 30:** rules batch 2 and `aws_rules.yaml`. Target 35+ rules loading
  without error.
- **Mon 31:** extend `attack_chains.yaml`. Three are drafted. A chain is a
  *story* — "attacker gets in → escalates → isn't detected". If you can't tell
  it in one sentence, it isn't a chain. Coordinate with Sanavi; these are what
  her graph draws.
- **Tue 1:** `metrics.py` (written, needs the engine) — first real run.
- **Wed 2:** tune. Chase every false positive back to its rule and fix the rule.
- **Thu 3:** full metrics run on the integrated system.
- **Fri 4:** lock the headline number, build the slide, write the CIS coverage
  table — which controls you cover and which you don't.
- **Sat 5:** re-run against frozen code. The slide number must match what the
  code produces on the day.

## Two constraints from Manas

**Use only the operators in the comment block** at the top of the rules file:
`equals, not_equals, contains, not_contains, in, not_in, exists, not_exists,
gte, lte, in_range, min_length, matches`. If a CIS control needs something else,
**ask him** — don't invent syntax. A rule the engine can't load is worse than a
missing rule.

**Confirm the dedupe decision with him tonight.** The demo config has two
identical `line vty` blocks and two identical privilege-15 users, and the sample
report raises one finding each (`dedupe: by_rule`). If he switches to
`per_resource`, your ground-truth counts change and your false-positive number
will be wrong. Get it in writing in the group chat.

## The number

```
detection rate  = seeded misconfigs found / seeded total
false positives = findings raised against clean_baseline.cfg
```

`metrics.py` prints both plus the sentence for the slide. **The false-positive
number is the one that impresses** — any tool can flag everything. And name your
coverage gaps out loud; that's more credible than implying full coverage, and
judges test for it.

## Your judge questions

- How did you measure that? (end to end, including how ground truth was generated)
- Which CIS controls don't you cover? (have the table)
