# SANAVI — Attack-path graph + API glue

**Your one line:** the standout visualization, plus the thin Flask layer between
UI and engine. Two jobs on different schedules.

## Files in this folder → where they go

| File | Repo path |
|---|---|
| `app.py` | `api/app.py` |
| `api.js` | `frontend/src/api.js` |
| `sample_attack_paths.json` | `samples/` |
| `sample_report.json` | `samples/` |

## Do this first — 15 minutes, tonight

`app.py` is written and runnable. It returns `sample_report.json` regardless of
what you send it, with real validation and error handling already in place.

```bash
pip install flask flask-cors
flask --app api/app.py run --port 5000
curl -X POST localhost:5000/api/audit -H 'Content-Type: application/json' \
     -d '{"config_text":"x","source_type":"cisco_ios"}'
```

**Then tell Vedant the endpoint is live.** He wires `api.js` against real HTTP
tomorrow instead of during integration week, which removes the biggest week-two
risk on the project.

On Tue 1 Sep you swap **one line** — the marked `STAGE 2` comment — for
`run_audit(config_text, source_type)`.

## Then the graph

```bash
cd frontend && npm i @xyflow/react
```

(v12 is `@xyflow/react`; older tutorials say `reactflow` — same library, renamed.)

- **Sat 29:** one attack path as a left-to-right chain — a node per entry in
  `contributing_findings`, ending in a terminal impact node. Custom node
  components from the start; never ship React Flow defaults.
- **Sun 30:** all three paths, a path selector, severity-driven node styling,
  and **the break-chain highlight** — the node matching `break_chain.fix_rule`
  visually distinguished, with the edge it cuts labelled.
- **Mon 31:** interactions. Click a node → the findings table scrolls to and
  highlights that finding. Hover → detail card. This is what makes it a tool
  rather than a picture.
- **Tue 1:** the real Flask endpoint.
- **Wed 2:** live wiring with Vedant against real engine output.
- **Thu 3:** integration day.
- **Fri 4:** graph polish — layout spacing so paths don't overlap, edge labels,
  a subtle animation on the break-chain edge. This is the screenshot for the slide.
- **Sat 5:** design pass with Vedant. One visual language across both screens.
- **Sun 6:** rehearse presenting the graph. Ninety seconds, no notes.

## Why this screen matters more than the rest

Every team that picks this problem builds a findings table. **Nobody's template
hands them an attack-path graph with a break-chain highlight.** This is the one
screen judges will remember, and it's yours.

The test: someone who has never seen the tool should be able to point at the one
fix that kills the chain, without you explaining it.

The data is in `sample_attack_paths.json` — three chains, every
`contributing_findings` entry resolving to a real finding, every
`break_chain.fix_rule` inside its own chain. Verified.

## Done when

Attack paths render as a clear graph, clicking a node drives the findings table,
and the UI talks to the real engine over Flask.

## Your judge question

Why should I trust the attack paths? (They're declarative YAML chain
definitions, not hardcoded — show `attack_chains.yaml`.)
