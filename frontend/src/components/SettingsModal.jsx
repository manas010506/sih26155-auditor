import React, { useState } from 'react';
import { X, Server, Cloud, Check } from 'lucide-react';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
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
      borderTopColor: active ? '#8392a5' : '#6e7c8e',
      transition: 'background-color 0.2s',
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
    toast.success('Settings saved');
  };

  return (
    <Drawer.Root direction="right" open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay 
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
          }} 
        />
        <Drawer.Content 
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
          {/* Handle for dragging (optional for side drawer, but good for Vaul) */}
          <div style={{ position: 'absolute', top: '50%', left: '8px', width: '4px', height: '48px', backgroundColor: 'var(--wire)', borderRadius: '2px', transform: 'translateY(-50%)' }} />

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
            

          </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default SettingsModal;
