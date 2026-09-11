'use client';

import React, { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, ShieldAlert, ChevronRight, FileText, Filter, Layers} from "lucide-react";
import {
  CASES_LIST,
  CATEGORIES,
  CAMPAIGN_CLUSTERS,
  getRiskBadgeClasses,
  getClassificationBadgeClasses,
  matchesCampaign,
} from "../../lib/cases";

function CasesTableContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignParam = searchParams.get("campaign") || searchParams.get("cluster") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [groupByCampaign, setGroupByCampaign] = useState(false);

  // Resolved display name for the active campaign filter chip
  const displayCampaign = useMemo(() => {
    if (!campaignParam) return "";
    const matchedCluster = CAMPAIGN_CLUSTERS.find(
      (c) =>
        c.id.toLowerCase() === campaignParam.toLowerCase() ||
        c.aliases.includes(campaignParam.toLowerCase())
    );
    return matchedCluster ? matchedCluster.id : campaignParam.toUpperCase();
  }, [campaignParam]);

  // Base list of cases scoped to active campaign query (if any)
  const campaignScopedCases = useMemo(() => {
    if (!campaignParam) return CASES_LIST;
    return CASES_LIST.filter((item) => matchesCampaign(item, campaignParam));
  }, [campaignParam]);

  // Counts for the category pills based on the campaign-scoped cases
  const categoryCounts = useMemo(() => {
    const counts = { all: campaignScopedCases.length, critical: 0, bec: 0, clean: 0 };
    for (const c of campaignScopedCases) {
      if (counts[c.category] !== undefined) {
        counts[c.category]++;
      }
    }
    return counts;
  }, [campaignScopedCases]);

  // Filtered cases based on category and search query
  const filteredCases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return campaignScopedCases.filter((item) => {
      // Category filter
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      // Search filter
      if (q) {
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesFilename = item.data?.filename?.toLowerCase().includes(q);
        const matchesSenderName = item.data?.sender?.name?.toLowerCase().includes(q);
        const matchesSenderEmail = item.data?.sender?.email?.toLowerCase().includes(q);
        const matchesClassification = item.data?.classification?.toLowerCase().includes(q);
        const matchesTyposquat = item.data?.iocs?.typosquat_target?.toLowerCase().includes(q);

        return (
          matchesId ||
          matchesName ||
          Boolean(matchesFilename) ||
          Boolean(matchesSenderName) ||
          Boolean(matchesSenderEmail) ||
          Boolean(matchesClassification) ||
          Boolean(matchesTyposquat)
        );
      }
      return true;
    });
  }, [campaignScopedCases, activeCategory, searchQuery]);

  // Grouped cases when "Group by Campaign" is toggled
  const caseGroups = useMemo(() => {
    if (!groupByCampaign) return null;

    const cluster1Cases = [];
    const cluster2Cases = [];
    const independentCases = [];

    filteredCases.forEach((item) => {
      if (item.clusterId === "AS61754" || item.clusterId === "AS197540") {
        cluster1Cases.push(item);
      } else if (item.clusterId === "AS20262" || item.clusterId === "AS13335") {
        cluster2Cases.push(item);
      } else {
        independentCases.push(item);
      }
    });

    const groups = [];
    if (cluster1Cases.length > 0) {
      groups.push({
        id: "AS61754",
        title: "Threat Cluster AS61754",
        dotColor: "bg-risk-red",
        cases: cluster1Cases,
      });
    }
    if (cluster2Cases.length > 0) {
      groups.push({
        id: "AS20262",
        title: "Threat Cluster AS20262",
        dotColor: "bg-risk-amber",
        cases: cluster2Cases,
      });
    }
    if (independentCases.length > 0) {
      groups.push({
        id: "independent",
        title: "Independent Cases",
        dotColor: "bg-dim",
        cases: independentCases,
      });
    }

    return groups;
  }, [groupByCampaign, filteredCases]);

  function handleSelectCase(slug) {
    router.push(`/?case=${slug}`);
  }

  function handleClearCampaignFilter() {
    router.push("/cases");
  }

  function handleResetAllFilters() {
    setSearchQuery("");
    setActiveCategory("all");
    if (campaignParam) {
      router.push("/cases");
    }
  }

  const renderCaseRow = (item) => {
    const score = item.data?.risk_score ?? 0;
    const classification = item.data?.classification ?? "unknown";
    const senderName = item.data?.sender?.name ?? "Unknown";
    const senderEmail = item.data?.sender?.email ?? "unknown@domain";
    const filename = item.data?.filename ?? "evidence.eml";

    return (
      <tr
        key={item.id}
        onClick={() => handleSelectCase(item.slug)}
        className="group cursor-pointer transition-colors hover:bg-canvas/80"
      >
        {/* Case ID */}
        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-accent">
          {item.id}
        </td>

        {/* Case Title & Raw File */}
        <td className="px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-ink group-hover:text-accent transition-colors">
              {item.name}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-dim">
              <FileText className="h-3 w-3" />
              {filename}
            </span>
          </div>
        </td>

        {/* Sender */}
        <td className="px-4 py-3.5">
          <div className="flex flex-col">
            <span className="text-ink">{senderName}</span>
            <span className="font-mono text-[11px] text-dim">{senderEmail}</span>
          </div>
        </td>

        {/* Classification */}
        <td className="whitespace-nowrap px-4 py-3.5">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${getClassificationBadgeClasses(
              classification
            )}`}
          >
            {classification.replace("_", " ")}
          </span>
        </td>

        {/* Risk Score */}
        <td className="whitespace-nowrap px-4 py-3.5">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${getRiskBadgeClasses(
              score
            )}`}
          >
            {score} Risk
          </span>
        </td>

        {/* Date */}
        <td className="whitespace-nowrap px-4 py-3.5 text-dim">
          {item.date}
        </td>

        {/* Trailing chevron indicating clickable row */}
        <td className="whitespace-nowrap px-4 py-3.5 text-right">
          <ChevronRight className="h-4 w-4 text-dim/50 transition-transform group-hover:translate-x-1 group-hover:text-accent ml-auto" />
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header section */}
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-edge bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dim">
                Forensics archive
              </span>
              <span className="text-xs text-dim">
                {CASES_LIST.length} ingested case files
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-ink tracking-tight">
              Case directory & evidence management
            </h1>
            <p className="text-xs text-dim">
              Searchable forensic database for suspect emails, threat telemetry, and identity forensics.
            </p>
          </div>
        </div>
      </header>

      {/* Active Campaign Filter Banner */}
      {campaignParam && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs text-accent shadow-sm">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 shrink-0" />
            <span>
              Filtering by campaign cluster: <strong>{campaignParam}</strong> ({filteredCases.length} correlated cases)
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/cases")}
            className="rounded-md border border-accent/30 bg-surface px-2.5 py-1 text-[11px] font-semibold text-accent hover:border-accent hover:text-ink transition-colors cursor-pointer"
          >
            Clear Filter (Show All 8 Cases)
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-edge bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex w-full items-center lg:w-96">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-dim"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case ID, title, filename, sender, or keyword..."
              className="w-full rounded-lg border border-edge bg-canvas py-2 pl-9 pr-8 text-xs text-ink placeholder:text-dim focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent/40 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-dim hover:text-ink transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills & Group By Campaign Toggle */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 text-xs text-dim">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              const count = categoryCounts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "border-accent bg-accent/15 text-accent shadow-xs"
                      : "border-edge bg-canvas/60 text-dim hover:border-edge/80 hover:bg-canvas hover:text-ink"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`inline-flex items-center justify-center rounded px-1.5 py-0.2 text-[10px] font-semibold leading-tight ${cat.badgeClasses}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Separator */}
            <div className="mx-1 h-4 w-px bg-edge hidden sm:block" />

            {/* Group by Campaign Toggle */}
            <button
              type="button"
              onClick={() => setGroupByCampaign((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                groupByCampaign
                  ? "border-accent bg-accent/15 text-accent shadow-xs ring-1 ring-accent/30"
                  : "border-edge bg-canvas/60 text-dim hover:border-edge/80 hover:bg-canvas hover:text-ink"
              }`}
            >
              <span>🗂️</span>
              <span>Group by Campaign</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Campaign Filter Chip */}
      {campaignParam && (
        <div className="mb-4 flex items-center gap-2 animate-in fade-in duration-150">
          <span className="text-xs text-dim">Active Filter:</span>
          <div className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-medium text-accent shadow-xs">
            <span>🏷️</span>
            <span>
              Campaign: {displayCampaign} ({filteredCases.length} {filteredCases.length === 1 ? "Case" : "Cases"})
            </span>
            <button
              type="button"
              onClick={handleClearCampaignFilter}
              className="ml-1 rounded p-0.5 text-accent/80 hover:bg-accent/20 hover:text-ink transition-colors cursor-pointer"
              title="Clear campaign filter and restore full directory"
              aria-label="Clear campaign filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Forensic Case Table */}
      <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-edge bg-canvas/60 text-[11px] font-semibold uppercase tracking-wider text-dim">
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Case title & file</th>
                <th className="px-4 py-3">Sender identity</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Risk score</th>
                <th className="px-4 py-3">Date ingested</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-dim">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-dim/60" />
                      <p className="text-sm font-medium text-ink">
                        No matching forensic cases found
                      </p>
                      <p className="text-xs text-dim">
                        {campaignParam
                          ? `No cases found for campaign "${displayCampaign}" matching your active filter criteria.`
                          : "Try adjusting your search query or reset the category filter."}
                      </p>
                      {(searchQuery || activeCategory !== "all" || campaignParam) && (
                        <button
                          type="button"
                          onClick={handleResetAllFilters}
                          className="mt-2 rounded-lg border border-edge bg-canvas px-3 py-1.5 text-xs text-accent hover:border-accent transition-colors cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : groupByCampaign && caseGroups ? (
                caseGroups.map((group) => (
                  <React.Fragment key={`group-frag-${group.title}`}>
                    {/* Clean Category Header */}
                    <tr className="border-y border-edge bg-canvas/90">
                      <td colSpan={7} className="px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${group.dotColor}`} />
                            <span className="font-mono text-xs font-bold text-ink">
                              {group.title} • {group.cases.length} {group.cases.length === 1 ? "case" : "cases"}
                            </span>
                          </div>
                          {group.id !== "independent" && (
                            <span className="font-mono text-[10px] text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                              {group.id}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {group.cases.map(renderCaseRow)}
                  </React.Fragment>
                ))
              ) : (
                filteredCases.map(renderCaseRow)
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Summary */}
        <div className="flex items-center justify-between border-t border-edge bg-canvas/40 px-4 py-2.5 text-xs text-dim">
          <span>
            Showing <strong className="text-ink">{filteredCases.length}</strong> of{" "}
            {CASES_LIST.length} total forensic cases
            {campaignParam && (
              <span className="ml-1 text-accent font-medium">
                (filtered by campaign {displayCampaign})
              </span>
            )}
          </span>
          <span className="text-[11px]">
            Click any row to open in investigation dashboard
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-6 text-xs text-dim">
          Loading forensic case archive...
        </div>
      }
    >
      <CasesTableContent />
    </Suspense>
  );
}
