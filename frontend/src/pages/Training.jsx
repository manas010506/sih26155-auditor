import React, { useState } from 'react';
import {
  IconBrain,
  IconCheck,
  IconDeviceFloppy,
} from '@tabler/icons-react';

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

const ATTRIBUTES = [
  'enabled',
  'transport_input',
  'access',
  'version',
  'password',
  'username',
  'source',
  'destination',
  'value',
];

const Training = ({ reportData }) => {
  const [selectedLine, setSelectedLine] = useState(null);
  const [resourceType, setResourceType] = useState('');
  const [attribute, setAttribute] = useState('');
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const lines = Array.isArray(reportData?.unparsed)
    ? reportData.unparsed
    : [];

  const selectLine = (item) => {
    setSelectedLine(item);
    setResourceType('');
    setAttribute('');
    setValue('');
    setSaved(false);
    setError('');
  };

  const saveMapping = async () => {
    if (!selectedLine || !resourceType || !attribute || !value.trim()) {
      return;
    }

    const sourceType = reportData?.source?.type;

    if (!sourceType) {
      setError('Unable to determine source type.');
      setSaved(false);
      return;
    }

    const mapping = {
      line: selectedLine.line,
      text: selectedLine.text,
      source_type: sourceType,
      resource_type: resourceType,
      attribute,
      value: value.trim(),
    };

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const response = await fetch('/api/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapping),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Training save failed (${response.status})`
        );
      }

      setSaved(true);
    } catch (err) {
      setError(err.message || 'Failed to save training mapping.');
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-substrate text-ink">
      {/* Header */}
      <header
        className="bg-panel border-b-wire p-5"
        style={{ flexShrink: 0 }}
      >
        <div className="flex items-center gap-2">
          <IconBrain size={18} />
          <h1
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            VENDOR TRAINING
          </h1>
        </div>

        <p
          className="text-ink-dim"
          style={{
            margin: '6px 0 0',
            fontSize: '12px',
          }}
        >
          Teach the auditor to recognize previously unknown configuration
          syntax.
        </p>
      </header>

      {/* Main content */}
      <div
        className="flex-1"
        style={{
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)',
          gap: '1px',
          background: 'var(--wire)',
        }}
      >
        {/* Unknown lines */}
        <section
          className="bg-substrate"
          style={{
            minWidth: 0,
            overflow: 'auto',
          }}
        >
          <div
            className="p-4 border-b-wire flex items-center justify-between"
          >
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Unknown Configuration Lines
              </div>

              <div
                className="text-ink-dim"
                style={{
                  marginTop: '4px',
                  fontSize: '11px',
                }}
              >
                {lines.length} unrecognized line
                {lines.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <div className="p-4">
            {lines.length === 0 ? (
              <div className="bg-panel-raised border-wire p-4 text-ink-dim">
                No unrecognized configuration lines.
              </div>
            ) : (
              <div>
                {lines.map((item, index) => {
                  const active = selectedLine === item;

                  return (
                    <button
                      key={`${item.line}-${index}`}
                      type="button"
                      onClick={() => selectLine(item)}
                      className={`w-full text-ink ${
                        active ? 'bg-panel-raised' : 'bg-panel'
                      }`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '52px minmax(0, 1fr)',
                        gap: '12px',
                        padding: '12px',
                        border: `1px solid ${
                          active ? 'var(--accent)' : 'var(--wire)'
                        }`,
                        borderBottom:
                          index === lines.length - 1
                            ? `1px solid ${
                                active ? 'var(--accent)' : 'var(--wire)'
                              }`
                            : 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className="mono text-ink-dim"
                        style={{ textAlign: 'right' }}
                      >
                        {item.line}
                      </span>

                      <code
                        className="mono"
                        style={{
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--ink)',
                        }}
                      >
                        {item.text}
                      </code>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Mapping editor */}
        <aside
          className="bg-panel p-5"
          style={{
            minWidth: 0,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '16px',
            }}
          >
            Teach This Command
          </div>

          {!selectedLine ? (
            <div className="border-wire p-4 text-ink-dim">
              Select an unknown configuration line to create a mapping.
            </div>
          ) : (
            <>
              <div
                className="bg-substrate border-wire p-3"
                style={{ marginBottom: '20px' }}
              >
                <div
                  className="mono text-ink-dim"
                  style={{
                    marginBottom: '6px',
                    fontSize: '10px',
                  }}
                >
                  LINE {selectedLine.line}
                </div>

                <code
                  className="mono"
                  style={{
                    display: 'block',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedLine.text}
                </code>
              </div>

              <label
                className="flex flex-col gap-2"
                style={{ marginBottom: '14px' }}
              >
                <span
                  className="text-ink-dim"
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Resource Type
                </span>

                <select
                  value={resourceType}
                  onChange={(event) => {
                    setResourceType(event.target.value);
                    setSaved(false);
                    setError('');
                  }}
                  className="bg-substrate text-ink border-wire"
                  style={{
                    padding: '9px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <option value="">Select resource type</option>

                  {RESOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label
                className="flex flex-col gap-2"
                style={{ marginBottom: '14px' }}
              >
                <span
                  className="text-ink-dim"
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Attribute
                </span>

                <select
                  value={attribute}
                  onChange={(event) => {
                    setAttribute(event.target.value);
                    setSaved(false);
                    setError('');
                  }}
                  className="bg-substrate text-ink border-wire"
                  style={{
                    padding: '9px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <option value="">Select attribute</option>

                  {ATTRIBUTES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label
                className="flex flex-col gap-2"
                style={{ marginBottom: '20px' }}
              >
                <span
                  className="text-ink-dim"
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Value
                </span>

                <input
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setSaved(false);
                    setError('');
                  }}
                  placeholder="Enter normalized value"
                  className="bg-substrate text-ink border-wire"
                  style={{
                    padding: '9px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                />
              </label>

              <button
                type="button"
                onClick={saveMapping}
                disabled={
                  saving ||
                  !resourceType ||
                  !attribute ||
                  !value.trim()
                }
                className="w-full"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  border: '1px solid var(--accent)',
                  background: 'var(--accent-dim)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor:
                    saving ||
                    !resourceType ||
                    !attribute ||
                    !value.trim()
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    saving ||
                    !resourceType ||
                    !attribute ||
                    !value.trim()
                      ? 0.45
                      : 1,
                }}
              >
                {saved ? (
                  <IconCheck size={15} />
                ) : (
                  <IconDeviceFloppy size={15} />
                )}

                {saving
                  ? 'SAVING...'
                  : saved
                    ? 'MAPPING SAVED'
                    : 'SAVE MAPPING'}
              </button>

              {error && (
                <div
                  className="text-ink-dim"
                  style={{
                    marginTop: '10px',
                    fontSize: '11px',
                  }}
                >
                  {error}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Training;