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

export const CASES_LIST = [
  {
    id: "CASE-001",
    slug: "sbi-kyc",
    name: "SBI KYC Scam",
    category: "critical",
    date: "2026-09-06 14:32",
    data: mock01,
  },
  {
    id: "CASE-002",
    slug: "bec-wire",
    name: "BEC Wire Fraud",
    category: "bec",
    date: "2026-09-06 12:15",
    data: mock02,
  },
  {
    id: "CASE-003",
    slug: "clean-memo",
    name: "Clean Internal Memo",
    category: "clean",
    date: "2026-09-06 10:48",
    data: mock03,
  },
  {
    id: "CASE-004",
    slug: "itd-refund",
    name: "ITD Refund Spoof",
    category: "critical",
    date: "2026-09-05 18:20",
    data: mock04,
  },
  {
    id: "CASE-005",
    slug: "vendor-invoice",
    name: "Vendor Invoice Diversion",
    category: "bec",
    date: "2026-09-05 16:04",
    data: mock05,
  },
  {
    id: "CASE-006",
    slug: "it-helpdesk",
    name: "IT Helpdesk Harvest",
    category: "critical",
    date: "2026-09-05 11:30",
    data: mock06,
  },
  {
    id: "CASE-007",
    slug: "marketing-newsletter",
    name: "Marketing Newsletter",
    category: "clean",
    date: "2026-09-04 09:12",
    data: mock07,
  },
  {
    id: "CASE-008",
    slug: "university-compromise",
    name: "University Compromise",
    category: "critical",
    date: "2026-09-03 15:45",
    data: mock08,
  },
];

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
