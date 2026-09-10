"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";

const RISK = {
  red: "#dc2626",
  amber: "#d97706",
  green: "#16a34a",
  neutral: "#475569",
};

function isFlaggedNote(note) {
  return typeof note === "string" && /flagged/i.test(note);
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTimeDeltaSeconds(t1Str, t2Str) {
  if (!t1Str || !t2Str) return null;
  const t1 = new Date(t1Str).getTime();
  const t2 = new Date(t2Str).getTime();
  if (isNaN(t1) || isNaN(t2)) return null;
  return Math.abs((t2 - t1) / 1000);
}

function getCityName(place, hopOrder) {
  if (!place) return `Hop ${hopOrder}`;
  const parts = place.split(",");
  return parts[0]?.trim() || place;
}

function getHopPairAnomalies(hops) {
  const anomalies = [];
  for (let i = 0; i < hops.length - 1; i++) {
    const from = hops[i];
    const to = hops[i + 1];
    const distKm = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
    const deltaSec = getTimeDeltaSeconds(from.relayed_at, to.relayed_at);

    if (distKm > 3000 && deltaSec !== null && deltaSec < 5) {
      anomalies.push({
        pairKey: `${from.hop_order}-${to.hop_order}`,
        fromHopOrder: from.hop_order,
        toHopOrder: to.hop_order,
        fromCity: getCityName(from.place, from.hop_order),
        toCity: getCityName(to.place, to.hop_order),
        deltaSec,
        distKm: Math.round(distKm),
      });
    }
  }
  return anomalies;
}

// Markers distinguished by sequence order (numbers) and neutral slate base;
// destination uses green, anomalies use amber
function hopColor(hop, isLast) {
  if (isLast) return RISK.green;
  if (isFlaggedNote(hop?.note)) return RISK.amber;
  return RISK.neutral;
}

function createHopIcon(L, hop, isLast, isSelected) {
  const color = hopColor(hop, isLast);
  const ring = isSelected
    ? "box-shadow: 0 0 0 3px #38bdf8, 0 2px 8px rgba(0,0,0,0.8); transform: scale(1.15);"
    : "box-shadow: 0 2px 6px rgba(0,0,0,0.6);";
  return L.divIcon({
    className: "hop-marker-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
    tooltipAnchor: [0, -14],
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};color:#ffffff;border:2px solid #e8eaed;font-size:12px;font-weight:700;font-family:monospace;line-height:1;transition:all 0.15s ease;${ring}">${hop.hop_order}</div>`,
  });
}

function FitTraceBounds({ hops, useMap, L }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !hops || hops.length === 0) return;
    const positions = hops.map((hop) => [Number(hop.lat), Number(hop.lng)]);

    const apply = () => {
      try {
        map.invalidateSize();
        if (positions.length > 1) {
          const latLngBounds = L ? L.latLngBounds(positions) : positions;
          map.fitBounds(latLngBounds, { padding: [50, 50], maxZoom: 5 });
        } else if (positions.length === 1) {
          map.setView(positions[0], 5);
        }
      } catch (err) {
        console.warn("Leaflet fitBounds error:", err);
      }
    };

    apply();
    const t1 = setTimeout(apply, 60);
    const t2 = setTimeout(apply, 200);
    const t3 = setTimeout(apply, 500);

    let ro;
    const container = map.getContainer();
    if (typeof ResizeObserver !== "undefined" && container) {
      ro = new ResizeObserver(() => {
        apply();
      });
      ro.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (ro) ro.disconnect();
    };
  }, [map, hops, L]);

  return null;
}

// Invalidate size on mount and whenever selectedHop changes
function MapInvalidator({ selectedHop, useMap }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const invalidate = () => {
      try {
        map.invalidateSize();
      } catch (err) {
        // ignore if unmounted
      }
    };

    invalidate();
    const t1 = setTimeout(invalidate, 60);
    const t2 = setTimeout(invalidate, 180);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, selectedHop]);

  return null;
}

function RoutingMap({ hops, rl, L, selectedHop, onSelectHop, pairAnomalies }) {
  const { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } = rl;
  const scenarioKey = hops.map((hop) => `${hop.hop_order}:${hop.ip}`).join("|");

  const anomalousPairKeys = useMemo(
    () => new Set(pairAnomalies.map((a) => a.pairKey)),
    [pairAnomalies]
  );

  const initialCenter = hops.length > 0 ? [Number(hops[0].lat), Number(hops[0].lng)] : [30, 40];

  return (
    <MapContainer
      key={scenarioKey}
      center={initialCenter}
      zoom={3}
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: "100%", minHeight: "420px", width: "100%", background: "#1b1e24", position: "relative" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
        subdomains={['a', 'b', 'c']}
      />
      <FitTraceBounds hops={hops} useMap={useMap} L={L} />
      <MapInvalidator selectedHop={selectedHop} useMap={useMap} />

      {hops.slice(0, -1).map((from, index) => {
        const to = hops[index + 1];
        const pairKey = `${from.hop_order}-${to.hop_order}`;
        const isTimingAnomaly = anomalousPairKeys.has(pairKey);
        const flagged = isFlaggedNote(from.note) || isFlaggedNote(to.note);

        // Color system: Timing anomaly uses amber (not red)
        const lineColor = isTimingAnomaly || flagged ? RISK.amber : "#64748b";

        return (
          <Polyline
            key={pairKey}
            positions={[
              [Number(from.lat), Number(from.lng)],
              [Number(to.lat), Number(to.lng)],
            ]}
            pathOptions={{
              color: lineColor,
              weight: isTimingAnomaly ? 4.5 : 3,
              opacity: 0.95,
              dashArray: isTimingAnomaly ? "6 5" : undefined,
              className: isTimingAnomaly ? "anomalous-polyline-pulse" : undefined,
            }}
          />
        );
      })}

      {hops.map((hop, index) => {
        const hopAnomalies = pairAnomalies.filter(
          (a) => a.toHopOrder === hop.hop_order || a.fromHopOrder === hop.hop_order
        );
        const isLast = index === hops.length - 1;
        const isSelected = selectedHop?.hop_order === hop.hop_order;

        return (
          <Marker
            key={`${hop.hop_order}-${hop.ip}`}
            position={[Number(hop.lat), Number(hop.lng)]}
            icon={createHopIcon(L, hop, isLast, isSelected)}
            eventHandlers={{
              click: () => {
                onSelectHop((prev) => (prev?.hop_order === hop.hop_order ? null : hop));
              },
            }}
          >
            {/* Lightweight Hover-only Tooltip */}
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
              className="hop-leaflet-tooltip"
            >
              <div className="flex items-center gap-1.5 font-sans text-xs">
                <span className="font-semibold text-slate-100">
                  Hop {hop.hop_order}: <span className="font-mono text-slate-200">{hop.ip}</span> • {hop.place}
                </span>
                {hopAnomalies.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.2 font-semibold text-[10px] text-amber-400">
                    ⚠️ Anomaly Detected
                  </span>
                )}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default function MapView({ data, masked }) {
  void masked;

  const [selectedHop, setSelectedHop] = useState(null);

  const trace = useMemo(() => {
    if (Array.isArray(data?.trace)) return data.trace;
    return [];
  }, [data]);

  const hops = useMemo(() => {
    if (!Array.isArray(data?.trace)) return [];
    return [...data.trace]
      .filter(
        (hop) =>
          hop &&
          Number.isFinite(Number(hop.lat)) &&
          Number.isFinite(Number(hop.lng)),
      )
      .sort((a, b) => a.hop_order - b.hop_order);
  }, [data]);

  // Reset selected hop if active case changes
  useEffect(() => {
    setSelectedHop(null);
  }, [data]);

  const pairAnomalies = useMemo(() => getHopPairAnomalies(hops), [hops]);

  // Comprehensive anomaly count for header: flagged notes, timing_anomaly flags, or pair anomalies
  const anomalyCount = useMemo(() => {
    if (!Array.isArray(hops) || hops.length === 0) return 0;
    const flaggedHops = hops.filter(
      (h) =>
        (typeof h?.note === "string" && h.note.toLowerCase().includes("flagged")) ||
        Boolean(h?.timing_anomaly)
    );
    const anomalousHops = hops.filter(
      (h) =>
        (typeof h?.note === "string" && h.note.toLowerCase().includes("flagged")) ||
        Boolean(h?.timing_anomaly) ||
        pairAnomalies.some((a) => a.toHopOrder === h.hop_order || a.fromHopOrder === h.hop_order)
    );
    return Math.max(flaggedHops.length, anomalousHops.length, pairAnomalies.length);
  }, [hops, pairAnomalies]);

  const selectedHopAnomalies = useMemo(() => {
    if (!selectedHop) return [];
    return pairAnomalies.filter(
      (a) => a.toHopOrder === selectedHop.hop_order || a.fromHopOrder === selectedHop.hop_order
    );
  }, [selectedHop, pairAnomalies]);

  const selectedHopHasAnomaly = selectedHopAnomalies.length > 0;

  const [mapLib, setMapLib] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([import("react-leaflet"), import("leaflet")]).then(
      ([{ MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap }, L]) => {
        if (cancelled) return;
        setMapLib({ rl: { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap }, L });
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative isolate z-0 flex flex-col justify-between h-full min-h-[520px] rounded-xl border border-edge bg-surface p-6 shadow-sm">
      <style>{`
        .hop-marker-icon {
          background: none;
          border: none;
        }
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          min-height: 420px !important;
          font-family: inherit;
          position: relative !important;
          z-index: 0 !important;
        }
        .leaflet-tooltip.hop-leaflet-tooltip {
          background-color: #1e2229 !important;
          border: 1px solid #334155 !important;
          color: #f1f5f9 !important;
          border-radius: 6px !important;
          padding: 5px 9px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6) !important;
          font-family: inherit !important;
          white-space: nowrap !important;
        }
        .leaflet-tooltip-top.hop-leaflet-tooltip::before {
          border-top-color: #334155 !important;
        }
        .leaflet-tooltip-bottom.hop-leaflet-tooltip::before {
          border-bottom-color: #334155 !important;
        }
        @keyframes timingAnomalyPulse {
          0%, 100% {
            stroke-opacity: 0.95;
            stroke-width: 4.5px;
          }
          50% {
            stroke-opacity: 0.4;
            stroke-width: 6.5px;
          }
        }
        .anomalous-polyline-pulse {
          animation: timingAnomalyPulse 1.5s ease-in-out infinite;
        }
      `}</style>
      
      {/* Top Header (Matching GraphView hierarchy) */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-edge/60 pb-3 shrink-0">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            NETWORK TELEMETRY
          </span>
          <div className="flex items-center gap-3 mt-0.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Routing map</h2>
            <span className="rounded-md border border-slate-700/60 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-400 font-mono">
              {`${trace.length} hops • ${anomalyCount} ${anomalyCount === 1 ? "anomaly" : "anomalies"}`}
            </span>
          </div>
        </div>
      </div>

      {/* Dedicated Sub-Header Legend Bar (Matching GraphView's RING STATUS row) */}
      <div className="mb-2 flex items-center gap-5 text-xs text-slate-400 pb-2 border-b border-edge/40 shrink-0">
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          HOP STATUS:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 font-medium">Timing anomaly</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span>Relay route</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span>Destination</span>
        </span>
      </div>

      {/* Map Viewport Canvas with Explicit Minimum Height & Flex-1 */}
      {hops.length === 0 ? (
        <div className="flex flex-1 min-h-[420px] w-full items-center justify-center rounded-lg border border-edge bg-canvas text-sm text-dim">
          No route data available for this case.
        </div>
      ) : (
        <div className="relative z-0 flex-1 min-h-[420px] w-full overflow-hidden rounded-lg border border-edge bg-canvas/60 shrink-0">
          {mapLib ? (
            <RoutingMap
              hops={hops}
              rl={mapLib.rl}
              L={mapLib.L}
              selectedHop={selectedHop}
              onSelectHop={setSelectedHop}
              pairAnomalies={pairAnomalies}
            />
          ) : (
            <div className="flex h-full min-h-[420px] w-full items-center justify-center text-xs text-dim">
              Loading Leaflet geospatial engine…
            </div>
          )}
        </div>
      )}

      {/* 
        Selected Hop Details Drawer — Renders INLINE BELOW the map canvas within the same card container,
        pushing the page content down naturally. Never floats or overlays. Exactly one drawer.
      */}
      {selectedHop && (
        <div className="mt-3 rounded-lg border border-edge bg-canvas/90 p-3.5 animate-in fade-in duration-150 shrink-0">
          {/* Top header row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge/60 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-edge bg-surface px-2 py-0.5 font-mono text-[10px] uppercase text-accent font-semibold">
                HOP {selectedHop.hop_order}
              </span>
              <span className="font-mono text-xs font-bold text-ink">
                {selectedHop.ip}
              </span>
              <span className="text-xs text-dim">
                · {selectedHop.place}
              </span>

              {/* Status badge */}
              {selectedHopHasAnomaly ? (
                <span className="rounded border border-risk-amber/40 bg-risk-amber/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-risk-amber uppercase">
                  FLAGGED ANOMALY
                </span>
              ) : isFlaggedNote(selectedHop.note) ? (
                <span className="rounded border border-risk-amber/40 bg-risk-amber/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-risk-amber uppercase">
                  FLAGGED RELAY
                </span>
              ) : selectedHop.hop_order === hops.length ? (
                <span className="rounded border border-risk-green/40 bg-risk-green/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-risk-green uppercase">
                  DESTINATION NODE
                </span>
              ) : selectedHop.hop_order === 1 ? (
                <span className="rounded border border-edge bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-dim uppercase">
                  ORIGIN NODE
                </span>
              ) : (
                <span className="rounded border border-edge bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-dim uppercase">
                  RELAY NODE
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedHop(null)}
              className="text-xs text-dim hover:text-ink cursor-pointer hover:underline"
            >
              ✕ Close drawer
            </button>
          </div>

          {/* Drawer content body: Relay timestamp, note/ISP info, coordinates */}
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col gap-0.5 rounded-md border border-edge bg-surface/80 p-2 font-mono">
              <span className="text-[10px] uppercase tracking-wider text-dim font-sans font-semibold">
                Relayed Timestamp
              </span>
              <span className="text-accent text-[11px] truncate" title={selectedHop.relayed_at}>
                {selectedHop.relayed_at || "Timestamp unrecorded"}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 rounded-md border border-edge bg-surface/80 p-2">
              <span className="text-[10px] uppercase tracking-wider text-dim font-sans font-semibold">
                Relay Info / Note
              </span>
              <span className="text-ink text-[11px] truncate" title={selectedHop.note}>
                {selectedHop.note || "Standard MTA relay"}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 rounded-md border border-edge bg-surface/80 p-2 font-mono">
              <span className="text-[10px] uppercase tracking-wider text-dim font-sans font-semibold">
                Coordinates
              </span>
              <span className="text-ink text-[11px]">
                {Number(selectedHop.lat).toFixed(4)}°, {Number(selectedHop.lng).toFixed(4)}°
              </span>
            </div>
          </div>

          {/* Detailed Timing Anomaly Box */}
          {selectedHopAnomalies.length > 0 && (
            <div className="mt-2.5 space-y-2">
              {selectedHopAnomalies.map((anomaly, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-risk-amber/40 bg-risk-amber/10 p-2.5 text-xs leading-relaxed text-risk-amber"
                >
                  <span className="font-semibold">⚠️ Timing anomaly (inferred):</span>{" "}
                  Only {anomaly.deltaSec}s between {anomaly.fromCity} and {anomaly.toCity} ({anomaly.distKm.toLocaleString()} km) — implausible for real relay processing at this distance, suggesting potential header manipulation.
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dedicated Footer Bar (Matching GraphView footer) */}
      <div className="mt-3 flex items-center justify-between pt-2 text-xs border-t border-edge/40 shrink-0">
        <span className="text-xs text-slate-500 font-mono">
          MaxMind GeoLite2 telemetry active
        </span>
        <span className="text-xs text-slate-500">
          Hover node for summary • Click node to expand forensic trace
        </span>
      </div>
    </div>
  );
}
