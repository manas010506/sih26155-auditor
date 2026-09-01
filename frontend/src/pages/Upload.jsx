import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconUpload, IconFileText, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { audit } from '../api';
import TactileButton from '../components/TactileButton';

/* Detect source type from file extension */
const detectSourceType = (filename) => {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (ext === '.cfg' || ext === '.txt') return { type: 'cisco_ios', label: 'Cisco IOS', ext };
  if (ext === '.tf') return { type: 'terraform_aws', label: 'Terraform (.tf)', ext };
  return { type: null, label: null, ext };
};

/* Spinning ring — pure CSS animation, no Tailwind animate-pulse */
const SpinRing = () => (
  <div style={{
    width: '40px',
    height: '40px',
    border: '2px solid var(--wire)',
    borderTopColor: 'var(--trace)',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  }} />
);

const BOOT_LOGS = [
  '[SYS] Initializing Audit Engine v0.1.0...',
  '[SYS] Mounting configuration payload...',
  '[SYS] Parsing AST structure...',
  '[AUDIT] Engine booted in LOCAL MODE.',
  '[AUDIT] Loading CIS Cisco IOS benchmarks (32 rules)...',
  '[AUDIT] Evaluating access control lists...',
  '[WARN] Rule match: CIS-NET-001 (VTY lines permit Telnet)',
  '[WARN] Rule match: CIS-NET-006 (Enable password unencrypted)',
  '[AUDIT] Evaluating SNMP configuration...',
  '[WARN] Rule match: CIS-NET-009 (SNMP default string)',
  '[AUDIT] Evaluating cryptography constraints...',
  '[SYS] Analysis complete. Aggregating results...',
];

const TerminalStream = () => {
  const [lines, setLines] = React.useState([]);
  
  React.useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < BOOT_LOGS.length) {
        setLines(prev => [...prev, BOOT_LOGS[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 220);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="corner-marks" style={{
      width: '100%',
      backgroundColor: 'var(--substrate)',
      border: '1px solid var(--wire)',
      padding: '12px 16px',
      minHeight: '180px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Subtle CRT scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
        backgroundSize: '100% 3px, 3px 100%',
        zIndex: 10
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 1 }}>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.1 }}
            className="mono"
            style={{ 
              fontSize: '11px', 
              color: line.includes('[WARN]') ? 'var(--severity-high)' : line.includes('[AUDIT]') ? 'var(--trace)' : 'var(--ink-dim)'
            }}
          >
            {line}
          </motion.div>
        ))}
        {/* Blinking cursor */}
        {lines.length < BOOT_LOGS.length && (
          <motion.div
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            style={{ width: '8px', height: '14px', backgroundColor: 'var(--trace)', marginTop: '4px' }}
          />
        )}
      </div>
    </div>
  );
};

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('empty'); // empty | detected | loading | success
  const [detected, setDetected] = useState(null); // { name, type, label, file }
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { setReportData } = useOutletContext();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const processFile = (file) => {
    if (!file) return;
    const { type, label, ext } = detectSourceType(file.name);

    if (!type) {
      setError(`Unsupported file type: "${ext}". Upload a Cisco running-config (.cfg, .txt) or Terraform file (.tf).`);
      setStatus('empty');
      setDetected(null);
      return;
    }

    setError(null);
    setDetected({ name: file.name, type, label, file });
    setStatus('detected');
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!detected) return;
    setStatus('loading');
    
    try {
      const text = await detected.file.text();
      const result = await audit(text, detected.type);
      setReportData(result);
      
      setStatus('success');
      setTimeout(() => navigate('/audit/findings'), 800);
    } catch (err) {
      console.error('Audit failed:', err);
      setError(err.message || 'Failed to process configuration.');
      setStatus('empty');
      setDetected(null);
    }
  };

  const isLoading = status === 'loading' || status === 'success';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--substrate)', padding: '24px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="heading-lg" style={{ marginBottom: '4px' }}>Data Ingestion</div>
        <div style={{ fontSize: '13px', color: 'var(--ink-dim)' }}>
          Upload a raw configuration file for normalization and CIS baseline auditing.
        </div>
      </div>

      {/* Spin keyframe — injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                  backgroundColor: 'var(--panel)',
                  border: '1px solid var(--wire)',
                  borderLeft: '2px solid var(--severity-critical)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <IconAlertCircle size={18} style={{ color: 'var(--severity-critical)', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--severity-critical)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                    Parse Error
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-dim)' }}>{error}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drop zone — corner-marks for depth */}
          <motion.div
            animate={{
              borderColor: dragActive
                ? 'var(--trace)'
                : isLoading
                ? 'var(--wire)'
                : 'var(--wire)',
              backgroundColor: dragActive
                ? 'var(--panel-raised)'
                : 'var(--panel)',
            }}
            transition={{ duration: 0.15 }}
            className="corner-marks"
            style={{
              position: 'relative',
              padding: '48px 32px',
              border: `1px dashed var(--wire)`,
              minHeight: '260px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              opacity: isLoading ? 0.6 : 1,
              pointerEvents: isLoading ? 'none' : 'auto',
              transition: 'opacity 0.2s',
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <AnimatePresence mode="wait">

              {/* Loading Terminal */}
              {status === 'loading' && (
                <motion.div key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}
                >
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
                    Engine Analysis Active
                  </div>
                  <TerminalStream />
                </motion.div>
              )}

              {/* Success */}
              {status === 'success' && (
                <motion.div key="success"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                >
                  <IconCheck size={36} style={{ color: 'var(--trace)' }} />
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Analysis Complete
                  </div>
                </motion.div>
              )}

              {/* Detected — show source type before submit */}
              {status === 'detected' && (
                <motion.div key="detected"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}
                >
                  <IconFileText size={32} style={{ color: 'var(--trace)' }} />

                  {/* Detected file info panel */}
                  <div style={{
                    width: '100%',
                    backgroundColor: 'var(--substrate)',
                    border: '1px solid var(--wire)',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="label">Filename</div>
                      <div className="mono" style={{ fontSize: '12px', color: 'var(--ink)' }}>{detected.name}</div>
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'var(--wire)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="label">Detected Source Type</div>
                      <div className="mono" style={{ fontSize: '12px', color: 'var(--trace)', fontWeight: 600 }}>
                        {detected.label}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <TactileButton
                      onClick={handleSubmit}
                      style={{
                        backgroundColor: 'var(--trace)',
                        border: 'none',
                        color: 'var(--substrate)',
                        padding: '8px 24px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
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
                        padding: '8px 16px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </TactileButton>
                  </div>
                </motion.div>
              )}

              {/* Default — empty drop zone */}
              {status === 'empty' && (
                <motion.div key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" style={{ color: 'var(--ink-dim)', marginBottom: '4px' }}>
                    {/* Dashed Outline box */}
                    <rect x="8" y="8" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
                    {/* Tick marks for depth/instrument feel */}
                    <path d="M 8 16 h -4 M 8 32 h -4 M 40 16 h 4 M 40 32 h 4 M 16 8 v -4 M 32 8 v -4 M 16 40 v 4 M 32 40 v 4" stroke="currentColor" strokeWidth="1.5" />
                    {/* Center cross/arrow */}
                    <path d="M 24 30 v -12 M 18 24 l 6 -6 l 6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                  </svg>
                  <div style={{ textAlign: 'center' }}>
                    <div className="heading-sm" style={{ marginBottom: '6px' }}>Drop configuration file here</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-dim)', marginBottom: '20px' }}>
                      Cisco IOS (.cfg, .txt) or Terraform (.tf)
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".cfg,.txt,.tf"
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    <TactileButton
                      onClick={() => inputRef.current?.click()}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--wire)',
                        color: 'var(--ink)',
                        padding: '7px 20px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--trace)'; e.currentTarget.style.color = 'var(--trace)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--wire)'; e.currentTarget.style.color = 'var(--ink)'; }}
                    >
                      Select File
                    </TactileButton>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>

          {/* Supported formats note */}
          <div className="label" style={{ textAlign: 'center' }}>
            Supported: .cfg · .txt · .tf &nbsp;·&nbsp; Max 10 MB
          </div>

        </div>
      </div>
    </div>
  );
};

export default Upload;
