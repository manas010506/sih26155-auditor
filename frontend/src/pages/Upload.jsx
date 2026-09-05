import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconFileText, IconCheck, IconAlertCircle, IconUpload, IconShieldLock } from '@tabler/icons-react';
import { audit, auditBatch } from '../api';
import TactileButton from '../components/TactileButton';
import UploadBackground from '../components/UploadBackground';
import { useSettings } from '../context/SettingsContext';

/* Detect source type from file extension */
const detectSourceType = (filename) => {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (ext === '.cfg' || ext === '.txt') return { type: 'cisco_ios', label: 'Cisco IOS', ext };
  if (ext === '.conf') return { type: 'juniper_junos', label: 'Juniper JunOS', ext };
  if (ext === '.tf') return { type: 'terraform_aws', label: 'Terraform (.tf)', ext };
  return { type: null, label: null, ext };
};

/* Spinning ring for loading */
const SpinRing = () => (
  <div style={{
    width: '56px',
    height: '56px',
    border: '2px solid var(--wire)',
    borderTopColor: 'var(--trace)',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  }} />
);

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('empty'); // empty | detected | loading | success | batch_summary
  const [detected, setDetected] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { setReportData } = useOutletContext();
  const { defaultFramework } = useSettings();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const processFiles = (files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const typed = fileArray.map(f => ({ file: f, type: detectSourceType(f.name).type }));

    const unsupported = typed.filter(t => !t.type);
    if (unsupported.length) {
      setError(`Unsupported: ${unsupported.map(t => t.file.name).join(', ')}. Cisco IOS (.cfg, .txt) or Terraform (.tf) only.`);
      setStatus('empty');
      setDetected(null);
      return;
    }

    // Mixed vendors are fine. Each file carries its own source_type and the
    // engine dispatches per file - auditing a Cisco router and a Terraform
    // stack in one batch is the point, not an error.
    const kinds = new Set(typed.map(t => t.type));
    const label = kinds.size > 1
      ? `${kinds.size} vendors`
      : ({ cisco_ios: 'Cisco IOS', juniper_junos: 'Juniper JunOS', terraform_aws: 'Terraform' }[typed[0].type]);

    setError(null);
    setDetected({
      name: fileArray.length === 1 ? fileArray[0].name : `${fileArray.length} files selected`,
      type: typed[0].type,
      label,
      typed,
      files: fileArray,
      isBatch: fileArray.length > 1,
    });
    setStatus('detected');
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) processFiles(e.dataTransfer.files);
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.length > 0) processFiles(e.target.files);
  };

  const handleSubmit = async () => {
    if (!detected) return;

    setError(null);
    setStatus('loading');

    try {
      if (detected.isBatch) {
        const configs = await Promise.all(detected.typed.map(async t => ({
          filename: t.file.name,
          config_text: await t.file.text(),
          source_type: t.type,
        })));
        const result = await auditBatch(configs, defaultFramework);
        setBatchResults(result.results ?? []);
        setStatus('batch_summary');
      } else {
        const text = await detected.files[0].text();
        const result = await audit(text, detected.type, defaultFramework);
        setReportData(result);

        setStatus('success');
        setTimeout(() => navigate('/audit/findings'), 800);
      }
    } catch (err) {
      console.error('Audit failed:', err);
      setError(err.message || 'Failed to process configuration.');
      setStatus('empty');
      setDetected(null);
    }
  };

  const isLoading = status === 'loading' || status === 'success';

  const scoreColour = (s) =>
    s < 40 ? 'var(--severity-critical)'
      : s < 70 ? 'var(--severity-medium)'
        : 'var(--trace)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'transparent', position: 'relative' }}>

      {/* Full-page Background SVG Layer */}
      <UploadBackground />

      {/* Main Container - Centered Vertically and Horizontally */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ textAlign: 'center', marginBottom: '32px' }}
        >
          <h1 className="heading-lg" style={{ marginBottom: '8px' }}>Data Ingestion</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-dim)' }}>
            Upload one or more configuration files for normalization and CIS baseline auditing.
          </p>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="glass-card"
              style={{
                borderLeft: '3px solid var(--severity-critical)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '24px',
                width: '100%',
                maxWidth: '640px',
                boxShadow: '0 8px 24px rgba(229, 72, 77, 0.1)',
              }}
            >
              <IconAlertCircle size={20} style={{ color: 'var(--severity-critical)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--severity-critical)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Parse Error
                </div>
                <div style={{ fontSize: '14px', color: 'var(--ink)' }}>{error}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Outer glow container for depth */}
        <div style={{ position: 'relative', width: '100%', maxWidth: status === 'batch_summary' ? '760px' : '520px', transition: 'max-width 0.3s' }}>

          {/* Soft ambient teal blur behind card */}
          <motion.div
            animate={{
              opacity: dragActive ? 0.8 : 0.4,
              scale: dragActive ? 1.05 : 1,
            }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              inset: '-10%',
              background: 'radial-gradient(ellipse at center, rgba(63, 169, 160, 0.2) 0%, transparent 60%)',
              filter: 'blur(32px)',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />

          {/* Main Dropzone Card */}
          <motion.div
            animate={{
              scale: dragActive ? 1.02 : 1,
              borderColor: dragActive ? 'rgba(63, 169, 160, 0.8)' : 'rgba(74, 85, 99, 0.4)',
              boxShadow: dragActive
                ? '0 16px 48px rgba(0,0,0,0.5), inset 0 0 40px rgba(63,169,160,0.1)'
                : '0 12px 32px rgba(0,0,0,0.3)',
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-card"
            style={{
              position: 'relative',
              padding: '56px 48px',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              opacity: isLoading ? 0.7 : 1,
              pointerEvents: isLoading ? 'none' : 'auto',
              transition: 'opacity 0.3s',
              overflow: 'hidden',
              backgroundColor: 'var(--panel)',
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {/* Gradient wash background */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: dragActive
                ? 'linear-gradient(135deg, rgba(63, 169, 160, 0.12) 0%, rgba(16, 20, 26, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(63, 169, 160, 0.04) 0%, rgba(16, 20, 26, 0.8) 100%)',
              zIndex: 0,
              transition: 'background 0.3s ease',
            }} />

            {/* Oversized background icon texture */}
            <IconShieldLock
              size={360}
              stroke={0.7}
              style={{
                position: 'absolute',
                right: '-60px',
                bottom: '-80px',
                color: 'var(--trace)',
                opacity: dragActive ? 0.15 : 0.04,
                zIndex: 0,
                transition: 'opacity 0.3s ease, transform 0.5s ease',
                transform: dragActive ? 'scale(1.05) rotate(-5deg)' : 'scale(1) rotate(0deg)',
                pointerEvents: 'none',
              }}
            />

            {/* Dashed border */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <rect
                x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="14" ry="14"
                fill="none"
                stroke={dragActive ? "var(--trace)" : "var(--wire)"}
                strokeWidth="2"
                strokeDasharray="12 12"
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s' }}
              />
            </svg>

            <AnimatePresence mode="wait">

              {/* Status: Loading */}
              {status === 'loading' && (
                <motion.div key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', zIndex: 1 }}
                >
                  <div className="mono" style={{ fontSize: '13px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
                    Engine Analysis Active
                  </div>
                  <SpinRing />
                  <div style={{ fontSize: '14px', color: 'var(--ink-dim)' }}>Parsing and evaluating against CIS benchmarks...</div>
                </motion.div>
              )}

              {/* Status: Success */}
              {status === 'success' && (
                <motion.div key="success"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 1 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      backgroundColor: 'var(--trace-dim)', border: '2px solid var(--trace)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 24px rgba(63, 169, 160, 0.4)',
                    }}
                  >
                    <IconCheck size={32} style={{ color: 'var(--trace)' }} />
                  </motion.div>
                  <div className="mono" style={{ fontSize: '14px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Analysis Complete
                  </div>
                </motion.div>
              )}

              {/* Status: Batch Summary */}
              {status === 'batch_summary' && batchResults && (
                <motion.div key="batch_summary"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ width: '100%', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div className="heading-md" style={{ marginBottom: '4px' }}>Batch Audit Complete</div>
                    <div className="text-ink-dim" style={{ fontSize: '13px' }}>
                      {batchResults.filter(r => r.ok).length} of {batchResults.length} audited, worst score first
                    </div>
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--wire)', borderRadius: '6px', background: 'var(--panel-raised)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--panel)', borderBottom: '1px solid var(--wire)' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--ink-dim)', fontWeight: 500 }}>File</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ink-dim)', fontWeight: 500 }}>Score</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ink-dim)', fontWeight: 500 }}>Findings</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ink-dim)', fontWeight: 500 }}>Critical</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ink-dim)', fontWeight: 500 }}>Unread</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--ink-dim)', fontWeight: 500 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((row, idx) => {
                          // A file that failed to parse comes back ok:false with an
                          // error rather than failing the whole batch.
                          if (!row.ok) {
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--wire)' }}>
                                <td className="mono" style={{ padding: '8px 12px' }}>{row.filename}</td>
                                <td colSpan={5} style={{ padding: '8px 12px', color: 'var(--severity-critical)', fontSize: '12px' }}>
                                  {row.error}
                                </td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--wire)' }}>
                              <td className="mono" style={{ padding: '8px 12px' }}>{row.filename}</td>
                              <td className="mono" style={{ padding: '8px 12px', textAlign: 'right', color: scoreColour(row.compliance_score), fontWeight: 600 }}>
                                {row.compliance_score}
                              </td>
                              <td className="mono" style={{ padding: '8px 12px', textAlign: 'right' }}>{row.findings}</td>
                              <td className="mono" style={{ padding: '8px 12px', textAlign: 'right', color: row.critical > 0 ? 'var(--severity-critical)' : 'var(--ink-dim)' }}>
                                {row.critical}
                              </td>
                              <td className="mono" style={{ padding: '8px 12px', textAlign: 'right', color: row.unparsed > 0 ? 'var(--severity-high)' : 'var(--ink-dim)' }}>
                                {row.unparsed}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <TactileButton
                                  onClick={() => {
                                    setReportData(row.report);
                                    navigate('/audit/findings');
                                  }}
                                  style={{ padding: '4px 10px', fontSize: '11px', background: 'transparent', border: '1px solid var(--trace)', color: 'var(--trace)', borderRadius: '4px' }}
                                >
                                  View
                                </TactileButton>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <TactileButton
                    onClick={() => { setStatus('empty'); setDetected(null); setBatchResults(null); }}
                    style={{ background: 'transparent', border: '1px solid var(--wire)', color: 'var(--ink-dim)', padding: '8px 16px', alignSelf: 'center', marginTop: '8px', borderRadius: '6px' }}
                  >
                    Upload Another Batch
                  </TactileButton>
                </motion.div>
              )}

              {/* Status: Detected */}
              {status === 'detected' && (
                <motion.div key="detected"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', zIndex: 1 }}
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      backgroundColor: 'var(--trace-dim)', border: '1px solid rgba(63,169,160,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <IconFileText size={32} style={{ color: 'var(--trace)' }} />
                  </motion.div>

                  <div style={{
                    width: '100%',
                    maxWidth: '400px',
                    backgroundColor: 'rgba(16, 20, 26, 0.6)',
                    border: '1px solid var(--wire)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="label">{detected.isBatch ? 'Selection' : 'Filename'}</div>
                      <div className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{detected.name}</div>
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'var(--wire)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="label">Detected Source Type</div>
                      <div className="mono" style={{ fontSize: '13px', color: 'var(--trace)', fontWeight: 600 }}>
                        {detected.label}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <TactileButton
                      onClick={handleSubmit}
                      style={{
                        backgroundColor: 'var(--trace)',
                        border: 'none',
                        color: 'var(--substrate)',
                        padding: '12px 32px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '13px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(63, 169, 160, 0.3)',
                      }}
                    >
                      Run Audit
                    </TactileButton>
                    <TactileButton
                      onClick={() => { setStatus('empty'); setDetected(null); }}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--wire)',
                        color: 'var(--ink-dim)',
                        padding: '12px 24px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        borderRadius: '6px',
                      }}
                    >
                      Cancel
                    </TactileButton>
                  </div>
                </motion.div>
              )}

              {/* Status: Empty Default */}
              {status === 'empty' && (
                <motion.div key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', zIndex: 1, padding: '20px' }}
                >
                  <motion.div
                    animate={{ y: dragActive ? -6 : 0, scale: dragActive ? 1.05 : 1 }}
                    transition={{ duration: 0.2 }}
                    style={{ marginBottom: '8px' }}
                  >
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '50%',
                      backgroundColor: dragActive ? 'rgba(63, 169, 160, 0.15)' : 'rgba(74, 85, 99, 0.15)',
                      border: `2px ${dragActive ? 'solid' : 'dashed'} ${dragActive ? 'var(--trace)' : 'var(--wire)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.25s',
                      boxShadow: dragActive ? '0 0 20px rgba(63, 169, 160, 0.3)' : 'none',
                    }}>
                      <IconUpload size={32} stroke={1.5} style={{
                        color: dragActive ? 'var(--trace)' : 'var(--ink-dim)',
                        transition: 'color 0.25s',
                      }} />
                    </div>
                  </motion.div>

                  <div style={{ textAlign: 'center' }}>
                    <div className="heading-md" style={{ marginBottom: '12px', fontSize: '20px' }}>Drop configuration files here</div>
                    <div style={{ fontSize: '14px', color: 'var(--ink-dim)', marginBottom: '32px' }}>
                      Cisco IOS (.cfg, .txt) or Terraform (.tf) &mdash; select several to audit together
                    </div>

                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      accept=".cfg,.txt,.conf,.tf"
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />

                    <TactileButton
                      onClick={() => inputRef.current?.click()}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--wire)',
                        color: 'var(--ink)',
                        padding: '10px 32px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--trace)';
                        e.currentTarget.style.color = 'var(--trace)';
                        e.currentTarget.style.backgroundColor = 'rgba(63, 169, 160, 0.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--wire)';
                        e.currentTarget.style.color = 'var(--ink)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Select Files
                    </TactileButton>
                  </div>

                  <div className="mono" style={{
                    position: 'absolute',
                    bottom: '24px',
                    fontSize: '10px',
                    color: 'var(--ink-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    Max file size: 10 MB
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
