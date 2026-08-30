import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { autoAnimate } from '@formkit/auto-animate';
import { ChevronDown, ChevronRight, ChevronUp, Copy, Check, Info } from 'lucide-react';
import SeverityLED from './SeverityLED';

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

/* ── Pass/Fail badge ─────────────────────────────────────────── */
const PassFailBadge = ({ value }) => {
  const pass = value === 'pass';
  return (
    <div className="mono" style={{
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: pass ? 'var(--trace)' : 'var(--severity-critical)',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    }}>
      <svg width="6" height="6" viewBox="0 0 6 6" style={{ flexShrink: 0 }}>
        <circle cx="3" cy="3" r="2.5" fill={pass ? 'var(--trace)' : 'var(--severity-critical)'} />
      </svg>
      {pass ? 'PASS' : 'FAIL'}
    </div>
  );
};

/* ── Score tooltip ───────────────────────────────────────────── */
const ScoreCell = ({ finding }) => {
  const [open, setOpen] = useState(false);
  const baseScore = finding.score_breakdown?.inputs?.base_severity ?? 'N/A';

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="mono" style={{ fontSize: '12px', color: 'var(--ink)', cursor: 'default' }}>{baseScore}</span>
      <Info size={12} style={{ color: 'var(--trace)', opacity: 0.7, flexShrink: 0 }} />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              right: 0,
              width: '240px',
              backgroundColor: 'var(--panel-raised)',
              border: '1px solid var(--wire)',
              padding: '10px 12px',
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            <div className="label" style={{ marginBottom: '6px' }}>Score Breakdown</div>
            {finding.score_breakdown?.formula && (
              <div className="mono" style={{ fontSize: '11px', color: 'var(--trace)', marginBottom: '8px', wordBreak: 'break-all' }}>
                {finding.score_breakdown.formula}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(finding.score_breakdown?.inputs || {}).map(([k, v]) => (
                  <tr key={k}>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', padding: '2px 0' }}>{k}</td>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--ink)', padding: '2px 0', textAlign: 'right' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
      borderLeft: '2px solid var(--trace)',
      marginLeft: '24px',
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
            backgroundColor: 'var(--substrate)',
            border: '1px solid var(--wire)',
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
            padding: '10px 14px', backgroundColor: 'var(--substrate)',
            border: '1px solid var(--wire)', fontSize: '12px',
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
            <div className="label">Remediation CLI</div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onCopy(finding.remediation_template, finding.rule_id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'transparent', border: '1px solid var(--wire)',
                color: copiedId === finding.rule_id ? 'var(--trace)' : 'var(--ink-dim)',
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
            backgroundColor: 'var(--substrate)',
            border: `1px solid ${copiedId === finding.rule_id ? 'var(--trace)' : 'var(--wire)'}`,
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

  const categories = ['all', ...new Set(findings.map(f => f.category))];
  const severities = ['all', 'critical', 'high', 'medium', 'low'];

  const filtered = findings.filter(f => {
    if (filterSeverity !== 'all' && f.severity?.toLowerCase() !== filterSeverity) return false;
    if (filterCategory !== 'all' && f.category !== filterCategory) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'severity') {
      const diff = (SEVERITY_ORDER[a.severity?.toLowerCase()] ?? 0) - (SEVERITY_ORDER[b.severity?.toLowerCase()] ?? 0);
      return sortDir === 'asc' ? diff : -diff;
    }
    if (sortField === 'score') {
      const aScore = a.score_breakdown?.inputs?.base_severity ?? 0;
      const bScore = b.score_breakdown?.inputs?.base_severity ?? 0;
      return sortDir === 'asc' ? aScore - bScore : bScore - aScore;
    }
    return 0;
  });

  const selectStyle = {
    backgroundColor: 'var(--panel)',
    border: '1px solid var(--wire)',
    color: 'var(--ink)',
    padding: '5px 10px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--substrate)' }}>

      {/* Filter bar */}
      <div style={{
        padding: '10px 24px',
        borderBottom: '1px solid var(--wire)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        backgroundColor: 'var(--panel)',
        flexShrink: 0,
      }}>
        <div className="label">{sorted.length} / {findings.length} findings</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '36px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '120px' }} />
              <col /* description */ />
              <col style={{ width: '130px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '72px' }} />
            </colgroup>
            <thead>
              <tr style={{
                backgroundColor: 'var(--panel)',
                borderBottom: '1px solid var(--wire)',
                position: 'sticky', top: 0, zIndex: 10,
              }}>
                <th style={{ padding: '8px 12px' }} />
                <SortableHeader label="SEV"    field="severity" sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ paddingLeft: '12px' }} />
                <th className="mono" style={{ padding: '8px 0', fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>RULE ID</th>
                <th className="mono" style={{ padding: '8px 0', fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>DESCRIPTION</th>
                <th className="mono" style={{ padding: '8px 0', fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>CATEGORY</th>
                <th className="mono" style={{ padding: '8px 0', fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>STATUS</th>
                <SortableHeader label="SCORE"  field="score"    sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ paddingRight: '12px', textAlign: 'right' }} />
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {sorted.map((finding, rowIdx) => {
                const isExpanded = expandedRows.has(finding.rule_id);
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
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'var(--panel)'; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Chevron */}
                      <td style={{ padding: '10px 0 10px 12px' }}>
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.18 }}
                          style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-dim)' }}
                        >
                          <ChevronRight size={14} />
                        </motion.div>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '10px 0 10px 12px' }}>
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

                      {/* Description + secondary metadata line */}
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <div style={{ fontSize: '13px', color: 'var(--ink)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '3px' }}>
                          {finding.description}
                        </div>
                        {/* Secondary metadata: rule_id · category */}
                        <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)', letterSpacing: '0.04em' }}>
                          {finding.rule_id} · {finding.category}
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '10px 0' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {finding.category}
                        </span>
                      </td>

                      {/* Pass/Fail */}
                      <td style={{ padding: '10px 0' }}>
                        <PassFailBadge value={finding.pass_fail} />
                      </td>

                      {/* Score */}
                      <td style={{ padding: '10px 12px 10px 0', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <ScoreCell finding={finding} />
                      </td>
                    </motion.tr>

                    {/* Expanded detail row */}
                    <tr style={{ backgroundColor: 'var(--substrate)' }}>
                      <td colSpan={7} style={{ padding: 0, borderBottom: isExpanded ? '1px solid var(--wire)' : 'none' }}>
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
