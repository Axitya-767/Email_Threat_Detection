import mock01 from "../data/mock_responses/mock_01_sbi_kyc.json";
import mock02 from "../data/mock_responses/mock_02_bec_wire_fraud.json";
import mock03 from "../data/mock_responses/mock_03_clean_internal_memo.json";
import mock04 from "../data/mock_responses/mock_04_itd_refund_spoof.json";
import mock05 from "../data/mock_responses/mock_05_vendor_invoice_diversion.json";
import mock06 from "../data/mock_responses/mock_06_it_helpdesk_harvest.json";
import mock07 from "../data/mock_responses/mock_07_marketing_newsletter.json";
import mock08 from "../data/mock_responses/mock_08_university_compromise.json";

export const CATEGORIES = [
  {
    id: "all",
    label: "All Cases",
    badgeClasses: "border border-slate-700 bg-slate-800 text-slate-300",
  },
  {
    id: "critical",
    label: "Critical / Phishing",
    badgeClasses: "border border-red-500/30 bg-red-500/20 text-red-400",
  },
  {
    id: "bec",
    label: "BEC & Fraud",
    badgeClasses: "border border-amber-500/30 bg-amber-500/20 text-amber-400",
  },
  {
    id: "clean",
    label: "Clean / Internal",
    badgeClasses: "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
  },
];

export const CAMPAIGN_CLUSTERS = [
  {
    id: "AS61754",
    name: "Threat Cluster AS61754",
    aliases: ["as61754", "as197540", "camp-01", "camp-02"],
    caseIds: ["CASE-001", "CASE-004"],
  },
  {
    id: "AS20262",
    name: "Threat Cluster AS20262",
    aliases: ["as20262", "as13335", "camp-03", "camp-04"],
    caseIds: ["CASE-002", "CASE-005"],
  },
];

export const CASES_LIST = [
  {
    id: "CASE-001",
    slug: "sbi-kyc",
    name: "SBI KYC Scam",
    category: "critical",
    campaignId: "camp-01",
    clusterId: "AS61754",
    clusterName: "Threat Cluster AS61754",
    date: "2026-09-06 14:32",
    data: mock01,
  },
  {
    id: "CASE-002",
    slug: "bec-wire",
    name: "BEC Wire Fraud",
    category: "bec",
    campaignId: "camp-03",
    clusterId: "AS20262",
    clusterName: "Threat Cluster AS20262",
    date: "2026-09-06 12:15",
    data: mock02,
  },
  {
    id: "CASE-003",
    slug: "clean-memo",
    name: "Clean Internal Memo",
    category: "clean",
    campaignId: null,
    clusterId: null,
    clusterName: "Independent Cases",
    date: "2026-09-06 10:48",
    data: mock03,
  },
  {
    id: "CASE-004",
    slug: "itd-refund",
    name: "ITD Refund Spoof",
    category: "critical",
    campaignId: "camp-02",
    clusterId: "AS61754",
    clusterName: "Threat Cluster AS61754",
    date: "2026-09-05 18:20",
    data: mock04,
  },
  {
    id: "CASE-005",
    slug: "vendor-invoice",
    name: "Vendor Invoice Diversion",
    category: "bec",
    campaignId: "camp-03",
    clusterId: "AS20262",
    clusterName: "Threat Cluster AS20262",
    date: "2026-09-05 16:04",
    data: mock05,
  },
  {
    id: "CASE-006",
    slug: "it-helpdesk",
    name: "IT Helpdesk Harvest",
    category: "critical",
    campaignId: null,
    clusterId: null,
    clusterName: "Independent Cases",
    date: "2026-09-05 11:30",
    data: mock06,
  },
  {
    id: "CASE-007",
    slug: "marketing-newsletter",
    name: "Marketing Newsletter",
    category: "clean",
    campaignId: null,
    clusterId: null,
    clusterName: "Independent Cases",
    date: "2026-09-04 09:12",
    data: mock07,
  },
  {
    id: "CASE-008",
    slug: "university-compromise",
    name: "University Compromise",
    category: "critical",
    campaignId: null,
    clusterId: null,
    clusterName: "Independent Cases",
    date: "2026-09-03 15:45",
    data: mock08,
  },
];

export function matchesCampaign(caseItem, campaignQuery) {
  if (!campaignQuery) return true;
  const q = String(campaignQuery).toLowerCase().trim();

  // Direct match on clusterId or campaignId
  if (caseItem.clusterId && caseItem.clusterId.toLowerCase() === q) return true;
  if (caseItem.campaignId && caseItem.campaignId.toLowerCase() === q) return true;

  // Check cluster aliases
  const cluster = CAMPAIGN_CLUSTERS.find(
    (c) => c.id.toLowerCase() === q || c.aliases.includes(q)
  );
  if (cluster && cluster.caseIds.includes(caseItem.id)) {
    return true;
  }

  return false;
}

export function getRiskBadgeClasses(score) {
  if (score >= 70) {
    return "border border-red-500/30 bg-red-500/20 text-red-400";
  }
  if (score >= 40) {
    return "border border-amber-500/30 bg-amber-500/20 text-amber-400";
  }
  return "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400";
}

export function getClassificationBadgeClasses(classification) {
  const c = String(classification || "").toLowerCase();
  if (c === "phishing") {
    return "border border-red-500/30 bg-red-500/10 text-red-400";
  }
  if (c === "bec" || c === "payment_diversion") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-400";
  }
  if (c === "compromised_account") {
    return "border border-purple-500/30 bg-purple-500/10 text-purple-400";
  }
  if (c === "marketing") {
    return "border border-sky-500/30 bg-sky-500/10 text-sky-400";
  }
  return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
}

export function maskEmail(email) {
  if (!email || typeof email !== "string") return "[REDACTED]";
  const [local, domain] = email.split("@");
  if (!domain) return "[REDACTED]";
  const maskedLocal =
    local.length > 2
      ? `${local[0]}***${local[local.length - 1]}`
      : `${local[0] || ""}***`;
  return `${maskedLocal}@${domain}`;
}

export function maskName(name) {
  if (!name || typeof name !== "string") return "[REDACTED]";
  return name
    .split(" ")
    .map((word) => (word.length > 1 ? `${word[0]}***` : `${word}***`))
    .join(" ");
}

export function maskIp(ip) {
  if (!ip || typeof ip !== "string") return "[REDACTED]";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return "[MASKED_IP]";
}

export function maskEntity(val) {
  if (!val || typeof val !== "string") return val;
  if (val.includes("@")) return maskEmail(val);
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val)) return maskIp(val);
  return val;
}

export function sanitizeReport(data, isMasked) {
  if (!data) return {};
  if (!isMasked) return data;

  return {
    ...data,
    sender: {
      ...data.sender,
      name: maskName(data.sender?.name),
      email: maskEmail(data.sender?.email),
    },
    trace: Array.isArray(data.trace)
      ? data.trace.map((hop) => ({
          ...hop,
          ip: maskIp(hop.ip),
        }))
      : [],
    iocs: {
      ...data.iocs,
      artifacts: Array.isArray(data.iocs?.artifacts)
        ? data.iocs.artifacts.map(() => "[REDACTED_IOC]")
        : [],
    },
    relationships: {
      nodes: Array.isArray(data.relationships?.nodes)
        ? data.relationships.nodes.map((node) => {
            if (node.type === "ip") {
              return { ...node, label: maskIp(node.label) };
            }
            if (node.type === "email") {
              return { ...node, label: maskEmail(node.label) };
            }
            return node;
          })
        : [],
      edges: Array.isArray(data.relationships?.edges)
        ? data.relationships.edges.map((e) => ({
            ...e,
            from: maskEntity(e.from),
            to: maskEntity(e.to),
          }))
        : [],
    },
  };
}
