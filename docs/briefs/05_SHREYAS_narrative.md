# SHREYAS — AI / narrative layer

**Your one line:** plain-English explanations, with a fallback so good the tool
ships fine without an API key. Build the fallback first.

## Files in this folder → where they go

| File | Repo path |
|---|---|
| `templates.py` | `engine/narrative/templates.py` |
| `generator.py` | `engine/narrative/generator.py` |
| `test_sanitize.py` | `tests/test_sanitize.py` |
| `sample_report.json` | `samples/` |

## Tonight

`templates.py` and `generator.py` are written. `generate_narrative()` already
returns template text and has caching and the whitelist wired.

```bash
python -c "
import json, sys; sys.path.insert(0,'.')
import templates
r = json.load(open('sample_report.json'))
print(templates.path_text(r['attack_paths'][0]))
print(templates.finding_text(r['findings'][0]))
"
```

The only `NotImplementedError` is `_call_llm()`. That's Sunday's job.

## Task order

- **Sat 29:** run `pytest tests/test_sanitize.py` — it checks that no password,
  IP, hostname or config text survives `sanitize()`. Then a **template quality
  pass**: per-rule-family wording, not one generic sentence. Templates are your
  floor. If Gemini fails on stage this is what judges read, so make it good
  enough to ship alone.
- **Sun 30:** wire Gemini into `_call_llm()`. `pip install google-genai`, key
  from AI Studio, in `.env`, and `.env` in `.gitignore` **on your first commit**.
  Check the current quickstart — the SDK changed recently and older snippets
  won't run. Done when narratives improve with the key present and the tool
  still works with it removed.
- **Mon 31:** caching is scaffolded; verify it never calls twice for the same item.
- **Tue 1:** attack-path narratives specifically. These are the ones that
  matter — they sit next to Sanavi's graph. **Narrate paths only (3–5), never
  all 15 findings.**
- **Wed 2:** wire into `run_audit()` as a **separate enrichment pass**. The
  report returns immediately with template text; the LLM upgrades it in place
  afterward. Never block the response on network calls — 15 live calls is
  20–60 seconds and it will kill the demo.
- **Thu 3:** integration day.
- **Fri 4 — the test that saves your demo:** pre-generate narratives for every
  demo config, commit `cache.json`, **turn off wifi and run the full demo.** If
  anything degrades visibly, fix it that night. Venue wifi is not a dependency
  you get to have.
- **Sat 5 — stretch, and it's the valuable one.** See below.

## The whitelist — read this before you touch Gemini

`ALLOWED_KEYS` in `generator.py` is a **whitelist, not a blacklist**. `raw_ref`
is never in it. Neither is `remediation_template` or `explanation`. Adding a key
is a decision, not a convenience.

A judge will ask what you send to Google. Pointing at a nine-item list on screen
is a much stronger answer than describing a regex that strips IPs.
`test_sanitize.py` proves it — run it in front of them if you want.

## Sat 5 stretch — the thing NTRO actually asked for

If you're clean by Saturday, spike the **training loop**: a screen listing the
`_unparsed` lines from Kashvi's parser, letting an admin map one to a schema
field, storing that mapping as a row, and having the parser pick it up on the
next run with no redeploy.

NTRO's headline ask is exactly this — an engine that learns a new vendor's
syntax without a code change. Nobody currently owns it, and it's what you'll
build out properly between the 7th and the 20th. Even a rough version on the 7th
is the strongest thing on the table.

## Done when

Findings and paths get readable explanations, the tool works identically with
the API key removed, and the full demo runs with wifi off.

## Your judge questions

- What exactly do you send to the LLM? (point at `ALLOWED_KEYS`)
- Does it work offline? (**demo it** — turn the wifi off, re-run)
