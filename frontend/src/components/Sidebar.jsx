import React from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconUpload,
  IconTable,
  IconRoute,
  IconFileText,
  IconLogout,
  IconBrain,
  IconChevronRight,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { ChevronLeft } from 'lucide-react';
import ComplianceGauge from './ComplianceGauge';

const NAV_ITEMS = [
  { id: '01', path: '/audit/upload',       label: 'UPLOAD',       Icon: IconUpload   },
  { id: '02', path: '/audit/findings',     label: 'FINDINGS',     Icon: IconTable    },
  { id: '03', path: '/audit/attack-paths', label: 'ATTACK PATHS', Icon: IconRoute    },
  { id: '04', path: '/audit/report',       label: 'REPORT',       Icon: IconFileText },
  { id: '05', path: '/audit/training',     label: 'TRAINING',     Icon: IconBrain    },
];

const Sidebar = ({ score, breakdown, isCollapsed, setIsCollapsed, reportData }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = React.useState(null);

  // Helper to determine severity color for the compact score badge
  const getScoreColor = (s) => {
    if (s >= 25) return 'var(--trace)';
    if (s >= 15) return 'var(--severity-low)';
    if (s >= 8) return 'var(--severity-medium)';
    return 'var(--severity-critical)';
  };

  return (
    <motion.div
      style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(180deg, rgba(27, 33, 43, 0.98) 0%, rgba(16, 20, 26, 0.99) 100%)',
        borderRight: '1px solid var(--wire)',
        boxShadow: '4px 0 16px rgba(0, 0, 0, 0.2), 1px 0 0 rgba(63, 169, 160, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* Project identity & Toggle Button */}
      <div style={{
        padding: isCollapsed ? '16px 0' : '20px 20px 16px',
        borderBottom: '1px solid var(--wire)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        transition: 'padding 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Project ID as pill badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                backgroundColor: 'rgba(63, 169, 160, 0.1)',
                border: '1px solid rgba(63, 169, 160, 0.2)',
                borderRadius: '3px',
                marginBottom: '8px',
              }}>
                <div style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--trace)',
                }} />
                <span className="mono" style={{
                  fontSize: '9px',
                  color: 'var(--trace)',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}>SIH-26155</span>
              </div>

              {/* App name */}
              <div style={{
                fontSize: '15px',
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
        </AnimatePresence>

        {/* Toggle Button */}
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          whileHover={{ scale: 1.08, backgroundColor: 'var(--panel-raised)' }}
          whileTap={{ scale: 0.92 }}
          style={{
            background: 'transparent',
            border: '1px solid var(--wire)',
            borderRadius: '4px',
            color: 'var(--ink-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5px',
            transition: 'border-color 0.2s',
          }}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ChevronLeft size={16} />
          </motion.div>
        </motion.button>
      </div>

      {/* Scrollable Middle Section */}
      <div style={{
        flex: 1,
        minHeight: 0, // This is the crucial flexbox scrolling fix!
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Nav */}
        <nav style={{
        padding: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {NAV_ITEMS.map((item, i) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const isHovered = hoveredItem === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <NavLink to={item.path} style={{ display: 'block', textDecoration: 'none' }}>
                {({ isActive: navActive }) => {
                  const active = navActive || isActive;
                  return (
                    <motion.div
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: isCollapsed ? '0' : '12px',
                        padding: isCollapsed ? '12px 0' : '10px 16px',
                        margin: isCollapsed ? '0' : '0 12px',
                        borderRadius: '6px',
                        backgroundColor: active
                          ? 'rgba(63, 169, 160, 0.15)'
                          : isHovered
                          ? 'rgba(74, 85, 99, 0.15)'
                          : 'transparent',
                        transition: 'background-color 0.2s, padding 0.3s ease, margin 0.3s ease',
                      }}
                    >
                      {/* Active indicator bar on the left */}
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '3px',
                            height: '60%',
                            background: 'var(--trace)',
                            borderRadius: '0 4px 4px 0',
                          }}
                        />
                      )}

                      {/* Tabler icon */}
                      <item.Icon
                        size={20}
                        stroke={active ? 2 : 1.5}
                        style={{
                          color: active ? 'var(--trace)' : isHovered ? 'var(--ink)' : 'var(--ink-dim)',
                          flexShrink: 0,
                          transition: 'color 0.15s',
                        }}
                      />

                      {/* Label */}
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flex: 1,
                            }}
                          >
                            <span
                              className="mono"
                              style={{
                                fontSize: '11px',
                                fontWeight: active ? 600 : 500,
                                color: active ? 'var(--trace)' : isHovered ? 'var(--ink)' : 'var(--ink-dim)',
                                letterSpacing: '0.06em',
                                whiteSpace: 'nowrap',
                                transition: 'color 0.15s',
                              }}
                            >
                              {item.label}
                            </span>

                            {/* Chevron on active */}
                            {active && (
                              <motion.div
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{ marginLeft: 'auto' }}
                              >
                                <IconChevronRight size={14} style={{ color: 'var(--trace)', opacity: 0.7 }} />
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }}
              </NavLink>

              {/* Tooltip for collapsed mode */}
              {isCollapsed && isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: '8px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--panel-raised)',
                    border: '1px solid var(--wire)',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 100,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--ink)', letterSpacing: '0.04em' }}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </nav>

      {/* Compliance gauge / Collapsed Badge */}
      <div style={{ padding: isCollapsed ? '0 0 16px 0' : '0 16px 16px 16px', overflow: 'hidden', marginTop: '24px', flexShrink: 0 }}>
        {isCollapsed ? (
          /* Collapsed Score Badge */
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {score !== null && score !== undefined ? (
              <div
                title={`Compliance Score: ${score}`}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: `2px solid ${getScoreColor(score)}`,
                  backgroundColor: 'rgba(27, 33, 43, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${getScoreColor(score)}40`,
                }}
              >
                <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: getScoreColor(score) }}>
                  {score}
                </span>
              </div>
            ) : (
              <div
                title="No file loaded"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px dashed var(--wire)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-dim)',
                  opacity: 0.6,
                }}
              >
                <span className="mono" style={{ fontSize: '10px' }}>--</span>
              </div>
            )}
          </div>
        ) : (
          /* Expanded Full Gauge Card */
          <div
            className="glass-card"
            style={{
              padding: '20px 16px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Ambient glow behind gauge */}
            {score !== null && score !== undefined && (
              <div style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100px',
                height: '60px',
                borderRadius: '50%',
                background: score >= 25
                  ? 'radial-gradient(ellipse, rgba(63,169,160,0.15) 0%, transparent 70%)'
                  : score >= 15
                  ? 'radial-gradient(ellipse, rgba(124,140,166,0.12) 0%, transparent 70%)'
                  : score >= 8
                  ? 'radial-gradient(ellipse, rgba(232,197,71,0.12) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse, rgba(229,72,77,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
                filter: 'blur(8px)',
              }} />
            )}

            <div className="label" style={{ textAlign: 'center', marginBottom: '12px' }}>
              Compliance Score
            </div>
            
            {score !== null && score !== undefined ? (
              <>
                <ComplianceGauge score={score} breakdown={breakdown} />
                {reportData?.unparsed?.length > 0 && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '12px 14px', marginTop: '12px', borderRadius: '6px',
                      background: 'var(--severity-high-bg, rgba(240,136,62,0.08))',
                      border: '1px solid var(--severity-high)',
                    }}
                  >
                    <IconAlertTriangle size={16} style={{ color: 'var(--severity-high)', flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                      <div className="mono" style={{ color: 'var(--severity-high)', marginBottom: '2px' }}>
                        INCOMPLETE
                      </div>
                      <span className="text-ink-dim">
                        {reportData.unparsed.length} lines were not recognised. Rules that depend
                        on them could not be evaluated, so this score is a floor, not a verdict.
                        {' '}<Link to="/audit/training" style={{ color: 'var(--trace)' }}>Teach the parser</Link>.
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-dim)', opacity: 0.6 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <span className="mono" style={{ fontSize: '10px', letterSpacing: '1px' }}>NO FILE LOADED</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer to prevent scrollbar clipping */}
      <div style={{ height: '16px', flexShrink: 0 }} />
    </div>

      {/* Footer: Version and Logout */}
      <div style={{
        padding: isCollapsed ? '16px 0' : '16px 20px',
        borderTop: '1px solid var(--wire)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        transition: 'padding 0.3s ease',
        marginTop: 'auto',
      }}>
        {!isCollapsed && (
          <span className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)' }}>v0.1.0</span>
        )}
        <motion.button
          onClick={() => navigate('/login')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Logout"
          style={{
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: '6px',
            color: 'var(--ink-dim)',
            fontSize: '11px',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--severity-critical)';
            e.currentTarget.style.backgroundColor = 'rgba(229, 72, 77, 0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--ink-dim)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {!isCollapsed && "Logout"}
          <IconLogout size={isCollapsed ? 20 : 16} />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
