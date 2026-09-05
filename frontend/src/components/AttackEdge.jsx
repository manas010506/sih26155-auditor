import React from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';

export default function AttackEdge({
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
  const isRowWrap = targetX < sourceX;
  const offset = 40; // match standoff distance
  const r = 8;
  
  let path = '';

  if (isRowWrap) {
    const midY = sourceY + (targetY - sourceY) / 2;
    path = `M ${sourceX} ${sourceY} ` +
           `L ${sourceX + offset - r} ${sourceY} ` +
           `Q ${sourceX + offset} ${sourceY} ${sourceX + offset} ${sourceY + r} ` +
           `L ${sourceX + offset} ${midY - r} ` +
           `Q ${sourceX + offset} ${midY} ${sourceX + offset - r} ${midY} ` +
           `L ${targetX - offset + r} ${midY} ` +
           `Q ${targetX - offset} ${midY} ${targetX - offset} ${midY + r} ` +
           `L ${targetX - offset} ${targetY - r} ` +
           `Q ${targetX - offset} ${targetY} ${targetX - offset + r} ${targetY} ` +
           `L ${targetX} ${targetY}`;
  } else {
    [path] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: r,
    });
  }

  return <BaseEdge path={path} markerEnd={markerEnd} style={style} />;
}
