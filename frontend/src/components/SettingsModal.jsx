import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Cloud, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const ToggleButton = ({ active, onClick, icon: Icon, title, description }) => (
  <button
    onClick={onClick}
    className="bezel-panel"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      padding: '16px',
      width: '100%',
      textAlign: 'left',
      backgroundColor: active ? 'var(--panel-raised)' : 'var(--substrate)',
      borderColor: active ? 'var(--trace)' : 'var(--wire)',
      transition: 'border-color 0.2s, background-color 0.2s',
    }}
  >
    <div style={{ color: active ? 'var(--trace)' : 'var(--ink-dim)', marginTop: '2px' }}>
      <Icon size={20} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--ink-dim)', lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
    {active && (
      <div style={{ color: 'var(--trace)' }}>
        <Check size={18} />
      </div>
    )}
  </button>
);

const SettingsModal = ({ isOpen, onClose }) => {
  const { useLocalModel, setUseLocalModel } = useSettings();
  const [toastVisible, setToastVisible] = useState(false);

  const handleToggle = (value) => {
    setUseLocalModel(value);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: '#000',
              zIndex: 100,
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bezel-panel"
            style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: '440px',
              backgroundColor: 'var(--panel)',
              borderLeft: '1px solid var(--wire)',
              zIndex: 101,
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '24px', borderBottom: '1px solid var(--wire)',
              backgroundColor: 'var(--substrate)'
            }}>
              <div className="heading-lg">Settings</div>
              <button onClick={onClose} style={{ color: 'var(--ink-dim)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Account section */}
              <section>
                <div className="label" style={{ marginBottom: '16px' }}>Account</div>
                <div className="bezel-panel corner-marks" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Admin User</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="mono text-ink-dim" style={{ fontSize: '12px' }}>
                      <a href="mailto:admin@ntro.gov.in" style={{ color: 'var(--trace)', textDecoration: 'none' }}>admin@ntro.gov.in</a>
                    </div>
                  </div>
                </div>
              </section>

              {/* Data & Privacy section */}
              <section>
                <div className="label" style={{ marginBottom: '16px' }}>Data & Privacy</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <ToggleButton
                    active={useLocalModel}
                    onClick={() => handleToggle(true)}
                    icon={Server}
                    title="Local model (air-gapped)"
                    description="AI remediation and attack-path narratives run on a self-hosted local model. Nothing leaves this network."
                  />
                  <ToggleButton
                    active={!useLocalModel}
                    onClick={() => handleToggle(false)}
                    icon={Cloud}
                    title="Hosted API (sanitised findings only)"
                    description="Uses an external API for convenience. Only abstracted, sanitised findings are sent — never raw configs, hostnames, IPs, or secrets."
                  />
                </div>
              </section>

              {/* Preferences */}
              <section>
                <div className="label" style={{ marginBottom: '16px' }}>Preferences</div>
                <div className="bezel-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--ink)' }}>Default Framework</div>
                    <select style={{
                      backgroundColor: 'var(--substrate)', color: 'var(--ink)',
                      border: '1px solid var(--wire)', padding: '4px 8px',
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px'
                    }}>
                      <option>CIS</option>
                      <option>NIST</option>
                      <option>STIG</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* About */}
              <section>
                <div className="label" style={{ marginBottom: '16px' }}>About</div>
                <div className="bezel-panel" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span className="text-ink-dim">App Version</span>
                    <span className="mono">v0.1.0-alpha</span>
                  </div>
                </div>
              </section>
            </div>
            
            {/* Toast overlay in Settings */}
            <AnimatePresence>
              {toastVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    position: 'absolute', bottom: '24px', left: '24px', right: '24px',
                    padding: '12px 16px', backgroundColor: 'var(--panel-raised)',
                    border: '1px solid var(--trace)', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--trace)'
                  }}
                >
                  <Check size={16} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Settings saved</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
