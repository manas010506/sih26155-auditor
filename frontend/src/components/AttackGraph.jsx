import { useMemo, useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import AttackNode from "./AttackNode";
import "./AttackGraph.css";

const nodeTypes = {
  attack: AttackNode,
};

function AttackGraph({ report }) {
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);

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

    const nodes = selectedPath.contributing_findings.map(
      (ruleId, index) => {
        const finding = findingsById[ruleId];

        return {
          id: ruleId,
          type: "attack",

          position: {
            x: index * 270,
            y: 180,
          },

          data: {
            ruleId,
            title: finding?.title ?? ruleId,
            severity:
              finding?.severity ?? selectedPath.severity,

            isBreakPoint:
              ruleId === selectedPath.break_chain.fix_rule,

            isImpact: false,
          },
        };
      }
    );

    const impactId = `impact-${selectedPath.chain_id}`;

    nodes.push({
      id: impactId,
      type: "attack",

      position: {
        x:
          selectedPath.contributing_findings.length *
          270,
        y: 180,
      },

      data: {
        ruleId: "IMPACT",
        title: "Privileged Takeover",
        severity: selectedPath.severity,
        isBreakPoint: false,
        isImpact: true,
      },
    });

    const edges = [];

    for (
      let i = 0;
      i < selectedPath.contributing_findings.length - 1;
      i++
    ) {
      edges.push({
        id: `${selectedPath.chain_id}-edge-${i}`,

        source:
          selectedPath.contributing_findings[i],

        target:
          selectedPath.contributing_findings[i + 1],

        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    }

    const lastFinding =
      selectedPath.contributing_findings[
        selectedPath.contributing_findings.length - 1
      ];

    edges.push({
      id: `${selectedPath.chain_id}-impact-edge`,

      source: lastFinding,
      target: impactId,

      label: "leads to impact",

      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    });

    return {
      nodes,
      edges,
    };
  }, [report, selectedPath]);

  if (!report) {
    return (
      <section className="attack-graph">
        <div className="graph-loading">
          Loading attack paths...
        </div>
      </section>
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

      <div className="attack-graph-header">

        <div>
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

        <div className="path-severity">
          {selectedPath.severity}
        </div>

      </div>

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
            onClick={() => setSelectedPathIndex(index)}
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

      <div className="graph-canvas">

        <ReactFlow
          key={selectedPath.chain_id}
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.15,
            minZoom: 0.5,
            maxZoom: 1.2,
          }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background />
          <Controls />
        </ReactFlow>

      </div>

    </section>
  );
}

export default AttackGraph;