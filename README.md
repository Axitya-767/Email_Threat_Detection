# Email Threat Intelligence & Forensic Platform — Backend Architecture & Team Guide

> Production-ready Python FastAPI architecture for the SIH Email Threat Intelligence & Forensic Platform. Built for high-throughput forensic ingestion, zero-blocking external enrichment, and strict 1:1 conformance with the locked frontend contract.

---

## 1. ARCHITECTURE & ENDPOINTS

### 1.1 Architectural Overview & Dataflow Pipeline

The platform uses an **asymmetric dual-tier execution pipeline**:
1. **Synchronous Fast-Path (< 800ms)**: Handles file hashing, MIME parsing, RFC-5322 Received header extraction, local MaxMind GeoLite2 IP resolution, cached threat intelligence lookups, HuggingFace zero-shot NLP classification, and risk scoring. Returns the complete locked JSON schema immediately to the frontend.
2. **Asynchronous Background Worker (FastAPI `BackgroundTasks`)**: Dispatches external API queries (AbuseIPDB, VirusTotal, WHOIS/RDAP), hydrates Supabase cache tables, writes graph nodes and edges into Neo4j, and persists the immutable case audit trail without blocking the HTTP event loop.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                Next.js Frontend Client                  │
                  └────────────┬───────────────────────────────▲────────────┘
                               │ POST /api/v1/analyze          │ Complete Locked
                               │ (multipart/form-data)         │ JSON (<800ms)
                               ▼                               │
    ┌──────────────────────────────────────────────────────────┴────────────┐
    │                      FastAPI Ingestion Gateway                        │
    │  - SHA-256 Chain of Custody Stamping (hashlib)                        │
    │  - MIME / MAPI Demuxing (mail-parser, extract-msg)                    │
    │  - Header Authentication Check (checkdmarc, pyspf, dkimpy)           │
    │  - Reverse Hop Geometry & Haversine Distance (GeoLite2-City.mmdb)     │
    │  - Local NLP Zero-Shot Inference (facebook/bart-large-mnli)           │
    │  - Quadrant Weighting & Risk Score Synthesis                          │
    └──────────────────────────┬────────────────────────────────────────────┘
                               │
                               │ Dispatches Non-Blocking Job
                               ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │                  FastAPI BackgroundTasks Worker                       │
    │  ┌─────────────────────────┐     ┌──────────────────────────────────┐ │
    │  │  External Threat Feeds  │     │       Forensic Persistence       │ │
    │  │  - AbuseIPDB V2 API     │     │  - Supabase PostgreSQL (Cases)   │ │
    │  │  - VirusTotal V3 API    │     │  - Neo4j Graph DB (Clusters)     │ │
    │  │  - RDAP / Domain Age    │     │  - IP/Domain Reputation Caches   │ │
    │  └─────────────────────────┘     └──────────────────────────────────┘ │
    └───────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Locked Schema Contract (Pydantic v2 Models)

The following Pydantic models in `app/schemas/analysis.py` enforce exact 1:1 compatibility with `@data/mock_responses/analysis_mock.json`. **No field names, nesting levels, or casing may be altered.**

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class SenderInfo(BaseModel):
    name: str
    email: str

class Quadrants(BaseModel):
    header_routing: int = Field(..., ge=0, le=30, description="Routing anomalies & relay risk")
    auth_failure: int = Field(..., ge=0, le=30, description="SPF / DKIM / DMARC failures")
    nlp_language: int = Field(..., ge=0, le=30, description="Urgency & credential harvesting")
    reputation: int = Field(..., ge=0, le=30, description="IP & domain reputation feeds")

class AuthStatus(BaseModel):
    spf: Literal["pass", "fail", "softfail", "neutral", "none"]
    dkim: Literal["pass", "fail", "none"]
    dmarc: Literal["pass", "fail", "none"]

class TraceHop(BaseModel):
    hop_order: int = Field(..., ge=1)
    ip: str
    lat: float
    lng: float
    place: str
    note: str
    relayed_at: str  # ISO 8601 UTC string: YYYY-MM-DDTHH:MM:SS.sssZ

class IOCs(BaseModel):
    domain_age_days: Optional[int] = None
    typosquat_target: Optional[str] = None
    artifacts: List[str] = Field(default_factory=list)

class GraphNode(BaseModel):
    id: str
    type: Literal["ip", "email", "domain"]
    label: str

class GraphEdge(BaseModel):
    # 'from' is a reserved Python keyword, mapped via Field alias
    from_node: str = Field(..., alias="from")
    to: str
    reason: str

    class Config:
        populate_by_name = True

class GraphRelationships(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class NLPFinding(BaseModel):
    phrase: str
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class AnalysisResponse(BaseModel):
    filename: str
    file_size_kb: int
    sha256: str
    sender: SenderInfo
    risk_score: int = Field(..., ge=0, le=100)
    classification: Literal["phishing", "bec", "legitimate", "suspicious", "spam"]
    quadrants: Quadrants
    authentication: AuthStatus
    trace: List[TraceHop]
    iocs: IOCs
    relationships: GraphRelationships
    masked_view_available: bool = True
    nlp_findings: List[NLPFinding]

    class Config:
        populate_by_name = True
```

---

### 1.3 Production Endpoints

#### 1. `POST /api/v1/analyze`
- **Description**: Ingests raw `.eml` or `.msg` files, extracts digital evidence, calculates forensic risk, dispatches background cache hydration, and returns the full locked JSON analysis payload.
- **Request**: `multipart/form-data`
  - `file`: `UploadFile` (.eml or .msg binary)
- **Response**: `200 OK` (`AnalysisResponse`)
- **Example cURL**:
  ```bash
  curl -X POST "http://localhost:8000/api/v1/analyze" \
       -H "accept: application/json" \
       -H "Content-Type: multipart/form-data" \
       -F "file=@samples/SBI_Urgent_KYC_Update.eml"
  ```
- **Example Response Output**:
  ```json
  {
    "filename": "SBI_Urgent_KYC_Update.msg",
    "file_size_kb": 2150,
    "sha256": "4b7e2c91a8d0f356e1c4b9a7d2f6083c5e9a1b4d7c2f8e0a3b6d9c1e4f7a2b5d",
    "sender": { "name": "Ramesh Sharma", "email": "ramesh@sbi-support-desk.com" },
    "risk_score": 91,
    "classification": "phishing",
    "quadrants": {
      "header_routing": 18,
      "auth_failure": 30,
      "nlp_language": 30,
      "reputation": 13
    },
    "authentication": { "spf": "fail", "dkim": "fail", "dmarc": "fail" },
    "trace": [
      { "hop_order": 1, "ip": "185.220.101.5", "lat": 52.37, "lng": 4.9, "place": "Amsterdam, Netherlands", "note": "Datacenter flagged", "relayed_at": "2026-09-06T09:02:10.000Z" },
      { "hop_order": 2, "ip": "94.130.88.21", "lat": 50.11, "lng": 8.68, "place": "Frankfurt, Germany", "note": "Intermediate relay", "relayed_at": "2026-09-06T09:02:28.000Z" },
      { "hop_order": 3, "ip": "103.21.244.0", "lat": 19.07, "lng": 72.87, "place": "Mumbai, India", "note": "Destination mail server", "relayed_at": "2026-09-06T09:02:29.500Z" }
    ],
    "iocs": {
      "domain_age_days": 11,
      "typosquat_target": "onlinesbi.sbi",
      "artifacts": ["IFSC:HDFC0001234"]
    },
    "relationships": {
      "nodes": [
        { "id": "ip1", "type": "ip", "label": "185.220.101.5" },
        { "id": "email1", "type": "email", "label": "Email #104 (SBI spoof)" },
        { "id": "email2", "type": "email", "label": "Email #108 (Tax refund spoof)" },
        { "id": "domain1", "type": "domain", "label": "sbi-support-desk.com" }
      ],
      "edges": [
        { "from": "email1", "to": "ip1", "reason": "same sending IP" },
        { "from": "email2", "to": "ip1", "reason": "same sending IP" },
        { "from": "domain1", "to": "ip1", "reason": "same registrar" }
      ]
    },
    "masked_view_available": true,
    "nlp_findings": [
      { "phrase": "your account will be suspended within 24 hours", "label": "urgency", "confidence": 0.91 },
      { "phrase": "verify your KYC details immediately", "label": "credential_request", "confidence": 0.87 }
    ]
  }
  ```

#### 2. `GET /api/v1/cases`
- **Description**: Returns paginated forensic cases recorded in Supabase for the Case Directory table.
- **Query Parameters**:
  - `page`: `int` (default: 1)
  - `limit`: `int` (default: 20, max: 100)
  - `category`: `Optional[str]` (`critical`, `bec`, `clean`)
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "CASE-001",
      "slug": "sbi-kyc",
      "name": "SBI KYC Scam",
      "category": "critical",
      "risk_score": 91,
      "classification": "phishing",
      "sha256": "4b7e2c91a8d0f356e1c4b9a7d2f6083c5e9a1b4d7c2f8e0a3b6d9c1e4f7a2b5d",
      "created_at": "2026-09-06T14:32:00Z"
    }
  ]
  ```

#### 3. `GET /api/v1/cases/{id}`
- **Description**: Retrieves a single case by its Case ID or SHA-256 hash. Returns the complete locked schema object identical to `/api/v1/analyze`.
- **Path Parameter**: `id` (`CASE-001` or SHA-256 string)
- **Response**: `200 OK` (`AnalysisResponse`)

#### 4. `GET /api/v1/reports/{id}/pdf`
- **Description**: Dynamically compiles and streams a high-resolution forensic evidence PDF generated via WeasyPrint. Respects the investigator privacy toggle.
- **Path Parameter**: `id` (Case ID or SHA-256)
- **Query Parameter**: `masked: bool = true` (Default: true, redacts PII before rendering)
- **Response**: `200 OK` (`Content-Type: application/pdf`)

---

### 1.4 BackgroundTasks Pattern (Zero-Blocking Asynchronous Enrichment)

To guarantee sub-second HTTP responses while avoiding Celery/Redis operational overhead during the hackathon, we utilize FastAPI's native `BackgroundTasks`.

```python
# app/api/v1/endpoints.py
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from app.schemas.analysis import AnalysisResponse
from app.modules.forensics import compute_sha256_and_size
from app.modules.parser import parse_email_message
from app.modules.auth import evaluate_auth_headers
from app.modules.network import build_hop_trace
from app.modules.nlp import extract_nlp_findings
from app.modules.scorer import synthesize_verdict
from app.modules.correlation import query_cached_graph
from app.tasks.enrichment import background_enrich_and_persist

router = APIRouter()

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_email(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.filename.lower().endswith((".eml", ".msg")):
        raise HTTPException(status_code=400, detail="Invalid file format. Upload .eml or .msg.")

    raw_bytes = await file.read()
    sha256_hash, file_size_kb = compute_sha256_and_size(raw_bytes)

    # 1. SYNCHRONOUS FAST PATH (<800ms)
    parsed = parse_email_message(raw_bytes, file.filename)
    auth = evaluate_auth_headers(parsed)
    trace = build_hop_trace(parsed.received_headers)
    nlp_findings = extract_nlp_findings(parsed.subject, parsed.body_text)
    quadrants, risk_score, classification = synthesize_verdict(auth, trace, nlp_findings, parsed.domain)
    relationships, iocs = query_cached_graph(parsed.sender.email, trace, parsed.domain)

    response_payload = AnalysisResponse(
        filename=file.filename,
        file_size_kb=file_size_kb,
        sha256=sha256_hash,
        sender=parsed.sender,
        risk_score=risk_score,
        classification=classification,
        quadrants=quadrants,
        authentication=auth,
        trace=trace,
        iocs=iocs,
        relationships=relationships,
        masked_view_available=True,
        nlp_findings=nlp_findings
    )

    # 2. DISPATCH ASYNC WORKERS (Non-blocking)
    # Queries AbuseIPDB/VirusTotal API, updates Supabase cache, writes Neo4j clusters
    background_tasks.add_task(
        background_enrich_and_persist,
        case_payload=response_payload.model_dump(by_alias=True),
        raw_bytes=raw_bytes
    )

    return response_payload
```

---

## 2. ENVIRONMENT & LOCAL SETUP

### 2.1 `.env` Configuration File

Create `backend/.env` in your local workspace:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Supabase Connection (PostgreSQL & REST)
# Direct asyncpg connection pool string
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_KEY=eyJhbGciOi...[YOUR-SUPABASE-SERVICE-ROLE-KEY]

# Neo4j Graph Database
# Option A: Local Docker container
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=forensic_vault_2026
# Option B: Neo4j AuraDB Free Cloud (uncomment to activate)
# NEO4J_URI=neo4j+s://[INSTANCE_ID].databases.neo4j.io
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=[AURA_PASSWORD]

# External Threat Intelligence Feeds
ABUSEIPDB_API_KEY=[YOUR-ABUSEIPDB-V2-API-KEY]
VIRUSTOTAL_API_KEY=[YOUR-VIRUSTOTAL-V3-API-KEY]
IPINFO_TOKEN=[YOUR-IPINFO-TOKEN]

# Local Binary Databases & Models
MAXMIND_DB_PATH=data/GeoLite2-City.mmdb
HF_MODEL_NAME=facebook/bart-large-mnli
```

---

### 2.2 Supabase Schema DDL (PostgreSQL)

Execute the following DDL in your Supabase SQL Editor:

```sql
-- 1. Cases Table (Permanent forensic record)
CREATE TABLE IF NOT EXISTS public.cases (
    id TEXT PRIMARY KEY,                       -- e.g. 'CASE-001'
    slug TEXT UNIQUE NOT NULL,                 -- e.g. 'sbi-kyc'
    name TEXT NOT NULL,                        -- e.g. 'SBI KYC Scam'
    category TEXT NOT NULL,                    -- 'critical', 'bec', 'clean'
    sha256 CHAR(64) UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    classification TEXT NOT NULL,
    payload JSONB NOT NULL,                    -- Complete locked AnalysisResponse JSON
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_sha256 ON public.cases(sha256);
CREATE INDEX IF NOT EXISTS idx_cases_category ON public.cases(category);

-- 2. Threat Intel Cache: IP Reputation (Prevent external API rate-limiting)
CREATE TABLE IF NOT EXISTS public.ip_reputation_cache (
    ip INET PRIMARY KEY,
    abuse_confidence_score INT DEFAULT 0,
    total_reports INT DEFAULT 0,
    country_code VARCHAR(8),
    isp TEXT,
    is_tor BOOLEAN DEFAULT FALSE,
    raw_response JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_reputation_ttl ON public.ip_reputation_cache(updated_at);

-- 3. Threat Intel Cache: Domain Intelligence
CREATE TABLE IF NOT EXISTS public.domain_reputation_cache (
    domain TEXT PRIMARY KEY,
    domain_age_days INT,
    registrar TEXT,
    vt_malicious_votes INT DEFAULT 0,
    vt_harmless_votes INT DEFAULT 0,
    is_typosquat BOOLEAN DEFAULT FALSE,
    typosquat_target TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 2.3 Neo4j Graph Database Setup

#### Option A: Local Docker Compose (Recommended for Local Dev)

Save the following `docker-compose.yml` in `backend/docker-compose.yml`:

```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.18.0-community
    container_name: email_threat_neo4j
    ports:
      - "7474:7474"   # Neo4j Browser UI
      - "7687:7687"   # Bolt Driver Protocol
    environment:
      - NEO4J_AUTH=neo4j/forensic_vault_2026
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_server_memory_heap_initial__size=512m
      - NEO4J_server_memory_heap_max__size=1g
      - NEO4J_server_memory_pagecache_size=512m
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    restart: unless-stopped

volumes:
  neo4j_data:
  neo4j_logs:
```

Start the container:
```bash
docker-compose up -d
```
Access the Neo4j Web UI at [http://localhost:7474](http://localhost:7474) (`User: neo4j`, `Pass: forensic_vault_2026`).

#### Option B: Neo4j AuraDB Free (Zero-Install Cloud Alternative)

If Docker is not installed on your machine:
1. Sign up for free at [neo4j.com/cloud/aura-free](https://neo4j.com/cloud/aura-free/).
2. Create an **AuraDB Free** instance (takes ~2 minutes).
3. Download the generated credentials file containing your `NEO4J_URI` (`neo4j+s://[ID].databases.neo4j.io`) and `NEO4J_PASSWORD`.
4. Paste these values directly into `backend/.env`. No Docker installation needed.

---

### 2.4 MaxMind GeoLite2-City.mmdb Setup

MaxMind's local binary allows IP-to-coordinates lookups in `< 1ms` without network latency.

1. Register for a free MaxMind account at [dev.maxmind.com](https://www.maxmind.com/en/geolite2/signup).
2. Download the **GeoLite2 City** gzip archive (`GeoLite2-City.tar.gz` or `.mmdb`).
3. Extract the `.mmdb` file and place it at:
   ```
   backend/data/GeoLite2-City.mmdb
   ```
4. **Git Exclusions**: The `.mmdb` binary is strictly excluded from version control. Verify your `.gitignore`:
   ```gitignore
   # MaxMind Binary Databases
   backend/data/*.mmdb
   *.mmdb
   ```

---

### 2.5 Pinned `requirements.txt`

Tested and pinned for **Python 3.11+**:

```txt
# Web Framework & ASGI
fastapi==0.110.0
uvicorn[standard]==0.28.0
pydantic==2.6.4
pydantic-settings==2.2.1
python-multipart==0.0.9

# Databases & Drivers
supabase==2.4.1
asyncpg==0.29.0
psycopg2-binary==2.9.9
neo4j==5.18.0

# Email Parsing & Protocol Authentication
mail-parser==3.15.0
extract-msg==0.48.5
checkdmarc==5.5.1
pyspf==2.0.14
dkimpy==1.1.5
dnstwist==20240109

# Geolocation & Network Enrichment
geoip2==4.8.0
httpx==0.27.0
requests==2.31.0

# AI / NLP Zero-Shot Pipeline
transformers==4.38.2
torch==2.2.1 --extra-index-url https://download.pytorch.org/whl/cpu

# Forensic PDF Generation & Templates
weasyprint==61.2
jinja2==3.1.3

# Utilities & Testing
python-dotenv==1.0.1
pytest==8.1.1
pytest-asyncio==0.23.5
```

Install via pip:
```bash
pip install -r requirements.txt
```

---

## 3. DATA & EVALUATION STRATEGY

### 3.1 Benchmark Pipeline & Public Corpora

To objectively validate detection accuracy and ensure our pipeline does not produce false positives on corporate email traffic, the backend must benchmark against standard public datasets:

| Corpus | Target Email Type | Samples | Validation Target |
|---|---|---|---|
| **Jose Nazario Phishing Corpus** | Real-world historical financial & credential phishing | ~4,500 | Recall $\ge 94\%$ on credential lures |
| **Apache SpamAssassin Public Corpus** | Valid ham & diverse spam | ~6,000 | False-Positive Rate (FPR) $< 1.5\%$ on clean internal memos |
| **CEAS-08 Corpus** | Complex MIME structures & forged headers | 12,000+ | $100\%$ parsing resilience (zero unhandled exceptions) |
| **Enron Corporate Baseline** | Benign executive communications | ~2,000 | Baseline calibration for benign quadrant scores |

#### Evaluation Metrics:
- **Precision**: $\ge 95\%$ for `phishing` and `bec` classifications.
- **Recall**: $\ge 92\%$ across all adversarial variants.
- **F1 Score**: $\ge 0.93$.
- **Sync Response Latency**: $< 800\text{ms}$ on multi-hop inputs.

---

### 3.2 Timing Anomaly Heuristic Calculation

The frontend `@components/MapView.jsx` renders amber pulsed indicators when hops reflect physical impossibilities. The backend computes this using the Haversine distance formula:

$$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$

Where:
- $R = 6371\text{ km}$ (mean Earth radius)
- $\phi_1, \phi_2$ = Latitudes in radians
- $\lambda_1, \lambda_2$ = Longitudes in radians

**The Anomaly Rule**:
$$\Delta t = |t_{\text{hop}_{i+1}} - t_{\text{hop}_i}|$$
$$\text{ANOMALY} \iff (d > 3000\text{ km}) \land (\Delta t < 5\text{ seconds})$$

An apparent speed of $> 600\text{ km/s}$ is physically impossible for legitimate MTA queuing and internet routing, proving the intermediate `Received` header was forged by the threat actor.

---

### 3.3 Synthetic `.eml` Generator Script (`scripts/generate_mock_eml.py`)

A standalone generator is provided in `backend/scripts/generate_mock_eml.py` to synthesize RFC-5322 test emails with forged hops, anomalous relays, and financial artifacts.

#### CLI Usage:
```bash
# Generate all 4 benchmark test cases
python scripts/generate_mock_eml.py --scenario all --out tests/samples

# Generate custom timing anomaly scenario
python scripts/generate_mock_eml.py --scenario timing_anomaly --out tests/samples/anomaly.eml

# Generate custom SBI phishing test
python scripts/generate_mock_eml.py --scenario sbi_kyc --out tests/samples/sbi_test.eml
```

#### Script Source:
```python
# backend/scripts/generate_mock_eml.py
import argparse, os
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
        "body": "Dear Customer, verify KYC details immediately: https://onlinesbi.sbi.kyc-verification.com/auth\nIFSC: HDFC0001234",
        "base_time": "2026-09-06T09:02:10Z",
        "hops": [
            {"from_host": "relay01.nl", "by_host": "mail.sbi-support-desk.com", "ip": "185.220.101.5", "delta_seconds": 0},
            {"from_host": "mail.sbi-support-desk.com", "by_host": "mx-edge02.de", "ip": "94.130.88.21", "delta_seconds": 18},
            {"from_host": "mx-edge02.de", "by_host": "mx.target-corp.in", "ip": "103.21.244.0", "delta_seconds": 2} # Anomaly: DE -> IN in 2s
        ]
    }
}

def generate_eml(scenario_key: str) -> bytes:
    cfg = SCENARIOS[scenario_key]
    msg = EmailMessage()
    msg["Subject"] = cfg["subject"]
    msg["From"] = f'"{cfg["sender_name"]}" <{cfg["sender_email"]}>'
    msg["To"] = cfg["recipient"]
    msg["Message-ID"] = make_msgid(domain=cfg["sender_email"].split("@")[-1])
    msg["Date"] = format_datetime(datetime.now(timezone.utc))

    current_dt = datetime.fromisoformat(cfg["base_time"].replace("Z", "+00:00"))
    hop_headers = []
    for i, hop in enumerate(cfg["hops"]):
        current_dt += timedelta(seconds=hop["delta_seconds"])
        date_str = format_datetime(current_dt)
        recv_str = f"from {hop['from_host']} ([{hop['ip']}]) by {hop['by_host']} with ESMTP id 4T{1000+i}ZX; {date_str}"
        hop_headers.append(recv_str)

    # In RFC-5322, MTAs prepend headers; destination hop is first
    for recv in reversed(hop_headers):
        msg.add_header("Received", recv)

    msg.set_content(cfg["body"])
    return msg.as_bytes()
```

---

## 4. 6-PERSON MODULE ALLOCATION & BRANCHING

### 4.1 Git Workflow & Branching Strategy

- **Base Branch**: `develop`
- **Feature Branches**: `feature/be-<module-name>`
- **Workflow Rules**:
  1. Branch off `origin/develop`.
  2. Maintain 100% boundary isolation — work strictly within your assigned module files.
  3. Every pull request must be validated against `AnalysisResponse` schema before merge.
  4. Person 5 (Integrator) merges PRs into `develop`.

---

### 4.2 Module Assignment Matrix

```
┌──────────┬─────────────────────────────┬──────────────────────────────────────────┬────────────────────────┐
│ Member   │ Feature Branch              │ Core Files Owned                         │ Contract Key Output    │
├──────────┼─────────────────────────────┼──────────────────────────────────────────┼────────────────────────┤
│ Person 1 │ feature/be-parser           │ app/modules/parser.py                    │ authentication, sender │
│          │                             │ app/modules/auth.py                      │                        │
├──────────┼─────────────────────────────┼──────────────────────────────────────────┼────────────────────────┤
│ Person 2 │ feature/be-network          │ app/modules/network.py                   │ trace,                 │
│          │                             │ app/modules/enrichment.py                │ header_routing score   │
├──────────┼─────────────────────────────┼──────────────────────────────────────────┼────────────────────────┤
│ Person 3 │ feature/be-nlp              │ app/modules/nlp.py                       │ nlp_findings,          │
│          │                             │ app/modules/scorer.py                    │ risk_score, quadrants  │
├──────────┼─────────────────────────────┼──────────────────────────────────────────┼────────────────────────┤
│ Person 4 │ feature/be-correlation      │ app/modules/correlation.py               │ relationships,         │
│          │                             │ app/modules/typosquat.py                 │ iocs                   │
├──────────┼─────────────────────────────┼──────────────────────────────────────────┼────────────────────────┤
│ Person 5 │ feature/be-orchestration    │ app/main.py, app/api/v1/endpoints.py     │ Pipeline Synthesis,    │
│ (Lead)   │                             │ app/schemas/analysis.py, app/db/*.py     │ Supabase CRUD          │
├──────────┼─────────────────────────────┼──────────────────────────────────────────┼────────────────────────┤
│ Person 6 │ feature/be-reporting        │ app/modules/forensics.py                 │ sha256, custody,       │
│          │                             │ app/modules/redactor.py, app/reports/*.py│ WeasyPrint PDF stream  │
└──────────┴─────────────────────────────┴──────────────────────────────────────────┴────────────────────────┘
```

---

### 4.3 Technical Deliverables by Teammate

#### Person 1: Parsing & Protocol Authentication
- **Branch**: `feature/be-parser`
- **Files**: `app/modules/parser.py`, `app/modules/auth.py`
- **Libraries**: `mail-parser`, `extract-msg`, `checkdmarc`, `pyspf`, `dkimpy`
- **Implementation Rules**:
  - Accept raw bytes; auto-detect `.msg` (OLE format) vs `.eml` (RFC-822 text).
  - Extract sender name, sender email, recipient, date, subject, body (plain text + HTML), and chronological list of raw `Received:` header strings.
  - Execute DNS authentication tests:
    - SPF validation using `pyspf` against client IP and sender domain.
    - DKIM signature verification using `dkimpy`.
    - DMARC policy lookup and alignment check via `checkdmarc`.
- **Output Schema**:
  ```python
  {
      "sender": {"name": str, "email": str},
      "authentication": {"spf": "pass|fail|softfail|neutral|none", "dkim": "pass|fail|none", "dmarc": "pass|fail|none"}
  }
  ```

#### Person 2: Network Topology & Geolocation
- **Branch**: `feature/be-network`
- **Files**: `app/modules/network.py`, `app/modules/enrichment.py`
- **Libraries**: `geoip2`, `httpx`, `asyncpg`
- **Implementation Rules**:
  - Parse RFC-5322 `Received` headers using robust regex matching IP addresses:
    `r'\[([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\]'`
  - Normalize hop ordering: Originating sending client = `hop_order: 1`, intermediate relays = `hop_order: 2..N-1`, recipient corporate server = `hop_order: N`.
  - Resolve each public IP against local `data/GeoLite2-City.mmdb` for `lat`, `lng`, and `place` (`City, Country`).
  - Calculate timing anomaly using the Haversine distance and timestamp delta formula.
  - Implement Supabase IP reputation cache lookup: query `ip_reputation_cache`; if miss, schedule background API call.
- **Output Schema**:
  ```python
  {
      "trace": [
          {"hop_order": 1, "ip": "185.220.101.5", "lat": 52.37, "lng": 4.9, "place": "Amsterdam, Netherlands", "note": "Datacenter flagged", "relayed_at": "..."}
      ],
      "quadrants": {"header_routing": int, "reputation": int}
  }
  ```

#### Person 3: NLP Threat Intelligence & Scoring Engine
- **Branch**: `feature/be-nlp`
- **Files**: `app/modules/nlp.py`, `app/modules/scorer.py`
- **Libraries**: `transformers`, `torch`
- **Implementation Rules**:
  - Load `facebook/bart-large-mnli` once during app startup in `lifespan` context.
  - Segment body into sentences; perform zero-shot classification against threat candidate labels:
    `["urgency", "credential_request", "financial_diversion", "account_suspension", "legal_threat"]`.
  - Filter findings where `confidence >= 0.75`.
  - Synthesize quadrant scores (each capped at 30 points) and calculate composite risk:
    $$\text{risk\_score} = \min(100, \text{header\_routing} + \text{auth\_failure} + \text{nlp\_language} + \text{reputation})$$
  - Classify verdict:
    - $\ge 70 \implies \text{"phishing"}$ (or $\text{"bec"}$ if financial keywords detected)
    - $40 - 69 \implies \text{"suspicious"}$
    - $< 40 \implies \text{"legitimate"}$
- **Output Schema**:
  ```python
  {
      "nlp_findings": [{"phrase": str, "label": str, "confidence": float}],
      "quadrants": {"header_routing": int, "auth_failure": int, "nlp_language": int, "reputation": int},
      "risk_score": int,
      "classification": "phishing" | "bec" | "legitimate" | "suspicious" | "spam"
  }
  ```

#### Person 4: Graph Correlation & Typosquat Detection
- **Branch**: `feature/be-correlation`
- **Files**: `app/modules/correlation.py`, `app/modules/typosquat.py`
- **Libraries**: `neo4j`, `dnstwist`
- **Implementation Rules**:
  - Ingest graph elements into Neo4j: `(:Email {sha256})`, `(:IP {ip})`, `(:Domain {domain})`.
  - Cypher query to retrieve 2-hop cluster relationships:
    ```cypher
    MATCH (e:Email {sha256: $sha256})-[:RELAYED_VIA|SENT_FROM]->(target)
    MATCH (other:Email)-[r]->(target)
    RETURN target, other, r LIMIT 10
    ```
  - Format output as frontend-ready nodes and edges:
    `nodes: [{id: "ip1", type: "ip", label: "..."}]`, `edges: [{from: "email1", to: "ip1", reason: "same sending IP"}]`.
  - Run `dnstwist` dictionary comparison against high-value target domains (`onlinesbi.sbi`, `incometax.gov.in`, `microsoft.com`) to extract `typosquat_target`.
  - Extract financial artifacts using regex: IFSC (`^[A-Z]{4}0[A-Z0-9]{6}$`), IBAN, Bitcoin addresses.
- **Output Schema**:
  ```python
  {
      "iocs": {"domain_age_days": Optional[int], "typosquat_target": Optional[str], "artifacts": List[str]},
      "relationships": {"nodes": [...], "edges": [...]}
  }
  ```

#### Person 5: Orchestrator & System Integrator (Lead)
- **Branch**: `feature/be-orchestration`
- **Files**: `app/main.py`, `app/api/v1/endpoints.py`, `app/schemas/analysis.py`, `app/db/supabase.py`
- **Libraries**: `fastapi`, `uvicorn`, `supabase`
- **Implementation Rules**:
  - Configure FastAPI factory with lifespan management, CORS middleware, and unified error handling.
  - Stub endpoints on Day 1 to unblock team integration.
  - Synthesize sub-module outputs from Persons 1–4 into the unified `AnalysisResponse`.
  - Maintain Supabase schema and execute CRUD queries for `/api/v1/cases`.
  - Coordinate code reviews and resolve git merge conflicts in `develop`.

#### Person 6: Chain of Custody & PDF Reporting
- **Branch**: `feature/be-reporting`
- **Files**: `app/modules/forensics.py`, `app/modules/redactor.py`, `app/modules/reporter.py`, `app/templates/report_template.html`
- **Libraries**: `hashlib`, `weasyprint`, `jinja2`
- **Implementation Rules**:
  - Calculate SHA-256 hash immediately upon file stream ingestion:
    ```python
    sha256 = hashlib.sha256(raw_bytes).hexdigest()
    ```
  - Implement PII masking utility:
    - Email: `r***a@sbi-support-desk.com` (preserve first and last chars of local part)
    - IP: `185.220.***.***` (mask lower 16 bits)
    - Name: `R*** S***`
  - Design HTML/CSS Jinja2 template mirroring the forensic dashboard dark aesthetic.
  - Stream compiled PDF via `GET /api/v1/reports/{id}/pdf` with WeasyPrint.

---

## 5. 2.5-DAY MILESTONE SCHEDULE (60-HOUR SPRINT)

```
DAY 1 (0h - 24h)               DAY 2 (24h - 48h)              DAY 3 (48h - 60h)
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│ • Scaffolding & Env Setup │  │ • Sub-module Integration  │  │ • WeasyPrint PDF Polish   │
│ • Schema Lock Verified    │  │ • Real Parsing Pipeline   │  │ • Malformed Edge Testing  │
│ • Stub Endpoints Active   │  │ • Neo4j Cypher Clusters   │  │ • Frontend Live Cutover   │
│ • Isolated Unit Tests     │  │ • Background Cache Tasks  │  │ • Presentation Freeze     │
└───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
```

### Day 1 (Hours 0 – 24): Scaffolding, Stub Endpoints & Isolated Logic
- **Hours 0 – 4 (Foundation Setup)**:
  - Person 5 pushes repo skeleton to `develop` branch, configures `.env.example`, Supabase DDL, and `docker-compose.yml`.
  - Team members clone repo, create their respective `feature/be-<module-name>` branches, and verify local environments (`pip install -r requirements.txt`).
- **Hours 4 – 10 (Stub Activation & Schema Lock)**:
  - Person 5 deploys stubbed `/api/v1/analyze` endpoint returning mock JSON directly.
  - Frontend developers confirm zero-breakage when switching `NEXT_PUBLIC_USE_MOCK=false`.
  - Persons 1, 2, 3, 4, 6 develop standalone test harness scripts validating their respective library imports.
- **Hours 10 – 18 (Core Algorithmic Coding)**:
  - Person 1 completes MIME demuxing (`.eml` + `.msg`) and SPF/DKIM validation.
  - Person 2 implements Received header regex parser and Haversine timing anomaly calculations.
  - Person 3 caches `facebook/bart-large-mnli` model and tests zero-shot classification on synthetic prompts.
  - Person 4 sets up Neo4j driver and builds typosquat permutation engine using `dnstwist`.
  - Person 6 implements SHA-256 calculation and PII redaction regex tests.
- **Hours 18 – 24 (Day 1 Standup & Checkpoint)**:
  - Verify all isolated unit tests pass against the synthetic samples in `tests/samples/`.
  - Merge Day 1 foundational PRs into `develop`.

---

### Day 2 (Hours 24 – 48): Pipeline Integration & Live Threat Enrichment
- **Hours 24 – 32 (Parsing & Network Merging)**:
  - Person 5 wires Person 1 (parser) and Person 2 (network trace) into `/api/v1/analyze`.
  - Ingesting `SBI_Urgent_KYC_Update.eml` produces real extracted hops, coordinates, and SPF/DKIM status.
- **Hours 32 – 40 (AI Inference & Graph Correlation Integration)**:
  - Integrate Person 3's HuggingFace NLP pipeline and scoring logic.
  - Connect Person 4's Neo4j Cypher cluster queries; verify multi-case shared IP links render properly.
  - Configure `BackgroundTasks` for asynchronous AbuseIPDB queries and Supabase database commits.
- **Hours 40 – 48 (Custody Stamping & Day 2 Checkpoint)**:
  - Person 6 hooks up SHA-256 custody verification and baseline PDF generation.
  - End-to-end test of `/api/v1/analyze` with all 8 mock scenarios.
  - Sync check with frontend team to verify Leaflet map and Neo4j graph data bindings.

---

### Day 3 (Hours 48 – 60): Hardening, PDF Styling & Frontend Cutover
- **Hours 48 – 54 (Reporting Polish & Malformed Edge-Case Testing)**:
  - Person 6 styles the WeasyPrint PDF report to match the high-contrast forensic dossier styling.
  - Stress test pipeline against malformed MIME headers, broken boundaries, and missing timestamps.
  - Verify that missing IP coordinates gracefully default without breaking map rendering.
- **Hours 54 – 58 (Production Frontend Cutover)**:
  - Switch frontend `.env.local` to `NEXT_PUBLIC_USE_MOCK=false`.
  - Perform live upload test of `.eml` and `.msg` samples from the browser.
  - Validate that map routes animate, risk quadrants match verdicts, and PDF export downloads seamlessly.
- **Hours 58 – 60 (Freeze & Rehearsal)**:
  - Final code freeze on `develop` branch.
  - Rehearse live demonstration walkthrough (upload phishing email $\to$ inspect hops $\to$ observe timing anomaly $\to$ view correlation cluster $\to$ download signed custody PDF).
