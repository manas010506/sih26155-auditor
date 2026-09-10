"""Repo path: engine/report.py     Owner: Manas

The audit result as a document someone can file.

The report is evidence, so every section shows what the engine actually found
and nothing else: a value absent from the configuration says so, a framework
with no rules behind it is not scored, and an unparsed line is reported as
unread rather than as a pass or a failure.

Build a report with:

    build_report(run_audit(text, source_type))  ->  bytes
"""
from __future__ import annotations

import datetime
import io

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

SEVERITY_COLOUR = {
    "critical": colors.HexColor("#B3261E"),
    "high": colors.HexColor("#C7601A"),
    "medium": colors.HexColor("#8A6D1F"),
    "low": colors.HexColor("#4A5568"),
}

# Cloud accounts have no hardware to identify. Rendering these rows for a
# Terraform audit would fill the cover with lines that can never be answered.
DEVICE_ROWS = [
    ("Hostname", "hostname"),
    ("Vendor", "vendor"),
    ("Operating system", "os"),
    ("OS version", "os_version"),
    ("Model", "model"),
    ("Serial number", "serial_number"),
    ("Firmware", "firmware"),
]


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("H1x", parent=s["Heading1"], fontSize=18, spaceAfter=4))
    s.add(ParagraphStyle("H2x", parent=s["Heading2"], fontSize=13, spaceBefore=14,
                         spaceAfter=6))
    s.add(ParagraphStyle("Body", parent=s["BodyText"], fontSize=9, leading=12,
                         alignment=TA_LEFT))
    s.add(ParagraphStyle("Mono", parent=s["BodyText"], fontName="Courier",
                         fontSize=8, leading=10, textColor=colors.HexColor("#333333")))
    s.add(ParagraphStyle("Muted", parent=s["BodyText"], fontSize=8.5, leading=11,
                         textColor=colors.HexColor("#666666")))
    return s


def _cover(result: dict, st) -> list:
    device = result["device"]
    flow: list = [Paragraph("Network Security Compliance Report", st["H1x"])]
    flow.append(Paragraph(
        f"Generated {datetime.date.today().isoformat()} · SIH26155 Auditor",
        st["Muted"]))
    flow.append(Spacer(1, 8 * mm))

    rows = [(label, device[key]) for label, key in DEVICE_ROWS if key in device]
    rows.append(("Compliance score", f"{result['compliance_score']} / 100"))

    t = Table([[Paragraph(f"<b>{k}</b>", st["Body"]), Paragraph(str(v), st["Body"])]
               for k, v in rows], colWidths=[45 * mm, 110 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.25, colors.HexColor("#DDDDDD")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    flow.append(t)
    return flow

def _framework_summary(result: dict, st) -> list:
    """Only frameworks with rules behind them get a score.

    A framework we have not implemented is listed as not implemented rather
    than shown at 0%, which would read as a compliance failure instead of an
    absence of rules.
    """
    breakdown = result.get("score_breakdown", {})
    implemented = [f.upper() for f in breakdown.get("frameworks", [])]

    flow: list = [Paragraph("Framework coverage", st["H2x"])]
    rows = [["Framework", "Status"]]
    for name in ("CIS", "NIST", "STIG", "ISO 27001"):
        rows.append([name, "Evaluated" if name in implemented else "Not implemented"])

    t = Table(rows, colWidths=[45 * mm, 110 * mm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.black),
        ("TEXTCOLOR", (1, 1), (1, -1), colors.HexColor("#444444")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    flow.append(t)

    ev = breakdown.get("rules_evaluated")
    if ev:
        flow.append(Spacer(1, 4 * mm))
        flow.append(Paragraph(
            f"{breakdown.get('rules_passed', 0)} of {ev} checks passed. "
            f"Score is weighted by severity, not a simple pass count.", st["Muted"]))
    return flow


def _findings(result: dict, st) -> list:
    flow: list = [Paragraph("Findings", st["H2x"])]
    findings = result.get("findings", [])
    if not findings:
        flow.append(Paragraph("No failed checks.", st["Body"]))
        return flow

    for f in findings:
        sev = (f.get("severity") or "low").lower()
        block: list = [Paragraph(
            f'<font color="{SEVERITY_COLOUR.get(sev, colors.black)}"><b>'
            f'{sev.upper()}</b></font> &nbsp; <b>{f.get("rule_id", "")}</b> '
            f'&nbsp; {f.get("title", "")}', st["Body"])]

        ref = f.get("raw_ref") or {}
        if ref.get("snippet"):
            block.append(Paragraph(
                f'Line {ref.get("line", "?")}: {ref["snippet"]}', st["Mono"]))
        if f.get("cis_control"):
            block.append(Paragraph(f'Control: {f["cis_control"]}', st["Muted"]))
        if f.get("explanation"):
            block.append(Paragraph(f["explanation"], st["Body"]))
        if f.get("remediation_template"):
            block.append(Paragraph("Remediation:", st["Muted"]))
            block.append(Paragraph(
                f["remediation_template"]
                .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace(" ", "&nbsp;").replace("\n", "<br/>"),
                st["Mono"]))
        block.append(Spacer(1, 5 * mm))
        flow.append(KeepTogether(block))
    return flow

def _attack_paths(result: dict, st) -> list:
    """Findings that combine into something worse than their parts.

    Each path carries the one fix that breaks it, which is the difference
    between a list of 27 problems and a place to start.
    """
    paths = result.get("attack_paths", [])
    if not paths:
        return []

    flow: list = []
    heading = Paragraph("Attack paths", st["H2x"])
    for i, p in enumerate(paths):
        sev = (p.get("severity") or "low").lower()
        block: list = [Paragraph(
            f'<font color="{SEVERITY_COLOUR.get(sev, colors.black)}"><b>'
            f'{sev.upper()}</b></font> &nbsp; <b>{p.get("name", "")}</b>', st["Body"])]
        block.append(Paragraph(
            f'{p.get("chain_id", "")} · contributing findings: '
            f'{", ".join(p.get("contributing_findings", []))}', st["Muted"]))
        if p.get("narrative"):
            block.append(Paragraph(p["narrative"], st["Body"]))
        brk = p.get("break_chain") or {}
        if brk.get("fix_rule"):
            block.append(Paragraph(
                f'<b>Breaks the chain: {brk["fix_rule"]}</b> — {brk.get("why", "")}',
                st["Body"]))
        block.append(Spacer(1, 5 * mm))
        combined: list = [heading] + block
        flow.append(KeepTogether(combined) if i == 0 else KeepTogether(block))
    return flow


def _unparsed(result: dict, st) -> list:
    """Lines the parser could not read.

    These are neither passes nor failures. Reporting them is what keeps the
    score honest: the auditor is stating the limits of what it read.
    """
    lines = result.get("unparsed", [])
    if not lines:
        return []

    flow: list = [Paragraph("Unrecognised configuration", st["H2x"])]
    flow.append(Paragraph(
        f"{len(lines)} lines were not recognised by the parser. They are neither "
        f"compliant nor non-compliant — no rule could be evaluated against them, "
        f"so the score above is a floor rather than a verdict.", st["Body"]))
    flow.append(Spacer(1, 3 * mm))
    for item in lines:
        text = item.get("text", item) if isinstance(item, dict) else item
        flow.append(Paragraph(str(text).replace(" ", "&nbsp;"), st["Mono"]))
    return flow


def build_report(result: dict) -> bytes:
    """The audit result as a PDF, returned as bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title="Network Security Compliance Report",
        author="SIH26155 Auditor",
    )
    st = _styles()

    flow: list = []
    flow += _cover(result, st)
    flow += _framework_summary(result, st)
    flow.append(PageBreak())
    flow += _findings(result, st)
    flow += _attack_paths(result, st)
    flow += _unparsed(result, st)

    doc.build(flow)
    return buf.getvalue()