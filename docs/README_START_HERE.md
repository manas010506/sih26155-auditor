# SIH26155 — Team Pack

Everything you need to start. **Open your own folder, read
`YOUR_INSTRUCTIONS.md`, start working.** You don't need to read anyone else's.

| Folder | Owner | Job |
|---|---|---|
| `00_SHARED/` | everyone | roadmap, contracts, sample fixtures |
| `01_MANAS_engine/` | Manas | schema, rule engine, correlation, cloud parser |
| `02_KASHVI_cisco_parser/` | Kashvi | Cisco IOS → normalized schema |
| `03_VEDANT_dashboard/` | Vedant | findings table, charts, score, PDF export |
| `04_SANAVI_graph_api/` | Sanavi | attack-path graph + Flask API |
| `05_SHREYAS_narrative/` | Shreyas | explanations, LLM layer + fallback |
| `06_DEEP_rules_metrics/` | Deep | CIS rules, test corpus, metrics |

## Manas: run this first

```bash
unzip SIH26155_Team_Pack.zip
bash SIH26155_Team_Pack/setup_repo.sh
```

Builds the whole repo, places every file at its correct path, writes the
`.gitignore` and README, and makes the first commit. It prints the GitHub push
commands when it finishes. Then `python verify.py` — it should say
`all checks passed`.

Windows: use Git Bash, not PowerShell.

## Read in this order

1. Your own `YOUR_INSTRUCTIONS.md` — what to type tonight
2. `00_SHARED/DAY0_START.md` — setup commands for everyone
3. `00_SHARED/ROADMAP.md` — the full day-by-day plan through 7 Sep

Add the Project Handbook PDF to `00_SHARED/` yourself — it's the architecture
reference and it isn't in this zip.

## What's already built for you

Nobody starts from an empty file:

- **`00_SHARED/samples/`** — a deliberately misconfigured Cisco config plus the
  three JSON fixtures derived from it. Every `raw_ref` line number is verified
  against the actual config text, every `resource_id` resolves, every
  `contributing_findings` entry resolves, and every `break_chain.fix_rule` sits
  inside its own chain. **15 findings, 3 attack paths, score 24/100.**
- **`00_SHARED/contracts/`** — the Parser interface, 15 working CIS rules with
  the complete format spec, 3 attack chains, pinned `requirements.txt`.
- Per-person starters: a worked parser example, a runnable mock API, design
  tokens, sanitization with tests, and a corpus generator that produces 37
  labelled configs in one command.

Everything cross-validates. If you change a fixture, re-run
`00_SHARED/samples/build_fixtures.py` so the line numbers regenerate instead of
drifting.

## The two rules that matter

**1. Everyone builds to the shared format.** Parsers produce the normalized
schema; the engine consumes it; the UI renders what the engine outputs. If your
output matches the contract, it plugs into everyone else's work — that's the
whole reason six people can build at once. If a contract has to change, change
the sample fixture and tell the group. Never diverge quietly.

**2. You must be able to explain what you built.** Use AI to draft, then read
every line, refactor it into your own structure, and confirm you could add a
small feature to it without help. If you can't explain your component to a
judge, it's a liability regardless of how well it works.

## Dates

| | |
|---|---|
| Today | Fri 28 Aug — schema + fixtures pushed, everyone unblocked |
| CP1 | Sun 30 Aug — every part runs standalone against the samples |
| CP2 | Thu 3 Sep — end to end works. **Feature freeze.** |
| CP3 | Sat 5 Sep — code freeze, metric locked, demo runs offline |
| Internal hackathon | **Mon 7 Sep** |
| SIH submission | **Sun 20 Sep** |

You have two weekends and five weekday evenings, not ten equal days. Sat 29 and
Sun 30 are worth more than Mon–Fri combined — every component should reach "runs
standalone" by Sunday night.

## Tonight's checklist

- [ ] Manas: repo pushed, all five invited, `samples/` complete
- [ ] Manas: the two contract decisions in his instructions (scoring, dedupe)
- [ ] Everyone: cloned, venv up, deps installed, on their branch
- [ ] Sanavi: mock Flask endpoint running, Vedant told
- [ ] Deep: CIS downloads started, corpus generated
- [ ] Daily sync time agreed
- [ ] Everyone posts their Day 0 done-check output in the group

Branch names: `feature/engine`, `feature/cisco-parser`, `feature/dashboard`,
`feature/attack-graph`, `feature/narrative`, `feature/rules`.
`main` stays working. Never push broken code to it.
