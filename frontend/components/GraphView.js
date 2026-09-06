'use client';

import { useState, useMemo } from "react";

function maskLabel(label, type, masked) {
  if (!masked || !label) return label;
  if (type === "email") {
    return label
      .replace(/([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, (match, local, domain) => {
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

// Deterministic campaign expansion for presentation pitch round
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
      label: "ASN Bulletproof Hub",
      cluster: 2,
    });
    extraEdges.push({
      from: primaryIpNode.id,
      to: "asn_cluster",
      reason: "colocated CIDR subnet",
    });

    extraNodes.push({
      id: "c2_relay",
      type: "ip",
      label: "Relay (Port 443)",
      cluster: 2,
    });
    extraEdges.push({
      from: "asn_cluster",
      to: "c2_relay",
      reason: "upstream proxy",
    });
  }

  if (iocs.typosquat_target) {
    extraNodes.push({
      id: "typosquat_node",
      type: "domain",
      label: iocs.typosquat_target,
      cluster: 2,
    });
    if (primaryIpNode) {
      extraEdges.push({
        from: "typosquat_node",
        to: primaryIpNode.id,
        reason: "targeted brand impersonation",
      });
    }
  }

  if (iocs.artifacts && iocs.artifacts.length > 0) {
    const artifactLabel = iocs.artifacts[0];
    extraNodes.push({
      id: "artifact_node",
      type: "ioc",
      label: artifactLabel.length > 20 ? `${artifactLabel.slice(0, 18)}…` : artifactLabel,
      cluster: 2,
    });
    if (primaryEmailNode) {
      extraEdges.push({
        from: primaryEmailNode.id,
        to: "artifact_node",
        reason: "extracted forensic artifact",
      });
    }
  }

  extraNodes.push({
    id: "historical_spray",
    type: "email",
    label: "Case #982 (Correlated)",
    cluster: 2,
  });
  if (primaryIpNode) {
    extraEdges.push({
      from: "historical_spray",
      to: primaryIpNode.id,
      reason: "prior campaign attribution",
    });
  }

  return {
    nodes: [...baseNodes.map((n) => ({ ...n, cluster: 1 })), ...extraNodes],
    edges: [...baseEdges, ...extraEdges],
  };
}

// Organic spring layout computed deterministically with optimal repulsion
function computeLayout(nodes, edges, width = 720, height = 310, isExpanded = false) {
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
  const cx1 = isExpanded ? width * 0.27 : width * 0.5;
  const cx2 = width * 0.73;
  const cy = height * 0.5;

  nodes.forEach((n, idx) => {
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
    const radius = isCluster2 ? 80 : isExpanded ? 85 : 95;

    nodeMap[n.id] = {
      ...n,
      degree: degreeMap[n.id] || 0,
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  const kRepulse = isExpanded ? 7500 : 9000;
  const kSpring = 0.045;
  const idealDist = isExpanded ? 125 : 145;

  for (let iter = 0; iter < 55; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodeMap[nodes[i].id];
        const n2 = nodeMap[nodes[j].id];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 150;
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
      node.vx += (targetCenter.x - node.x) * 0.025;
      node.vy += (targetCenter.y - node.y) * 0.025;

      node.x += node.vx * 0.6;
      node.y += node.vy * 0.6;

      node.vx *= 0.65;
      node.vy *= 0.65;

      node.x = Math.max(55, Math.min(width - 55, node.x));
      node.y = Math.max(45, Math.min(height - 45, node.y));
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
    return {
      nodes: data?.relationships?.nodes || [],
      edges: data?.relationships?.edges || [],
    };
  }, [data, expandCampaign]);

  const { positionedNodes, positionedEdges } = useMemo(() => {
    return computeLayout(
      activeGraphData.nodes,
      activeGraphData.edges,
      720,
      310,
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

  const selectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return positionedEdges.filter(
      (e) => e.from === selectedNodeId || e.to === selectedNodeId
    );
  }, [positionedEdges, selectedNodeId]);

  const getNodeColor = (type) => {
    switch (type) {
      case "ip":
        return { stroke: "#6ea3d8", bg: "#1b1e24", text: "text-accent" };
      case "email":
        return { stroke: "#dc2626", bg: "#1b1e24", text: "text-risk-red" };
      case "domain":
        return { stroke: "#d97706", bg: "#1b1e24", text: "text-risk-amber" };
      case "ioc":
        return { stroke: "#16a34a", bg: "#1b1e24", text: "text-risk-green" };
      default:
        return { stroke: "#8f96a1", bg: "#1b1e24", text: "text-dim" };
    }
  };

  const getNodeRadius = (degree = 1) => {
    return Math.min(25, Math.max(16, 15 + degree * 3));
  };

  return (
    <div className="flex min-h-[360px] flex-col rounded-lg border border-edge bg-surface p-4">
      {/* Top Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-dim">Attribution & Correlation</p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-sm font-medium text-ink">Threat Infrastructure Map</h2>
            <span className="rounded-full border border-edge bg-canvas px-2 py-0.5 text-xs text-dim">
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
              className={`rounded-md px-2.5 py-1 transition-colors ${
                !expandCampaign
                  ? "bg-surface text-accent font-medium shadow-sm"
                  : "text-dim hover:text-ink"
              }`}
            >
              Direct Case
            </button>
            <button
              type="button"
              onClick={() => {
                setExpandCampaign(true);
                setSelectedNodeId(null);
              }}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                expandCampaign
                  ? "bg-surface text-accent font-medium shadow-sm"
                  : "text-dim hover:text-ink"
              }`}
            >
              Campaign Cluster
            </button>
          </div>

          {/* Zoom controls */}
          <div className="inline-flex items-center rounded-lg border border-edge bg-canvas px-1 py-0.5 text-xs text-dim">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
              className="px-1.5 py-0.5 hover:text-ink"
              title="Zoom Out"
            >
              −
            </button>
            <span className="px-1 font-mono text-[10px] text-ink">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, +(z + 0.15).toFixed(2)))}
              className="px-1.5 py-0.5 hover:text-ink"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1);
                setSelectedNodeId(null);
              }}
              className="ml-1 border-l border-edge pl-1 text-[10px] hover:text-accent"
              title="Reset View"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Legend strip */}
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-accent bg-[#1b1e24]" />
          IP Address
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-risk-red bg-[#1b1e24]" />
          Email / Case
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-risk-amber bg-[#1b1e24]" />
          Domain
        </span>
        {expandCampaign && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-risk-green bg-[#1b1e24]" />
            IOC / Artifact
          </span>
        )}
        <span className="ml-auto text-[11px] text-dim">
          Click node to isolate connections
        </span>
      </div>

      {/* SVG Graph Viewport */}
      <div className="relative flex-1 overflow-hidden rounded-lg border border-edge bg-canvas">
        <svg
          viewBox="0 0 720 310"
          className="h-[285px] w-full select-none"
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3d444e" />
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#6ea3d8" />
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
                x1="375"
                y1="20"
                x2="375"
                y2="285"
                stroke="#3d444e"
                strokeDasharray="4 4"
              />
              <text
                x="362"
                y="32"
                fill="#8f96a1"
                fontSize="9"
                textAnchor="end"
                fontFamily="monospace"
              >
                CURRENT CASE
              </text>
              <text
                x="388"
                y="32"
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

              const midX = (edge.source.x + edge.target.x) / 2;
              const midY = (edge.source.y + edge.target.y) / 2;

              return (
                <g key={`${edge.from}-${edge.to}-${idx}`}>
                  <line
                    x1={edge.source.x}
                    y1={edge.source.y}
                    x2={edge.target.x}
                    y2={edge.target.y}
                    stroke={isEdgeActive ? "#6ea3d8" : "#3d444e"}
                    strokeWidth={isEdgeActive ? 2 : 1.2}
                    strokeDasharray={edge.reason?.includes("colocated") ? "4 3" : undefined}
                    opacity={isDimmed ? 0.2 : 1}
                    markerEnd={isEdgeActive ? "url(#graph-arrow-active)" : "url(#graph-arrow)"}
                    className="transition-all duration-200"
                  />

                  {/* Edge label pill on hover or selection */}
                  {isEdgeActive && (
                    <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                      <rect
                        x={-Math.min(Math.max(edge.reason.length * 3.5 + 8, 46), 75)}
                        y="-9"
                        width={Math.min(Math.max(edge.reason.length * 7 + 16, 92), 150)}
                        height="18"
                        rx="4"
                        fill="#1b1e24"
                        stroke="#3d444e"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="2.5"
                        fill="#e8eaed"
                        fontSize="8.5"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontFamily="monospace"
                      >
                        {edge.reason.length > 22 ? `${edge.reason.slice(0, 20)}…` : edge.reason}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {positionedNodes.map((node) => {
              const colors = getNodeColor(node.type);
              const radius = getNodeRadius(node.degree);
              const isSelected = node.id === selectedNodeId;
              const isHovered = node.id === hoveredNodeId;
              const isConnected = connectedNodeIds.has(node.id);
              const isDimmed = activeFocusId && !isConnected;
              const displayLabel = maskLabel(node.label, node.type, masked);

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
                  {(isSelected || isHovered) && (
                    <circle
                      r={radius + 7}
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth="1.5"
                      opacity="0.5"
                      className="animate-pulse"
                    />
                  )}

                  <circle
                    r={radius}
                    fill={colors.bg}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    className="transition-colors duration-150"
                  />

                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={colors.stroke}
                    fontSize={radius * 0.72}
                    fontWeight="600"
                    fontFamily="monospace"
                    className="select-none pointer-events-none"
                  >
                    {node.type === "ip" ? "IP" : node.type === "email" ? "✉" : node.type === "domain" ? "🌐" : "◈"}
                  </text>

                  {node.degree > 1 && (
                    <g transform={`translate(${radius * 0.7}, ${-radius * 0.7})`}>
                      <circle r="6.5" fill="#262b33" stroke="#3d444e" strokeWidth="1" />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#8f96a1"
                        fontSize="7.5"
                        fontFamily="monospace"
                      >
                        {node.degree}
                      </text>
                    </g>
                  )}

                  <g transform={`translate(0, ${radius + 14})`} className="pointer-events-none select-none">
                    <rect
                      x={-Math.min(displayLabel.length * 3.6 + 6, 75)}
                      y="-7"
                      width={Math.min(displayLabel.length * 7.2 + 12, 150)}
                      height="15"
                      rx="3"
                      fill="#1b1e24"
                      fillOpacity="0.88"
                      stroke="#3d444e"
                      strokeWidth="0.5"
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

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="border-t border-edge bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-edge bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase text-accent">
                  {selectedNode.type}
                </span>
                <span className="font-mono text-xs font-semibold text-ink">
                  {maskLabel(selectedNode.label, selectedNode.type, masked)}
                </span>
                <span className="text-xs text-dim">
                  · {selectedNode.degree} connection{selectedNode.degree === 1 ? "" : "s"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="text-xs text-dim hover:text-ink"
              >
                ✕ Close
              </button>
            </div>

            {selectedEdges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedEdges.map((e, idx) => {
                  const otherId = e.from === selectedNode.id ? e.to : e.from;
                  const otherNode = positionedNodes.find((n) => n.id === otherId);
                  const otherLabel = otherNode ? maskLabel(otherNode.label, otherNode.type, masked) : otherId;

                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-canvas px-2 py-1 font-mono text-[11px] text-dim"
                    >
                      <span className="text-accent">{e.reason}</span>
                      <span className="text-edge">➔</span>
                      <span className="text-ink">{otherLabel}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer info strip */}
      <div className="mt-auto flex items-center justify-between pt-3 text-xs text-dim">
        <span>
          {masked ? "PII masked in graph labels" : "Full entity identifiers displayed"}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-dim">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Cross-incident infrastructure correlation
        </span>
      </div>
    </div>
  );
}
