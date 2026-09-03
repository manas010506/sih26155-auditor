import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { autoAnimate } from '@formkit/auto-animate';
import { ChevronDown, ChevronRight, ChevronUp, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import SeverityLED from './SeverityLED';
import { useSettings } from '../context/SettingsContext';

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

/* ── Sort indicator icon ─────────────────────────────────────── */
const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronDown size={11} style={{ opacity: 0.3 }} />;
  return sortDir === 'desc'
    ? <ChevronDown size={11} style={{ color: 'var(--trace)' }} />
    : <ChevronUp size={11} style={{ color: 'var(--trace)' }} />;
};

/* ── Sortable column header ──────────────────────────────────── */
const SortableHeader = ({ label, field, sortField, sortDir, onSort, style }) => (
  <th
    className="mono"
    onClick={() => onSort(field)}
    style={{
      padding: '8px 0',
      fontSize: '10px',
      color: sortField === field ? 'var(--trace)' : 'var(--ink-dim)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontWeight: 400,
      textAlign: 'left',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'color 0.15s',
      ...style,
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {label}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </span>
  </th>
);


/* ── Expanded detail panel ───────────────────────────────────── */
const ExpandedDetail = ({ finding, copiedId, onCopy }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    style={{ overflow: 'hidden' }}
  >
    <div style={{
      padding: '16px 24px 20px 52px',
      borderLeft: `2px solid ${
        finding.severity?.toLowerCase() === 'critical' ? 'var(--severity-critical)' :
        finding.severity?.toLowerCase() === 'high' ? 'var(--severity-high)' :
        finding.severity?.toLowerCase() === 'medium' ? 'var(--severity-medium)' :
        'var(--severity-low)'
      }`,
      marginLeft: '12px',
      marginBottom: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Raw ref */}
      {finding.raw_ref ? (
        <div>
          <div className="label" style={{ marginBottom: '6px' }}>
            Match at line <span className="mono" style={{ color: 'var(--ink)', fontWeight: 500 }}>{finding.raw_ref.line}</span>
          </div>
          <pre style={{
            margin: 0, padding: '10px 14px',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--wire)',
            borderRadius: '4px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px', color: 'var(--ink)',
            overflowX: 'auto', lineHeight: '1.6',
          }}>
            {finding.raw_ref.snippet}
          </pre>
        </div>
      ) : (
        <div>
          <div className="label" style={{ marginBottom: '6px' }}>Context</div>
          <div style={{
            padding: '10px 14px', backgroundColor: 'var(--panel)',
            border: '1px solid var(--wire)', borderRadius: '4px', fontSize: '12px',
            color: 'var(--ink-dim)', fontStyle: 'italic',
          }}>
            No direct line reference — global setting or missing configuration.
          </div>
        </div>
      )}

      {/* Remediation CLI */}
      {finding.remediation_template && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="label">Remediation CLI</div>
              <div className="mono" style={{
                fontSize: '9px', padding: '2px 6px',
                backgroundColor: 'var(--panel-raised)',
                border: '1px solid var(--wire)',
                color: 'var(--trace)',
                borderRadius: '2px'
              }}>
                {useSettings().useLocalModel ? 'LOCAL MODEL' : 'SANITISED API CALL'}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onCopy(finding.remediation_template, finding.rule_id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'transparent', border: '1px solid var(--wire)',
                color: copiedId === finding.rule_id ? 'var(--trace)' : 'var(--ink-dim)',
                borderRadius: '4px',
                padding: '3px 10px', cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px', letterSpacing: '0.04em',
              }}
            >
              {copiedId === finding.rule_id
                ? <><Check size={12} /> COPIED</>
                : <><Copy size={12} /> COPY</>}
            </motion.button>
          </div>
          <pre style={{
            margin: 0, padding: '10px 14px',
            backgroundColor: 'var(--panel)',
            border: `1px solid ${copiedId === finding.rule_id ? 'var(--trace)' : 'var(--wire)'}`,
            borderRadius: '4px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px', color: 'var(--ink)',
            overflowX: 'auto', lineHeight: '1.6',
            transition: 'border-color 0.3s ease',
          }}>
            {finding.remediation_template}
          </pre>
        </div>
      )}
    </div>
  </motion.div>
);

/* ── Main component ──────────────────────────────────────────── */
const FindingsTable = ({ findings }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortField, setSortField] = useState('severity');
  const [sortDir, setSortDir] = useState('desc');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [copiedRuleId, setCopiedRuleId] = useState(null);

  // auto-animate on tbody for smooth row reflow on filter change
  const tbodyRef = useRef(null);
  useEffect(() => {
    if (tbodyRef.current) autoAnimate(tbodyRef.current, { duration: 180 });
  }, []);

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text, ruleId) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedRuleId(ruleId);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedRuleId(null), 2000);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const categories = ['all', ...new Set(findings.map(f => f.cis_control).filter(Boolean))];
  const severities = ['all', 'critical', 'high', 'medium', 'low'];

  const filtered = findings.filter(f => {
    if (filterSeverity !== 'all' && f.severity?.toLowerCase() !== filterSeverity) return false;
    if (filterCategory !== 'all' && f.cis_control !== filterCategory) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'severity') {
      const diff = (SEVERITY_ORDER[a.severity?.toLowerCase()] ?? 0) - (SEVERITY_ORDER[b.severity?.toLowerCase()] ?? 0);
      return sortDir === 'asc' ? diff : -diff;
    }
    return 0;
  });

  const selectStyle = {
    backgroundColor: 'rgba(27, 33, 43, 0.6)',
    border: '1px solid var(--wire)',
    color: 'var(--ink)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    outline: 'none',
    backdropFilter: 'blur(8px)',
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Filter bar */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--wire)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <div className="label">{sorted.length} / {findings.length} findings</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select style={selectStyle} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            {severities.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'ALL SEVERITIES' : s.toUpperCase()}</option>
            ))}
          </select>
          <select style={selectStyle} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'ALL CATEGORIES' : c.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        {findings.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '48px', gap: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--trace)' }} />
            <div className="mono" style={{ fontSize: '14px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Compliant</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-dim)' }}>No security findings detected in this configuration.</div>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
            <div className="label">No findings match filters</div>
          </div>
        ) : (
          <table className="zebra-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '36px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '120px' }} />
              <col /* title */ />
              <col className="hide-on-mobile" style={{ width: '80px' }} />
              <col className="hide-on-mobile" style={{ width: '160px' }} />
            </colgroup>
            <thead>
              <tr style={{
                borderBottom: '1px solid var(--wire)',
                position: 'sticky', top: 0, zIndex: 10,
                backdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(27, 33, 43, 0.85)',
              }}>
                <th style={{ padding: '8px 12px' }} />
                <SortableHeader label="SEV" field="severity" sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ paddingLeft: '12px' }} />
                <th className="mono" style={{ padding: '8px 0', fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>RULE ID</th>
                <th className="mono" style={{ padding: '8px 0', fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>FINDING</th>
                <th className="mono hide-on-mobile" style={{ padding: '8px 0', fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>RESOURCE</th>
                <th className="mono hide-on-mobile" style={{ padding: '8px 0 8px 0', fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400, paddingRight: '12px' }}>CIS CONTROL</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {sorted.map((finding, rowIdx) => {
                const isExpanded = expandedRows.has(finding.rule_id);
                const sevLevel = finding.severity?.toLowerCase();
                const borderColor = sevLevel === 'critical' ? 'var(--severity-critical)' :
                                    sevLevel === 'high' ? 'var(--severity-high)' :
                                    sevLevel === 'medium' ? 'var(--severity-medium)' :
                                    'var(--severity-low)';

                return (
                  <React.Fragment key={finding.rule_id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(rowIdx * 0.03, 0.3) }}
                      onClick={() => toggleRow(finding.rule_id)}
                      style={{
                        borderBottom: '1px solid var(--wire)',
                        backgroundColor: isExpanded ? 'var(--panel-raised)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(74, 85, 99, 0.15)'; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Chevron & Severity Left Border */}
                      <td style={{ padding: '10px 0 10px 12px', borderLeft: `3px solid ${borderColor}` }}>
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.18 }}
                          style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-dim)' }}
                        >
                          <ChevronRight size={14} />
                        </motion.div>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '10px 0 10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <SeverityLED severity={finding.severity} />
                          <span className="mono" style={{ fontSize: '11px', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {finding.severity}
                          </span>
                        </div>
                      </td>

                      {/* Rule ID */}
                      <td style={{ padding: '10px 0' }}>
                        <span className="mono" style={{ fontSize: '12px', color: 'var(--trace)', letterSpacing: '0.02em' }}>
                          {finding.rule_id}
                        </span>
                      </td>

                      {/* Title + explanation preview */}
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <div style={{ fontSize: '13px', color: 'var(--ink)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '3px' }}>
                          {finding.title}
                        </div>
                        {finding.explanation && (
                          <div style={{ fontSize: '11px', color: 'var(--ink-dim)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                            {finding.explanation}
                          </div>
                        )}
                      </td>

                      {/* Resource ID */}
                      <td className="hide-on-mobile" style={{ padding: '10px 0' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', letterSpacing: '0.04em' }}>
                          {finding.resource_id ?? '—'}
                        </span>
                      </td>

                      {/* CIS Control */}
                      <td className="hide-on-mobile" style={{ padding: '10px 12px 10px 0' }}>
                        <span className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)', letterSpacing: '0.03em' }}>
                          {finding.cis_control}
                        </span>
                      </td>
                    </motion.tr>

                    {/* Expanded detail row */}
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderBottom: isExpanded ? '1px solid var(--wire)' : 'none', backgroundColor: isExpanded ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                        <AnimatePresence>
                          {isExpanded && (
                            <ExpandedDetail
                              finding={finding}
                              copiedId={copiedRuleId}
                              onCopy={copyToClipboard}
                            />
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FindingsTable;
