# MANAS — Engine lead + cloud parser

**Your one line:** you own the contract everyone else builds against, and the
engine that turns a config into a scored report. You block five people, so
finishing narrow things fully beats starting everything.

## Files in this folder → where they go

| File | Repo path |
|---|---|
| `schema.py` | `engine/schema/schema.py` |
| `base.py` | `engine/parsers/base.py` |
| `cisco_rules_starter.yaml` | `engine/rules/cisco_rules.yaml` |
| `attack_chains_starter.yaml` | `engine/correlation/attack_chains.yaml` |
| `requirements.txt` | repo root |
| `../00_SHARED/samples/*` | `samples/` |

`schema.py` already validates the golden fixture. Run it:
`python engine/schema/schema.py samples/normalized_examples.json` → `valid`.

## Tonight

1. Create the repo with the Handbook §5 structure, invite all five.
2. Drop these files in, plus everything from `00_SHARED/samples/`.
3. **Decide the two open contract questions below**, then push and tell the group.

## Two decisions only you can make — make them tonight

**1. The scoring formula is broken as written.** Start-at-100-and-subtract floors
at 0 on any realistic config — these 15 findings alone deduct 136. The gauge
would read zero for almost every input, which looks like a bug on stage.

The fixtures use a ratio instead:
`100 × (1 − failed_weight / total_weight)` where `total_weight` is the summed
severity weight of every rule evaluated. Same weights, scales with the ruleset,
always lands somewhere meaningful. Demo config scores **24/100**. There's a
`score_breakdown` object in `sample_report.json` carrying the formula and its
inputs, so Vedant can show the working and you have a clean answer when a judge
asks how you got that number.

Keep it or strip it — but decide before Vedant builds the gauge tomorrow.

**2. Deduplication.** The demo config has two `line vty` blocks with identical
problems and two privilege-15 users with identical problems. The sample report
raises **one** finding each. That behaviour is `dedupe: by_rule`, documented at
the top of the rules file. The alternative is `per_resource`. Either is
defensible — but the engine and Deep's ground truth must agree or his
false-positive count will be wrong. Tell him which one you picked.

## Task order

1. Repo + `requirements.txt` + `schema.py` + `base.py`
2. `samples/` — all five files together, then message the group
3. Rule + chain YAML formats (already drafted here; adjust and commit)
4. **Sat 29:** rule engine — YAML loader, operator dispatch, matcher, scoring.
   No check logic in Python; everything comes from YAML. The operator vocabulary
   is fixed at the top of `cisco_rules_starter.yaml`.
5. **Sun 30:** Terraform parser. Traps: `python-hcl2` quotes string values
   (`'"public-read"'` — use `uq()`), and modern Terraform splits S3
   ACL/encryption into separate resources you must reconcile into one logical
   `s3_bucket`.
6. **Mon 31:** `report.py` — assemble findings + score + device block
7. **Tue 1:** correlation layer
8. **Wed 2:** `run_audit()` — hand it to Sanavi
9. **Thu 3:** integration day. You run it. Merge deadline 6pm, you run the
   pipeline and post the first error, fixes in dependency order
   (parser → engine → correlation → API → UI), nobody starts anything new.
10. **Fri 4:** error handling + rehearse the live "add a rule" demo
11. **Sat 5:** freeze. **Sun 6:** two full rehearsals + backup plan.

## Done when

`main.tf` and `sample_cisco_ios.cfg` both produce real findings, attack paths
and a score — all driven from YAML, nothing hardcoded — and you can explain
*parse → normalize → match → correlate → report* end to end in your own words
without notes.

## Your judge questions

- Walk me through what happens when I upload a config
- How is this different from a grep script? (YAML-driven rules + normalization
  across vendors + correlation — not pattern matching)
- **Add a rule right now.** Rehearse this. It's your strongest proof.
