import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react';

export default function ImpactEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: 'var(--panel-raised)',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 700,
            fontFamily: 'IBM Plex Mono, monospace',
            letterSpacing: '0.06em',
            color: 'var(--severity-critical)',
            border: '1px solid var(--severity-critical)',
            pointerEvents: 'all',
            boxShadow: '0 4px 12px rgba(229, 72, 77, 0.2)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          className="nodrag nopan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          LEADS TO IMPACT
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
