'use client';

import { useState, useEffect, useRef } from "react";
import {
  HelpCircle,
  X,
  ChevronDown,
  Shield,
  FileText,
  Layers,
  Search,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

const FAQ_ITEMS = [
  {
    id: "risk-score",
    question: "What does the Risk Score mean?",
    answer:
      "The Risk Score (0–100) measures overall email threat severity by aggregating findings across four telemetry quadrants: header routing anomalies, authentication failures, linguistic phishing intent, and domain reputation. Scores of 75 and above indicate critical threats requiring immediate quarantine or SOC escalation.",
  },
  {
    id: "pii-shield",
    question: "What does PII Shield do?",
    answer:
      "PII Shield automatically redacts sensitive personal identifiers—such as sender names, employee email addresses, and internal domains—to ensure privacy compliance during investigations. Authorized analysts can temporarily reveal unmasked details by providing an audited justification and investigator PIN.",
  },
  {
    id: "auth-checks",
    question: "What do SPF/DKIM/DMARC checks mean?",
    answer:
      "These are standard email security protocols. SPF verifies whether the sending server IP is authorized for the domain, DKIM validates the message's cryptographic signature, and DMARC dictates enforcement policy when alignment fails. A fail or soft-fail strongly signals domain spoofing or unauthorized relay hops.",
  },
  {
    id: "export-report",
    question: "How do I export a forensic report?",
    answer:
      "Click the 'Export Report' button located in the dashboard header or on any case view. You can generate a comprehensive executive PDF report, download a sanitized IOC bundle (JSON/CSV) for SIEM ingestion, or copy the raw header forensic trace directly to your clipboard.",
  },
  {
    id: "campaign-correlation",
    question: "What is campaign correlation?",
    answer:
      "Campaign correlation identifies broader phishing waves by linking disparate email cases that share underlying threat actor infrastructure. It clusters incidents by matching Autonomous System Numbers (ASN), bulletproof C2 IP subnets, and domain registrar patterns, revealing coordinated attacks across organizations.",
  },
];

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [openAccordionId, setOpenAccordionId] = useState("risk-score");
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleAccordion = (id) => {
    setOpenAccordionId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {/* Floating Circular Help Button Fixed at Bottom-Right */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Forensic Platform Help & FAQ"
        aria-expanded={isOpen}
        className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border shadow-xl transition-all duration-200 cursor-pointer ${
          isOpen
            ? "border-accent bg-accent text-canvas scale-105 shadow-accent/20"
            : "border-edge bg-surface text-ink hover:border-accent/60 hover:text-accent hover:scale-105 hover:shadow-2xl"
        }`}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <span className="text-base font-bold">?</span>
        )}
      </button>

      {/* Slide-Up FAQ Panel / Modal */}
      {isOpen && (
        <div
          ref={modalRef}
          role="dialog"
          aria-label="Forensic FAQ Panel"
          className="fixed bottom-20 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-edge bg-surface p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Panel Header */}
          <div className="flex items-start justify-between border-b border-edge/80 pb-3.5 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/15 text-accent">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-ink">
                  Platform Forensic Guide
                </h3>
                <p className="text-[11px] text-dim">
                  Frequently asked questions &amp; triage reference
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-dim hover:bg-canvas hover:text-ink transition-colors"
              aria-label="Close help modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Accordion FAQ List */}
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2 divide-y divide-edge/40">
            {FAQ_ITEMS.map((item, idx) => {
              const isExpanded = openAccordionId === item.id;
              return (
                <div key={item.id} className={idx === 0 ? "" : "pt-2"}>
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.id)}
                    className="flex w-full items-center justify-between gap-3 text-left py-1 group cursor-pointer"
                    aria-expanded={isExpanded}
                  >
                    <span
                      className={`text-xs font-semibold transition-colors ${
                        isExpanded ? "text-accent" : "text-ink group-hover:text-accent"
                      }`}
                    >
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-dim transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-accent" : "group-hover:text-ink"
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="mt-1.5 rounded-lg bg-canvas/60 border border-edge/60 p-2.5 text-[11px] text-dim leading-relaxed animate-in fade-in duration-150">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-3.5 border-t border-edge/80 pt-2.5 flex items-center justify-between text-[10px] text-dim">
            <span>SOC Telemetry &amp; CTI v1.4</span>
            <span className="flex items-center gap-1 text-accent">
              <span>Low-light SOC Mode</span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
