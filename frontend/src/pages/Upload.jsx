import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconUpload, IconFileText, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { audit } from '../api';

/* Detect source type from file extension */
const detectSourceType = (filename) => {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (ext === '.cfg' || ext === '.txt') return { type: 'cisco_ios', label: 'Cisco IOS', ext };
  if (ext === '.tf') {
    return {
      type: 'terraform_aws',
      label: 'Terraform (.tf)',
      ext,
    };
  }
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

const Upload = ({ onAuditComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('empty'); // empty | detected | loading | success
  const [detected, setDetected] = useState(null); // { name, type, label }
  const inputRef = useRef(null);
  const navigate = useNavigate();

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
    setDetected({ file, name: file.name, type, label });
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
    if (!detected?.file) return;

    setStatus('loading');
    setError(null);

    try {
      const configText = await detected.file.text();

      const report = await audit(
        configText,
        detected.type
      );

      onAuditComplete(report);

      setStatus('success');

      setTimeout(() => {
        navigate('/audit/attack-paths');
      }, 600);
    } catch (err) {
      setError(err.message);
      setStatus('detected');
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

              {/* Loading */}
              {status === 'loading' && (
                <motion.div key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
                >
                  <SpinRing />
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Normalizing Syntax...
                  </div>
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
                    <button
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
                    </button>
                    <button
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
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Default — empty drop zone */}
              {status === 'empty' && (
                <motion.div key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
                >
                  <IconUpload size={36} style={{ color: 'var(--ink-dim)' }} />
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
                    <button
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
                    </button>
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
