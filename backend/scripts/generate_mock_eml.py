#!/usr/bin/env python3
"""
RFC-5322 Compliant EML Generator for Threat Intelligence Benchmarking
Generates synthetic .eml files with multi-hop Received headers, timing anomalies,
and forensic artifacts for SIH Email Threat Intelligence & Forensic Platform.
"""

import argparse
import os
import sys
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from email.utils import format_datetime, make_msgid


SCENARIOS = {
    "sbi_kyc": {
        "filename": "SBI_Urgent_KYC_Update.eml",
        "sender_name": "Ramesh Sharma",
        "sender_email": "ramesh@sbi-support-desk.com",
        "recipient": "victim.user@target-corp.in",
        "subject": "URGENT: Mandatory SBI KYC Verification Pending - Account Suspension Notice",
        "body": """Dear State Bank Customer,

Our security monitoring system indicates your KYC (Know Your Customer) compliance has expired.
Your account will be suspended within 24 hours unless details are verified immediately.

Please click the secure link below to verify your KYC details immediately:
https://onlinesbi.sbi.kyc-verification-gateway.com/auth

Reference Case Number: KYC-9921820
Beneficiary Settlement IFSC: HDFC0001234

Chief Compliance Officer,
State Bank Support Operations
""",
        "base_time": "2026-09-06T09:02:10Z",
        "hops": [
            {
                "from_host": "relay01.bulletproof-hosting.nl",
                "by_host": "mail.sbi-support-desk.com",
                "ip": "185.220.101.5",
                "delta_seconds": 0,
                "note": "Datacenter flagged - Amsterdam, NL"
            },
            {
                "from_host": "mail.sbi-support-desk.com",
                "by_host": "mx-edge02.frankfurt-transit.net",
                "ip": "94.130.88.21",
                "delta_seconds": 18,
                "note": "Intermediate relay - Frankfurt, DE"
            },
            {
                "from_host": "mx-edge02.frankfurt-transit.net",
                "by_host": "mx.target-corp.in",
                "ip": "103.21.244.0",
                "delta_seconds": 2,  # 1.5s delta: Timing anomaly from Frankfurt to Mumbai (>6000km)
                "note": "Destination mail server - Mumbai, IN"
            }
        ]
    },
    "bec_wire": {
        "filename": "FW_Urgent_Vendor_Account_Change.eml",
        "sender_name": "Ananya Mehta",
        "sender_email": "ananya.mehta@meridian-infra.com",
        "recipient": "accounts.payable@target-corp.in",
        "subject": "FW: Urgent Vendor Payment - Beneficiary Account Update Required",
        "body": """Accounts Team,

Please note our bank accounts are currently undergoing annual statutory audit.
Please update payment beneficiary immediately for Invoice #INV-2026-881.
Process the attached wire transfer before end of day.

New Beneficiary Details:
Bank: HDFC Bank Mumbai Fort
IFSC: HDFC0002891
IBAN: DE89370400440532013000

Regards,
Ananya Mehta
Chief Financial Officer | Meridian Infrastructure
""",
        "base_time": "2026-09-06T06:45:10Z",
        "hops": [
            {
                "from_host": "vpn-node19.lagos-isp.ng",
                "by_host": "mail.meridian-infra.com",
                "ip": "197.210.53.88",
                "delta_seconds": 0,
                "note": "Session origin before relay - Lagos, NG"
            },
            {
                "from_host": "mail.meridian-infra.com",
                "by_host": "ap-southeast-1.protection.outlook.com",
                "ip": "40.107.8.52",
                "delta_seconds": 22,
                "note": "Compromised Microsoft 365 tenant relay - Singapore, SG"
            },
            {
                "from_host": "ap-southeast-1.protection.outlook.com",
                "by_host": "mx01.target-corp.in",
                "ip": "49.207.50.12",
                "delta_seconds": 17,
                "note": "Destination mail server - Bengaluru, IN"
            }
        ]
    },
    "timing_anomaly": {
        "filename": "Timing_Anomaly_Manipulated_Relay.eml",
        "sender_name": "IT Service Desk",
        "sender_email": "support@identity-portal-auth.net",
        "recipient": "security-alert@target-corp.in",
        "subject": "CRITICAL: Password Expiration Notice for Session ID #8812",
        "body": """Your corporate credentials will expire in 2 hours.
Sign in to our secure identity verification portal immediately to prevent account lock:
https://login.target-corp.identity-portal-auth.net/sso/v2

Security Operations Center
""",
        "base_time": "2026-09-06T11:00:00Z",
        "hops": [
            {
                "from_host": "tor-exit-amsterdam.badnode.org",
                "by_host": "smtp-out.cloudburst.net",
                "ip": "185.220.101.5",
                "delta_seconds": 0,
                "note": "Amsterdam, NL"
            },
            {
                "from_host": "smtp-out.cloudburst.net",
                "by_host": "mta-in.target-corp.in",
                "ip": "103.21.244.0",
                "delta_seconds": 2,  # 2 seconds between Amsterdam and Mumbai (6,800 km) -> ANOMALY
                "note": "Forged Received Header Anomaly"
            }
        ]
    },
    "clean_memo": {
        "filename": "Q3_AllHands_Internal_Memo.eml",
        "sender_name": "Priya Nair",
        "sender_email": "priya.nair@lumenforge.in",
        "recipient": "all-team@lumenforge.in",
        "subject": "Q3 All-Hands Meeting & Strategy Update",
        "body": """Hi Team,

Looking forward to seeing everyone at our Q3 All-Hands today at 3:00 PM IST.
The calendar invitation has been sent with the Google Meet conference link.

Agenda:
1. Q2 Product Milestone Achievements
2. H2 Roadmap Overview
3. Open Q&A

Best regards,
Priya Nair | VP People & Culture
LumenForge Technologies
""",
        "base_time": "2026-09-06T05:18:00Z",
        "hops": [
            {
                "from_host": "mail-wm1-f41.google.com",
                "by_host": "mx.google.com",
                "ip": "209.85.220.41",
                "delta_seconds": 0,
                "note": "Mountain View, US"
            },
            {
                "from_host": "mx.google.com",
                "by_host": "smtp.gmail.com",
                "ip": "74.125.24.26",
                "delta_seconds": 14,
                "note": "Singapore, SG"
            },
            {
                "from_host": "smtp.gmail.com",
                "by_host": "mail.lumenforge.in",
                "ip": "202.83.21.45",
                "delta_seconds": 11,
                "note": "Hyderabad, IN"
            }
        ]
    }
}


def parse_iso(ts_str: str) -> datetime:
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def generate_eml(scenario_key: str, custom_params: dict = None) -> bytes:
    cfg = SCENARIOS.get(scenario_key, SCENARIOS["sbi_kyc"]).copy()
    if custom_params:
        cfg.update(custom_params)

    msg = EmailMessage()
    msg["Subject"] = cfg["subject"]
    msg["From"] = f'"{cfg["sender_name"]}" <{cfg["sender_email"]}>'
    msg["To"] = cfg["recipient"]
    msg["Message-ID"] = make_msgid(domain=cfg["sender_email"].split("@")[-1])
    msg["MIME-Version"] = "1.0"
    msg["X-Mailer"] = "ForensicTestHarness/1.0"

    # Compute timestamps for each hop
    base_dt = parse_iso(cfg["base_time"])
    current_dt = base_dt

    # Format Received header without unescaped newlines to comply with Python 3.11+ EmailMessage policy
    hop_headers = []
    for i, hop in enumerate(cfg["hops"]):
        current_dt += timedelta(seconds=hop["delta_seconds"])
        date_str = format_datetime(current_dt)
        recv_str = (
            f"from {hop['from_host']} ({hop['from_host']} [{hop['ip']}]) "
            f"by {hop['by_host']} (Postfix/ESMTP) with ESMTPS id 4T{1000+i}ZX89 "
            f"for <{cfg['recipient']}>; {date_str}"
        )
        hop_headers.append(recv_str)

    # In RFC 5322, MTAs PREPEND Received headers.
    # Therefore, the final destination hop appears FIRST in the header block,
    # and the original sending hop appears LAST.
    for recv in reversed(hop_headers):
        msg.add_header("Received", recv)

    msg["Date"] = format_datetime(current_dt)
    msg.set_content(cfg["body"])
    return msg.as_bytes()


def main():
    parser = argparse.ArgumentParser(
        description="Generate synthetic RFC-5322 .eml test files with custom relay hops and timing anomalies."
    )
    parser.add_argument(
        "--scenario",
        choices=list(SCENARIOS.keys()) + ["all"],
        default="sbi_kyc",
        help="Predefined scenario template (default: sbi_kyc, or 'all')",
    )
    parser.add_argument(
        "--out",
        type=str,
        default="",
        help="Output file path or directory (when --scenario all)",
    )
    parser.add_argument("--subject", type=str, help="Override subject line")
    parser.add_argument("--from-email", type=str, help="Override sender email")
    parser.add_argument("--anomaly", action="store_true", help="Force timing anomaly (<2s across >3000km)")

    args = parser.parse_args()

    if args.scenario == "all":
        out_dir = args.out or "samples"
        os.makedirs(out_dir, exist_ok=True)
        for key, sc in SCENARIOS.items():
            out_file = os.path.join(out_dir, sc["filename"])
            content = generate_eml(key)
            with open(out_file, "wb") as f:
                f.write(content)
            print(f"[+] Generated {key} -> {out_file} ({len(content)} bytes)")
        return

    custom = {}
    if args.subject:
        custom["subject"] = args.subject
    if args.from_email:
        custom["sender_email"] = args.from_email

    content = generate_eml(args.scenario, custom)
    out_path = args.out or SCENARIOS[args.scenario]["filename"]

    parent_dir = os.path.dirname(out_path)
    if parent_dir:
        os.makedirs(parent_dir, exist_ok=True)

    with open(out_path, "wb") as f:
        f.write(content)

    print(f"[✓] Successfully generated RFC-5322 .eml file:")
    print(f"    Scenario: {args.scenario}")
    print(f"    Output:   {out_path}")
    print(f"    Size:     {len(content)} bytes")


if __name__ == "__main__":
    main()
