'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Network,
  Server,
  ShieldAlert,
  Globe,
  ArrowUpRight,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Search,
  X,
  MapPin,
  Radio,
} from "lucide-react";
import {
  CASES_LIST,
  getClassificationBadgeClasses,
} from "../../lib/cases";

// Threat Campaigns with strict multi-case correlation (linked_cases.length >= 2)
const CAMPAIGN_DEFINITIONS = [
  {
    id: "CAMP-01",
    title: "Russian Bulletproof Hosting / Financial Spoof",
    riskLevel: "CRITICAL",
    riskScore: 91,
    status: "active",
    asn: "AS61754",
    asnName: "Top Layer Privacy Fabric",
    registrar: "NameCheap / PrivacyGuardian",
    subnet: "185.220.101.0/24",
    originIp: "185.220.101.5",
    caseIds: ["CASE-001", "CASE-004"],
    sharedIocs: [
      { type: "ip", value: "185.220.101.5" },
      { type: "domain", value: "sbi-support-desk.com" },
      { type: "typosquat", value: "onlinesbi.sbi" },
      { type: "domain", value: "incometax-india-gov.in" },
      { type: "typosquat", value: "incometaxindia.gov.in" },
    ],
    verdict:
      "Cases CASE-001 and CASE-004 share originating IP 185.220.101.5 routed through Amsterdam datacenter, identical registrar nexus, and simultaneous tax/banking credential phishing lures.",
    routingTelemetry: [
      { hop: 1, ip: "185.220.101.5", location: "Amsterdam, Netherlands", note: "Bulletproof C2 Datacenter" },
      { hop: 2, ip: "94.130.88.21 / 51.89.42.17", location: "Frankfurt, DE & London, UK", note: "Intermediate Transit Relays" },
      { hop: 3, ip: "103.21.244.0 / 49.36.80.10", location: "Mumbai & New Delhi, IN", note: "Enterprise Target MX Ingest" },
    ],
  },
  {
    id: "CAMP-02",
    title: "Global Executive BEC / Wire Diversion Ring",
    riskLevel: "CRITICAL",
    riskScore: 84,
    status: "active",
    asn: "AS20262",
    asnName: "Transit Bulletproof Route",
    registrar: "Tucows / PublicDomainRegistry",
    subnet: "Bulletproof Transit Relay",
    originIp: "197.210.53.88",
    caseIds: ["CASE-002", "CASE-005"],
    sharedIocs: [
      { type: "domain", value: "meridian-infra.com" },
      { type: "domain", value: "apex-logistics-billing.com" },
      { type: "typosquat", value: "apexlogistics.co.in" },
      { type: "ip", value: "197.210.53.88" },
      { type: "ip", value: "89.32.148.77" },
    ],
    verdict:
      "Cases CASE-002 and CASE-005 correlate via identical BEC payment diversion TTPs, compromised corporate invoice threads, and offshore bulletproof transit relays.",
    routingTelemetry: [
      { hop: 1, ip: "197.210.53.88 / 89.32.148.77", location: "Lagos, NG & Bucharest, RO", note: "Bulletproof Session Origin" },
      { hop: 2, ip: "40.107.8.52 / 103.86.99.21", location: "Singapore Transit Hub", note: "Compromised Tenant / Transit MX" },
      { hop: 3, ip: "49.207.50.12 / 103.25.60.8", location: "Bengaluru & Pune, IN", note: "Corporate Target Ingest" },
    ],
  },
];

export default function CampaignsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMapCampaign, setSelectedMapCampaign] = useState(null);

  // Strict Campaign Filter: ONLY display clusters where linked_cases.length >= 2
  const activeCampaigns = useMemo(() => {
    return CAMPAIGN_DEFINITIONS.map((camp) => {
      // Hydrate cases from ground-truth CASES_LIST
      const linkedCases = camp.caseIds
        .map((id) => CASES_LIST.find((c) => c.id === id))
        .filter(Boolean);

      return {
        ...camp,
        cases: linkedCases,
      };
    }).filter((camp) => camp.cases.length >= 2);
  }, []);

  // Filtered campaigns based on search query & status filter
  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return activeCampaigns.filter((camp) => {
      // Status filter
      if (statusFilter !== "all" && camp.status !== statusFilter) {
        return false;
      }
      // Search query (matches title, ID, ASN, registrar, subnet, or case names)
      if (q) {
        const matchesTitle = camp.title.toLowerCase().includes(q);
        const matchesId = camp.id.toLowerCase().includes(q);
        const matchesAsn = camp.asn.toLowerCase().includes(q);
        const matchesRegistrar = camp.registrar.toLowerCase().includes(q);
        const matchesSubnet = camp.subnet.toLowerCase().includes(q);
        const matchesCases = camp.cases.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q)
        );

        return (
          matchesTitle ||
          matchesId ||
          matchesAsn ||
          matchesRegistrar ||
          matchesSubnet ||
          matchesCases
        );
      }
      return true;
    });
  }, [activeCampaigns, searchQuery, statusFilter]);

  // Dynamically compute top metrics from the filtered set based strictly on 8 mock cases
  const stats = useMemo(() => {
    const totalCampaigns = activeCampaigns.length;

    // Unique cases correlated across all clusters
    const uniqueCaseIds = new Set();
    activeCampaigns.forEach((camp) => {
      camp.cases.forEach((c) => uniqueCaseIds.add(c.id));
    });

    // Unique ASNs / threat fabrics mapped
    const uniqueAsns = new Set(activeCampaigns.map((camp) => camp.asn));

    return {
      activeCampaignsCount: totalCampaigns,
      correlatedCasesCount: uniqueCaseIds.size,
      threatFabricsCount: uniqueAsns.size,
    };
  }, [activeCampaigns]);

  // Aggregate all shared IOCs across active campaigns
  const allSharedIocs = useMemo(() => {
    const seen = new Set();
    const list = [];
    activeCampaigns.forEach((camp) => {
      camp.sharedIocs.forEach((ioc) => {
        const key = `${ioc.type}:${ioc.value}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ ...ioc, campaignId: camp.id });
        }
      });
    });
    return list;
  }, [activeCampaigns]);

  const handleViewCorrelatedCases = (campaignId) => {
    router.push(`/cases?campaign=${campaignId}`);
  };

  return (
    <div className="min-h-screen p-6 bg-canvas text-ink font-sans">
      {/* Header Section */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Layers className="h-4 w-4" />
            <span>Multi-Incident Correlation</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Campaign Intelligence
          </h1>
          <p className="mt-1 text-xs text-dim max-w-2xl">
            Correlated multi-incident email threat clusters. Displaying only campaigns linking multiple
            cases across shared infrastructure fabrics, ASNs, and registrar footprints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cases"
            className="flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-dim hover:border-accent hover:text-ink transition-colors cursor-pointer"
          >
            <span>Cases Directory (8 Cases)</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Top Dynamic Metrics Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Metric 1: Active Campaigns */}
        <div className="rounded-xl border border-edge bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dim uppercase tracking-wider">
              Active Campaigns
            </span>
            <span className="rounded-md border border-edge bg-canvas/70 p-1.5 text-accent">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">
              {stats.activeCampaignsCount} Active Campaigns
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-dim">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified multi-case correlation
            </span>
          </div>
        </div>

        {/* Metric 2: Correlated Cases */}
        <div className="rounded-xl border border-edge bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dim uppercase tracking-wider">
              Correlated Cases
            </span>
            <span className="rounded-md border border-edge bg-canvas/70 p-1.5 text-risk-red">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">
              {stats.correlatedCasesCount} Cases Correlated
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-dim">
            {stats.correlatedCasesCount} of 8 investigated scenarios linked across clusters
          </div>
        </div>

        {/* Metric 3: Shared Threat Infrastructures */}
        <div className="rounded-xl border border-edge bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dim uppercase tracking-wider">
              Shared Threat Infrastructures
            </span>
            <span className="rounded-md border border-edge bg-canvas/70 p-1.5 text-risk-amber">
              <Server className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">
              {stats.threatFabricsCount} Threat Fabrics
            </span>
          </div>
          <div className="mt-1.5 text-[11px] font-mono text-dim">
            AS61754 &bull; AS20262
          </div>
        </div>
      </div>

      {/* Sleek Single-Row Search & Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-edge bg-surface p-3 shadow-sm">
        {/* Live Search Input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaign names, ASNs (e.g. AS61754), registrars, or case titles..."
            className="w-full rounded-lg border border-edge bg-canvas py-1.5 pl-9 pr-8 text-xs text-ink placeholder:text-dim/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dim hover:text-ink transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Clean Status Filter Pills */}
        <div className="flex items-center gap-1 shrink-0 rounded-lg border border-edge bg-canvas/70 p-1">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-dim">
            Status:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-surface text-ink border border-edge shadow-xs"
                : "text-dim hover:text-ink"
            }`}
          >
            All ({activeCampaigns.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "active"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs"
                : "text-dim hover:text-emerald-400"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active ({activeCampaigns.filter((c) => c.status === "active").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("mitigated")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "mitigated"
                ? "bg-surface text-ink border border-edge shadow-xs"
                : "text-dim hover:text-ink"
            }`}
          >
            Mitigated ({activeCampaigns.filter((c) => c.status === "mitigated").length})
          </button>
        </div>
      </div>

      {/* Flattened Campaign Cards Grid (2-column layout) */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-dim">
              Correlated Threat Campaigns
            </h2>
            <p className="text-xs text-dim mt-0.5">
              Multi-incident threat clusters grouped by common ASN, shared registrar, and infrastructure nexus.
            </p>
          </div>
          <span className="text-xs text-dim">
            Showing <strong className="text-ink">{filteredCampaigns.length}</strong> of{" "}
            <strong className="text-ink">{activeCampaigns.length}</strong> active campaigns
          </span>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="rounded-xl border border-edge bg-surface p-10 text-center text-dim">
            <ShieldAlert className="mx-auto h-7 w-7 text-dim/50 mb-2" />
            <p className="text-sm font-semibold text-ink">No matching threat campaigns</p>
            <p className="text-xs text-dim mt-1">Try adjusting your search terms or status filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-edge bg-canvas px-2.5 py-1 text-xs text-accent hover:border-accent cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="rounded-xl border border-edge bg-surface p-5 sm:p-6 shadow-sm hover:border-accent/60 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Campaign Title, ID & Risk Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent bg-accent/15 border border-accent/30 rounded px-2 py-0.5">
                          {camp.id}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active Threat
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-ink tracking-tight mt-1.5">
                        {camp.title}
                      </h3>
                    </div>

                    <span className="shrink-0 font-mono text-xs font-bold uppercase tracking-wider text-risk-red bg-risk-red/15 border border-risk-red/30 rounded-md px-2.5 py-1">
                      {camp.riskLevel} // {camp.riskScore}+
                    </span>
                  </div>

                  {/* Infrastructure Footprint (Monospace Pills) */}
                  <div className="mb-5 rounded-lg border border-edge/80 bg-canvas/70 p-3 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-dim">
                      Infrastructure Footprint
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-accent bg-surface px-2.5 py-1 rounded border border-edge">
                        <Server className="h-3 w-3 text-accent" />
                        <span>{camp.asn}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink bg-surface px-2.5 py-1 rounded border border-edge">
                        <Globe className="h-3 w-3 text-risk-amber" />
                        <span className="truncate max-w-[200px]">{camp.registrar}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-dim bg-surface px-2.5 py-1 rounded border border-edge">
                        <Network className="h-3 w-3 text-dim" />
                        <span>{camp.subnet}</span>
                      </span>
                    </div>
                  </div>

                  {/* Linked Cases List */}
                  <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-dim font-semibold uppercase tracking-wider">
                        Linked Cases ({camp.cases.length}):
                      </span>
                      <span className="font-mono text-[10px] text-dim">
                        {camp.cases.map((c) => c.id).join(" • ")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {camp.cases.map((c) => {
                        const caseClass = c.data?.classification || "phishing";

                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-edge bg-canvas/50 hover:border-accent/40 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-xs font-bold text-accent shrink-0">
                                [{c.id}]
                              </span>
                              <span className="text-xs font-medium text-ink truncate">
                                {c.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${getClassificationBadgeClasses(
                                  caseClass
                                )}`}
                              >
                                {caseClass.replace("_", " ")}
                              </span>
                              <Link
                                href={`/?case=${c.slug}&campaign=${camp.id}`}
                                className="text-dim hover:text-accent transition-colors p-1"
                                title="Investigate in Dashboard"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Dual Action Buttons: View Infrastructure Map & View Correlated Cases */}
                <div className="pt-4 border-t border-edge/60 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMapCampaign(camp)}
                    className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 rounded-lg border border-edge bg-canvas/80 hover:border-accent hover:text-accent py-2 px-3 text-xs font-semibold text-dim transition-all cursor-pointer shadow-xs"
                  >
                    <Globe className="h-3.5 w-3.5 text-accent" />
                    <span>View Infrastructure Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewCorrelatedCases(camp.id)}
                    className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 py-2 px-3 text-xs font-semibold transition-all cursor-pointer shadow-xs hover:border-accent"
                  >
                    <span>View Correlated Cases ({camp.cases.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Compact 2-Column Footer Section */}
      <section className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Active Shared Indicators (IOCs) Tag Cloud */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Network className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-ink tracking-tight">
                Active Shared Indicators (IOCs)
              </h3>
            </div>
            <p className="text-xs text-dim mb-4">
              Shared originating IPs, sending endpoints, and lookalike domains identified across active campaigns.
            </p>

            <div className="flex flex-wrap gap-2">
              {allSharedIocs.map((ioc) => {
                let badgeClass = "border-edge bg-canvas/80 text-dim";
                let icon = <Network className="h-3 w-3 text-accent" />;

                if (ioc.type === "ip") {
                  badgeClass = "border-accent/30 bg-accent/10 text-accent font-mono";
                  icon = <Network className="h-3 w-3 text-accent" />;
                } else if (ioc.type === "typosquat") {
                  badgeClass = "border-risk-red/30 bg-risk-red/10 text-risk-red font-mono";
                  icon = <ShieldAlert className="h-3 w-3 text-risk-red" />;
                } else {
                  badgeClass = "border-risk-amber/30 bg-risk-amber/10 text-risk-amber font-mono";
                  icon = <Globe className="h-3 w-3 text-risk-amber" />;
                }

                return (
                  <span
                    key={`${ioc.campaignId}-${ioc.type}-${ioc.value}`}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${badgeClass}`}
                  >
                    {icon}
                    <span>{ioc.value}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right Column: Correlation Matrix Summary */}
          <div className="lg:border-l lg:border-edge/60 lg:pl-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-risk-green" />
                <h3 className="text-sm font-bold text-ink tracking-tight">
                  Correlation Matrix Summary
                </h3>
              </div>
              <p className="text-xs text-dim mb-4">
                Automated multi-incident correlation verdict based on telemetry clustering.
              </p>

              <div className="space-y-3">
                {activeCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="rounded-lg border border-edge bg-canvas/50 p-3 text-xs leading-relaxed"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-accent uppercase">
                        {camp.id} Verdict
                      </span>
                      <span className="text-edge">•</span>
                      <span className="font-mono text-[10px] text-dim">
                        {camp.asn}
                      </span>
                    </div>
                    <p className="text-ink/90 font-sans">{camp.verdict}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-edge/60 flex items-center justify-between text-[11px] text-dim">
              <span>RFC-5322 Telemetry &bull; MaxMind GeoIP Verified</span>
              <span className="font-mono text-accent">Confidence: HIGH (0.94)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Threat Infrastructure Map Modal */}
      {selectedMapCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-xl border border-edge bg-surface p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-edge/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent bg-accent/15 border border-accent/30 rounded px-2 py-0.5">
                    {selectedMapCampaign.id}
                  </span>
                  <span className="text-xs text-dim font-mono">
                    {selectedMapCampaign.asn} &bull; {selectedMapCampaign.subnet}
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink tracking-tight mt-1">
                  {selectedMapCampaign.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMapCampaign(null)}
                className="rounded-lg border border-edge bg-canvas p-1.5 text-dim hover:text-ink hover:border-accent transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Infrastructure Overview Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-lg border border-edge bg-canvas/70 p-3">
                <div className="text-[10px] uppercase font-semibold text-dim">Autonomous System</div>
                <div className="mt-1 font-mono font-bold text-accent">{selectedMapCampaign.asn}</div>
                <div className="text-[11px] text-dim truncate">{selectedMapCampaign.asnName}</div>
              </div>
              <div className="rounded-lg border border-edge bg-canvas/70 p-3">
                <div className="text-[10px] uppercase font-semibold text-dim">Registrar Anchor</div>
                <div className="mt-1 font-medium text-ink truncate">{selectedMapCampaign.registrar}</div>
                <div className="text-[11px] text-dim">Privacy Protected</div>
              </div>
              <div className="rounded-lg border border-edge bg-canvas/70 p-3">
                <div className="text-[10px] uppercase font-semibold text-dim">Origin Subnet</div>
                <div className="mt-1 font-mono text-dim">{selectedMapCampaign.subnet}</div>
                <div className="text-[11px] text-risk-red font-mono">C2 Endpoint Flagged</div>
              </div>
            </div>

            {/* Hop-by-Hop Telemetry Routing Path */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-dim flex items-center justify-between">
                <span>Verified Telemetry Routing Hops</span>
                <span className="text-[10px] font-mono text-accent">RFC-5322 Trace</span>
              </div>
              <div className="space-y-2 rounded-lg border border-edge bg-canvas/50 p-3">
                {selectedMapCampaign.routingTelemetry?.map((hop) => (
                  <div
                    key={hop.hop}
                    className="flex items-center justify-between text-xs py-1 border-b border-edge/40 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent font-mono text-[10px] font-bold">
                        {hop.hop}
                      </span>
                      <div>
                        <div className="font-mono text-ink font-semibold">{hop.ip}</div>
                        <div className="text-[11px] text-dim">{hop.note}</div>
                      </div>
                    </div>
                    <span className="text-dim font-mono text-[11px] text-right">
                      {hop.location}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-edge/60">
              <button
                type="button"
                onClick={() => setSelectedMapCampaign(null)}
                className="rounded-lg border border-edge bg-canvas px-3.5 py-1.5 text-xs text-dim hover:text-ink transition-colors cursor-pointer"
              >
                Close
              </button>

              <Link
                href={`/?case=${selectedMapCampaign.cases[0].slug}&campaign=${selectedMapCampaign.id}#routing-correlation`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Open Full Interactive Map in Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
