import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, Shield, LayoutDashboard, FileText } from 'lucide-react';

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} 
        onClick={() => setOpen(false)} 
      />
      <Command 
        className="bezel-panel"
        style={{ 
          position: 'relative', 
          width: '100%', maxWidth: '640px', 
          backgroundColor: 'var(--panel)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 0 0 1px var(--wire)', // Explicitly no big blurry shadow, just a wire border
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--wire)', padding: '0 16px' }}>
          <Search size={18} style={{ color: 'var(--ink-dim)' }} />
          <Command.Input 
            placeholder="Type a command or search..." 
            autoFocus
            style={{ 
              width: '100%', border: 'none', backgroundColor: 'transparent', 
              padding: '16px', color: 'var(--ink)', fontSize: '14px',
              outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif'
            }} 
          />
        </div>

        <Command.List style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px' }}>
          <Command.Empty style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-dim)', fontSize: '13px' }}>
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" style={{ padding: '8px 8px 4px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-dim)', fontFamily: 'IBM Plex Mono, monospace' }}>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/audit/upload'))}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', color: 'var(--ink)' }}
            >
              <Upload size={16} />
              Upload Config
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/audit/findings'))}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', color: 'var(--ink)' }}
            >
              <Shield size={16} />
              Findings Dashboard
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/audit/report'))}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', color: 'var(--ink)' }}
            >
              <FileText size={16} />
              Compliance Report
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};

export default CommandPalette;
