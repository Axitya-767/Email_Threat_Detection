'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Network,
  Server,
  ShieldAlert,
  Globe,
  Mail,
  FileCode,
  Calendar,
  Search,
  X,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Building2,
  ChevronDown,
  ChevronUp,
  Share2,
  ArrowUpRight,
} from "lucide-react";
import rawCampaignsData from "../../data/mock_responses/campaigns_mock.json";

function getRiskBadge(risk) {
  const r = String(risk || "").toLowerCase();
  if (r === "critical") {
    return {
      label: "Critical",
      classes: "border border-risk-red/30 bg-risk-red/15 text-risk-red",
      dot: "bg-risk-red",
    };
  }
  if (r === "high") {
    return {
      label: "High",
      classes: "border border-risk-amber/30 bg-risk-amber/15 text-risk-amber",
      dot: "bg-risk-amber",
    };
  }
  return {
    label: "Medium",
    classes: "border border-risk-green/30 bg-risk-green/15 text-risk-green",
    dot: "bg-risk-green",
  };
}

function getStatusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") {
    return {
      label: "Active",
      classes: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      dot: "bg-emerald-400 animate-pulse",
    };
  }
  return {
    label: "Mitigated",
    classes: "border border-edge bg-canvas/60 text-dim",
    dot: "bg-dim",
  };
}

function getNodeTypeIcon(type) {
  switch (type) {
    case "ip":
      return <Network className="h-3.5 w-3.5 text-accent" />;
    case "domain":
      return <Globe className="h-3.5 w-3.5 text-risk-amber" />;
    case "email":
      return <Mail className="h-3.5 w-3.5 text-risk-red" />;
    case "ioc":
      return <FileCode className="h-3.5 w-3.5 text-risk-green" />;
    default:
      return <Radio className="h-3.5 w-3.5 text-dim" />;
  }
}

function getNodeTypeBadge(type) {
  switch (type) {
    case "ip":
      return {
        label: "IP Address",
        classes: "border border-accent/30 bg-accent/15 text-accent",
      };
    case "domain":
      return {
        label: "Domain",
        classes: "border border-risk-amber/30 bg-risk-amber/15 text-risk-amber",
      };
    case "email":
      return {
        label: "Email",
        classes: "border border-risk-red/30 bg-risk-red/15 text-risk-red",
      };
    case "ioc":
      return {
        label: "Artifact",
        classes: "border border-risk-green/30 bg-risk-green/15 text-risk-green",
      };
    default:
      return {
        label: type,
        classes: "border border-edge bg-surface text-dim",
      };
  }
}

export default function CampaignsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [nodeTypeFilter, setNodeTypeFilter] = useState("all");
  const [expandedCampaigns, setExpandedCampaigns] = useState({});

  const toggleCampaignExpansion = (id) => {
    setExpandedCampaigns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Sectors list from dataset
  const sectors = useMemo(() => {
    const set = new Set();
    rawCampaignsData.forEach((c) => {
      if (c.target_sector) set.add(c.target_sector);
    });
    return Array.from(set);
  }, []);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return rawCampaignsData.filter((camp) => {
      // Status filter
      if (statusFilter !== "all" && camp.status !== statusFilter) {
        return false;
      }
      // Risk filter
      if (riskFilter !== "all" && camp.risk_level !== riskFilter) {
        return false;
      }
      // Sector filter
      if (sectorFilter !== "all" && camp.target_sector !== sectorFilter) {
        return false;
      }
      // Search query
      if (q) {
        const matchesName = camp.name.toLowerCase().includes(q);
        const matchesId = camp.id.toLowerCase().includes(q);
        const matchesSector = camp.target_sector?.toLowerCase().includes(q);
        const matchesAsn = camp.shared_infrastructure?.asn?.toLowerCase().includes(q);
        const matchesAsnName = camp.shared_infrastructure?.asn_name?.toLowerCase().includes(q);
        const matchesRegistrar = camp.shared_infrastructure?.registrar?.toLowerCase().includes(q);
        const matchesIps = camp.shared_infrastructure?.ip_cluster?.some((ip) =>
          ip.toLowerCase().includes(q)
        );
        const matchesNodes = camp.nodes?.some(
          (n) => n.label?.toLowerCase().includes(q) || n.type?.toLowerCase().includes(q)
        );

        return (
          matchesName ||
          matchesId ||
          matchesSector ||
          matchesAsn ||
          matchesAsnName ||
          matchesRegistrar ||
          matchesIps ||
          matchesNodes
        );
      }
      return true;
    });
  }, [statusFilter, riskFilter, sectorFilter, searchQuery]);

  // Group filtered campaigns by shared infrastructure (ASN)
  const clusters = useMemo(() => {
    const clusterMap = {};

    filteredCampaigns.forEach((camp) => {
      const asnKey = camp.shared_infrastructure?.asn || "Unknown Infrastructure";
      if (!clusterMap[asnKey]) {
        clusterMap[asnKey] = {
          asn: asnKey,
          asnName: camp.shared_infrastructure?.asn_name || "Autonomous System",
          registrar: camp.shared_infrastructure?.registrar || "Unspecified Registrar",
          ipPool: new Set(),
          campaigns: [],
        };
      }

      clusterMap[asnKey].campaigns.push(camp);
      if (Array.isArray(camp.shared_infrastructure?.ip_cluster)) {
        camp.shared_infrastructure.ip_cluster.forEach((ip) => {
          clusterMap[asnKey].ipPool.add(ip);
        });
      }
    });

    return Object.values(clusterMap).map((c) => ({
      ...c,
      ipPool: Array.from(c.ipPool),
      totalCases: c.campaigns.reduce((acc, curr) => acc + (curr.case_count || 0), 0),
    }));
  }, [filteredCampaigns]);

  // Flatten all nodes from filtered campaigns
  const allAttributedNodes = useMemo(() => {
    const nodes = [];

    filteredCampaigns.forEach((camp) => {
      if (Array.isArray(camp.nodes)) {
        camp.nodes.forEach((node) => {
          nodes.push({
            ...node,
            campaignId: camp.id,
            campaignName: camp.name,
            targetSector: camp.target_sector,
            campaignStatus: camp.status,
            riskLevel: camp.risk_level,
            asn: camp.shared_infrastructure?.asn,
            registrar: camp.shared_infrastructure?.registrar,
          });
        });
      }
    });

    return nodes;
  }, [filteredCampaigns]);

  // Filtered nodes table
  const filteredNodesTable = useMemo(() => {
    return allAttributedNodes.filter((node) => {
      if (nodeTypeFilter !== "all" && node.type !== nodeTypeFilter) {
        return false;
      }
      return true;
    });
  }, [allAttributedNodes, nodeTypeFilter]);

  // Global counts for KPI cards
  const stats = useMemo(() => {
    const totalCases = rawCampaignsData.reduce((acc, c) => acc + (c.case_count || 0), 0);
    const activeCamps = rawCampaignsData.filter((c) => c.status === "active").length;
    const mitigatedCamps = rawCampaignsData.filter((c) => c.status === "mitigated").length;

    const uniqueAsns = new Set(rawCampaignsData.map((c) => c.shared_infrastructure?.asn)).size;
    const totalNodes = rawCampaignsData.reduce((acc, c) => acc + (c.nodes?.length || 0), 0);

    return { totalCases, activeCamps, mitigatedCamps, uniqueAsns, totalNodes };
  }, []);

  const hasActiveFilters =
    statusFilter !== "all" ||
    riskFilter !== "all" ||
    sectorFilter !== "all" ||
    searchQuery.trim() !== "";

  const clearFilters = () => {
    setStatusFilter("all");
    setRiskFilter("all");
    setSectorFilter("all");
    setSearchQuery("");
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
            Correlated multi-case email threat campaigns grouped by shared attacker
            infrastructure, autonomous systems (ASN), IP clusters, and domain registrar footprints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cases"
            className="flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-dim hover:border-accent hover:text-ink transition-colors"
          >
            <span>Browse Cases</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <div className="flex items-center gap-2 rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-risk-green animate-pulse" />
            <span className="text-dim">C2 Intel Feed:</span>
            <span className="font-semibold text-ink">Active Sync</span>
          </div>
        </div>
      </header>

      {/* KPI Metric Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-edge bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dim">Tracked Campaigns</span>
            <span className="rounded-md border border-edge bg-canvas/70 p-1.5 text-accent">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{rawCampaignsData.length}</span>
            <span className="text-xs text-dim">campaigns</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-dim">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {stats.activeCamps} Active
            </span>
            <span>•</span>
            <span>{stats.mitigatedCamps} Mitigated</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-edge bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dim">Threat Clusters</span>
            <span className="rounded-md border border-edge bg-canvas/70 p-1.5 text-risk-amber">
              <Server className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{stats.uniqueAsns}</span>
            <span className="text-xs text-dim">shared ASN fabrics</span>
          </div>
          <div className="mt-2 text-[11px] text-dim">
            Cross-campaign infrastructure overlap
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-edge bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dim">Correlated Cases</span>
            <span className="rounded-md border border-edge bg-canvas/70 p-1.5 text-risk-red">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{stats.totalCases}</span>
            <span className="text-xs text-dim">incident cases</span>
          </div>
          <div className="mt-2 text-[11px] text-dim">
            Linked across enterprise telemetry
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-edge bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dim">Attributed Graph Nodes</span>
            <span className="rounded-md border border-edge bg-canvas/70 p-1.5 text-accent">
              <Network className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{stats.totalNodes}</span>
            <span className="text-xs text-dim">indicators mapped</span>
          </div>
          <div className="mt-2 text-[11px] text-dim">
            IPs, Domains, Senders & Payload Artifacts
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="mb-8 rounded-xl border border-edge bg-surface p-4 shadow-sm space-y-4">
        {/* Top Controls Row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns, ASN, C2 IP, domain, registrar, or indicator label..."
              className="w-full rounded-lg border border-edge bg-canvas py-2 pl-9 pr-8 text-xs text-ink placeholder:text-dim/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dim hover:text-ink transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Status Toggle */}
          <div className="flex items-center gap-1.5 rounded-lg border border-edge bg-canvas/70 p-1">
            <span className="px-2 text-[11px] font-semibold text-dim uppercase tracking-wider">
              Status:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-surface text-ink border border-edge shadow-xs"
                  : "text-dim hover:text-ink"
              }`}
            >
              All ({rawCampaignsData.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === "active"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs"
                  : "text-dim hover:text-ink"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active ({stats.activeCamps})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("mitigated")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === "mitigated"
                  ? "bg-surface text-dim border border-edge shadow-xs"
                  : "text-dim hover:text-ink"
              }`}
            >
              Mitigated ({stats.mitigatedCamps})
            </button>
          </div>

          {/* Risk Level Segmented Toggle */}
          <div className="flex items-center gap-1.5 rounded-lg border border-edge bg-canvas/70 p-1">
            <span className="px-2 text-[11px] font-semibold text-dim uppercase tracking-wider">
              Risk:
            </span>
            <button
              type="button"
              onClick={() => setRiskFilter("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                riskFilter === "all"
                  ? "bg-surface text-ink border border-edge shadow-xs"
                  : "text-dim hover:text-ink"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter("critical")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1 ${
                riskFilter === "critical"
                  ? "bg-risk-red/15 text-risk-red border border-risk-red/30 shadow-xs"
                  : "text-dim hover:text-risk-red"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-risk-red" />
              Critical
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter("high")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1 ${
                riskFilter === "high"
                  ? "bg-risk-amber/15 text-risk-amber border border-risk-amber/30 shadow-xs"
                  : "text-dim hover:text-risk-amber"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-risk-amber" />
              High
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter("medium")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1 ${
                riskFilter === "medium"
                  ? "bg-risk-green/15 text-risk-green border border-risk-green/30 shadow-xs"
                  : "text-dim hover:text-risk-green"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-risk-green" />
              Medium
            </button>
          </div>
        </div>

        {/* Sector Quick Pills & Clear Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-edge/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-dim mr-1 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>Target Sector:</span>
            </span>
            <button
              type="button"
              onClick={() => setSectorFilter("all")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                sectorFilter === "all"
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-edge bg-canvas/60 text-dim hover:border-edge/80 hover:text-ink"
              }`}
            >
              All Sectors
            </button>
            {sectors.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSectorFilter(sec)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                  sectorFilter === sec
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-edge bg-canvas/60 text-dim hover:border-edge/80 hover:text-ink"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-accent hover:underline transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Reset all filters</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: Threat-Cluster View */}
      <section className="mb-10">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                1
              </span>
              <h2 className="text-lg font-bold text-ink tracking-tight">
                Infrastructure Threat Clusters
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-dim">
              Campaigns grouped by common attacker infrastructure: autonomous network (ASN),
              shared IP subnets, and domain registrar footprint.
            </p>
          </div>
          <div className="text-xs text-dim">
            Showing <strong className="text-ink">{filteredCampaigns.length}</strong> campaigns across{" "}
            <strong className="text-ink">{clusters.length}</strong> infrastructure clusters
          </div>
        </div>

        {clusters.length === 0 ? (
          <div className="rounded-xl border border-edge bg-surface p-12 text-center text-dim">
            <ShieldAlert className="mx-auto h-8 w-8 text-dim/50" />
            <p className="mt-2 text-sm font-medium text-ink">No matching threat clusters found</p>
            <p className="mt-1 text-xs text-dim">
              Try adjusting your active filters or clear your search term.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-edge bg-canvas px-3 py-1.5 text-xs font-medium text-accent hover:border-accent transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {clusters.map((cluster) => (
              <div
                key={cluster.asn}
                className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm transition-all hover:border-edge/90"
              >
                {/* Cluster Header Bar */}
                <div className="border-b border-edge bg-canvas/70 px-5 py-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-ink">
                            {cluster.asn}
                          </span>
                          <span className="text-xs text-dim">•</span>
                          <span className="text-xs font-medium text-ink">
                            {cluster.asnName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-dim">
                          <span>
                            Registrar:{" "}
                            <strong className="text-ink font-normal">{cluster.registrar}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Shared Subnet IPs:{" "}
                            <span className="font-mono text-[11px] text-accent">
                              {cluster.ipPool.join(", ")}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-md border border-edge bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
                        {cluster.campaigns.length}{" "}
                        {cluster.campaigns.length === 1 ? "Campaign" : "Campaigns"}
                      </span>
                      <span className="rounded-md border border-edge bg-surface px-2.5 py-1 text-xs font-semibold text-accent">
                        {cluster.totalCases} Associated Cases
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inner Campaign Cards Grid */}
                <div className="p-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {cluster.campaigns.map((camp) => {
                    const risk = getRiskBadge(camp.risk_level);
                    const status = getStatusBadge(camp.status);
                    const isExpanded = expandedCampaigns[camp.id];

                    return (
                      <div
                        key={camp.id}
                        className="rounded-lg border border-edge/80 bg-canvas/40 p-4 transition-all hover:border-accent/40 hover:bg-canvas/60 flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-ink tracking-tight">
                                  {camp.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[10px] text-dim uppercase">
                                  {camp.id}
                                </span>
                                <span className="text-dim">•</span>
                                <span className="inline-flex items-center gap-1 rounded bg-surface px-2 py-0.5 text-[10px] font-semibold text-dim border border-edge">
                                  <Building2 className="h-3 w-3 text-accent" />
                                  {camp.target_sector}
                                </span>
                              </div>
                            </div>

                            {/* Status & Risk Badges */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${status.classes}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                {status.label}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${risk.classes}`}
                              >
                                {risk.label} Risk
                              </span>
                            </div>
                          </div>

                          {/* Stats & Timeline */}
                          <div className="grid grid-cols-2 gap-2 my-3 rounded-md border border-edge/60 bg-surface/60 p-2.5 text-xs">
                            <div>
                              <div className="text-[10px] text-dim uppercase tracking-wider">
                                Linked Cases
                              </div>
                              <div className="mt-0.5 font-bold text-ink">
                                {camp.case_count} Cases
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-dim uppercase tracking-wider">
                                Timeline Window
                              </div>
                              <div className="mt-0.5 font-mono text-[11px] text-dim flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-dim/70" />
                                <span>{camp.first_seen} → {camp.last_seen}</span>
                              </div>
                            </div>
                          </div>

                          {/* Shared Attribution Signals */}
                          <div className="text-[11px] text-dim space-y-1 mb-3">
                            <div className="flex items-center justify-between">
                              <span className="text-dim/80">Cluster IP Subnet:</span>
                              <span className="font-mono text-[11px] text-ink">
                                {camp.shared_infrastructure?.ip_cluster?.join(", ")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-dim/80">Registrar Anchor:</span>
                              <span className="text-ink">
                                {camp.shared_infrastructure?.registrar}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom / Expandable Nodes */}
                        <div className="pt-2 border-t border-edge/60">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => toggleCampaignExpansion(camp.id)}
                              className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline transition-colors"
                            >
                              <span>{isExpanded ? "Hide" : "Inspect"} Attributed Nodes ({camp.nodes?.length || 0})</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>

                            <Link
                              href="/cases"
                              className="inline-flex items-center gap-1 text-[11px] text-dim hover:text-ink transition-colors"
                            >
                              <span>View Cases</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          </div>

                          {/* Expanded Nodes List */}
                          {isExpanded && (
                            <div className="mt-3 space-y-1.5 rounded-lg border border-edge bg-surface/80 p-2.5 text-xs animate-in fade-in duration-150">
                              <div className="text-[10px] uppercase font-semibold text-dim tracking-wider mb-1">
                                Attributed Graph Nodes
                              </div>
                              {camp.nodes?.map((node) => {
                                const typeBadge = getNodeTypeBadge(node.type);
                                return (
                                  <div
                                    key={node.id}
                                    className="flex items-center justify-between gap-2 py-1 px-1.5 rounded bg-canvas/50 border border-edge/50"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {getNodeTypeIcon(node.type)}
                                      <span className="font-mono text-[11px] text-ink truncate">
                                        {node.label}
                                      </span>
                                    </div>
                                    <span
                                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${typeBadge.classes}`}
                                    >
                                      {typeBadge.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: Graph-Based Node Overview Table */}
      <section>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                2
              </span>
              <h2 className="text-lg font-bold text-ink tracking-tight">
                Graph-Based Node Overview Table
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-dim">
              Flat tabular scan of every attributed graph node across active campaigns for raw
              attribution analysis and SOC pivoting.
            </p>
          </div>

          {/* Node Type Segmented Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-edge bg-surface p-1 text-xs">
            <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-dim">
              Filter Nodes:
            </span>
            <button
              type="button"
              onClick={() => setNodeTypeFilter("all")}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                nodeTypeFilter === "all"
                  ? "bg-canvas text-ink border border-edge"
                  : "text-dim hover:text-ink"
              }`}
            >
              All ({allAttributedNodes.length})
            </button>
            <button
              type="button"
              onClick={() => setNodeTypeFilter("ip")}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                nodeTypeFilter === "ip"
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "text-dim hover:text-accent"
              }`}
            >
              IPs
            </button>
            <button
              type="button"
              onClick={() => setNodeTypeFilter("domain")}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                nodeTypeFilter === "domain"
                  ? "bg-risk-amber/20 text-risk-amber border border-risk-amber/40"
                  : "text-dim hover:text-risk-amber"
              }`}
            >
              Domains
            </button>
            <button
              type="button"
              onClick={() => setNodeTypeFilter("email")}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                nodeTypeFilter === "email"
                  ? "bg-risk-red/20 text-risk-red border border-risk-red/40"
                  : "text-dim hover:text-risk-red"
              }`}
            >
              Emails
            </button>
            <button
              type="button"
              onClick={() => setNodeTypeFilter("ioc")}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                nodeTypeFilter === "ioc"
                  ? "bg-risk-green/20 text-risk-green border border-risk-green/40"
                  : "text-dim hover:text-risk-green"
              }`}
            >
              Artifacts
            </button>
          </div>
        </div>

        {/* Node Overview Table Card */}
        <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-edge bg-canvas/70 text-[11px] font-semibold uppercase tracking-wider text-dim">
                  <th className="px-4 py-3">Node Indicator</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Attributed Campaign</th>
                  <th className="px-4 py-3">Target Sector</th>
                  <th className="px-4 py-3">Campaign Status</th>
                  <th className="px-4 py-3">Infrastructure ASN</th>
                  <th className="px-4 py-3 text-right">Registrar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {filteredNodesTable.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-dim">
                      <Network className="mx-auto h-7 w-7 text-dim/40 mb-1" />
                      <p className="text-xs text-ink font-medium">No nodes match the active filters</p>
                      <p className="text-[11px] text-dim mt-0.5">Try resetting the node type filter</p>
                    </td>
                  </tr>
                ) : (
                  filteredNodesTable.map((node) => {
                    const typeBadge = getNodeTypeBadge(node.type);
                    const statusBadge = getStatusBadge(node.campaignStatus);

                    return (
                      <tr
                        key={`${node.campaignId}-${node.id}`}
                        className="group hover:bg-canvas/50 transition-colors"
                      >
                        {/* Indicator Label & ID */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-edge bg-canvas">
                              {getNodeTypeIcon(node.type)}
                            </span>
                            <div className="min-w-0">
                              <span className="block font-mono text-xs font-semibold text-ink truncate group-hover:text-accent transition-colors">
                                {node.label}
                              </span>
                              <span className="font-mono text-[10px] text-dim/80">
                                {node.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Node Type */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeBadge.classes}`}
                          >
                            {typeBadge.label}
                          </span>
                        </td>

                        {/* Origin Campaign */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-ink">
                            {node.campaignName}
                          </div>
                          <div className="font-mono text-[10px] text-dim">
                            {node.campaignId}
                          </div>
                        </td>

                        {/* Target Sector */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded bg-canvas/60 px-2 py-0.5 text-[11px] font-medium text-dim border border-edge">
                            <Building2 className="h-3 w-3 text-accent" />
                            {node.targetSector}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.classes}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                            {statusBadge.label}
                          </span>
                        </td>

                        {/* Infrastructure ASN */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-accent">
                          {node.asn || "—"}
                        </td>

                        {/* Registrar */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs text-dim">
                          {node.registrar || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-edge bg-canvas/50 px-4 py-3 text-xs text-dim gap-2">
            <div>
              Showing <strong className="text-ink">{filteredNodesTable.length}</strong> of{" "}
              <strong className="text-ink">{allAttributedNodes.length}</strong> total attributed nodes
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span>IPs</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-risk-amber" />
                <span>Domains</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-risk-red" />
                <span>Emails</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-risk-green" />
                <span>Artifacts</span>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
