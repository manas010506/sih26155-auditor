import React, { useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconPrinter } from '@tabler/icons-react';
import SeverityLED from '../components/SeverityLED';


const ReportView = () => {
  const { reportData } = useOutletContext();

  useEffect(() => {
    document.title = 'Report | Compliance Auditor';
  }, []);

  if (!reportData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: 'var(--substrate)' }}>
        <div className="corner-marks" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px', border: '1px dashed var(--wire)', backgroundColor: 'var(--panel)', maxWidth: '400px' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ color: 'var(--ink-dim)' }}>
            {/* Dashed Outline box */}
            <rect x="8" y="8" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
            {/* Cross/Cancel inner shape */}
            <path d="M 18 18 l 12 12 M 30 18 l -12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            {/* Tick marks */}
            <path d="M 8 24 h -4 M 40 24 h 4 M 24 8 v -4 M 24 40 v 4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="mono" style={{ fontSize: '14px', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>No Report Generated</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-dim)', textAlign: 'center', lineHeight: '1.5' }}>
            There is no report to view because an audit has not been run. Upload a configuration file to begin.
          </div>
          <Link to="/audit/upload" style={{
            marginTop: '8px',
            backgroundColor: 'transparent',
            border: '1px solid var(--wire)',
            color: 'var(--ink)',
            padding: '8px 20px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            transition: 'border-color 0.2s, color 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--trace)'; e.currentTarget.style.color = 'var(--trace)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--wire)'; e.currentTarget.style.color = 'var(--ink)'; }}
          >
            Go to Upload
          </Link>
        </div>
      </div>
    );
  }

  const { device, findings } = reportData;
  const totalFindings = findings.length;   // findings are failures; passes come from score_breakdown

  return (
    <>
      {/* ── Screen-only print trigger bar ───────────────────────── */}
      <div className="print-hide" style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--wire)',
        backgroundColor: 'var(--panel)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div className="heading-sm">Compliance Report</div>
          <div className="label" style={{ marginTop: '2px' }}>
            {totalFindings} findings · compliance score: {reportData.compliance_score ?? 'N/A'}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.print()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--trace)',
            border: 'none',
            color: 'var(--substrate)',
            padding: '8px 20px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          <IconPrinter size={15} />
          Print to PDF
        </motion.button>
      </div>

      {/* ── Printable document body ──────────────────────────────── */}
      <div id="report-body" style={{
        padding: '32px 48px',
        maxWidth: '860px',
        margin: '0 auto',
        backgroundColor: 'var(--substrate)',
      }}>

        {/* Document header */}
        <div style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid var(--wire)' }}>
          <div className="label" style={{ marginBottom: '8px' }}>SIH-26155 · NTRO AUDIT REPORT</div>
          <div className="heading-lg" style={{ fontSize: '22px', marginBottom: '20px', letterSpacing: '-0.02em' }}>
            COMPLIANCE AUDITOR
          </div>

          {/* Device identity grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            backgroundColor: 'var(--wire)',
            border: '1px solid var(--wire)',
          }}>
            {[
              ['Device',      device.hostname],
              ['Vendor',      device.vendor],
              ['OS',          device.os],
              ['OS Version',  device.version],
              ['Model',       device.model],
              ['Serial',      device.serial],
              ['Source Type', reportData.source?.type],
            ].map(([label, value]) => (
              <div key={label} style={{ backgroundColor: 'var(--panel)', padding: '10px 14px' }}>
                <div className="label" style={{ marginBottom: '3px' }}>{label}</div>
                <div className="value">{value ?? 'not in config'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: '1px', backgroundColor: 'var(--wire)', marginBottom: '32px', border: '1px solid var(--wire)' }}>
          {[
            { label: 'Checks Run',       value: reportData.score_breakdown?.rules_evaluated ?? '—', color: 'var(--ink)' },
            { label: 'Passed',           value: reportData.score_breakdown?.rules_passed ?? '—',    color: 'var(--trace)' },
            { label: 'Failed',           value: totalFindings,                                      color: 'var(--severity-critical)' },
            { label: 'Compliance Score', value: reportData.compliance_score ?? '—',                 color: 'var(--ink)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, backgroundColor: 'var(--panel)', padding: '14px 16px', textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: '28px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>
                {value}
              </div>
              <div className="label">{label}</div>
            </div>
          ))}
        </div>

        {/* Findings list */}
        <div className="heading-sm" style={{ marginBottom: '16px' }}>Audit Findings</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--wire)' }}>
          {findings.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', backgroundColor: 'var(--panel)', gap: '12px' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" style={{ color: 'var(--trace)' }}>
                {/* Outer ring */}
                <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                {/* Inner dot LED */}
                <circle cx="16" cy="16" r="4" fill="currentColor" />
                {/* Tick marks */}
                <path d="M 16 0 v 4 M 16 32 v -4 M 0 16 h 4 M 32 16 h -4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <div className="mono" style={{ fontSize: '14px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Compliant</div>
              <div style={{ fontSize: '13px', color: 'var(--ink-dim)' }}>No security findings detected in this configuration.</div>
            </div>
          ) : (
            findings.map((finding) => (
              <div
                key={finding.rule_id}
                className="print-break-inside-avoid"
                style={{ backgroundColor: 'var(--panel)' }}
              >
                {/* Finding header row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--wire)',
                }}>
                  {/* LED severity indicator — no filled pill */}
                  <SeverityLED severity={finding.severity} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {finding.severity}
                  </span>
                  <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--wire)', flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--trace)' }}>{finding.rule_id}</span>
                  <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--wire)', flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', textTransform: 'uppercase' }}>{finding.cis_control}</span>
                </div>

                {/* Description */}
                <div style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--ink)', borderBottom: '1px solid var(--wire)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{finding.title}</div>
                  <div>{finding.explanation}</div>
                </div>

                {/* Remediation CLI */}
                {finding.remediation_template && (
                  <div style={{ padding: '10px 16px', backgroundColor: 'var(--substrate)' }}>
                    <div className="label" style={{ marginBottom: '6px' }}>Remediation CLI</div>
                    <pre style={{
                      margin: 0,
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '12px',
                      color: 'var(--ink)',
                      lineHeight: '1.6',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}>
                      {finding.remediation_template}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--wire)', textAlign: 'center' }}>
          <div className="label">Generated by Compliance Auditor · SIH-26155 · Do not distribute without clearance</div>
        </div>
      </div>
    </>
  );
};

export default ReportView;