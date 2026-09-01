import { Handle, Position } from "@xyflow/react";
import { useNavigate } from "react-router-dom";

function AttackNode({ data }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (data.isImpact) return;

    navigate("/audit/findings", {
      state: {
        selectedRuleId: data.ruleId,
      },
    });
  };

  return (
    <div
      className={[
        "attack-node",
        data.isBreakPoint ? "break-point" : "",
        data.isImpact ? "impact-node" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      style={{
        cursor: data.isImpact ? "default" : "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} />

      <div className="attack-node-severity">
        {data.severity}
      </div>

      <div className="attack-node-rule">
        {data.isImpact ? "IMPACT" : data.ruleId}
      </div>

      <div className="attack-node-title">
        {data.title}
      </div>

      {data.isBreakPoint && (
        <div className="break-chain">
          BREAK CHAIN
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default AttackNode;