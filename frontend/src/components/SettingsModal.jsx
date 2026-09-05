import React, { useState, useEffect } from 'react';
import { X, Server, Cloud, Check } from 'lucide-react';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import { useSettings } from '../context/SettingsContext';
import { getFrameworks } from '../api';

const SettingsModal = ({ isOpen, onClose }) => {
  const { defaultFramework, setDefaultFramework } = useSettings();
  const [frameworks, setFrameworks] = useState(["CIS"]);

  useEffect(() => {
    getFrameworks().then(data => {
      setFrameworks(data.frameworks || ["CIS"]);
    }).catch(() => {});
  }, []);



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
            
              {/* Data & Privacy section */}
              <section>
                <div className="label" style={{ marginBottom: '16px' }}>Data & Privacy</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '13px' }}>Narrative source</span>
                  <span className="mono text-ink-dim" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                    Templates offline; sanitised findings only when an API key is configured
                  </span>
                </div>
              </section>

              {/* Preferences */}
              <section>
                <div className="label" style={{ marginBottom: '16px' }}>Preferences</div>
                <div className="bezel-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--ink)' }}>Default Framework</div>
                    <select value={defaultFramework} onChange={e => setDefaultFramework(e.target.value)} style={{
                      backgroundColor: 'var(--substrate)', color: 'var(--ink)',
                      border: '1px solid var(--wire)', padding: '4px 8px',
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px'
                    }}>
                      {frameworks.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
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
