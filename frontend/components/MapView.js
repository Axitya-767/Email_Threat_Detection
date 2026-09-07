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
// destination uses green, anomalies use amber (red reserved strictly for case verdict)
function hopColor(hop, isLast) {
  if (isLast) return RISK.green;
  if (isFlaggedNote(hop?.note)) return RISK.amber;
  return RISK.neutral;
}

function createHopIcon(L, hop, isLast) {
  const color = hopColor(hop, isLast);
  return L.divIcon({
    className: "hop-marker-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};color:#ffffff;border:2px solid #e8eaed;font-size:12px;font-weight:700;font-family:monospace;line-height:1;box-shadow:0 2px 6px rgba(0,0,0,0.6)">${hop.hop_order}</div>`,
  });
}

function FitTraceBounds({ hops, useMap, L }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !hops || hops.length === 0) return;
    const positions = hops.map((hop) => [hop.lat, hop.lng]);

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

function RoutingMap({ hops, rl, L }) {
  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } = rl;
  const scenarioKey = hops.map((hop) => `${hop.hop_order}:${hop.ip}`).join("|");

  const pairAnomalies = useMemo(() => getHopPairAnomalies(hops), [hops]);
  const anomalousPairKeys = useMemo(
    () => new Set(pairAnomalies.map((a) => a.pairKey)),
    [pairAnomalies]
  );

  const initialCenter = hops.length > 0 ? [hops[0].lat, hops[0].lng] : [30, 40];

  return (
    <MapContainer
      key={scenarioKey}
      center={initialCenter}
      zoom={3}
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: "100%", width: "100%", background: "#1b1e24", position: "relative" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitTraceBounds hops={hops} useMap={useMap} L={L} />
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
              [from.lat, from.lng],
              [to.lat, to.lng],
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

        return (
          <Marker
            key={`${hop.hop_order}-${hop.ip}`}
            position={[hop.lat, hop.lng]}
            icon={createHopIcon(L, hop, index === hops.length - 1)}
          >
            <Popup>
              <div className="text-xs max-w-[240px]">
                <div>
                  <strong>Hop {hop.hop_order}</strong>
                </div>
                <div className="font-mono">{hop.ip}</div>
                <div>{hop.place}</div>
                {hop.note && <div className="text-dim">{hop.note}</div>}
                {hop.relayed_at && (
                  <div className="mt-1 font-mono text-[10px] text-accent">
                    {hop.relayed_at}
                  </div>
                )}
                {hopAnomalies.map((anomaly, aIdx) => (
                  <div
                    key={aIdx}
                    className="mt-2 rounded border border-risk-amber/40 bg-risk-amber/10 p-2 text-[11px] leading-relaxed text-risk-amber"
                  >
                    <span className="font-semibold">⚠️ Timing anomaly (inferred):</span>{" "}
                    Only {anomaly.deltaSec}s between {anomaly.fromCity} and{" "}
                    {anomaly.toCity} — implausible for real relay processing at this distance, suggesting potential header manipulation.
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default function MapView({ data, masked }) {
  void masked;

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

  const [mapLib, setMapLib] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([import("react-leaflet"), import("leaflet")]).then(
      ([{ MapContainer, TileLayer, Marker, Popup, Polyline, useMap }, L]) => {
        if (cancelled) return;
        setMapLib({ rl: { MapContainer, TileLayer, Marker, Popup, Polyline, useMap }, L });
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative isolate z-0 flex flex-col h-[520px] min-h-[520px] rounded-xl border border-edge bg-surface p-6 shadow-sm">
      <style>{`
        .hop-marker-icon {
          background: none;
          border: none;
        }
        .leaflet-container {
          height: 100%;
          width: 100%;
          font-family: inherit;
          position: relative !important;
          z-index: 0 !important;
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
      
      {/* Section Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between pb-3 border-b border-edge/60 shrink-0">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Network telemetry
          </span>
          <h2 className="text-lg font-semibold text-ink">Routing map</h2>
          <p className="mt-0.5 text-xs text-dim">
            Timing anomalies are inferred indicators, not definitive proof of spoofing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-xs text-dim self-end sm:self-auto">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full bg-risk-amber animate-pulse"
              aria-hidden
            />
            <span className="text-ink">Timing anomaly (amber)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full bg-slate-500"
              aria-hidden
            />
            <span>Relay route</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full bg-risk-green"
              aria-hidden
            />
            <span>Destination</span>
          </span>
        </div>
      </div>

      {/* Map Viewport - takes remaining container height */}
      {hops.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-edge bg-canvas text-sm text-dim">
          No route data available for this case.
        </div>
      ) : (
        <div className="relative z-0 mt-4 flex-1 h-[400px] min-h-[380px] w-full overflow-hidden rounded-lg border border-edge">
          {mapLib ? (
            <RoutingMap hops={hops} rl={mapLib.rl} L={mapLib.L} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-dim">
              Loading Leaflet geospatial engine…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
