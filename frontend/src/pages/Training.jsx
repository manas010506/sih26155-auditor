import { useOutletContext } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconBrain,
  IconCheck,
  IconDeviceFloppy,
  IconChevronRight,
  IconDatabase,
  IconCode,
  IconX,
  IconListDetails
} from '@tabler/icons-react';
import TactileButton from '../components/TactileButton';
import EmptyStateCard from '../components/EmptyStateCard';
import { addTrainingMapping, getSchema } from '../api';

const RESOURCE_TYPES = [
  'global_settings',
  'enable_secret',
  'local_user',
  'snmp_community',
  'snmp_settings',
  'vty_line',
  'console_line',
  'ssh_settings',
  'logging',
  'ntp',
  'interface',
  'access_list',
  's3_bucket',
  'security_group_rule',
  'iam_policy',
  'kms_key',
  'cloudtrail',
  'rds_instance',
];

const Training = () => {
  const { reportData } = useOutletContext();

  // Every hook must run on every render. These used to sit below the
  // `if (!reportData)` early return, so the hook count changed the moment an
  // upload completed and React threw "Rendered more hooks than during the
  // previous render". Keep all hooks above any conditional return.
  const [selectedLine, setSelectedLine] = useState(null);
  const [resourceType, setResourceType] = useState('');
  const [attribute, setAttribute] = useState('');
  const [value, setValue] = useState('');
  const [saveError, setSaveError] = useState(null);

  // Follow-up Tracking: Dictionary mapping line number -> mapping payload
  const [mappings, setMappings] = useState({});

  // Schema-driven attribute list
  const [schema, setSchema] = useState({});

  useEffect(() => {
    getSchema()
      .then(setSchema)
      .catch(() => setSchema({}));
  }, []);

  // Only attributes this resource type actually has.
  // An empty schema (backend unreachable) yields an empty list,
  // so the UI can never offer a mapping the rule engine won't read.
  const availableAttributes = schema[resourceType] ?? [];

  const unparsed = reportData?.unparsed ?? [];
  const lines = Array.isArray(unparsed) ? unparsed : [];

  const selectLine = (item) => {
    setSelectedLine(item);
    setSaveError(null);

    // If we've already mapped this line in this session,
    // pre-fill it so the user can edit it.
    const existing = mappings[item.line];

    if (existing) {
      setResourceType(existing.resource_type);
      setAttribute(existing.attribute);
      setValue(existing.value);
      return;
    }

    // Pre-fill from the engine's proposal.
    // The admin confirms or corrects it - nothing is saved until
    // they press the button.
    const s = item.suggestion;
    setResourceType(s?.resource_type ?? '');
    setAttribute(s?.attribute ?? '');
    setValue(s?.value ?? '');
  };

  const saveMapping = async () => {
    if (!selectedLine || !resourceType || !attribute || !value.trim()) {
      return;
    }

    const mapping = {
      line: selectedLine.line,
      text: selectedLine.text,
      source_type: reportData?.source?.type ?? 'cisco_ios',
      resource_type: resourceType,
      attribute,
      value: value.trim(),
    };

    // Persist to the engine. If this fails we must NOT show the line as saved -
    // a checkmark for a mapping that never reached the server is worse than an
    // error message.
    try {
      await addTrainingMapping(mapping);
      setSaveError(null);
    } catch (err) {
      setSaveError(err.message || 'Could not reach the auditor. Mapping not saved.');
      return;
    }

    // Update local state to show it as completed
    setMappings(prev => ({
      ...prev,
      [selectedLine.line]: mapping
    }));

    // Auto-advance to the next unmapped line
    const currentIndex = lines.findIndex(l => l.line === selectedLine.line);
    const nextLine = lines.slice(currentIndex + 1).find(l => !mappings[l.line]);

    if (nextLine) {
      selectLine(nextLine);
    } else {
      setSelectedLine(null); // All caught up
    }
  };

  const completedCount = Object.keys(mappings).length;
  const remainingCount = Math.max(0, lines.length - completedCount);
  const progressPercent = lines.length === 0 ? 100 : (completedCount / lines.length) * 100;

  if (!reportData) {
    const TrainingSVG = (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="trainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--trace)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--trace)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--trace)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="30%" cy="30%" r="4" fill="var(--wire)" opacity="0.5" />
        <circle cx="50%" cy="20%" r="6" fill="var(--wire)" opacity="0.3" />
        <circle cx="70%" cy="40%" r="8" fill="var(--wire)" opacity="0.6" />
        <circle cx="40%" cy="60%" r="5" fill="var(--wire)" opacity="0.4" />
        <circle cx="60%" cy="70%" r="7" fill="url(#trainGrad)" opacity="0.8" />
        <path d="M 120 60 L 200 40 L 280 80 L 240 140 L 160 120 Z" fill="none" stroke="var(--wire)" strokeWidth="1" opacity="0.3" style={{ transformOrigin: 'center', transform: 'scale(1.5)' }} />
        <path d="M 160 120 L 240 140" fill="none" stroke="url(#trainGrad)" strokeWidth="2" style={{ transformOrigin: 'center', transform: 'scale(1.5)' }} />
        <path d="M 280 80 L 240 140" fill="none" stroke="url(#trainGrad)" strokeWidth="1.5" style={{ transformOrigin: 'center', transform: 'scale(1.5)' }} />
      </svg>
    );

    return (
      <EmptyStateCard
        title="No Vendor Syntax Detected"
        description="Upload a configuration file. If any vendor-specific syntax is completely unrecognized by the auditor, you will be prompted to map it here."
        icon={IconBrain}
        svgLayer={TrainingSVG}
      />
    );
  }

  const renderBody = () => {
    return (
      <div
        className="flex-1 relative z-10"
        style={{
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: '24px'
        }}
      >
        {/* Left Pane: Task Queue */}
        <aside
          style={{ display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'var(--substrate)', border: '1px solid var(--wire)', borderRadius: '12px', overflow: 'hidden' }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--substrate)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconListDetails size={16} className="text-ink-dim" />
              <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Unrecognized Lines</div>
            </div>
            <div className="mono" style={{ fontSize: '11px', color: remainingCount === 0 ? 'var(--trace)' : 'var(--severity-high)' }}>
              {remainingCount} Pending
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {lines.map((item) => {
              const isSelected = selectedLine?.line === item.line;
              const isMapped = !!mappings[item.line];

              return (
                <button
                  key={item.line}
                  type="button"
                  onClick={() => selectLine(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--panel-raised)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--trace)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {/* Status Indicator */}
                  <div style={{
                    flexShrink: 0,
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isMapped ? 'var(--trace-dim)' : 'var(--substrate)',
                    border: `1px solid ${isMapped ? 'var(--trace)' : 'var(--wire)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isMapped ? (
                      <IconCheck size={14} style={{ color: 'var(--trace)' }} />
                    ) : (
                      <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)' }}>{item.line}</div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <code
                      className="mono"
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: isMapped ? 'var(--ink-dim)' : 'var(--ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: 'color 0.2s',
                      }}
                    >
                      {item.text}
                    </code>
                  </div>

                  {!isMapped && item.suggestion && (
                    <IconBrain
                      size={12}
                      style={{
                        color: 'var(--trace)',
                        opacity: 0.6,
                        flexShrink: 0
                      }}
                    />
                  )}

                  {isSelected && (
                    <motion.div layoutId="active-indicator" style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--trace)', borderRadius: '0 4px 4px 0' }} />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Pane: Mapping Editor */}
        <section
          className="relative overflow-auto"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', backgroundColor: 'transparent', border: '1px solid var(--wire)', borderRadius: '12px', overflow: 'hidden' }}
        >
          <AnimatePresence mode="wait">
            {!selectedLine ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card"
                style={{
                  padding: '48px',
                  textAlign: 'center',
                  maxWidth: '400px',
                  width: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* SVG Background Layer for depth */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.6, zIndex: 0 }}>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }} />
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--trace)" stopOpacity="0" />
                        <stop offset="50%" stopColor="var(--trace)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--trace)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M -50 50 Q 150 150 450 -50" fill="none" stroke="url(#cardGrad)" strokeWidth="1.5" />
                    <path d="M -50 150 Q 200 50 450 200" fill="none" stroke="url(#cardGrad)" strokeWidth="1" />
                    <circle cx="200" cy="100" r="80" fill="none" stroke="var(--wire)" strokeDasharray="4 4" opacity="0.3" />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(63, 169, 160, 0.05) 0%, transparent 70%)',
                  }} />
                </div>

                {/* Content Layer */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'var(--trace-dim)',
                    border: '1px solid rgba(63,169,160,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: '0 0 24px rgba(63, 169, 160, 0.15)'
                  }}>
                    <IconCode size={32} style={{ color: 'var(--trace)' }} stroke={1.5} />
                  </div>
                  <h3 className="heading-md" style={{ marginBottom: '8px' }}>Select a line to map</h3>
                  <p className="text-ink-dim" style={{ fontSize: '14px', lineHeight: 1.5 }}>
                    Choose an unrecognized configuration line from the queue to define how the auditor should parse it in the future.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={selectedLine.line}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ width: '100%', maxWidth: '640px' }}
              >
                <div className="glass-card" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div className="mono" style={{ fontSize: '12px', color: 'var(--trace)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Mapping Editor
                    </div>
                    {mappings[selectedLine.line] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--trace-dim)', border: '1px solid var(--trace)', padding: '4px 10px', borderRadius: '4px' }}>
                        <IconCheck size={14} style={{ color: 'var(--trace)' }} />
                        <span className="mono" style={{ fontSize: '10px', color: 'var(--trace)' }}>SAVED</span>
                      </div>
                    )}
                  </div>

                  {/* Code Snippet Box */}
                  <div style={{
                    background: 'var(--substrate)',
                    border: '1px solid var(--wire)',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '32px',
                    position: 'relative'
                  }}>
                    <div className="mono" style={{ position: 'absolute', top: '-10px', left: '16px', background: 'var(--panel)', padding: '0 8px', fontSize: '10px', color: 'var(--ink-dim)' }}>
                      LINE {selectedLine.line}
                    </div>
                    <code className="mono" style={{ fontSize: '14px', color: 'var(--ink)', wordBreak: 'break-word', display: 'block' }}>
                      {selectedLine.text}
                    </code>
                  </div>

                  {/* Suggestion Banner */}
                  {selectedLine?.suggestion && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        background: 'var(--trace-dim)',
                        border: '1px solid var(--trace)',
                      }}
                    >
                      <IconBrain
                        size={16}
                        style={{
                          color: 'var(--trace)',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                        <span className="mono" style={{ color: 'var(--trace)' }}>
                          SUGGESTED
                        </span>
                        <span className="text-ink-dim">
                          {' '}— matched{' '}
                          <code className="mono" style={{ color: 'var(--ink)' }}>
                            {selectedLine.suggestion.matched}
                          </code>
                          . Confirm or correct below.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Form Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>

                    {/* Resource Type */}
                    <label className="flex flex-col gap-2">
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>RESOURCE TYPE</span>
                      <div className="relative">
                        <IconDatabase size={16} className="text-ink-dim" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <select
                          value={resourceType}
                          onChange={(e) => {
                            setResourceType(e.target.value);
                            setAttribute('');
                          }}
                          style={{
                            width: '100%',
                            appearance: 'none',
                            background: 'rgba(16,20,26,0.6)',
                            border: '1px solid var(--wire)',
                            borderRadius: '6px',
                            padding: '12px 16px 12px 36px',
                            color: 'var(--ink)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--trace)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--wire)'}
                        >
                          <option value="" disabled>Select resource...</option>
                          {RESOURCE_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </label>

                    {/* Attribute */}
                    <label className="flex flex-col gap-2">
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>ATTRIBUTE</span>
                      <div className="relative">
                        <IconListDetails size={16} className="text-ink-dim" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <select
                          value={attribute}
                          onChange={(e) => setAttribute(e.target.value)}
                          style={{
                            width: '100%',
                            appearance: 'none',
                            background: 'rgba(16,20,26,0.6)',
                            border: '1px solid var(--wire)',
                            borderRadius: '6px',
                            padding: '12px 16px 12px 36px',
                            color: 'var(--ink)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--trace)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--wire)'}
                        >
                          <option value="" disabled>Select attribute...</option>
                          {availableAttributes.map(attr => (
                            <option key={attr} value={attr}>{attr}</option>
                          ))}
                        </select>
                      </div>
                    </label>

                    {/* Value (Spans full width) */}
                    <label className="flex flex-col gap-2" style={{ gridColumn: '1 / -1' }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>NORMALIZED VALUE</span>
                      <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="e.g. true, 192.168.1.1, console"
                        style={{
                          width: '100%',
                          background: 'rgba(16,20,26,0.6)',
                          border: '1px solid var(--wire)',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          color: 'var(--ink)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--trace)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--wire)'}
                      />
                    </label>
                  </div>

                  {/* Save failure - never show a mapping as saved when it wasn't */}
                  {saveError && (
                    <div
                      className="mono"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        background: 'var(--severity-critical-bg, rgba(242,84,91,0.08))',
                        border: '1px solid var(--severity-critical)',
                        color: 'var(--severity-critical)',
                        fontSize: '12px'
                      }}
                    >
                      <IconX size={14} />
                      {saveError}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <TactileButton
                      onClick={() => setSelectedLine(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--wire)',
                        color: 'var(--ink-dim)',
                        padding: '12px 24px',
                        fontFamily: 'var(--font-ui)',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderRadius: '6px'
                      }}
                    >
                      Cancel
                    </TactileButton>

                    <TactileButton
                      onClick={saveMapping}
                      disabled={!resourceType || !attribute || !value.trim()}
                      style={{
                        background: 'var(--trace)',
                        border: 'none',
                        color: 'var(--substrate)',
                        padding: '12px 32px',
                        fontFamily: 'var(--font-ui)',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        opacity: (!resourceType || !attribute || !value.trim()) ? 0.5 : 1,
                        cursor: (!resourceType || !attribute || !value.trim()) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(63, 169, 160, 0.3)'
                      }}
                    >
                      <IconDeviceFloppy size={18} />
                      Save Mapping
                    </TactileButton>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col text-ink" style={{ position: 'relative', padding: '24px', gap: '24px', backgroundColor: 'transparent' }}>

      {/* Decorative background element for premium feel */}
      <div style={{
        position: 'absolute',
        top: '-150px',
        right: '-150px',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(63, 169, 160, 0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header */}
      <header
        style={{
          border: '1px solid var(--wire)',
          borderRadius: '12px',
          padding: '20px 24px',
          position: 'relative',
          zIndex: 10,
          flexShrink: 0,
          backgroundColor: 'var(--panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 className="heading-lg" style={{ margin: 0, fontSize: '20px' }}>
            Vendor Training
          </h1>
          <p className="text-ink-dim" style={{ margin: 0, fontSize: '13px' }}>
            Map unrecognized configuration syntax to standard audit rules.
          </p>
        </div>

        {/* Overall Progress Widget - ONLY RENDER IF THERE ARE LINES TO MAP */}
        {lines.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
              <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)', letterSpacing: '0.05em' }}>SESSION PROGRESS</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                {completedCount} <span style={{ color: 'var(--ink-dim)', fontWeight: 400, margin: '0 4px' }}>/</span> {lines.length} <span style={{ color: 'var(--trace)', fontSize: '12px', marginLeft: '6px' }}>MAPPED</span>
              </div>
            </div>
            <div style={{ width: '120px', height: '4px', background: 'var(--substrate)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--wire)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ height: '100%', background: 'var(--trace)' }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Dynamic Main Content */}
      {renderBody()}
    </div>
  );
};

export default Training;