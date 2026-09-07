"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";

const RISK = {
  red: "#dc2626",
  amber: "#d97706",
  green: "#16a34a",
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

function hopColor(hop, isLast) {
  if (isFlaggedNote(hop?.note)) return RISK.red;
  if (isLast) return RISK.green;
  return RISK.amber;
}

function createHopIcon(L, hop, isLast) {
  const color = hopColor(hop, isLast);
  return L.divIcon({
    className: "hop-marker-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};color:#e8eaed;border:2px solid #e8eaed;font-size:12px;font-weight:600;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,0.45)">${hop.hop_order}</div>`,
  });
}

function FitTraceBounds({ hops, useMap }) {
  const map = useMap();

  useEffect(() => {
    const positions = hops.map((hop) => [hop.lat, hop.lng]);

    const apply = () => {
      map.invalidateSize();
      if (positions.length === 1) {
        map.setView(positions[0], 5);
        return;
      }
      if (positions.length > 1) {
        map.fitBounds(positions, { padding: [32, 32], maxZoom: 7 });
      }
    };

    apply();
    const timers = [50, 200, 500].map((ms) => setTimeout(apply, ms));
    const observer = new ResizeObserver(apply);
    observer.observe(map.getContainer());

    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [map, hops]);

  return null;
}

function RoutingMap({ hops, rl, L }) {
  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } = rl;
  const center = [hops[0].lat, hops[0].lng];
  const scenarioKey = hops.map((hop) => `${hop.hop_order}:${hop.ip}`).join("|");

  const pairAnomalies = useMemo(() => getHopPairAnomalies(hops), [hops]);
  const anomalousPairKeys = useMemo(
    () => new Set(pairAnomalies.map((a) => a.pairKey)),
    [pairAnomalies]
  );

  return (
    <MapContainer
      key={scenarioKey}
      center={center}
      zoom={4}
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: "100%", width: "100%", background: "#1b1e24" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitTraceBounds hops={hops} useMap={useMap} />
      {hops.slice(0, -1).map((from, index) => {
        const to = hops[index + 1];
        const pairKey = `${from.hop_order}-${to.hop_order}`;
        const isTimingAnomaly = anomalousPairKeys.has(pairKey);
        const flagged = isFlaggedNote(from.note) || isFlaggedNote(to.note);

        return (
          <Polyline
            key={pairKey}
            positions={[
              [from.lat, from.lng],
              [to.lat, to.lng],
            ]}
            pathOptions={{
              color: isTimingAnomaly ? RISK.red : flagged ? RISK.red : RISK.amber,
              weight: isTimingAnomaly ? 5 : flagged ? 5 : 3,
              opacity: 0.95,
              dashArray: isTimingAnomaly ? "6 5" : flagged ? "8 6" : undefined,
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
                    className="mt-2 rounded border border-risk-red/40 bg-risk-red/10 p-2 text-[11px] leading-relaxed text-risk-red"
                  >
                    <span className="font-semibold">⚠️ Timing Anomaly (Inferred):</span>{" "}
                    Only {anomaly.deltaSec}s between {anomaly.fromCity} and{" "}
                    {anomaly.toCity} — implausible for real relay processing at this distance, suggesting fabricated or spoofed header entries.
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
      ([rl, leafletMod]) => {
        if (cancelled) return;
        const L = leafletMod.default;
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        setMapLib({ rl, L });
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full min-h-[360px] flex-col rounded-lg border border-edge bg-surface p-4">
      <style>{`
        .hop-marker-icon {
          background: none;
          border: none;
        }
        .leaflet-container {
          height: 100%;
          width: 100%;
          font-family: inherit;
        }
        @keyframes timingAnomalyPulse {
          0%, 100% {
            stroke-opacity: 0.95;
            stroke-width: 5px;
          }
          50% {
            stroke-opacity: 0.4;
            stroke-width: 7px;
          }
        }
        .anomalous-polyline-pulse {
          animation: timingAnomalyPulse 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-sm font-medium text-ink">Routing map</span>
          <p className="mt-0.5 text-[11px] text-dim">
            Timing anomalies are inferred indicators, not definitive proof of spoofing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-dim">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full bg-risk-red animate-pulse"
              aria-hidden
            />
            Timing Anomaly
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full bg-risk-amber"
              aria-hidden
            />
            Route
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full bg-risk-green"
              aria-hidden
            />
            Destination
          </span>
        </div>
      </div>

      {hops.length === 0 ? (
        <div className="mt-3 flex flex-1 min-h-[280px] items-center justify-center rounded-md border border-edge bg-canvas text-sm text-dim">
          No route data
        </div>
      ) : (
        <div className="relative mt-3 flex-1 min-h-[280px] overflow-hidden rounded-md border border-edge">
          {mapLib ? (
            <RoutingMap hops={hops} rl={mapLib.rl} L={mapLib.L} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-dim">
              Loading map…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
