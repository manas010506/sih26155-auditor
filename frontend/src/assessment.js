// One place that decides how an audit result is described. A report is
// scored, partial (too little of the file was readable for a verdict),
// or not assessed (nothing applicable could be evaluated).
export function assessment(report) {
  if (!report) return { kind: 'none', label: '—', short: '—' };
  const b = report.score_breakdown ?? {};
  if (b.not_assessable) {
    return { kind: 'not_assessed', label: 'Not assessed', short: 'Not assessed' };
  }
  if (b.partial) {
    const ev = b.rules_evaluated ?? 0;
    const total = b.controls_total ?? '?';
    return {
      kind: 'partial', evaluated: ev, total,
      label: `Partial assessment — ${ev} of ${total} controls`,
      short: 'Partial',
    };
  }
  return {
    kind: 'scored', score: report.compliance_score,
    label: `${report.compliance_score}/100`, short: String(report.compliance_score),
  };
}


// Remediation text is written in Cisco IOS syntax (or Terraform for AWS). Say so
// wherever the audited device is not a natively read Cisco IOS config, so a
// Juniper, Aruba or MikroTik reader isn't handed commands as if they were theirs.
export function remediationLabel(report) {
  const src = report?.source?.type;
  if (src === 'terraform_aws') return 'Remediation (Terraform)';
  if (src === 'cisco_ios' && assessment(report).kind === 'scored') return 'Remediation CLI';
  return 'Remediation · Cisco IOS reference syntax';
}
