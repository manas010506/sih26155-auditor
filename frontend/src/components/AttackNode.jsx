import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

function AttackNode({ data }) {
  const severityClass = data.severity?.toLowerCase() || 'low';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: (data.index || 0) * 0.12, ease: [0.16, 1, 0.3, 1] }}
      className={[
        "attack-node",
        data.isBreakPoint ? "break-point" : "",
        data.isImpact ? "impact-node" : "",
        !data.isImpact && !data.isBreakPoint ? `severity-${severityClass}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle type="target" position={Position.Left} />

      <div className={`attack-node-severity ${severityClass}`}>
        {data.severity}
      </div>

      <div className="attack-node-rule">
        {data.isImpact ? "IMPACT" : data.ruleId}
      </div>

      <div className="attack-node-title" style={{
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        flex: 1,
      }}>
        {data.title}
      </div>

      {data.isBreakPoint && (
        <div className="break-chain">
          ✂ BREAK CHAIN
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </motion.div>
  );
}

export default AttackNode;