import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconUpload,
  IconTable,
  IconRoute,
  IconFileText,
  IconLogout,
  IconBrain,
} from '@tabler/icons-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ComplianceGauge from './ComplianceGauge';

const NAV_ITEMS = [
  { id: '01', path: '/audit/upload',       label: 'UPLOAD',       Icon: IconUpload   },
  { id: '02', path: '/audit/findings',     label: 'FINDINGS',     Icon: IconTable    },
  { id: '03', path: '/audit/attack-paths', label: 'ATTACK PATHS', Icon: IconRoute    },
  { id: '04', path: '/audit/report',       label: 'REPORT',       Icon: IconFileText },
  { id: '05', path: '/audit/training',     label: 'TRAINING',     Icon: IconBrain    },
];

/* Sliding accent bar */
const ActiveBar = () => (
  <motion.div
    layoutId="sidebar-active-bar"
    style={{
      position: 'absolute',
      left: 0,
      top: '6px',
      bottom: '6px',
      width: '2px',
      backgroundColor: 'var(--trace)',
      borderRadius: '0 1px 1px 0',
    }}
    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
  />
);

const Sidebar = ({ score, findings, isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <motion.div
      style={{
        width: '100%',
        height: '100vh',
        backgroundColor: 'var(--panel)',
        borderRight: '1px solid var(--wire)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Product identity & Toggle Button */}
      <div style={{
        padding: isCollapsed ? '16px 0' : '18px 20px 16px',
        borderBottom: '1px solid var(--wire)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        transition: 'padding 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="label" style={{ marginBottom: '4px' }}>SIH-26155</div>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--ink)',
              fontFamily: 'IBM Plex Sans, sans-serif',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              COMPLIANCE<br />AUDITOR
            </div>
          </motion.div>
        )}
        
        {/* Toggle Button */}
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
          }}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ChevronLeft size={18} />
          </motion.div>
        </motion.button>
      </div>

      {/* Nav with connecting line - Animated Scrolling Container */}
      <nav style={{ 
        padding: '24px 0', 
        position: 'relative', 
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Vertical connecting line (hidden when collapsed) */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                left: '30px',
                top: '28px',
                bottom: '28px',
                width: '1px',
                backgroundColor: 'var(--wire)',
                zIndex: 0,
              }} 
            />
          )}
        </AnimatePresence>

        {NAV_ITEMS.map((item, i) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <NavLink to={item.path} style={{ display: 'block', textDecoration: 'none' }}>
                {({ isActive: navActive }) => {
                  const active = navActive || isActive;
                  return (
                    <motion.div
                      whileHover={{ backgroundColor: 'var(--panel-raised)' }}
                      transition={{ duration: 0.12 }}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: isCollapsed ? '0' : '10px',
                        padding: isCollapsed ? '12px 0' : '9px 16px',
                        backgroundColor: active ? 'var(--panel-raised)' : 'transparent',
                        transition: 'padding 0.3s ease, justify-content 0.3s ease',
                      }}
                    >
                      {active && <ActiveBar />}

                      {/* Step number (hidden when collapsed) */}
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5, width: 0 }} 
                            animate={{ opacity: 1, scale: 1, width: '22px' }} 
                            exit={{ opacity: 0, scale: 0.5, width: 0 }}
                            style={{
                              height: '22px',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              zIndex: 2,
                              backgroundColor: active ? 'var(--trace)' : 'var(--panel)',
                              border: `1px solid ${active ? 'var(--trace)' : 'var(--wire)'}`,
                              borderRadius: '50%',
                              transition: 'background-color 0.15s, border-color 0.15s',
                              marginRight: '10px'
                            }}>
                            <span className="mono" style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color: active ? 'var(--substrate)' : 'var(--ink-dim)',
                              lineHeight: 1,
                            }}>
                              {item.id}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Tabler icon */}
                      <item.Icon
                        size={18}
                        stroke={1.5}
                        style={{
                          color: active ? 'var(--trace)' : 'var(--ink-dim)',
                          flexShrink: 0,
                          transition: 'color 0.15s',
                        }}
                      />

                      {/* Label (hidden when collapsed) */}
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span 
                            initial={{ opacity: 0, x: -5 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: -5 }}
                            className="mono" 
                            style={{
                              fontSize: '11px',
                              fontWeight: active ? 600 : 400,
                              color: active ? 'var(--ink)' : 'var(--ink-dim)',
                              letterSpacing: '0.06em',
                              marginLeft: '4px',
                              whiteSpace: 'nowrap'
                            }}>
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Compliance gauge pinned at bottom (hidden when collapsed) */}
      <AnimatePresence>
        {!isCollapsed && score !== null && score !== undefined && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: '0 16px 24px 16px', overflow: 'hidden', marginTop: '16px' }}
          >
            <div className="bezel-panel corner-marks" style={{ padding: '16px 12px' }}>
              <div className="label" style={{ textAlign: 'center', marginBottom: '10px' }}>
                Compliance Score
              </div>
              <ComplianceGauge score={score} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer: Version and Logout */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--wire)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'auto'
            }}>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)' }}>v0.1.0</span>
              <button 
                onClick={() => navigate('/login')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink-dim)',
                  fontSize: '11px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--severity-critical)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-dim)'}
              >
                Logout
                <IconLogout size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Sidebar;
