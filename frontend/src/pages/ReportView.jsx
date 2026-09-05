import React, { useEffect, useState, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { IconPrinter, IconFileText, IconCheck, IconLoader2, IconShieldCheck, IconAlertTriangle } from '@tabler/icons-react';
import SeverityLED from '../components/SeverityLED';
import EmptyStateCard from '../components/EmptyStateCard';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/* Animated count-up for report numbers */
const CountUp = ({ end, duration = 1.2 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(end.toString());
      return;
    }
    const durationMs = duration * 1000;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * end).toString());
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return <span ref={ref}>{display}</span>;
};

/* Severity badge component for report entries */
const SeverityBadge = ({ severity }) => {
  const colors = {
    critical: 'var(--severity-critical)',
    high: 'var(--severity-high)',
    medium: 'var(--severity-medium)',
    low: 'var(--severity-low)',
  };
  const color = colors[severity?.toLowerCase()] || 'var(--ink-dim)';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '2px 8px',
      backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      borderRadius: '3px',
      fontSize: '10px',
      fontFamily: 'IBM Plex Mono, monospace',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color,
    }}>
      <SeverityLED severity={severity} />
      {severity}
    </span>
  );
};

/* Export button with loading/success state */
const ExportButton = ({ icon: Icon, label, onClick, variant = 'default' }) => {
  const [state, setState] = useState('idle'); // idle | loading | success

  const handleClick = async () => {
    setState('loading');
    try {
      await onClick();
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch (e) {
      console.error('Export failed:', e);
      setState('idle');
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      disabled={state === 'loading'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: variant === 'primary' ? 'var(--trace)' : 'transparent',
        border: variant === 'primary' ? 'none' : '1px solid var(--wire)',
        color: variant === 'primary' ? 'var(--substrate)' : 'var(--ink)',
        padding: '8px 18px',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        cursor: state === 'loading' ? 'wait' : 'pointer',
        borderRadius: '4px',
        transition: 'border-color 0.2s, color 0.2s, background-color 0.2s',
        opacity: state === 'loading' ? 0.7 : 1,
      }}
      onMouseEnter={e => {
        if (variant !== 'primary') {
          e.currentTarget.style.borderColor = 'var(--trace)';
          e.currentTarget.style.color = 'var(--trace)';
        }
      }}
      onMouseLeave={e => {
        if (variant !== 'primary') {
          e.currentTarget.style.borderColor = 'var(--wire)';
          e.currentTarget.style.color = 'var(--ink)';
        }
      }}
    >
      {state === 'loading' ? (
        <IconLoader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
      ) : state === 'success' ? (
        <IconCheck size={15} />
      ) : (
        <Icon size={15} />
      )}
      {state === 'success' ? 'Done' : label}
    </motion.button>
  );
};


const ReportView = () => {
  const { reportData } = useOutletContext();

  useEffect(() => {
    document.title = 'Report | Compliance Auditor';
  }, []);

  if (!reportData) {
    const ReportSVG = (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="reportGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--trace)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--trace)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--trace)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="25%" y="15%" width="50%" height="70%" rx="8" fill="none" stroke="var(--wire)" strokeWidth="1.5" opacity="0.4" />
        <rect x="35%" y="60%" width="8%" height="15%" rx="2" fill="var(--wire)" opacity="0.3" />
        <rect x="46%" y="45%" width="8%" height="30%" rx="2" fill="url(#reportGrad)" opacity="0.8" />
        <rect x="57%" y="55%" width="8%" height="20%" rx="2" fill="var(--wire)" opacity="0.3" />
        <rect x="35%" y="25%" width="30%" height="4" rx="2" fill="var(--wire)" opacity="0.4" />
        <rect x="35%" y="32%" width="20%" height="4" rx="2" fill="var(--wire)" opacity="0.2" />
        <rect x="35%" y="39%" width="25%" height="4" rx="2" fill="var(--wire)" opacity="0.2" />
        <path d="M -50 50 Q 250 80 550 50" fill="none" stroke="url(#reportGrad)" strokeWidth="1.5" />
      </svg>
    );

    return (
      <EmptyStateCard
        title="No Final Report"
        description="Upload a configuration file to generate a comprehensive compliance report suitable for external auditing and archiving."
        icon={IconFileText}
        svgLayer={ReportSVG}
      />
    );
  }

  const { device, findings } = reportData;
  const totalFindings = findings.length;
  const criticalCount = findings.filter(f => f.severity?.toLowerCase() === 'critical').length;
  const highCount = findings.filter(f => f.severity?.toLowerCase() === 'high').length;
  const reportDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  /* ── DOCX Export ────────────────────────────────────────────── */
  const generateDocx = async () => {
    const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
    const tableBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder, insideHorizontal: thinBorder, insideVertical: thinBorder };

    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: 'Normal',
            name: 'Normal',
            basedOn: 'Normal',
            next: 'Normal',
            run: { font: 'Helvetica', size: 22, color: '333333' },
            paragraph: { spacing: { after: 120 } }
          }
        ]
      },
      sections: [{
        properties: {},
        children: [
          // Title Section
          new Paragraph({
            children: [new TextRun({ text: 'COMPLIANCE AUDIT REPORT', bold: true, size: 36, font: 'Helvetica', color: '10141A' })],
            heading: HeadingLevel.TITLE,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `SIH-26155 · NTRO AUDIT REPORT`, bold: true, size: 22, color: '3FA9A0', font: 'Helvetica' })],
            spacing: { after: 400 },
          }),
          
          // Metadata Key-Value Block
          new Paragraph({
            children: [
              new TextRun({ text: 'Report Date: ', bold: true, size: 20 }),
              new TextRun({ text: `${reportDate}    `, size: 20 }),
              new TextRun({ text: 'Device: ', bold: true, size: 20 }),
              new TextRun({ text: `${device.hostname}    `, size: 20 }),
              new TextRun({ text: 'Source: ', bold: true, size: 20 }),
              new TextRun({ text: `${reportData.source?.type || 'cisco_ios'}`, size: 20 }),
            ],
            spacing: { after: 600 },
          }),

          // Executive Summary Section
          new Paragraph({
            text: 'Executive Summary',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          // Executive summary as a shaded table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F7F9F9" },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: `Compliance Score: `, bold: true, size: 24 }),
                          new TextRun({ text: `${reportData.compliance_score ?? 'N/A'}/100`, bold: true, size: 24, color: '10141A' }),
                        ],
                        spacing: { after: 120 }
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `Checks Evaluated: `, bold: true }),
                          new TextRun({ text: `${reportData.score_breakdown?.rules_evaluated ?? '—'}    ` }),
                          new TextRun({ text: `Passed: `, bold: true, color: '3FA9A0' }),
                          new TextRun({ text: `${reportData.score_breakdown?.rules_passed ?? '—'}    `, color: '3FA9A0' }),
                          new TextRun({ text: `Failed: `, bold: true, color: 'E5484D' }),
                          new TextRun({ text: `${totalFindings}`, color: 'E5484D' }),
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Device Information Section
          new Paragraph({
            text: 'Device Information',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [
              ['Device', device.hostname],
              ['Vendor', device.vendor],
              ['OS', device.os],
              ['OS Version', device.version],
              ['Model', device.model],
              ['Serial', device.serial],
              ['Source Type', reportData.source?.type]
            ].map(([label, value]) => (
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "F9FAFB" },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new Paragraph({ text: label, bold: true })]
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [new Paragraph({ text: value ?? 'not in config' })]
                  })
                ]
              })
            ))
          }),

          // Audit Findings Section
          new Paragraph({
            text: 'Audit Findings',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          ...(findings.length === 0 ? [
            new Paragraph({ text: 'No security findings detected in this configuration.', italics: true })
          ] : findings.map((f, idx) => {
            const severityColors = {
              critical: 'E5484D',
              high: 'F0883E',
              medium: 'E8C547',
              low: '7C8CA6'
            };
            const sevColor = severityColors[f.severity?.toLowerCase()] || '333333';
            
            return [
              new Paragraph({
                spacing: { before: 400, after: 100 },
                children: [
                  new TextRun({ text: `${String(idx + 1).padStart(2, '0')} `, bold: true, size: 24, color: '666666' }),
                  new TextRun({ text: `[${f.severity?.toUpperCase()}] `, bold: true, size: 24, color: sevColor }),
                  new TextRun({ text: `${f.rule_id} — `, bold: true, size: 24, color: '3FA9A0' }),
                  new TextRun({ text: f.title, bold: true, size: 24, color: '10141A' }),
                ]
              }),
              new Paragraph({
                text: f.explanation || '',
                spacing: { before: 100, after: f.remediation_template ? 200 : 400 },
              }),
              ...(f.remediation_template ? [
                new Paragraph({ text: 'Remediation CLI:', bold: true, size: 20, color: '666666', spacing: { after: 100 } }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          shading: { fill: "F4F4F5" },
                          margins: { top: 150, bottom: 150, left: 150, right: 150 },
                          children: f.remediation_template.split('\n').map(line => 
                            new Paragraph({
                              children: [new TextRun({ text: line, font: 'Consolas', size: 20 })],
                              spacing: { after: 0 }
                            })
                          )
                        })
                      ]
                    })
                  ]
                }),
                new Paragraph({ text: '', spacing: { after: 400 } }) // Extra spacing after remediation
              ] : [])
            ];
          }).flat()),

          // Footer
          new Paragraph({
            children: [new TextRun({ text: 'Generated by Compliance Auditor · SIH-26155 · Do not distribute without clearance', size: 18, color: '999999' })],
            spacing: { before: 600 },
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_report_${device.hostname}_${new Date().toISOString().slice(0, 10)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── PDF Export ────────────────────────────────────────────── */
  const generatePdf = async () => {
    const element = document.getElementById('report-body');
    if (!element) return;

    // Temporarily adjust styling for a clean render without UI constraints
    const origMaxWidth = element.style.maxWidth;
    const origMargin = element.style.margin;
    element.style.maxWidth = '1000px';
    element.style.margin = '0';

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0a0d14', // var(--substrate) equivalent
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`compliance_report_${device.hostname}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      element.style.maxWidth = origMaxWidth;
      element.style.margin = origMargin;
    }
  };

  return (
    <>
      {/* ── Export toolbar ─────────────────────────────────────── */}
      <div className="print-hide" style={{
        padding: '14px 24px',
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportButton
            icon={IconPrinter}
            label="Export PDF"
            variant="primary"
            onClick={generatePdf}
          />
          <ExportButton
            icon={IconFileText}
            label="Export DOCX"
            onClick={generateDocx}
          />
        </div>
      </div>

      {/* ── Report document body ─────────────────────────────── */}
      <div style={{ overflow: 'auto', flex: 1 }}>
        <div id="report-body" style={{
          padding: '40px 48px',
          maxWidth: '880px',
          margin: '24px auto',
        }}>
          <div className="glass-card" style={{ padding: '40px 48px', overflow: 'hidden' }}>

            {/* Document header — report cover section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: '36px', paddingBottom: '28px', borderBottom: '1px solid var(--wire)' }}
            >
              <div className="label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconShieldCheck size={14} style={{ color: 'var(--trace)' }} />
                SIH-26155 · NTRO AUDIT REPORT
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: '8px' }}>
                COMPLIANCE AUDIT REPORT
              </h1>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--ink-dim)' }}>
                <span>Report Date: {reportDate}</span>
                <span>Device: {device.hostname}</span>
                <span>Source: {reportData.source?.type || 'cisco_ios'}</span>
              </div>
            </motion.div>

            {/* Device identity grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{ marginBottom: '32px' }}
            >
              <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', letterSpacing: '0.02em' }}>Device Information</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1px',
                backgroundColor: 'var(--wire)',
                border: '1px solid var(--wire)',
                borderRadius: '4px',
                overflow: 'hidden',
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
            </motion.div>

            {/* Executive summary box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              style={{
                marginBottom: '36px',
                padding: '20px 24px',
                backgroundColor: 'rgba(63, 169, 160, 0.04)',
                border: '1px solid rgba(63, 169, 160, 0.15)',
                borderRadius: '6px',
              }}
            >
              <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconShieldCheck size={16} style={{ color: 'var(--trace)' }} />
                Executive Summary
              </h2>
              <div style={{ display: 'flex', gap: '1px', backgroundColor: 'var(--wire)', borderRadius: '4px', overflow: 'hidden' }}>
                {[
                  { label: 'Checks Run',       value: reportData.score_breakdown?.rules_evaluated ?? '—', color: 'var(--ink)' },
                  { label: 'Passed',           value: reportData.score_breakdown?.rules_passed ?? '—',    color: 'var(--trace)' },
                  { label: 'Failed',           value: totalFindings,                                      color: 'var(--severity-critical)' },
                  { label: 'Score', value: reportData.compliance_score ?? '—',                 color: 'var(--ink)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ flex: 1, backgroundColor: 'var(--panel)', padding: '16px', textAlign: 'center' }}>
                    <div className="mono" style={{ fontSize: '28px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>
                      {typeof value === 'number' ? <CountUp end={value} /> : value}
                    </div>
                    <div className="label">{label}</div>
                  </div>
                ))}
              </div>
              {criticalCount > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(229, 72, 77, 0.06)',
                  border: '1px solid rgba(229, 72, 77, 0.15)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--severity-critical)',
                }}>
                  <IconAlertTriangle size={14} />
                  <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {criticalCount} critical finding{criticalCount !== 1 ? 's' : ''} require immediate attention
                  </span>
                </div>
              )}
              {reportData?.unparsed?.length > 0 && (
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px 14px', marginTop: '12px', borderRadius: '6px',
                    background: 'var(--severity-high-bg, rgba(240,136,62,0.08))',
                    border: '1px solid var(--severity-high)',
                  }}
                >
                  <IconAlertTriangle size={16} style={{ color: 'var(--severity-high)', flexShrink: 0, marginTop: '1px' }} />
                  <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                    <div className="mono" style={{ color: 'var(--severity-high)', marginBottom: '2px' }}>
                      INCOMPLETE
                    </div>
                    <span className="text-ink-dim">
                      {reportData?.unparsed?.length} lines were not recognised. Rules that depend
                      on them could not be evaluated, so this score is a floor, not a verdict.
                      {' '}<Link to="/audit/training" style={{ color: 'var(--trace)' }}>Teach the parser</Link>.
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Findings list — numbered, styled report entries */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
                Audit Findings
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {findings.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '12px' }}>
                    <IconShieldCheck size={32} style={{ color: 'var(--trace)' }} />
                    <div className="mono" style={{ fontSize: '14px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Compliant</div>
                    <div style={{ fontSize: '13px', color: 'var(--ink-dim)' }}>No security findings detected in this configuration.</div>
                  </div>
                ) : (
                  findings.map((finding, idx) => (
                    <div
                      key={finding.rule_id}
                      className="print-break-inside-avoid"
                      style={{
                        border: '1px solid var(--wire)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        borderLeft: `3px solid ${
                          finding.severity?.toLowerCase() === 'critical' ? 'var(--severity-critical)' :
                          finding.severity?.toLowerCase() === 'high' ? 'var(--severity-high)' :
                          finding.severity?.toLowerCase() === 'medium' ? 'var(--severity-medium)' :
                          'var(--severity-low)'
                        }`,
                      }}
                    >
                      {/* Finding header row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        backgroundColor: 'var(--panel)',
                        borderBottom: '1px solid var(--wire)',
                      }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', fontWeight: 600, minWidth: '20px' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <SeverityBadge severity={finding.severity} />
                        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--wire)', flexShrink: 0 }} />
                        <span className="mono" style={{ fontSize: '12px', color: 'var(--trace)' }}>{finding.rule_id}</span>
                        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--wire)', flexShrink: 0 }} />
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', textTransform: 'uppercase' }}>{finding.cis_control}</span>
                      </div>

                      {/* Description */}
                      <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--ink)', borderBottom: finding.remediation_template ? '1px solid var(--wire)' : 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{finding.title}</div>
                        <div style={{ color: 'var(--ink-dim)', lineHeight: '1.6' }}>{finding.explanation}</div>
                      </div>

                      {/* Remediation CLI — code block style */}
                      {finding.remediation_template && (
                        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 20, 26, 0.5)' }}>
                          <div className="label" style={{ marginBottom: '8px' }}>Remediation CLI</div>
                          <pre style={{
                            margin: 0,
                            padding: '10px 14px',
                            backgroundColor: 'var(--substrate)',
                            border: '1px solid var(--wire)',
                            borderRadius: '4px',
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
            </motion.div>

            {/* Footer */}
            <div style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid var(--wire)', textAlign: 'center' }}>
              <div className="label">Generated by Compliance Auditor · SIH-26155 · Do not distribute without clearance</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportView;