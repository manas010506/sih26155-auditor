import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Settings, User, Server, Shield, LogOut } from 'lucide-react';
import TactileButton from './TactileButton';

/* Pulsing LIVE dot */
const LiveDot = () => (
  <div style={{ position: 'relative', width: '8px', height: '8px', flexShrink: 0 }}>
    <motion.div
      animate={{ scale: [1, 1.9, 1], opacity: [0.4, 0, 0.4] }}
      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        backgroundColor: 'var(--trace)',
        opacity: 0.35,
      }}
    />
    <div style={{
      position: 'absolute',
      inset: '1px',
      borderRadius: '50%',
      backgroundColor: 'var(--trace)',
    }} />
  </div>
);

/* Thin vertical rule */
const Divider = () => (
  <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--wire)', flexShrink: 0 }} />
);

/* Dropdown wrapper with bezel */
const DropdownMenu = ({ isOpen, onClose, children, style }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="bezel-panel corner-marks"
          style={{
            position: 'absolute',
            zIndex: 50,
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '200px',
            ...style
          }}
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const DropdownItem = ({ icon: Icon, label, onClick, destructive }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      width: '100%',
      color: destructive ? 'var(--severity-critical)' : 'var(--ink)',
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: '13px',
      transition: 'background-color 0.15s',
      borderRadius: '2px', // inside bezel
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--panel-raised)'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    {Icon && <Icon size={14} />}
    {label}
  </button>
);

const TopBar = ({ device, source, onSettingsClick }) => {
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // Button hover handler for bezel buttons
  const handleBtnHover = (e, isEnter) => {
    e.currentTarget.style.color = isEnter ? 'var(--trace)' : 'var(--ink-dim)';
    e.currentTarget.style.borderColor = isEnter ? 'var(--trace)' : 'var(--wire)';
  };

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--wire)',
      backgroundColor: 'var(--panel)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      {/* LEFT: Identity & Device */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--ink)' }}>
          <Shield size={20} className="text-trace" />
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}>
            COMPLIANCE<br />AUDITOR
          </div>
        </div>

        <div className="hide-on-mobile"><Divider /></div>

        {device ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDeviceDropdownOpen(!deviceDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '8px 12px',
                borderRadius: '4px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--panel-raised)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title="Connected to audit engine &middot; last sync 2s ago">
                <LiveDot />
                <span className="mono hide-on-mobile" style={{ fontSize: '11px', color: 'var(--trace)', letterSpacing: '0.1em' }}>LIVE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{device.hostname || device.name}</div>
                <div className="label hide-on-mobile" style={{ fontSize: '10px' }}>{source?.type || device.source_type}</div>
              </div>
            </button>

            <DropdownMenu isOpen={deviceDropdownOpen} onClose={() => setDeviceDropdownOpen(false)} style={{ top: '100%', left: 0 }}>
              <div className="label" style={{ padding: '8px 12px' }}>Switch Report</div>
              <DropdownItem icon={Server} label={`${device.hostname || device.name} (Current)`} onClick={() => setDeviceDropdownOpen(false)} />
              {/* Mocking a second device to switch to */}
              <DropdownItem icon={Server} label="NYC-CORE-RTR-02" onClick={() => setDeviceDropdownOpen(false)} />
            </DropdownMenu>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--wire)' }} />
            <span className="mono label">No active report</span>
          </div>
        )}
      </div>

      {/* RIGHT: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <TactileButton
            className="bezel-panel"
            style={{ 
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-dim)', transition: 'color 0.2s, border-color 0.2s', borderRadius: '2px', padding: 0
            }}
            onMouseEnter={(e) => handleBtnHover(e, true)}
            onMouseLeave={(e) => handleBtnHover(e, false)}
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            title="Notifications"
          >
            <div style={{ position: 'relative', zIndex: 10 }}>
              <Bell size={18} />
              {/* Notification badge - pulsing */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: 3, duration: 0.8, delay: 1 }}
                style={{
                  position: 'absolute', top: '-2px', right: '-2px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: 'var(--severity-critical)', border: '2px solid var(--substrate)'
                }} 
              />
            </div>
          </TactileButton>
          
          <DropdownMenu isOpen={notifDropdownOpen} onClose={() => setNotifDropdownOpen(false)} style={{ top: 'calc(100% + 8px)', right: 0, minWidth: '240px' }}>
            <div className="label" style={{ padding: '8px 12px', borderBottom: '1px solid var(--wire)', marginBottom: '4px' }}>Notifications</div>
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--ink)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--severity-critical)', flexShrink: 0, marginTop: '4px' }} />
                <div>3 new critical findings detected on EDGE-RTR-01</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--ink-dim)', flexShrink: 0, marginTop: '4px' }} />
                <div style={{ color: 'var(--ink-dim)' }}>Compliance report ready to export</div>
              </div>
            </div>
          </DropdownMenu>
        </div>

        {/* Settings */}
        <TactileButton
          className="bezel-panel"
          style={{ 
            width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-dim)', transition: 'color 0.2s, border-color 0.2s', borderRadius: '2px', padding: 0
          }}
          onMouseEnter={(e) => handleBtnHover(e, true)}
          onMouseLeave={(e) => handleBtnHover(e, false)}
          onClick={onSettingsClick}
          title="Settings"
        >
          <div style={{ position: 'relative', zIndex: 10 }}>
            <Settings size={18} />
          </div>
        </TactileButton>

        {/* User Profile */}
        <div style={{ position: 'relative', marginLeft: '4px' }}>
          <TactileButton
            className="bezel-panel"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            style={{
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--trace)', transition: 'color 0.2s, border-color 0.2s', borderRadius: '2px', padding: 0,
              borderColor: userDropdownOpen ? 'var(--trace)' : 'var(--wire)'
            }}
            onMouseEnter={(e) => handleBtnHover(e, true)}
            onMouseLeave={(e) => { if (!userDropdownOpen) handleBtnHover(e, false) }}
          >
            <div style={{ position: 'relative', zIndex: 10 }}>
              <User size={18} />
            </div>
          </TactileButton>
          
          <DropdownMenu isOpen={userDropdownOpen} onClose={() => setUserDropdownOpen(false)} style={{ top: 'calc(100% + 8px)', right: 0 }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--wire)', marginBottom: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Admin User</div>
              <div className="label" style={{ fontSize: '10px', textTransform: 'none' }}>admin@ntro.gov.in</div>
            </div>
            <DropdownItem icon={Settings} label="Preferences" onClick={() => { setUserDropdownOpen(false); onSettingsClick(); }} />
            <DropdownItem icon={LogOut} label="Log out" onClick={() => navigate('/login')} destructive />
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
