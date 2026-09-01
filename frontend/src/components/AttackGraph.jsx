import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
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

function AttackGraph() {
  const { reportData: report } = useOutletContext();

  const graph = useMemo(() => {
    if (!report || !report.attack_paths?.length) {
      return {
        nodes: [],
        edges: [],
      };
    }

    /*
     * Saturday milestone:
     * Display ONE attack path as a
     * left-to-right chain.
     */
    const path = report.attack_paths[0];

    const findingsById = Object.fromEntries(
      report.findings.map((finding) => [
        finding.rule_id,
        finding,
      ])
    );

    /*
     * One node for every contributing finding.
     */
    const nodes = path.contributing_findings.map(
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

            title:
              finding?.title ??
              ruleId,

            severity:
              finding?.severity ??
              path.severity,

            isBreakPoint:
              ruleId ===
              path.break_chain.fix_rule,

            isImpact: false,
          },
        };
      }
    );

    /*
     * Terminal impact node.
     */
    const impactId = "impact";

    nodes.push({
      id: impactId,
      type: "attack",

      position: {
        x:
          path.contributing_findings.length *
          270,
        y: 180,
      },

      data: {
        ruleId: "IMPACT",
        title: path.name,
        severity: path.severity,
        isBreakPoint: false,
        isImpact: true,
      },
    });

    /*
     * Connect each finding to the next finding.
     */
    const edges = [];

    for (
      let i = 0;
      i <
      path.contributing_findings.length - 1;
      i++
    ) {
      edges.push({
        id: `edge-${i}`,

        source:
          path.contributing_findings[i],

        target:
          path.contributing_findings[i + 1],

        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    }

    /*
     * Connect the final finding to the
     * terminal impact node.
     */
    const lastFinding =
      path.contributing_findings[
        path.contributing_findings.length - 1
      ];

    edges.push({
      id: "impact-edge",

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
  }, [report]);

  if (!report?.attack_paths?.length) {
    return (
      <div className="graph-loading">
        No attack paths in this report.
      </div>
    );
  }

  const path = report.attack_paths[0];

  return (
    <section className="attack-graph">

      <div className="attack-graph-header">

        <div>
          <div className="eyebrow">
            ATTACK PATH
          </div>

          <h1>
            {path.name}
          </h1>

          <p>
            {path.narrative}
          </p>
        </div>

        <div className="path-severity">
          {path.severity}
        </div>

      </div>

      <div className="graph-canvas">

        <ReactFlow
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
