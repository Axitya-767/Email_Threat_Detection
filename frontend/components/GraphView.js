'use client';

import { useState, useMemo } from "react";

function maskLabel(label, type, masked) {
  if (!masked || !label) return label;
  if (type === "email") {
    return label
      .replace(/([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, (_match, local, domain) => {
        const maskedLocal = local[0] ? `${local[0]}••••` : "••••";
        return `${maskedLocal}@${domain}`;
      })
      .replace(/\((.*?)\)/g, "(••••)");
  }
  if (type === "domain") {
    const parts = label.split(".");
    if (parts.length >= 2) {
      const main = parts[0];
      const tld = parts.slice(1).join(".");
      const maskedMain = main.length > 2 ? `${main[0]}••••${main[main.length - 1]}` : "••••";
      return `${maskedMain}.${tld}`;
    }
    return "••••.com";
  }
  return label;
}

// Deterministic campaign expansion for correlation analysis
function getExpandedGraph(data) {
  const baseNodes = data?.relationships?.nodes || [];
  const baseEdges = data?.relationships?.edges || [];
  const iocs = data?.iocs || {};

  const extraNodes = [];
  const extraEdges = [];

  const primaryIpNode = baseNodes.find((n) => n.type === "ip") || baseNodes[0];
  const primaryEmailNode = baseNodes.find((n) => n.type === "email") || baseNodes[0];

  if (primaryIpNode) {
    extraNodes.push({
      id: "asn_cluster",
      type: "ip",
      label: "ASN Bulletproof Hub (AS-20948)",
      cluster: 2,
      flagged: true,
    });
    extraEdges.push({
      from: primaryIpNode.id,
      to: "asn_cluster",
      reason: "Colocated CIDR subnet",
    });

    extraNodes.push({
      id: "c2_relay",
      type: "ip",
      label: "C2 Relay Hub (Port 443)",
      cluster: 2,
      flagged: true,
    });
    extraEdges.push({
      from: "asn_cluster",
      to: "c2_relay",
      reason: "Upstream proxy relay",
    });
  }

  if (iocs.typosquat_target) {
    extraNodes.push({
      id: "typosquat_node",
      type: "domain",
      label: iocs.typosquat_target,
      cluster: 2,
      flagged: true,
    });
    if (primaryIpNode) {
      extraEdges.push({
        from: "typosquat_node",
        to: primaryIpNode.id,
        reason: "Targeted brand impersonation",
      });
    }
  }

  if (iocs.artifacts && iocs.artifacts.length > 0) {
    const artifactLabel = iocs.artifacts[0];
    extraNodes.push({
      id: "artifact_node",
      type: "ioc",
      label: artifactLabel,
      cluster: 2,
      flagged: false,
    });
    if (primaryEmailNode) {
      extraEdges.push({
        from: primaryEmailNode.id,
        to: "artifact_node",
        reason: "Extracted forensic artifact",
      });
    }
  }

  extraNodes.push({
    id: "historical_spray",
    type: "email",
    label: "Correlated Spray Campaign (Case #982)",
    cluster: 2,
    flagged: true,
  });
  if (primaryIpNode) {
    extraEdges.push({
      from: "historical_spray",
      to: primaryIpNode.id,
      reason: "Prior campaign infrastructure",
    });
  }

  return {
    nodes: [
      ...baseNodes.map((n) => ({
        ...n,
        cluster: 1,
        // Primary case sender or flagged indicators get flagged status
        flagged: n.type === "email" || n.flagged === true || (data?.risk_score >= 60 && n.type === "ip"),
      })),
      ...extraNodes,
    ],
    edges: [...baseEdges, ...extraEdges],
  };
}

// Organic spring layout centered to the 960x460 canvas with increased spread
function computeLayout(nodes, edges, width = 960, height = 460, isExpanded = false) {
  if (!nodes || nodes.length === 0) return { positionedNodes: [], positionedEdges: [] };

  const degreeMap = {};
  nodes.forEach((n) => {
    degreeMap[n.id] = 0;
  });
  edges.forEach((e) => {
    if (degreeMap[e.from] !== undefined) degreeMap[e.from] += 1;
    if (degreeMap[e.to] !== undefined) degreeMap[e.to] += 1;
  });

  const nodeMap = {};
  const cx1 = isExpanded ? width * 0.30 : width * 0.5;
  const cx2 = width * 0.73;
  const cy = height * 0.5;

  nodes.forEach((n) => {
    const isCluster2 = isExpanded && n.cluster === 2;
    const center = isCluster2 ? { x: cx2, y: cy } : { x: cx1, y: cy };
    const clusterNodes = isCluster2
      ? nodes.filter((node) => node.cluster === 2)
      : isExpanded
      ? nodes.filter((node) => node.cluster === 1)
      : nodes;
    const clusterIndex = clusterNodes.findIndex((node) => node.id === n.id);
    const count = clusterNodes.length || 1;
    const angle = (clusterIndex / count) * 2 * Math.PI - Math.PI / 4;
    const radius = isCluster2 ? 140 : isExpanded ? 135 : 160;

    nodeMap[n.id] = {
      ...n,
      degree: degreeMap[n.id] || 0,
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  // Significantly increased repulsion strength and ideal distance so 9+ nodes spread widely
  const kRepulse = isExpanded ? 34000 : 30000;
  const kSpring = 0.035;
  const idealDist = isExpanded ? 180 : 195;

  for (let iter = 0; iter < 85; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodeMap[nodes[i].id];
        const n2 = nodeMap[nodes[j].id];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 180;
        const dist = Math.sqrt(distSq);
        const force = kRepulse / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        n1.vx -= fx;
        n1.vy -= fy;
        n2.vx += fx;
        n2.vy += fy;
      }
    }

    edges.forEach((e) => {
      const source = nodeMap[e.from];
      const target = nodeMap[e.to];
      if (!source || !target) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - idealDist;
      const force = displacement * kSpring;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    nodes.forEach((n) => {
      const node = nodeMap[n.id];
      const targetCenter = isExpanded && node.cluster === 2 ? { x: cx2, y: cy } : { x: cx1, y: cy };
      node.vx += (targetCenter.x - node.x) * 0.02;
      node.vy += (targetCenter.y - node.y) * 0.02;

      node.x += node.vx * 0.6;
      node.y += node.vy * 0.6;

      node.vx *= 0.65;
      node.vy *= 0.65;

      node.x = Math.max(70, Math.min(width - 70, node.x));
      node.y = Math.max(55, Math.min(height - 55, node.y));
    });
  }

  const positionedNodes = Object.values(nodeMap);
  const positionedEdges = edges
    .map((e) => {
      const source = nodeMap[e.from];
      const target = nodeMap[e.to];
      if (!source || !target) return null;
      return {
        ...e,
        source,
        target,
      };
    })
    .filter(Boolean);

  return { positionedNodes, positionedEdges };
}


export default function GraphView({ data, masked }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [expandCampaign, setExpandCampaign] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const activeGraphData = useMemo(() => {
    if (expandCampaign) {
      return getExpandedGraph(data);
    }
    const baseNodes = (data?.relationships?.nodes || []).map((n) => ({
      ...n,
      cluster: 1,
      flagged: n.type === "email" || n.flagged === true || (data?.risk_score >= 60 && n.type === "ip"),
    }));
    return {
      nodes: baseNodes,
      edges: data?.relationships?.edges || [],
    };
  }, [data, expandCampaign]);

  const { positionedNodes, positionedEdges } = useMemo(() => {
    return computeLayout(
      activeGraphData.nodes,
      activeGraphData.edges,
      960,
      460,
      expandCampaign
    );
  }, [activeGraphData, expandCampaign]);

  const activeFocusId = selectedNodeId || hoveredNodeId;

  const connectedNodeIds = useMemo(() => {
    if (!activeFocusId) return new Set();
    const set = new Set([activeFocusId]);
    positionedEdges.forEach((e) => {
      if (e.from === activeFocusId) set.add(e.to);
      if (e.to === activeFocusId) set.add(e.from);
    });
    return set;
  }, [activeFocusId, positionedEdges]);

  const selectedNode = useMemo(() => {
    return positionedNodes.find((n) => n.id === selectedNodeId) || null;
  }, [positionedNodes, selectedNodeId]);

  const hoveredNode = useMemo(() => {
    return positionedNodes.find((n) => n.id === hoveredNodeId) || null;
  }, [positionedNodes, hoveredNodeId]);

  const selectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return positionedEdges.filter(
      (e) => e.from === selectedNodeId || e.to === selectedNodeId
    );
  }, [positionedEdges, selectedNodeId]);

  const getNodeRadius = (degree = 1) => {
    return Math.min(26, Math.max(18, 17 + degree * 2.5));
  };

  return (
    <div className="relative flex flex-col justify-between h-full min-h-[520px] rounded-xl border border-edge bg-surface p-6 shadow-sm">
      {/* Top Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-edge/60 pb-3 shrink-0">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Attribution & correlation
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h2 className="text-lg font-semibold text-ink">Threat infrastructure map</h2>
            <span className="rounded-md border border-edge bg-canvas px-2 py-0.5 font-mono text-[11px] text-dim">
              {positionedNodes.length} entities · {positionedEdges.length} correlations
            </span>
          </div>
        </div>

        {/* View toggles & Zoom */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cluster Expansion Toggle */}
          <div className="inline-flex rounded-lg border border-edge bg-canvas p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setExpandCampaign(false);
                setSelectedNodeId(null);
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                !expandCampaign
                  ? "bg-surface text-accent shadow-xs"
                  : "text-dim hover:text-ink"
              }`}
            >
              Direct case
            </button>
            <button
              type="button"
              onClick={() => {
                setExpandCampaign(true);
                setSelectedNodeId(null);
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                expandCampaign
                  ? "bg-surface text-accent shadow-xs"
                  : "text-dim hover:text-ink"
              }`}
            >
              Campaign cluster
            </button>
          </div>

          {/* Zoom controls */}
          <div className="inline-flex items-center rounded-lg border border-edge bg-canvas px-1 py-0.5 text-xs text-dim">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
              className="px-1.5 py-0.5 hover:text-ink cursor-pointer"
              title="Zoom out"
            >
              −
            </button>
            <span className="px-1 font-mono text-[10px] text-ink">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, +(z + 0.15).toFixed(2)))}
              className="px-1.5 py-0.5 hover:text-ink cursor-pointer"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1);
                setSelectedNodeId(null);
              }}
              className="ml-1 border-l border-edge pl-1 text-[10px] text-dim hover:text-accent cursor-pointer"
              title="Reset view"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Legend Strip: Red Ring encodes Flagged Infrastructure */}
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-dim pb-2 border-b border-edge/40 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold text-dim uppercase tracking-wider">
            Ring status:
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-risk-red bg-transparent" />
            <span className="text-risk-red font-medium">Flagged infrastructure</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-slate-600 bg-transparent" />
            <span>Standard entity</span>
          </span>
        </div>
        <span className="text-[11px] text-dim hidden sm:inline">
          Icons denote entity type (IP router, email, domain globe)
        </span>
      </div>

      {/* SVG Graph Viewport */}
      <div className="relative flex-1 min-h-[420px] w-full overflow-hidden rounded-lg border border-edge bg-canvas shrink-0">
        <svg
          viewBox="0 0 960 460"
          className="h-full w-full select-none"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease-out",
          }}
        >
          <defs>
            <marker
              id="graph-arrow"
              viewBox="0 0 10 10"
              refX="19"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
            </marker>
            <marker
              id="graph-arrow-active"
              viewBox="0 0 10 10"
              refX="19"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#14b8a6" />
            </marker>
            <pattern id="graph-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.75" fill="#3d444e" opacity="0.35" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#graph-grid)" />

          {/* Cluster separation guide */}
          {expandCampaign && (
            <g opacity="0.45">
              <line
                x1="480"
                y1="20"
                x2="480"
                y2="440"
                stroke="#3d444e"
                strokeDasharray="4 4"
              />
              <text
                x="465"
                y="30"
                fill="#8f96a1"
                fontSize="9"
                textAnchor="end"
                fontFamily="monospace"
              >
                CURRENT CASE
              </text>
              <text
                x="495"
                y="30"
                fill="#8f96a1"
                fontSize="9"
                textAnchor="start"
                fontFamily="monospace"
              >
                CORRELATED CAMPAIGN
              </text>
            </g>
          )}

          {/* Edges */}
          <g className="edges">
            {positionedEdges.map((edge, idx) => {
              const isSourceFocused = edge.from === activeFocusId;
              const isTargetFocused = edge.to === activeFocusId;
              const isEdgeActive = isSourceFocused || isTargetFocused;
              const isDimmed = activeFocusId && !isEdgeActive;

              // Offset label position along edge path to avoid clustering and label collisions
              const t = 0.40 + ((idx % 3) * 0.10);
              const midX = edge.source.x + (edge.target.x - edge.source.x) * t;
              const midY = edge.source.y + (edge.target.y - edge.source.y) * t;
              const displayReason = edge.reason.length > 22 ? `${edge.reason.slice(0, 20)}…` : edge.reason;

              return (
                <g key={`${edge.from}-${edge.to}-${idx}`}>
                  <line
                    x1={edge.source.x}
                    y1={edge.source.y}
                    x2={edge.target.x}
                    y2={edge.target.y}
                    stroke={isEdgeActive ? "#14b8a6" : "#475569"}
                    strokeWidth={isEdgeActive ? 2.5 : 1.2}
                    strokeDasharray={edge.reason?.toLowerCase().includes("colocated") ? "4 3" : undefined}
                    opacity={isDimmed ? 0.2 : 1}
                    markerEnd={isEdgeActive ? "url(#graph-arrow-active)" : "url(#graph-arrow)"}
                    className="transition-all duration-200"
                  />

                  {/* Edge label pill on hover or selection */}
                  {isEdgeActive && (
                    <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                      <rect
                        x={-Math.min(Math.max(displayReason.length * 3.8 + 10, 50), 85)}
                        y="-10"
                        width={Math.min(Math.max(displayReason.length * 7.6 + 20, 100), 170)}
                        height="20"
                        rx="4"
                        fill="#1b1e24"
                        stroke="#14b8a6"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#e8eaed"
                        fontSize="9"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontFamily="monospace"
                      >
                        {displayReason}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes: Neutral Slate Fill, Shape by Type, Color strictly for Flagged Ring */}
          <g className="nodes">
            {positionedNodes.map((node) => {
              const radius = getNodeRadius(node.degree);
              const isSelected = node.id === selectedNodeId;
              const isHovered = node.id === hoveredNodeId;
              const isConnected = connectedNodeIds.has(node.id);
              const isDimmed = activeFocusId && !isConnected;
              const displayLabel = maskLabel(node.label, node.type, masked);
              const isFlagged = Boolean(node.flagged);

              // Status Ring Color: RED strictly for flagged infrastructure; neutral slate for standard
              const ringStroke = isFlagged ? "#dc2626" : "#475569";
              const ringWidth = isSelected ? 3 : isFlagged ? 2.2 : 1.5;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-transform duration-150"
                  opacity={isDimmed ? 0.25 : 1}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => {
                    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
                  }}
                >
                  {/* Selection / Focus Pulse Ring */}
                  {(isSelected || isHovered) && (
                    <circle
                      r={radius + 8}
                      fill="none"
                      stroke={isFlagged ? "#dc2626" : "#14b8a6"}
                      strokeWidth="1.5"
                      opacity="0.4"
                      className="animate-pulse"
                    />
                  )}

                  {/* Uniform Circle Node */}
                  <circle
                    r={radius}
                    fill="#262b33"
                    stroke={ringStroke}
                    strokeWidth={ringWidth}
                    className="transition-colors duration-150"
                  />

                  {/* Clean SVG Type Icons inside Node */}
                  {node.type === "domain" && (
                    <g className="pointer-events-none select-none" stroke={isFlagged ? "#fca5a5" : "#94a3b8"} fill="none" strokeWidth="1.5">
                      <circle cx="0" cy="0" r="6.5" />
                      <line x1="-6.5" y1="0" x2="6.5" y2="0" />
                      <ellipse cx="0" cy="0" rx="3.2" ry="6.5" />
                    </g>
                  )}

                  {node.type === "email" && (
                    <g className="pointer-events-none select-none" stroke={isFlagged ? "#fca5a5" : "#94a3b8"} fill="none" strokeWidth="1.5" transform="translate(-6.5, -4.5)">
                      <rect x="0" y="0" width="13" height="9" rx="1" />
                      <polyline points="0 0 6.5 5 13 0" />
                    </g>
                  )}

                  {node.type === "ip" && (
                    <g className="pointer-events-none select-none" stroke={isFlagged ? "#fca5a5" : "#94a3b8"} fill="none" strokeWidth="1.5">
                      <rect x="-6.5" y="-4" width="13" height="8" rx="1.5" />
                      <circle cx="-3" cy="0" r="0.75" fill="currentColor" />
                      <circle cx="0" cy="0" r="0.75" fill="currentColor" />
                      <circle cx="3" cy="0" r="0.75" fill="currentColor" />
                    </g>
                  )}

                  {node.type !== "ip" && node.type !== "email" && node.type !== "domain" && (
                    <g className="pointer-events-none select-none" stroke={isFlagged ? "#fca5a5" : "#94a3b8"} fill="none" strokeWidth="1.5">
                      <circle cx="-2" cy="-2" r="3" />
                      <path d="M0 0 L5 5 L3.5 6.5 M3.5 3.5 L5 5" />
                    </g>
                  )}

                  {/* Overview Node Label (Truncated pill) */}
                  <g transform={`translate(0, ${radius + 15})`} className="pointer-events-none select-none">
                    <rect
                      x={-Math.min(displayLabel.length * 3.8 + 8, 85)}
                      y="-8"
                      width={Math.min(displayLabel.length * 7.6 + 16, 170)}
                      height="16"
                      rx="3"
                      fill="#1b1e24"
                      fillOpacity="0.9"
                      stroke={isSelected ? "#14b8a6" : isFlagged ? "#dc2626" : "#3d444e"}
                      strokeWidth="0.75"
                    />
                    <text
                      textAnchor="middle"
                      fill="#e8eaed"
                      fontSize="9.5"
                      fontFamily="monospace"
                      dominantBaseline="central"
                    >
                      {displayLabel.length > 20 ? `${displayLabel.slice(0, 18)}…` : displayLabel}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover-only Forensic Tooltip (strictly when hovering and NOT selected) */}
        {hoveredNode && !selectedNode && (
          <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-xs rounded-lg border border-edge bg-surface/95 px-3 py-2 shadow-xl backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent font-semibold">
                {hoveredNode.type}
              </span>
              {hoveredNode.flagged && (
                <span className="rounded bg-risk-red/20 px-1.5 py-0.5 text-[9px] font-semibold text-risk-red uppercase">
                  Flagged Infrastructure
                </span>
              )}
            </div>
            {/* Full un-truncated identifier */}
            <p className="mt-1 font-mono text-xs font-semibold text-ink break-all">
              {maskLabel(hoveredNode.label, hoveredNode.type, masked)}
            </p>
            <p className="mt-0.5 text-[10px] text-dim">
              {hoveredNode.degree} correlation{hoveredNode.degree === 1 ? "" : "s"} · Click to view forensic details
            </p>
          </div>
        )}
      </div>

      {/* 
        Selected Node Details Drawer — Renders INLINE BELOW the canvas within the same Correlation card,
        pushing the page content down naturally. Never floats or overlays. Exactly one drawer.
      */}
      {selectedNode && (
        <div className="mt-3 rounded-lg border border-edge bg-canvas/90 p-3.5 animate-in fade-in duration-150 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge/60 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-edge bg-surface px-2 py-0.5 font-mono text-[10px] uppercase text-accent font-semibold">
                {selectedNode.type}
              </span>
              <span className="font-mono text-xs font-bold text-ink break-all">
                {maskLabel(selectedNode.label, selectedNode.type, masked)}
              </span>
              {selectedNode.flagged && (
                <span className="rounded border border-risk-red/40 bg-risk-red/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-risk-red uppercase">
                  Flagged
                </span>
              )}
              <span className="text-xs text-dim">
                · {selectedNode.degree} active correlation{selectedNode.degree === 1 ? "" : "s"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className="text-xs text-dim hover:text-ink cursor-pointer hover:underline"
            >
              ✕ Close drawer
            </button>
          </div>

          {selectedEdges.length > 0 && (
            <div className="mt-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-dim block mb-1.5">
                Active Forensic Correlations:
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedEdges.map((e, idx) => {
                  const otherId = e.from === selectedNode.id ? e.to : e.from;
                  const otherNode = positionedNodes.find((n) => n.id === otherId);
                  const otherLabel = otherNode ? maskLabel(otherNode.label, otherNode.type, masked) : otherId;

                  return (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-surface px-2.5 py-1 font-mono text-xs"
                    >
                      <span className="text-accent font-medium">{e.reason}</span>
                      <span className="text-edge">➔</span>
                      <span className="text-ink font-semibold">{otherLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info Strip */}
      <div className="mt-3 flex items-center justify-between pt-2 text-xs text-dim border-t border-edge/40 shrink-0">
        <span>
          {masked ? "PII masked in graph labels" : "Full entity identifiers displayed"}
        </span>
        <span className="text-[11px] text-dim">
          Click any node to expand forensic details below
        </span>
      </div>
    </div>
  );
}
