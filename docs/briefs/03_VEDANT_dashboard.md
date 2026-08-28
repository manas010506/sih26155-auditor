# VEDANT — Dashboard

**Your one line:** the main UI. You need zero backend today — import the sample
JSON directly and build against it.

## Files in this folder → where they go

| File | Repo path |
|---|---|
| `tokens.css` | `frontend/src/styles/tokens.css` |
| `sample_report.json` | `samples/` (and `frontend/src/` while working offline) |

## Tonight (30 minutes)

```bash
npm create vite@latest frontend -- --template react
cd frontend && npm install && npm i recharts
cp ../samples/sample_report.json src/sample_report.json
npm run dev
```

```jsx
import report from "./sample_report.json";
```

That import becomes a `fetch()` on Tue 1 Sep. Nothing else changes.

## Task order

- **Tonight:** shell + `tokens.css` + findings table showing all 15 rows.
- **Sat 29:** app shell (sidebar + main panel, fixed, dark) and
  `FindingsTable.jsx` **properly**: severity pill, monospace rule ID, sort by
  severity, filter, click-to-expand showing the `raw_ref` snippet and line
  number. Build this first and build it well — densest screen, and it exposes
  layout problems while there's still time.
- **Sun 30:** `SeverityDashboard.jsx` (Recharts), `ComplianceGauge.jsx` (a
  custom SVG arc reads far better than a library gauge, ~1 hour), upload screen
  with drag-drop and the extension → `source_type` mapping.
- **Mon 31:** the three states everyone forgets — empty (say "compliant", don't
  show a blank table), loading, error. Judges upload weird things.
- **Tue 1:** swap the import for `fetch()` against Sanavi's endpoint.
  She has it running tonight — you never wait for the real engine.
- **Wed 2:** point at the real engine output, fix what differs.
- **Thu 3:** integration day.
- **Fri 4: the PDF report.** See below — this is a named NTRO deliverable.
- **Sat 5:** the design pass.
- **Sun 6:** rehearse driving the UI. You're at the keyboard on the day.

## Three things in the data that will break a naive table

1. **Three findings have `raw_ref: null`** — no syslog host, no SSH version pin,
   no login banner. Render them without a line number and don't crash.
2. **`remediation_template` is multi-line CLI.** Preserve the newlines,
   monospace, and give it a copy button. This is the "actionable" half of the
   problem statement.
3. **`score_breakdown`** carries the formula and its inputs. Show the working on
   hover or in a tooltip — it's the difference between a number and a claim.

## The PDF report (Fri 4 Sep)

NTRO explicitly asks for a single PDF per device with device identification,
pass/fail findings with severity, and device-specific remediation CLI. The
handbook had no owner for this. Cheapest correct solution: a `ReportView.jsx`
print layout plus a `@media print` stylesheet, exported through the browser
print dialog. No new dependency, works offline. Include all three required
sections; the `device` block at the top of `sample_report.json` covers the first.

## The look (Handbook §10, hard rule 2)

`tokens.css` has the palette and scale. Every component reads from it and
nothing hardcodes a colour or a size — that discipline is what makes a UI look
designed rather than generated.

Severity colours are used for severity and nothing else. Never decorate with
them. Monospace for every technical value: rule IDs, line numbers, snippets,
CLI, hostnames, IPs.

Banned: gradients, emoji in headers, centered marketing layouts, untouched
component-library defaults. Open Wazuh or Nessus screenshots side by side and
ask whether yours belongs in that set.

## Done when

The full 15-finding report renders from the sample JSON, then from the live API,
and the PDF export produces a clean multi-page document with no UI chrome in it.
