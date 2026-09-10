#!/usr/bin/env python3
"""
Forensic Investigation PDF Generator
Generates formal, print-oriented A4 PDF documents for email threat cases.
Strictly black, white, and neutral grey styling matching law-enforcement
and digital forensic examination standards.
Uses standard PDF 1.4 primitives without external dependencies.
"""

import os
import json
import re

PAGE_WIDTH = 595.28   # A4 width in points
PAGE_HEIGHT = 841.89  # A4 height in points
MARGIN_LEFT = 45.0
MARGIN_RIGHT = 45.0
MARGIN_TOP = 50.0
MARGIN_BOTTOM = 50.0
USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

class PDFBuilder:
    def __init__(self, case_id, report_title):
        self.case_id = case_id
        self.report_title = report_title
        self.pages = []
        self.current_page_ops = []
        self.current_y = PAGE_HEIGHT - MARGIN_TOP

    def new_page(self):
        if self.current_page_ops:
            self.pages.append(self.current_page_ops)
        self.current_page_ops = []
        self.current_y = PAGE_HEIGHT - MARGIN_TOP

    def check_space(self, needed):
        if self.current_y - needed < MARGIN_BOTTOM + 25:
            self.new_page()

    def escape_text(self, text):
        if not text:
            return ""
        # Escape parenthesis and backslashes for PDF string literal
        text = str(text)
        text = text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        # Replace non-ascii with closest ascii representation
        return text.encode('ascii', 'replace').decode('ascii')

    def add_line(self, x1, y1, x2, y2, width=0.5):
        self.current_page_ops.append(f"{width:.2f} w 0 0 0 RG {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def add_rect(self, x, y, w, h, fill=None, stroke=0.5):
        ops = []
        if fill is not None:
            ops.append(f"{fill:.2f} g")
        if stroke:
            ops.append(f"{stroke:.2f} w 0 0 0 RG")
        op_code = "B" if (fill is not None and stroke) else ("f" if fill is not None else "S")
        ops.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re {op_code}")
        self.current_page_ops.append(" ".join(ops))

    def add_text(self, text, x, y, font="F1", size=10, bold=False):
        f = "F2" if bold else font
        safe_text = self.escape_text(text)
        self.current_page_ops.append(f"BT /{f} {size:.2f} Tf 0 g {x:.2f} {y:.2f} Td ({safe_text}) Tj ET")

    def add_paragraph(self, text, font="F1", size=9, bold=False, line_spacing=12, width=USABLE_WIDTH):
        words = str(text).split()
        if not words:
            return
        lines = []
        cur_line = []
        # Approximate char width factor for Helvetica (~0.52 * size)
        char_w = size * 0.51
        max_chars = int(width / char_w)

        for w in words:
            test_line = " ".join(cur_line + [w])
            if len(test_line) <= max_chars:
                cur_line.append(w)
            else:
                if cur_line:
                    lines.append(" ".join(cur_line))
                cur_line = [w]
        if cur_line:
            lines.append(" ".join(cur_line))

        for line in lines:
            self.check_space(line_spacing)
            self.add_text(line, MARGIN_LEFT, self.current_y, font=font, size=size, bold=bold)
            self.current_y -= line_spacing

    def add_heading(self, title):
        self.check_space(32)
        self.current_y -= 10
        self.add_line(MARGIN_LEFT, self.current_y + 16, MARGIN_LEFT + USABLE_WIDTH, self.current_y + 16, width=1.0)
        self.add_text(title, MARGIN_LEFT, self.current_y + 4, font="F2", size=10.5, bold=True)
        self.add_line(MARGIN_LEFT, self.current_y, MARGIN_LEFT + USABLE_WIDTH, self.current_y, width=0.5)
        self.current_y -= 12

    def add_table(self, headers, rows, col_widths, font_size=8.5, row_height=17):
        needed = (len(rows) + 1) * row_height + 10
        self.check_space(min(needed, 100))

        table_x = MARGIN_LEFT
        total_w = sum(col_widths)

        # Header row
        self.add_rect(table_x, self.current_y - row_height, total_w, row_height, fill=0.92, stroke=0.75)
        cur_x = table_x
        for i, h in enumerate(headers):
            self.add_text(h, cur_x + 5, self.current_y - row_height + 5, font="F2", size=font_size, bold=True)
            cur_x += col_widths[i]
        self.current_y -= row_height

        # Data rows
        for r_idx, row in enumerate(rows):
            self.check_space(row_height + 5)
            fill_val = 0.98 if r_idx % 2 == 1 else 1.0
            self.add_rect(table_x, self.current_y - row_height, total_w, row_height, fill=fill_val, stroke=0.5)
            cur_x = table_x
            for c_idx, cell in enumerate(row):
                val_str = str(cell) if cell is not None else "—"
                # Truncate if exceeds col width
                max_len = int((col_widths[c_idx] - 8) / (font_size * 0.52))
                if len(val_str) > max_len and max_len > 3:
                    val_str = val_str[:max_len - 3] + "..."
                self.add_text(val_str, cur_x + 5, self.current_y - row_height + 5, font="F1", size=font_size, bold=False)
                cur_x += col_widths[c_idx]
            self.current_y -= row_height

        self.current_y -= 8

    def build_pdf_bytes(self):
        if self.current_page_ops:
            self.pages.append(self.current_page_ops)

        total_pages = len(self.pages)
        objects = []

        # We will dynamically compile PDF objects
        # 1: Catalog
        # 2: Pages
        # 3.. 3+total_pages-1: Page objects
        # Next: Contents streams
        # Next: Font F1 (Helvetica), Font F2 (Helvetica-Bold)

        pdf_lines = []
        pdf_lines.append("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

        # Track byte offsets for xref
        offsets = {}

        def add_obj(obj_num, body):
            offsets[obj_num] = sum(len(line) for line in pdf_lines)
            pdf_lines.append(f"{obj_num} 0 obj\n{body}\nendobj\n")

        # Catalog
        add_obj(1, "<< /Type /Catalog /Pages 2 0 R >>")

        # Pages collection
        page_refs = " ".join([f"{3 + i} 0 R" for i in range(total_pages)])
        add_obj(2, f"<< /Type /Pages /Kids [{page_refs}] /Count {total_pages} >>")

        font_f1_num = 3 + total_pages * 2
        font_f2_num = font_f1_num + 1

        # Create pages and contents
        for i, ops in enumerate(self.pages):
            page_num = 3 + i
            content_num = 3 + total_pages + i

            # Add running header and footer into operations
            header_footer_ops = []
            page_str = f"Page {i + 1} of {total_pages}"
            case_header = f"CONFIDENTIAL // LAW ENFORCEMENT & FORENSIC USE ONLY - CASE ID: {self.case_id}"
            footer_str = f"Forensic Examination Report | Case ID: {self.case_id} | Platform Evidence Record"

            header_footer_ops.append(f"0.3 w 0.4 g {MARGIN_LEFT:.2f} {PAGE_HEIGHT - 32:.2f} m {MARGIN_LEFT + USABLE_WIDTH:.2f} {PAGE_HEIGHT - 32:.2f} l S")
            header_footer_ops.append(f"BT /F2 7 Tf 0.2 g {MARGIN_LEFT:.2f} {PAGE_HEIGHT - 28:.2f} Td ({self.escape_text(case_header)}) Tj ET")

            header_footer_ops.append(f"0.3 w 0.4 g {MARGIN_LEFT:.2f} 32 m {MARGIN_LEFT + USABLE_WIDTH:.2f} 32 l S")
            header_footer_ops.append(f"BT /F1 7.5 Tf 0.3 g {MARGIN_LEFT:.2f} 22 Td ({self.escape_text(footer_str)}) Tj ET")
            header_footer_ops.append(f"BT /F2 7.5 Tf 0.3 g {MARGIN_LEFT + USABLE_WIDTH - 60:.2f} 22 Td ({self.escape_text(page_str)}) Tj ET")

            full_stream = "\n".join(header_footer_ops + ops)
            stream_bytes = full_stream.encode('ascii')
            stream_len = len(stream_bytes)

            add_obj(page_num, f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH:.2f} {PAGE_HEIGHT:.2f}] "
                              f"/Contents {content_num} 0 R "
                              f"/Resources << /Font << /F1 {font_f1_num} 0 R /F2 {font_f2_num} 0 R >> >> >>")

            add_obj(content_num, f"<< /Length {stream_len} >>\nstream\n{full_stream}\nendstream")

        # Fonts
        add_obj(font_f1_num, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        add_obj(font_f2_num, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

        xref_offset = sum(len(line) for line in pdf_lines)
        total_objects = font_f2_num

        pdf_lines.append(f"xref\n0 {total_objects + 1}\n")
        pdf_lines.append("0000000000 65535 f \n")
        for obj_idx in range(1, total_objects + 1):
            offset = offsets.get(obj_idx, 0)
            pdf_lines.append(f"{offset:010d} 00000 n \n")

        pdf_lines.append(f"trailer\n<< /Size {total_objects + 1} /Root 1 0 R >>\n")
        pdf_lines.append(f"startxref\n{xref_offset}\n%%EOF\n")

        return "".join(pdf_lines).encode('latin1')

def generate_report_for_case(case_info, output_dir):
    data = case_info["data"]
    case_id = case_info["id"]
    report_title = case_info.get("name", "Forensic Threat Investigation")
    
    doc = PDFBuilder(case_id, report_title)

    # Document Header Title
    doc.current_y -= 8
    doc.add_text("EMAIL THREAT FORENSIC INVESTIGATION REPORT", MARGIN_LEFT, doc.current_y, font="F2", size=15, bold=True)
    doc.current_y -= 14
    doc.add_text("OFFICIAL DIGITAL FORENSIC EXAMINATION DOSSIER // LAW ENFORCEMENT & SOC RECORD", MARGIN_LEFT, doc.current_y, font="F1", size=8, bold=False)
    doc.current_y -= 14
    doc.add_line(MARGIN_LEFT, doc.current_y, MARGIN_LEFT + USABLE_WIDTH, doc.current_y, width=1.5)
    doc.current_y -= 12

    # Case Metadata Summary Table
    meta_headers = ["Case Identifier", "Examination Date", "Investigation Status", "Evidence Hash (SHA-256)"]
    meta_rows = [
        [case_id, case_info.get("date", "2026-09-06"), "VERIFIED EXAMINATION", data.get("sha256", "N/A")[:28] + "..."],
        [f"Classification: {data.get('classification', 'N/A').upper()}", f"Risk Score: {data.get('risk_score', 0)} / 100", f"Sample: {data.get('filename', 'email.eml')}", f"File Size: {data.get('file_size_kb', 0)} KB"]
    ]
    doc.add_table(meta_headers, meta_rows, [120, 110, 120, 155], font_size=7.5, row_height=15)

    # 1.0 Executive Summary
    doc.add_heading("1.0 EXECUTIVE SUMMARY")
    risk_score = data.get("risk_score", 0)
    classification = data.get("classification", "unclassified").upper()
    sender_name = data.get("sender", {}).get("name", "Unknown")
    sender_email = data.get("sender", {}).get("email", "unknown@domain")
    filename = data.get("filename", "evidence.eml")
    
    summary_p1 = (
        f"A forensic examination was conducted on evidence sample '{filename}' cataloged under reference {case_id}. "
        f"The electronic message claims transmission from sender '{sender_name}' ({sender_email}). Automated and "
        f"deterministic protocol evaluation assessed an authoritative risk score of {risk_score} out of 100, "
        f"resulting in a forensic threat classification of {classification}."
    )
    doc.add_paragraph(summary_p1, size=8.5, line_spacing=12)

    auth = data.get("authentication", {})
    spf = auth.get("spf", "none").upper()
    dkim = auth.get("dkim", "none").upper()
    dmarc = auth.get("dmarc", "none").upper()
    typosquat = data.get("iocs", {}).get("typosquat_target")
    
    summary_p2 = (
        f"Authentication protocol verification recorded SPF: {spf}, DKIM: {dkim}, and DMARC: {dmarc}. "
        + (f"The message was accompanied by an identified lookalike typosquat target domain ({typosquat}), indicating intentional brand impersonation. " if typosquat else "No direct lookalike domain registration was detected in the immediate IOC telemetry. ")
        + f"Routing telemetry analyzed {len(data.get('trace', []))} relay hops from origin to terminal destination server."
    )
    doc.add_paragraph(summary_p2, size=8.5, line_spacing=12)

    # 2.0 Email Evidence Specifications
    doc.add_heading("2.0 EMAIL & EVIDENCE SPECIFICATIONS")
    ev_headers = ["Evidence Field", "Forensic Data Value", "Verification Finding"]
    ev_rows = [
        ["Original Filename", filename, "Binary structure parsed and preserved"],
        ["File Size", f"{data.get('file_size_kb', 0)} KB", "Standard envelope size"],
        ["Cryptographic Hash", data.get("sha256", "N/A"), "SHA-256 cryptographic integrity confirmed"],
        ["Claimed Sender Name", sender_name, "Header-extracted display name"],
        ["Claimed Sender Email", sender_email, "Header From address"],
        ["Terminal Mail Server", data.get("trace", [{}])[-1].get("place", "Destination Server") if data.get("trace") else "N/A", "Terminal destination host"],
        ["Originating Node", data.get("trace", [{}])[0].get("ip", "N/A") if data.get("trace") else "N/A", "First recorded external IP hop"]
    ]
    doc.add_table(ev_headers, ev_rows, [130, 220, 155], font_size=8, row_height=15)

    # 3.0 Authentication Protocol Analysis
    doc.add_heading("3.0 AUTHENTICATION PROTOCOL ANALYSIS")
    doc.add_paragraph(
        "Standard email authentication protocols were checked against published Domain Name System (DNS) records. "
        "Discrepancies indicate that the sending infrastructure was not authorized to transmit on behalf of the domain.",
        size=8.5, line_spacing=11
    )
    auth_headers = ["Protocol", "Verdict", "Technical Examination Finding"]
    auth_rows = [
        [
            "SPF (Sender Policy Framework)",
            spf,
            "Authorized host check: Sending server IP is not listed in domain SPF record" if spf == "FAIL" else ("Sending host verified against authorized SPF record" if spf == "PASS" else "Softfail / record neutral")
        ],
        [
            "DKIM (DomainKeys Identified)",
            dkim,
            "Cryptographic signature check: Missing or invalid public key cryptographic signature" if dkim == "FAIL" else ("Valid cryptographic signature verified against DNS public key" if dkim == "PASS" else "No DKIM signature found in message header")
        ],
        [
            "DMARC (Domain Alignment)",
            dmarc,
            "Domain alignment policy check: Failed alignment criteria with published domain policy" if dmarc == "FAIL" else ("Message satisfies alignment policy for domain" if dmarc == "PASS" else "DMARC policy absent or inconclusive")
        ]
    ]
    doc.add_table(auth_headers, auth_rows, [140, 70, 295], font_size=8, row_height=16)

    # 4.0 Header & Routing Infrastructure
    doc.add_heading("4.0 HEADER & ROUTING INFRASTRUCTURE")
    trace = data.get("trace", [])
    if trace:
        doc.add_paragraph(
            f"The message envelope traversed {len(trace)} recorded network transit hops. "
            "Network infrastructure was cross-referenced with autonomous system records and datacenter threat feeds.",
            size=8.5, line_spacing=11
        )
        route_headers = ["Hop", "IP Address", "Geographic Location", "Relay Timestamp", "Forensic Infrastructure Note"]
        route_rows = []
        for h in trace:
            route_rows.append([
                f"#{h.get('hop_order', 1)}",
                h.get("ip", "—"),
                h.get("place", "—"),
                h.get("relayed_at", "—")[:19].replace('T', ' '),
                h.get("note", "Standard relay")
            ])
        doc.add_table(route_headers, route_rows, [35, 95, 115, 105, 155], font_size=7.5, row_height=14)
    else:
        doc.add_paragraph("Routing telemetry trace is not available in supplied evidence.", size=8.5)

    # 5.0 Language, Intent & Content Analysis
    doc.add_heading("5.0 LANGUAGE, INTENT & CONTENT ANALYSIS")
    nlp_findings = data.get("nlp_findings", [])
    quadrants = data.get("quadrants", {})
    nlp_score = quadrants.get("nlp_language", 0)
    doc.add_paragraph(
        f"Content linguistics and social engineering vectors were scored at {nlp_score} out of 30 maximum allocated points. "
        "Extracted textual phrases were analyzed for deception patterns, urgency cues, and financial solicitation.",
        size=8.5, line_spacing=11
    )
    if nlp_findings:
        nlp_headers = ["Category / Signal", "Detected Phrasing / Pattern", "Confidence Assessment"]
        nlp_rows = []
        for f in nlp_findings:
            nlp_rows.append([
                f.get("label", "suspicious").upper().replace('_', ' '),
                f'"{f.get("phrase", "N/A")}"',
                f"{float(f.get('confidence', 0.85)) * 100:.1f}% Match"
            ])
        doc.add_table(nlp_headers, nlp_rows, [140, 265, 100], font_size=8, row_height=15)
    else:
        doc.add_paragraph("No explicit semantic NLP phrase extractions cataloged for this sample.", size=8.5)

    # 6.0 Reputation & Domain Intelligence
    doc.add_heading("6.0 REPUTATION & DOMAIN INTELLIGENCE")
    iocs = data.get("iocs", {})
    domain_age = iocs.get("domain_age_days")
    rep_score = quadrants.get("reputation", 0)
    rep_headers = ["Attribute", "Observed Evidence", "Analyst Interpretation"]
    rep_rows = [
        [
            "Domain Age",
            f"{domain_age} days" if domain_age is not None else "Established corporate domain",
            "High anomaly: Domain registered immediately prior to campaign" if (domain_age and domain_age < 30) else "Domain age within normal operational thresholds"
        ],
        [
            "Typosquatting Target",
            typosquat if typosquat else "None observed",
            "Deliberate brand impersonation targeting legitimate entity" if typosquat else "No typosquatting target observed"
        ],
        [
            "Reputation Score Contribution",
            f"{rep_score} / 15 pts",
            "Elevated risk: Associated infrastructure flagged in threat repositories" if rep_score > 8 else "Reputation scores reflect standard operational indicators"
        ]
    ]
    doc.add_table(rep_headers, rep_rows, [130, 160, 215], font_size=8, row_height=15)

    # 7.0 Indicators of Compromise (IOCs)
    doc.add_heading("7.0 INDICATORS OF COMPROMISE (IOCs)")
    doc.add_paragraph(
        "The following actionable technical indicators were extracted during examination for perimeter blocklisting and SIEM correlation:",
        size=8.5, line_spacing=11
    )
    ioc_headers = ["Indicator Type", "Technical Value", "Context / Threat Finding"]
    ioc_rows = []
    if trace:
        ioc_rows.append(["IP Address (Origin)", trace[0].get("ip", "N/A"), "Originating relay host observed in header"])
    if sender_email:
        ioc_rows.append(["Email Address", sender_email, "Header From address"])
    if typosquat:
        ioc_rows.append(["Typosquat Target", typosquat, "Target brand impersonated in attack"])
    for art in iocs.get("artifacts", []):
        ioc_rows.append(["Forensic Artifact", art, "Extracted payment/URL artifact"])
    ioc_rows.append(["File Hash (SHA-256)", data.get("sha256", "N/A"), "Unique cryptographic hash of message payload"])
    doc.add_table(ioc_headers, ioc_rows, [120, 210, 175], font_size=8, row_height=15)

    # 8.0 Attribution Assessment
    doc.add_heading("8.0 ATTRIBUTION ASSESSMENT")
    # Determine attribution
    if spf == "FAIL" and typosquat:
        attr_title = f"Likely spoofed domain impersonating {typosquat}"
        attr_exp = "Authentication failures combined with a detected lookalike domain registration establish clear domain spoofing."
    elif any("flagged" in str(h.get("note","")).lower() or "bulletproof" in str(h.get("note","")).lower() for h in trace):
        attr_title = "Anonymized / hosting infrastructure"
        attr_exp = "Origin infrastructure utilized bulletproof or datacenter hosting to obscure attacker physical identity."
    elif spf == "PASS" and (nlp_score > 12 or rep_score > 6):
        attr_title = "Likely compromised legitimate account"
        attr_exp = "Authentication protocols validated successfully; however, anomalous content indicates account takeover."
    else:
        attr_title = "No attribution concerns"
        attr_exp = "No anomalous attribution signatures were identified in available telemetry."

    doc.add_paragraph(f"ATTRIBUTION FINDING: {attr_title.upper()}", font="F2", size=9, bold=True)
    doc.add_paragraph(attr_exp, size=8.5, line_spacing=12)
    doc.add_paragraph(
        "Note: Attribution conclusions represent technical forensic assessments based on available telemetry "
        "and do not constitute definitive legal identification without formal judicial subpoena records.",
        size=8, line_spacing=10
    )

    # 9.0 Correlation & Infrastructure Relationships
    rel = data.get("relationships", {})
    edges = rel.get("edges", [])
    if edges:
        doc.add_heading("9.0 CORRELATION & INFRASTRUCTURE RELATIONSHIPS")
        doc.add_paragraph(
            "Graph analysis cross-referenced entities across historical telemetry clusters and previous incident dossiers:",
            size=8.5, line_spacing=11
        )
        rel_headers = ["Source Entity", "Target Entity", "Correlation Basis / Linkage"]
        rel_rows = []
        for e in edges:
            rel_rows.append([e.get("from", "—"), e.get("to", "—"), e.get("reason", "Correlated infrastructure")])
        doc.add_table(rel_headers, rel_rows, [140, 140, 225], font_size=8, row_height=14)

    # 10.0 Risk Assessment & Signal Weighting
    doc.add_heading("10.0 RISK ASSESSMENT & SIGNAL WEIGHTING")
    doc.add_paragraph(
        f"Overall Risk Score: {risk_score} / 100 (Threshold evaluation: "
        + ("CRITICAL RISK" if risk_score >= 80 else ("HIGH RISK" if risk_score >= 60 else ("MODERATE RISK" if risk_score >= 30 else "LOW RISK")))
        + "). The score is derived across four standardized examination quadrants:",
        size=8.5, line_spacing=11
    )
    quad_headers = ["Quadrant Vector", "Allocated Weight", "Observed Score", "Analytical Contribution"]
    quad_rows = [
        ["Header & Routing", "30 pts", f"{quadrants.get('header_routing', 0)} pts", "Evaluates relay anomaly, ASN hosting, and header consistency"],
        ["Authentication Failure", "25 pts", f"{quadrants.get('auth_failure', 0)} pts", "Evaluates SPF, DKIM signature validity, and DMARC enforcement"],
        ["Language & Intent", "30 pts", f"{quadrants.get('nlp_language', 0)} pts", "Evaluates urgency, financial diversion, and social engineering"],
        ["Reputation & History", "15 pts", f"{quadrants.get('reputation', 0)} pts", "Evaluates domain age, typosquatting targets, and threat database flags"]
    ]
    doc.add_table(quad_headers, quad_rows, [140, 80, 85, 200], font_size=8, row_height=15)

    # 11.0 Key Investigation Findings
    doc.add_heading("11.0 KEY INVESTIGATION FINDINGS")
    findings = []
    if risk_score >= 70:
        findings.append("1. High-confidence threat signature: Overall threat score exceeds enterprise containment threshold.")
    else:
        findings.append("1. Low-risk baseline: Overall threat telemetry satisfies benign operational profile.")
    
    if spf == "FAIL" or dkim == "FAIL" or dmarc == "FAIL":
        findings.append("2. Message failed authentication verification: Sending host lacks authoritative domain alignment.")
    else:
        findings.append("2. Authentication verified: Cryptographic signatures and domain alignment passed checks.")

    if typosquat:
        findings.append(f"3. Lookalike brand impersonation identified: Attacker targeted legitimate entity '{typosquat}'.")
    else:
        findings.append("3. Domain registration integrity: No deceptive lookalike typography detected.")

    if trace and "flagged" in str(trace[0].get("note", "")).lower():
        findings.append(f"4. Originating host flagged: Relay hop #{trace[0].get('hop_order')} hosted on flagged datacenter infrastructure.")
    else:
        findings.append("4. Origin routing: Outbound transmission originated from standard commercial/workspace relay.")

    for f in findings:
        doc.add_paragraph(f, size=8.5, line_spacing=12)

    # 12.0 Recommended Investigation Actions
    doc.add_heading("12.0 RECOMMENDED INVESTIGATION ACTIONS")
    actions = []
    if risk_score >= 70:
        actions.append("1. Evidence Preservation: Retain full raw RFC 5322 message headers and message body in forensic storage.")
        if trace:
            actions.append(f"2. Network Containment: Implement perimeter firewall block on originating IP {trace[0].get('ip')}.")
        if typosquat:
            actions.append(f"3. DNS Mitigation: Issue internal DNS sinkhole rule for identified typosquatting target {typosquat}.")
        actions.append("4. Incident Response: Query mail gateway logs for all inbound messages matching the sending domain within past 30 days.")
        actions.append("5. Account Safeguards: Enforce credential reset and session termination for any recipient who engaged with message content.")
    else:
        actions.append("1. Routine Monitoring: Retain evidence hash in SOC telemetry archive for longitudinal baseline monitoring.")
        actions.append("2. No Blocking Required: Communication parameters match verified corporate or standard commercial baselines.")

    for a in actions:
        doc.add_paragraph(a, size=8.5, line_spacing=12)

    # 13.0 Architecture Note (AI Generation)
    doc.add_heading("13.0 AUTOMATED NARRATIVE GENERATION ARCHITECTURE NOTE")
    doc.add_paragraph(
        "SYSTEM NOTICE: This document was produced via deterministic evidence extraction from validated email forensic JSON. "
        "The platform architecture is designed to integrate text-generation language models in future backend iterations "
        "to draft extended contextual DFIR narratives while maintaining the underlying JSON as the single source of truth.",
        font="F1", size=8, line_spacing=10
    )

    # 14.0 Evidence Attestation & Legal Disclaimer
    doc.add_heading("14.0 EVIDENCE ATTESTATION & LEGAL DISCLAIMER")
    doc.add_paragraph(
        f"REPORT IDENTIFIER: REP-{case_id} | PLATFORM: Email Threat Intelligence & Forensic Platform | "
        f"EVIDENCE SOURCE: Ingested MIME/MSG Artifact | STATUS: VERIFIED FORENSIC RECORD",
        font="F2", size=8, bold=True
    )
    doc.add_paragraph(
        "LEGAL DISCLAIMER: This document is an analytical examination record compiled from electronic message headers, "
        "cryptographic authentication tokens, DNS telemetry, and network routing hops. Findings should be corroborated "
        "with original raw headers, provider server logs, and judicial legal process before presentation in legal proceedings.",
        font="F1", size=7.5, line_spacing=10
    )

    pdf_bytes = doc.build_pdf_bytes()
    filename = f"{case_id}-forensic-report.pdf"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)
    print(f"Generated {filepath} ({len(pdf_bytes)} bytes)")
    return filepath

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    mock_dir = os.path.join(root_dir, "frontend", "data", "mock_responses")
    out_dir = os.path.join(root_dir, "frontend", "public", "reports")
    os.makedirs(out_dir, exist_ok=True)

    cases_map = [
        {"id": "CASE-001", "slug": "sbi-kyc", "name": "SBI Impersonation Investigation", "file": "mock_01_sbi_kyc.json", "date": "2026-09-06"},
        {"id": "CASE-002", "slug": "bec-wire", "name": "BEC Wire Fraud Investigation", "file": "mock_02_bec_wire_fraud.json", "date": "2026-09-06"},
        {"id": "CASE-003", "slug": "clean-memo", "name": "Clean Internal Memo Review", "file": "mock_03_clean_internal_memo.json", "date": "2026-09-06"},
        {"id": "CASE-004", "slug": "itd-refund", "name": "ITD Refund Spoof Investigation", "file": "mock_04_itd_refund_spoof.json", "date": "2026-09-05"},
        {"id": "CASE-005", "slug": "vendor-invoice", "name": "Vendor Invoice Diversion Audit", "file": "mock_05_vendor_invoice_diversion.json", "date": "2026-09-05"},
        {"id": "CASE-006", "slug": "it-helpdesk", "name": "Credential Phishing Investigation", "file": "mock_06_it_helpdesk_harvest.json", "date": "2026-09-05"},
        {"id": "CASE-007", "slug": "marketing-newsletter", "name": "Marketing Newsletter Triage", "file": "mock_07_marketing_newsletter.json", "date": "2026-09-04"},
        {"id": "CASE-008", "slug": "university-compromise", "name": "Suspicious Account Investigation", "file": "mock_08_university_compromise.json", "date": "2026-09-03"},
    ]

    for c in cases_map:
        mock_file = os.path.join(mock_dir, c["file"])
        if os.path.exists(mock_file):
            with open(mock_file, "r") as f:
                c["data"] = json.load(f)
            generate_report_for_case(c, out_dir)
        else:
            print(f"Warning: {mock_file} not found")

if __name__ == "__main__":
    main()
