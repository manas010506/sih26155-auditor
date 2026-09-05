import { useMemo, useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import AttackNode from "./AttackNode";
import ImpactEdge from "./ImpactEdge";
import AttackEdge from "./AttackEdge";
import EmptyStateCard from "./EmptyStateCard";
import { IconInfoCircle, IconNetwork, IconLock, IconLockOpen } from "@tabler/icons-react";
import "./AttackGraph.css";

const nodeTypes = {
  attack: AttackNode,
};

const edgeTypes = {
  impact: ImpactEdge,
  attack: AttackEdge,
};

function GraphCanvas({ nodes, edges, isLocked, onToggleLock }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({
        padding: 0.2,
        minZoom: 0.2,
        maxZoom: 1.3,
        duration: 400,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [nodes, edges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{
        padding: 0.2,
        minZoom: 0.2,
        maxZoom: 1.3,
      }}
      nodesDraggable={!isLocked}
      nodesConnectable={false}
      elementsSelectable={!isLocked}
      nodesFocusable={!isLocked}
      edgesFocusable={!isLocked}
      panOnDrag={!isLocked}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={!isLocked}
      zoomOnDoubleClick={!isLocked}
      autoPanOnNodeDrag={!isLocked}
      selectionOnDrag={!isLocked}
      deleteKeyCode={isLocked ? null : "Delete"}
      preventScrolling={false}
    >
      <Background />
      <Controls showInteractive={false}>
        <button
          type="button"
          className={`graph-lock-button ${isLocked ? "locked" : "unlocked"}`}
          onClick={onToggleLock}
          title={isLocked ? "Unlock graph" : "Lock graph"}
          aria-label={isLocked ? "Unlock graph" : "Lock graph"}
          style={{ width: '100%', borderRadius: 0, padding: '4px 0', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isLocked ? <IconLock size={16} /> : <IconLockOpen size={16} />}
        </button>
      </Controls>
    </ReactFlow>
  );
}

function AttackGraph({ report: reportProp }) {
  const outletContext = useOutletContext();
  const report = reportProp ?? outletContext?.reportData;

  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(true);

  const paths = report?.attack_paths ?? [];
  const selectedPath = paths[selectedPathIndex] ?? null;

  const graph = useMemo(() => {
    if (!report || !selectedPath) {
      return {
        nodes: [],
        edges: [],
      };
    }

    const findingsById = Object.fromEntries(
      (report.findings ?? []).map((finding) => [
        finding.rule_id,
        finding,
      ])
    );

    const MAX_PER_ROW = 3;
    const X_SPACING = 400;
    const Y_SPACING = 240;

    const nodes = selectedPath.contributing_findings.map(
      (ruleId, index) => {
        const finding = findingsById[ruleId];

        return {
          id: ruleId,
          type: "attack",
          position: {
            x: (index % MAX_PER_ROW) * X_SPACING,
            y:
              Math.floor(index / MAX_PER_ROW) *
                Y_SPACING +
              40,
          },
          data: {
            ruleId,
            title: finding?.title ?? ruleId,
            severity:
              finding?.severity ??
              selectedPath.severity,
            isBreakPoint:
              ruleId ===
              selectedPath.break_chain?.fix_rule,
            isImpact: false,
            index,
          },
        };
      }
    );

    const impactId = `impact-${selectedPath.chain_id}`;

    const impactIndex =
      selectedPath.contributing_findings.length;

    nodes.push({
      id: impactId,
      type: "attack",
      position: {
        x: (impactIndex % MAX_PER_ROW) * X_SPACING,
        y:
          Math.floor(impactIndex / MAX_PER_ROW) *
            Y_SPACING +
          40,
      },
      data: {
        ruleId: "IMPACT",
        title: "Privileged Takeover",
        severity: selectedPath.severity,
        isBreakPoint: false,
        isImpact: true,
        index: impactIndex,
      },
    });

    const edges = [];

    for (
      let i = 0;
      i <
      selectedPath.contributing_findings.length - 1;
      i++
    ) {
      edges.push({
        id: `${selectedPath.chain_id}-edge-${i}`,
        source:
          selectedPath.contributing_findings[i],
        target:
          selectedPath.contributing_findings[i + 1],
        animated: true,
        type: "attack",
        style: {
          stroke: "var(--wire)",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "var(--wire)",
        },
      });
    }

    const lastFinding =
      selectedPath.contributing_findings[
        selectedPath.contributing_findings.length - 1
      ];

    if (lastFinding) {
      edges.push({
        id: `${selectedPath.chain_id}-impact-edge`,
        type: "impact",
        source: lastFinding,
        target: impactId,
        animated: true,
        style: {
          stroke: "var(--severity-critical)",
          strokeWidth: 2,
          strokeDasharray: "6 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "var(--severity-critical)",
        },
      });
    }

    return {
      nodes,
      edges,
    };
  }, [report, selectedPath]);

  if (!report) {
    const AttackPathsSVG = (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pathsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--trace)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--trace)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--trace)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="30%" cy="30%" r="6" fill="var(--wire)" opacity="0.4" />
        <circle cx="50%" cy="50%" r="6" fill="var(--wire)" opacity="0.4" />
        <circle cx="70%" cy="40%" r="6" fill="var(--wire)" opacity="0.4" />
        <path d="M 120 60 L 200 100 L 280 80" fill="none" stroke="var(--wire)" strokeWidth="2" opacity="0.2" style={{ transformOrigin: 'center', transform: 'scale(1.5)' }} />
        <path d="M -50 40 Q 250 80 550 40" fill="none" stroke="url(#pathsGrad)" strokeWidth="2" />
      </svg>
    );

    return (
      <EmptyStateCard
        title="No Attack Paths"
        description="Upload a configuration file to execute the auditing engine and visualize attack chains."
        icon={IconNetwork}
        svgLayer={AttackPathsSVG}
      />
    );
  }

  if (!paths.length) {
    return (
      <section className="attack-graph">
        <div className="graph-error">
          No attack paths found.
        </div>
      </section>
    );
  }

  return (
    <section className="attack-graph">
      <motion.div
        className="attack-graph-header"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="attack-graph-heading">
          <div className="eyebrow">
            ATTACK PATHS
          </div>

          <h1>
            {selectedPath.name}
          </h1>

          <p>
            {selectedPath.narrative}
          </p>
        </div>

        <div className="attack-graph-actions">
          <div className="path-severity">
            {selectedPath.severity}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: 0.1,
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          margin: "0 24px 16px",
          backgroundColor:
            "rgba(63, 169, 160, 0.04)",
          border:
            "1px solid rgba(63, 169, 160, 0.12)",
          borderRadius: "5px",
          fontSize: "12px",
          color: "var(--ink-dim)",
        }}
      >
        <IconInfoCircle
          size={14}
          style={{
            color: "var(--trace)",
            flexShrink: 0,
          }}
        />

        <span>
          Each step shows a weakness that enables
          the next, forming a chain that ends in
          real-world impact. Fix the highlighted
          break-chain node to disrupt the entire
          path.
        </span>
      </motion.div>

      <div className="attack-path-selector">
        {paths.map((path, index) => (
          <button
            key={path.chain_id}
            type="button"
            className={
              index === selectedPathIndex
                ? "attack-path-tab active"
                : "attack-path-tab"
            }
            onClick={() =>
              setSelectedPathIndex(index)
            }
          >
            <span className="attack-path-number">
              {index + 1}
            </span>

            <span className="attack-path-name">
              {path.name}
            </span>

            <span className="attack-path-severity">
              {path.severity}
            </span>
          </button>
        ))}
      </div>

      <motion.div
        className={`graph-canvas ${
          isLocked
            ? "graph-is-locked"
            : "graph-is-unlocked"
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.15,
        }}
      >
        <ReactFlowProvider>
          <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            isLocked={isLocked}
            onToggleLock={() => setIsLocked((v) => !v)}
          />
        </ReactFlowProvider>
      </motion.div>
    </section>
  );
}

export default AttackGraph;