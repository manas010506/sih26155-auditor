import { useMemo, useEffect } from "react";
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
import "./AttackGraph.css";
import { IconInfoCircle, IconHierarchy } from "@tabler/icons-react";
import EmptyStateCard from './EmptyStateCard';

const nodeTypes = {
  attack: AttackNode,
};

const edgeTypes = {
  impact: ImpactEdge,
};

// Extracted canvas content to use useReactFlow hooks
function GraphCanvas({ nodes, edges }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    // Wait for nodes to render, then fit view to make sure everything fits including the custom edge label
    const timeout = setTimeout(() => {
      fitView({ padding: 0.2, minZoom: 0.2, maxZoom: 1.3, duration: 400 });
    }, 100);
    return () => clearTimeout(timeout);
  }, [nodes, edges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      fitView
      fitViewOptions={{ padding: 0.2, minZoom: 0.2, maxZoom: 1.3 }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

function AttackGraph() {
  const { reportData: report } = useOutletContext();

  if (!report) {
    const AttackPathsSVG = (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="attackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--trace)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--trace)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--trace)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="30%" cy="40%" r="6" fill="var(--wire)" opacity="0.5" />
        <circle cx="50%" cy="20%" r="8" fill="var(--wire)" opacity="0.3" />
        <circle cx="70%" cy="50%" r="10" fill="var(--wire)" opacity="0.6" />
        <circle cx="40%" cy="70%" r="5" fill="var(--wire)" opacity="0.4" />
        <circle cx="60%" cy="80%" r="7" fill="var(--wire)" opacity="0.3" />
        
        <path d="M 120 80 L 200 40 L 280 100 L 240 160 L 160 140 Z" fill="none" stroke="url(#attackGrad)" strokeWidth="1.5" style={{ transformOrigin: 'center', transform: 'scale(1.5)' }} />
        <path d="M 120 80 L 280 100" fill="none" stroke="var(--wire)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" style={{ transformOrigin: 'center', transform: 'scale(1.5)' }} />
      </svg>
    );

    return (
      <EmptyStateCard
        title="No Attack Paths"
        description="Upload a configuration file to model potential network traversal vectors and critical exploit paths."
        icon={IconHierarchy}
        svgLayer={AttackPathsSVG}
      />
    );
  }

  const graph = useMemo(() => {
    if (!report.attack_paths?.length) {
      return { nodes: [], edges: [] };
    }

    const path = report.attack_paths[0];
    const findingsById = Object.fromEntries(
      report.findings.map((finding) => [finding.rule_id, finding])
    );

    const MAX_PER_ROW = 3;
    const X_SPACING = 400;
    const Y_SPACING = 240;

    const nodes = path.contributing_findings.map((ruleId, index) => {
      const finding = findingsById[ruleId];
      return {
        id: ruleId,
        type: "attack",
        position: { 
          x: (index % MAX_PER_ROW) * X_SPACING, 
          y: Math.floor(index / MAX_PER_ROW) * Y_SPACING + 40 
        },
        data: {
          ruleId,
          title: finding?.title ?? ruleId,
          severity: finding?.severity ?? path.severity,
          isBreakPoint: ruleId === path.break_chain.fix_rule,
          isImpact: false,
          index,
        },
      };
    });

    /* Terminal impact node */
    const impactId = "impact";
    const impactIndex = path.contributing_findings.length;
    nodes.push({
      id: impactId,
      type: "attack",
      position: {
        x: (impactIndex % MAX_PER_ROW) * X_SPACING,
        y: Math.floor(impactIndex / MAX_PER_ROW) * Y_SPACING + 40,
      },
      data: {
        ruleId: "IMPACT",
        title: path.name,
        severity: path.severity,
        isBreakPoint: false,
        isImpact: true,
        index: path.contributing_findings.length,
      },
    });

    /* Edges with animated styling */
    const edges = [];
    for (let i = 0; i < path.contributing_findings.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: path.contributing_findings[i],
        target: path.contributing_findings[i + 1],
        animated: true,
        type: 'smoothstep',
        style: { stroke: 'var(--wire)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--wire)' },
      });
    }

    /* Final edge to impact node — using custom edge type */
    const lastFinding = path.contributing_findings[path.contributing_findings.length - 1];
    edges.push({
      id: "impact-edge",
      type: "impact",
      source: lastFinding,
      target: impactId,
      animated: true,
      style: { stroke: 'var(--severity-critical)', strokeWidth: 2, strokeDasharray: '6 4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--severity-critical)' },
    });

    return { nodes, edges };
  }, [report]);

  if (!report?.attack_paths?.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px', maxWidth: '400px' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ color: 'var(--ink-dim)' }}>
            <rect x="8" y="8" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
            <path d="M 18 18 l 12 12 M 30 18 l -12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
          <div className="mono" style={{ fontSize: '14px', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>No Attack Paths</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-dim)', textAlign: 'center', lineHeight: '1.5' }}>
            Upload and audit a configuration to view attack path analysis.
          </div>
          <Link to="/audit/upload" style={{
            marginTop: '8px', backgroundColor: 'transparent', border: '1px solid var(--wire)',
            color: 'var(--ink)', padding: '8px 20px', fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
            textDecoration: 'none', borderRadius: '4px', transition: 'border-color 0.2s, color 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--trace)'; e.currentTarget.style.color = 'var(--trace)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--wire)'; e.currentTarget.style.color = 'var(--ink)'; }}
          >
            Go to Upload
          </Link>
        </div>
      </div>
    );
  }

  const path = report.attack_paths[0];

  return (
    <section className="attack-graph">
      {/* Header */}
      <motion.div
        className="attack-graph-header"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <div className="eyebrow">ATTACK PATH</div>
          <h1>{path.name}</h1>
          <p>{path.narrative}</p>
        </div>
        <div className="path-severity">{path.severity}</div>
      </motion.div>

      {/* Explanatory strip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          backgroundColor: 'rgba(63, 169, 160, 0.04)',
          border: '1px solid rgba(63, 169, 160, 0.12)',
          borderRadius: '5px',
          fontSize: '12px',
          color: 'var(--ink-dim)',
        }}
      >
        <IconInfoCircle size={14} style={{ color: 'var(--trace)', flexShrink: 0 }} />
        Each step shows a weakness that enables the next, forming a chain that ends in real-world impact. Fix the highlighted break-chain node to disrupt the entire path.
      </motion.div>

      {/* Graph canvas — full height */}
      <motion.div
        className="graph-canvas"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <ReactFlowProvider>
          <GraphCanvas nodes={graph.nodes} edges={graph.edges} />
        </ReactFlowProvider>
      </motion.div>
    </section>
  );
}

export default AttackGraph;
