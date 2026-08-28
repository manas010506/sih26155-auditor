# SIH26155 — Full Roadmap, Fri 28 Aug → Mon 7 Sep

Every person, every day, with a "done when" you can check. Companion to the Project
Handbook and the Day 0 Start Guide.

---

## 1. The calendar you actually have

This is the single biggest planning fact and the handbook's phase plan hides it. You do
**not** have ten equal days. You have two weekends and five weekday evenings.

| Block | Days | Realistic hours/person |
|---|---|---|
| Day 0 | Fri 28 Aug (evening) | 3–4 |
| **Weekend 1** | Sat 29 – Sun 30 Aug | **10–14 (the big block)** |
| Weekday evenings | Mon 31 – Fri 4 Sep | 3–4 each |
| **Weekend 2** | Sat 5 – Sun 6 Sep | **10–14** |
| Hackathon | Mon 7 Sep | — |

Plan accordingly:

- **Weekend 1 is your build weekend.** Every component should reach "runs standalone" by
  Sunday night. If you push this into the week, you lose — weekday evenings are for
  wiring and fixing, not for writing a parser from scratch.
- **Weekday evenings are integration.** Small, well-defined tasks with a clear finish.
  Don't schedule anything that needs a four-hour run-up.
- **Weekend 2 is hardening and rehearsal, not building.** Anything not working by Fri
  night gets cut, not crunched.

---

## 2. Master grid

| | Manas | Kashvi | Vedant | Sanavi | Shreyas | Deep |
|---|---|---|---|---|---|---|
| **D0** Fri 28 | Schema, fixtures, YAML formats | Env + failing test | Vite + tokens + table | **Mock API**, React Flow | templates.py | CIS downloads, corpus gen |
| **D1** Sat 29 | Rule engine | VTY, SNMP resources | App shell + findings table | Graph: one path | sanitize() + templates | Corpus to 30, rules batch 1 |
| **D2** Sun 30 | Terraform parser | Globals, absence facts, **golden test green** | Charts, gauge, upload UI | All paths + break-chain | Gemini behind fallback | Rules batch 2, AWS rules |
| **D3** Mon 31 | report.py + score | Edge cases vs corpus | States: empty/loading/error | Graph ↔ table interactions | Caching | attack_chains.yaml |
| **D4** Tue 1 | Correlation layer | `_unparsed` collection | Connect api.js | **Real Flask → run_audit()** | Path narratives | metrics.py + first run |
| **D5** Wed 2 | `run_audit()` wired | Malformed-input hardening | Live engine data | Live wiring | Enrichment pass, non-blocking | Tune rules, chase FPs |
| **D6** Thu 3 | **INTEGRATION — freeze features** | Integration | Integration | Integration | Integration | Full metrics run |
| **D7** Fri 4 | Errors + "add a rule live" | Stretch: 2nd vendor | **PDF/print report view** | Graph polish | Cache demo narratives, offline test | Lock headline number |
| **D8** Sat 5 | **CODE FREEZE**, rehearse engine walkthrough | Support + explain-your-code | Design pass | Design pass | Training-loop spike (stretch) | Coverage table + slide |
| **D9** Sun 6 | Rehearsal ×2, Q&A, backup | Rehearsal | Drive UI in rehearsal | Present graph in rehearsal | Rehearsal | Rehearsal |
| **D10** Mon 7 | Smoke test → present | | | | | |

---

## 3. The three checkpoints that gate everything

Hit these or triage. Announce pass/fail in the group at each one.

**CP1 — Sun 30 Aug, night. "Everything runs standalone."**
Every one of the six can run their piece against `samples/` and show output. Nobody is
connected to anybody yet. If a component fails CP1, that person gets help on Monday and
the stretch items around it are dropped now, not later.

**CP2 — Thu 3 Sep, night. "End to end."**
Upload a bad Cisco config in the browser → real findings, real attack paths, real
narratives on screen. **Feature freeze at this moment.** Anything not merged is cut.

**CP3 — Sat 5 Sep, night. "Frozen and demoable."**
Code freeze. Headline metric locked. Demo runs clean on the actual presentation laptop,
with wifi off. Sunday is rehearsal only — no commits to `main` except crash fixes.

---

## 4. Manas — Engine lead

You are on the critical path four times. Your discipline is finishing *narrow* things fully
rather than starting everything.

**D0 Fri 28** — Repo, `requirements.txt`, `schema.py`, `parsers/base.py`, the five files in
`samples/`, plus the rule YAML format and the attack-chain YAML format (two worked examples
each, every field commented). *Done when: all five samples pushed and `sample_report.json`
has 15 findings / 3 paths. Message the group.*

**D1 Sat 29 — Rule engine (full day).** YAML loader → operator dispatch (`equals`,
`contains`, `in`, `exists`, `gte`, …) → match rules against schema resources → emit
findings → compute score. No rule logic in Python; every check comes from YAML. *Done
when: `python -m engine.rules.engine samples/normalized_examples.json` prints findings
and a score.*

**D2 Sun 30 — Terraform/AWS parser (full day).** Adapt the mini-auditor. Watch the two
known traps: `python-hcl2` quotes string values (`'"public-read"'` — use `uq()`), and
modern Terraform splits S3 ACL/encryption into separate resources you must reconcile into
one logical `s3_bucket`. *Done when: `main.tf` → valid normalized schema.*

**D3 Mon 31 (eve)** — `report.py`: assemble findings + score + source into the Report shape.
Chain parser → engine → report. *Done when: `main.tf` in, full Report JSON out, no
correlation yet.*

**D4 Tue 1 (eve)** — Correlation layer. Load `attack_chains.yaml`, group findings into
paths, populate `break_chain`. *Done when: the demo config produces at least 2 attack paths.*

**D5 Wed 2 (eve)** — `audit.py`: `run_audit(config_text, source_type)` dispatching to both
parsers, running engine → correlation → report, with template narratives pre-filled.
Validate `source_type` and raise a clean error on garbage. *Done when: Sanavi can import it
and her Flask endpoint returns real data.*

**D6 Thu 3 — Integration day.** You run this. See §10. **No new features after tonight.**

**D7 Fri 4 (eve)** — Error handling: empty file, wrong `source_type`, binary upload,
50MB file, config with zero findings. None may 500. Then build the **live "add a rule"
demo**: a rule you paste into the YAML during the presentation, re-run, and it appears in
the findings. Rehearse it — it's your strongest extensibility proof.

**D8 Sat 5** — Code freeze. Rehearse explaining the flow — *parse → normalize → match →
correlate → report* — cleanly in your own words, twice, out loud, to a teammate. If you
stumble, you don't know it yet.

**D9 Sun 6** — Two full rehearsals. Lock the Q&A answers (§11). Build the backup: recorded
screen capture of the working demo, plus pre-computed report JSON the UI can load if the
engine dies on stage.

---

## 5. Kashvi — Cisco IOS parser

Your acceptance test is written before you start. Everything is "make the golden test pass."

**D0 Fri 28** — Install `ciscoconfparse2`, write the failing golden test.
*Done when: `pytest` fails on an assertion, not an import.*

**D1 Sat 29** — `vty_line` (transport input, exec-timeout, access-class, login),
`snmp_community` (string, RO/RW, ACL), `snmp_settings`. Attach `raw_ref` line numbers to
every one. *Done when: those three resource types match the golden block exactly.*

**D2 Sun 30 — the hard day.** `global_settings`, `local_user`, `logging`, `ntp` — and
**absence-based facts**. Cisco's insecure defaults are silent: no `no ip http server` line
means HTTP is *on*, and the vulnerability is the missing line. Emit the resource with
`raw_ref: null` and the insecure default. Write every assumed default in a comment block
at the top of the file; Deep needs it to write matching rules and a judge will ask.
*Done when: the full golden test is green.*

**D3 Mon 31 (eve)** — Run your parser over every file in Deep's corpus. Fix every crash.
Different IOS versions indent differently and banner blocks span lines. *Done when: 100%
of corpus files parse without exception.*

**D4 Tue 1 (eve)** — `_unparsed` collection: every config line your parser didn't recognize
goes into the array with its line number. This is cheap and it's doing double duty — it
proves you're not silently ignoring things, and it's the exact hook the training loop
plugs into after the 7th.

**D5 Wed 2 (eve)** — Hardening. Empty file, truncated config, Windows line endings, a
Juniper config fed in by mistake. Return an empty-but-valid schema, never crash.

**D6 Thu 3** — Integration.

**D7 Fri 4 (eve) — stretch only if genuinely ahead:** a second vendor. MikroTik RouterOS
or a minimal Juniper `set`-syntax parser. Even a partial one covering four checks
transforms "multi-vendor" from a claim into a demo. **Do not start this if anything above
is unfinished.**

**D8–D9** — Help Deep validate the corpus. Rehearse explaining absence-based detection —
it's the most interesting thing in your component and judges reward it.

---

## 6. Vedant — Dashboard

**D0 Fri 28** — Vite app, `src/styles/tokens.css` (palette, type scale, severity colours,
spacing — decided once, tonight), findings table rendering 15 rows from the sample JSON.
*Done when: `npm run dev` shows all 15 findings.*

**D1 Sat 29** — App shell (sidebar + main panel, fixed, dark) and `FindingsTable.jsx`
properly: severity pill, monospace rule ID, sort by severity, filter, click-to-expand
showing the `raw_ref` snippet and line number. Build this first and build it well — it's
the densest screen and it surfaces layout problems while you still have time.

**D2 Sun 30** — `SeverityDashboard.jsx` (Recharts), `ComplianceGauge.jsx` (custom SVG arc
reads far better than a library gauge, ~1 hour), and the upload screen: drag-drop, file
extension → `source_type` (`.tf` → `terraform_aws`, `.cfg`/`.conf`/`.txt` → `cisco_ios`),
manual dropdown override. *Done when: full report renders end to end from sample JSON.*
**This is CP1 for you.**

**D3 Mon 31 (eve)** — The three states everyone forgets: empty (no findings — say "compliant",
don't show a blank table), loading (during audit), error (engine failed). Judges upload
weird things.

**D4 Tue 1 (eve)** — Replace the JSON import with `fetch()` against Sanavi's endpoint.
Nothing else changes.

**D5 Wed 2 (eve)** — Point at the real engine output. Fix whatever differs from the sample.

**D6 Thu 3** — Integration.

**D7 Fri 4 (eve) — the PDF report.** The problem statement explicitly asks for *"a
comprehensive, single PDF report per device"* with device identification, pass/fail
findings with severity, and device-specific remediation CLI. The handbook has no owner for
this and it's a named NTRO deliverable. Cheapest correct solution: a `ReportView.jsx`
print layout plus a `@media print` stylesheet, exported via the browser print dialog. Zero
new dependencies, works offline, and looks professional if the CSS is right. Include all
three required sections. *Done when: clicking "Export PDF" produces a clean multi-page
document with no UI chrome in it.*

**D8 Sat 5 — the design pass.** Handbook §10 hard rule 2. Consistency in spacing, type
and colour is what separates "designed" from "generated." Severity colours used *only*
for severity, never decoration. Monospace for every technical value. No gradients, no
emoji in headers, no centered hero. Open Wazuh or Nessus screenshots side by side and ask
whether yours looks like it belongs in that set.

**D9 Sun 6** — Rehearse driving the UI. You're at the keyboard during the demo; know every
click without looking.

---

## 7. Sanavi — Attack-path graph + API

Two jobs on different schedules. The mock API is 15 minutes today; the real one is D4.

**D0 Fri 28** — Mock Flask endpoint returning `sample_report.json` regardless of input,
plus `@xyflow/react` installed. Tell Vedant the endpoint is live so he wires `api.js`
against real HTTP from the start instead of during integration week.

**D1 Sat 29** — One attack path rendering as a left-to-right chain: a node per entry in
`contributing_findings`, ending in a terminal impact node. Custom node components from the
start — never ship React Flow defaults.

**D2 Sun 30** — All three paths, a path selector, severity-driven node styling, and **the
break-chain highlight**: the node matching `break_chain.fix_rule` visually distinguished,
with the edge it cuts labelled. *Done when: someone who's never seen it can point at the
one fix that kills the chain.* **This is the single most important screen in the project** —
it's the one thing no other team's template hands them.

**D3 Mon 31 (eve)** — Interactions: click a node → the findings table scrolls to and
highlights that finding; hover → detail card. This is what makes it feel like a tool
rather than a picture.

**D4 Tue 1 (eve) — the real API.** Replace the mock body with
`run_audit(body["config_text"], body["source_type"])`. Add: request size limit, CORS,
try/except returning a clean 400 with a message the UI can display. *Done when: a real
config posted from the browser returns real findings.*

**D5 Wed 2 (eve)** — Live wiring with Vedant. Test with real engine output, which will
differ from the sample in small ways.

**D6 Thu 3** — Integration.

**D7 Fri 4 (eve)** — Graph polish: layout spacing so paths don't overlap, edge labels, a
subtle animation on the break-chain edge. This is the screenshot that goes on the slide.

**D8 Sat 5** — Design pass with Vedant. One visual language across both your screens.

**D9 Sun 6** — Rehearse presenting the graph. Ninety seconds, no notes.

---

## 8. Shreyas — Narrative layer

Fallback first, always. The system must be fully functional with no API key.

**D0 Fri 28** — `templates.py` + `generate_narrative(item, kind)` returning template text.
*Done when: it prints a readable paragraph for a sample attack path.*

**D1 Sat 29** — `sanitize()` as a **whitelist**, plus a test asserting no raw config,
hostname or IP survives it. Then a template quality pass: per-rule-family wording, not one
generic sentence. Templates are your floor — if Gemini fails on stage, this is what judges
read, so make it good enough to ship alone.

**D2 Sun 30** — Gemini behind the fallback. `pip install google-genai`, key in `.env`,
`.env` in `.gitignore` on your first commit. Check the current AI Studio quickstart for the
call shape — the SDK changed recently and older snippets won't run. *Done when: narratives
improve with the key present and the tool still works with it removed.* **CP1.**

**D3 Mon 31 (eve)** — Caching. Hash the sanitized item → `cache.json`. Never call twice
for the same finding.

**D4 Tue 1 (eve)** — Attack-path narratives specifically. These are the ones that matter —
they're the prose next to Sanavi's graph. Narrate paths only (3–5), never all 15 findings.

**D5 Wed 2 (eve)** — Wire into `run_audit()` as a **separate enrichment pass**. The report
returns immediately with template text; the LLM upgrades it in place afterward. Never block
the response on network calls — 15 live calls is 20–60 seconds and it will kill the demo.

**D6 Thu 3** — Integration.

**D7 Fri 4 (eve) — the offline test that saves your demo.** Pre-generate narratives for
every demo config, commit `cache.json`, then **turn off wifi and run the full demo**. If
anything degrades visibly, fix it tonight. Venue wifi is not a dependency you get to have.

**D8 Sat 5 — stretch, and it's the valuable one.** If you're clean, spike the **training
loop**: a screen listing `_unparsed` lines from Kashvi's parser, letting an admin map one
to a schema field, storing that mapping as a row, and having the parser pick it up on the
next run with no redeploy. Even a rough version is the thing NTRO actually asked for, and
it's what you'll build out properly before the 20th.

**D9 Sun 6** — Rehearse the answer to "what exactly do you send to Google?" Point at the
whitelist. That's a much stronger answer than describing a regex.

---

## 9. Deep — Rules, corpus, metrics

Your headline number goes on a slide, so it has to be real and it has to be early.

**D0 Fri 28** — Start the CIS benchmark downloads (registration + email confirmation, so
begin now). Scaffold the corpus generator. *Done when: 10+ config/expected pairs exist.*

**D1 Sat 29** — Corpus to 30–40 configs. Use the generator: one hardened baseline, then N
variants each with exactly one injected misconfiguration — the injection *is* the ground
truth, emitted automatically. Add 4–5 hand-written messy realistic configs too; the
generated ones are too clean to catch parser edge cases. Then rules batch 1 (VTY, SNMP)
once Manas's format lands.

**D2 Sun 30** — Rules batch 2: passwords/auth, logging, NTP, insecure services. Then
`aws_rules.yaml`. Work rule-family by rule-family, not benchmark-section by section —
faster, and you catch overlaps. Use only the operators in Manas's comment block; if a CIS
control needs something new, ask, don't invent syntax. *Done when: 35+ rules load without
error.* **CP1.**

**D3 Mon 31 (eve)** — `attack_chains.yaml`. Three or four chains, at least one network and
one cloud. A chain needs a plausible story: exposed management + weak auth + no logging =
undetected admin takeover. Coordinate with Sanavi — these are what her graph draws.

**D4 Tue 1 (eve)** — `metrics.py` and the first real run against Kashvi's parser.
```
detection rate  = seeded misconfigs found / seeded total
false positives = findings raised against clean_baseline.cfg
```

**D5 Wed 2 (eve)** — Tune. Chase every false positive to its rule and fix the rule. The FP
number is the one that impresses — any tool can flag everything.

**D6 Thu 3** — Full metrics run on the integrated system.

**D7 Fri 4 (eve)** — **Lock the headline number** and build the slide:
*"Caught 94% of 47 seeded misconfigurations across 38 configs, with 2 false positives."*
Also produce a CIS coverage table — which controls you cover, which you don't. Naming your
gaps is more credible than implying full coverage, and judges test for it.

**D8 Sat 5** — Re-run metrics against the frozen code. The number on the slide must match
the number the code produces on the day.

**D9 Sun 6** — Rehearse "how did you measure that?" End to end, including how ground truth
was generated.

---

## 10. Integration day protocol — Thu 3 Sep

The day teams lose. Run it like this:

1. **Everyone merges to `main` by 6pm.** Not "nearly done" — merged.
2. **Manas runs the full pipeline** and posts the first error to the group.
3. **Fix in dependency order:** parser → engine → correlation → API → UI. Don't fix a UI
   bug caused by a schema mismatch.
4. **Nobody starts anything new.** Every contract mismatch found today is a fix, not a
   feature.
5. **CP2 declared by 11pm:** end to end works, or you triage using §12 tonight rather than
   discovering it on Saturday.

Expect contract drift. Someone will have added a field, renamed one, or made a nullable
value non-null. That's normal — it's why the checkpoint exists.

---

## 11. Judge Q&A — assign these now

Each person owns their answers and rehearses them on the 6th.

| Question | Owner |
|---|---|
| Walk me through what happens when I upload a config | Manas |
| How is this different from running a grep script? | Manas (answer: YAML-driven rules + correlation + normalization across vendors) |
| Add a rule right now | Manas (live, rehearsed) |
| What happens with a vendor you've never seen? | Kashvi + Shreyas (`_unparsed` today, training loop next) |
| How do you detect something that isn't in the config? | Kashvi (absence-based facts) |
| What do you send to the LLM? | Shreyas (whitelist, on screen) |
| Does it work offline? | Shreyas (demo it — wifi off) |
| How did you measure that number? | Deep |
| Which CIS controls don't you cover? | Deep (coverage table) |
| Why should I trust the attack paths? | Sanavi (chain definitions are declarative YAML, show one) |

---

## 12. Triage order — cut in exactly this sequence

When you're behind, cut from the top. Never improvise the order at 1am.

1. Second vendor parser
2. Live Gemini calls (keep cached narratives — demo is identical)
3. Server-side PDF (fall back to browser print)
4. Graph interactions (static graph still lands)
5. Corpus size (25 configs still gives a real number)
6. Attack chains beyond two

**Never cut:** the Cisco parser, the YAML-driven engine, the findings table, the
attack-path graph, the offline test, or Sunday's rehearsals. Four beautiful components
that were never integrated lose to three plain ones that work together.

---

## 13. Demo run-of-show — Mon 7 Sep

Six minutes. Rehearsed twice on Sunday, on the presentation laptop, wifi off.

| Time | Content | Driver |
|---|---|---|
| 0:00–0:30 | The problem: misconfiguration, multi-vendor, no unified source of truth | Manas |
| 0:30–1:00 | Architecture, one slide, one breath | Manas |
| 1:00–2:30 | Upload a bad Cisco config → findings table → drill into a raw_ref line | Vedant |
| 2:30–3:30 | Attack path graph → the one fix that breaks the chain | Sanavi |
| 3:30–4:15 | **Add a rule live**, re-run, watch it appear | Manas |
| 4:15–4:45 | Metrics slide: detection rate, false positives, CIS coverage | Deep |
| 4:45–5:00 | "This ran with the wifi off" — say it out loud | Shreyas |
| 5:00+ | Q&A | all |

**Backups, ready before you walk in:** a screen recording of the full working demo, a
pre-computed report JSON the UI can load if the engine dies, and both sample configs on a
USB stick. Smoke-test on the presentation machine before you present, not the night before.

---

## 14. After the 7th — the path to 20 September

The internal round is a checkpoint, not the finish. The real submission is due **20 Sep**,
and one thing separates you from every other team who builds this:

**Build the training loop properly.** NTRO's headline ask is the interactive interface
where an admin maps unrecognized commands to schema fields and the engine learns them
without a code redeploy. `_unparsed` (Kashvi, D4) is the hook; Shreyas's D8 spike is the
prototype. Two weeks is enough to make it real, and it's what turns "another compliance
scanner" into an answer to the actual problem statement.

Also due by the 20th, per the PS: source code link, README with setup instructions, an
architecture document (max 2 pages), a 2-minute demo video, and a technical presentation
(max 5 slides). Assign an owner for these on the 8th — the deck and video take a full day
and they are currently nobody's job.
