import { useMemo, useState } from "react";
import { Lock, Unlock } from "lucide-react";

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

  // Graph is completely locked by default.
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

    /*
     * Create one node for every finding
     * contributing to the selected attack path.
     */
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
              finding?.severity ??
              selectedPath.severity,

            isBreakPoint:
              ruleId ===
              selectedPath.break_chain.fix_rule,

            isImpact: false,
          },
        };
      }
    );

    /*
     * Terminal impact node.
     */
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

    /*
     * Connect each finding to the next finding.
     */
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
      selectedPath.contributing_findings[
        selectedPath.contributing_findings.length - 1
      ];

    if (lastFinding) {
      edges.push({
        id: `${selectedPath.chain_id}-impact-edge`,

        source: lastFinding,

        target: impactId,

        label: "leads to impact",

        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    }

    return {
      nodes,
      edges,
    };
  }, [report, selectedPath]);

  /*
   * Report is still loading.
   */
  if (!report) {
    return (
      <section className="attack-graph">
        <div className="graph-loading">
          Loading attack paths...
        </div>
      </section>
    );
  }

  /*
   * Report loaded but no attack paths exist.
   */
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

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="attack-graph-header">

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


        {/* =================================================
            GRAPH ACTIONS
            ================================================= */}

        <div className="attack-graph-actions">

          <button
            type="button"
            className={`graph-lock-button ${
              isLocked
                ? "locked"
                : "unlocked"
            }`}
            onClick={() =>
              setIsLocked((value) => !value)
            }
            title={
              isLocked
                ? "Unlock graph"
                : "Lock graph"
            }
            aria-label={
              isLocked
                ? "Unlock graph"
                : "Lock graph"
            }
          >

            {isLocked ? (
              <Lock size={14} />
            ) : (
              <Unlock size={14} />
            )}

            <span>
              {isLocked
                ? "LOCKED"
                : "UNLOCKED"}
            </span>

          </button>


          <div className="path-severity">
            {selectedPath.severity}
          </div>

        </div>

      </div>


      {/* =================================================
          ATTACK PATH SELECTOR
          ================================================= */}

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


      {/* =================================================
          GRAPH CANVAS
          ================================================= */}

      <div
        className={`graph-canvas ${
          isLocked
            ? "graph-is-locked"
            : "graph-is-unlocked"
        }`}
      >

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

          /*
           * ===============================================
           * NODE INTERACTION
           * ===============================================
           */

          nodesDraggable={!isLocked}

          nodesConnectable={!isLocked}

          elementsSelectable={!isLocked}

          nodesFocusable={!isLocked}

          edgesFocusable={!isLocked}


          /*
           * ===============================================
           * CANVAS MOVEMENT
           * ===============================================
           *
           * These are the important additions.
           *
           * When locked:
           *
           *   panOnDrag       = false
           *   panOnScroll     = false
           *   zoomOnScroll    = false
           *   zoomOnPinch     = false
           *   zoomOnDoubleClick = false
           *
           * Therefore the entire canvas is frozen.
           */

          panOnDrag={!isLocked}

          panOnScroll={!isLocked}

          zoomOnScroll={!isLocked}

          zoomOnPinch={!isLocked}

          zoomOnDoubleClick={!isLocked}


          /*
           * Prevent automatic movement while dragging.
           */
          autoPanOnNodeDrag={!isLocked}

          /*
           * Don't allow selection rectangle
           * when the graph is locked.
           */
          selectionOnDrag={!isLocked}

          /*
           * Disable keyboard deletion when locked.
           */
          deleteKeyCode={
            isLocked
              ? null
              : "Delete"
          }
        >

          <Background />

          {/*
           * Controls are deliberately hidden while
           * the graph is locked.
           *
           * This prevents the + / - buttons from
           * changing the zoom while locked.
           */}
          {!isLocked && (
            <Controls showInteractive={false} />
          )}

        </ReactFlow>

      </div>

    </section>
  );
}

export default AttackGraph;