# WardWatch

## Hackathon-Winning Elastic x AWS Civic Observability Platform for Bengaluru

WardWatch is a hackathon-winning civic observability platform that models Bengaluru’s public infrastructure like a distributed system.

Built during the Elastic x AWS Hacknight Bengaluru, WardWatch applies observability engineering concepts such as distributed tracing, telemetry pipelines, anomaly detection, geo intelligence, and semantic retrieval to civic governance workflows.

Instead of functioning as just another civic chatbot, WardWatch reconstructs complaint lifecycles across departments, detects accountability dead zones (“Ghost Offices”), correlates outage-linked scam activity, and generates actionable escalation intelligence for citizens.

---

# 🏆 Achievement

🥇 Winner of Bengaluru Civic Navigator Theme  
Elastic x AWS Hacknight Bengaluru 2026

Built solo in under 4 hours.

---

# Core Idea

Modern engineering teams use observability platforms to trace failures across distributed systems.

WardWatch applies the same principles to Bengaluru’s fragmented civic infrastructure.

```text
Citizen
   ↓
BBMP
   ↓
BWSSB
   ↓
Ward Office
   ↓
No Activity
```

WardWatch treats:
- complaints as telemetry events,
- department transfers as trace spans,
- inactivity as latency,
- and scam spikes as operational anomalies.

The result is a civic intelligence system focused on accountability visibility.

---

# Key Features

## Civic Trace Reconstruction

Rebuilds the complete lifecycle of complaints across:
- BBMP
- BWSSB
- BESCOM
- Ward offices
- escalation channels

Tracks:
- complaint routing,
- inactivity duration,
- escalation loops,
- and ownership transfers.

---

## Ghost Office Detection

Detects accountability dead zones where complaints:
- stagnate,
- endlessly transfer,
- silently disappear,
- or show abnormal closure behavior.

Computed using:
- complaint aging,
- transfer frequency,
- inactivity scoring,
- reopen rate analytics,
- and operational aggregations.

---

## TrustLens Fraud Intelligence

Detects civic fraud patterns during:
- power outages,
- water disruptions,
- infrastructure failures.

Correlates:
- scam reports,
- outage telemetry,
- geographic clusters,
- suspicious domains,
- and timing anomalies.

Provides:
- trust scores,
- scam likelihood,
- and contextual risk explanations.

---

## Geo Intelligence

Ward-level operational visibility using:
- complaint heatmaps,
- outage clustering,
- scam density analysis,
- and accountability scoring.

---

## Actionable Outputs

WardWatch generates:
- escalation recommendations,
- RTI drafts,
- accountability summaries,
- ward report cards,
- and fraud warnings.

---

# Elastic Architecture

Elastic is the core observability engine powering WardWatch.

---

## Elasticsearch

Used as a real-time civic telemetry store.

Stores:
- complaints,
- escalation events,
- outages,
- scam reports,
- ward metrics,
- semantic vectors,
- operational traces.

Supports:
- full-text search,
- aggregations,
- geo queries,
- event correlation,
- vector search,
- and operational analytics.

---

## Distributed Trace Modeling

One of the core innovations of WardWatch.

Complaint journeys are modeled like distributed traces:

```text
Citizen → BBMP → BWSSB → Ward Office
```

Each department transfer becomes:
- a trace span,
- with latency,
- ownership,
- and escalation metadata.

This enables:
- bottleneck analysis,
- inactivity detection,
- and accountability reconstruction.

---

## Elastic Ingest Pipelines

Used for:
- parsing fragmented civic records,
- normalizing inconsistent department statuses,
- geo enrichment,
- scam enrichment,
- and telemetry standardization.

Pipelines transform raw civic records into structured operational events.

---

## Vector Search (kNN)

WardWatch uses:
- Bedrock Titan embeddings
- + Elasticsearch dense vectors

to perform:
- semantic complaint similarity,
- related scam discovery,
- contextual civic search.

This enables intelligent retrieval beyond keyword matching.

---

## Aggregations & Analytics

Elastic aggregations compute:
- ghost-office scores,
- complaint aging,
- escalation loops,
- ward responsiveness,
- operational health metrics.

---

## Elastic Maps

Geo intelligence visualization for:
- ward heatmaps,
- outage clusters,
- scam hotspots,
- civic risk zones.

---

## Watchers & Alerts

Operational anomaly detection for:
- complaint inactivity spikes,
- abnormal closure behavior,
- scam surges,
- accountability threshold breaches.

Triggers AWS Lambda workflows automatically.

---

## Kibana Dashboards

Kibana powers:
- civic observability dashboards,
- complaint trace timelines,
- ward intelligence panels,
- operational analytics,
- and fraud intelligence visualizations.

---

# AWS Architecture

AWS powers the intelligence and orchestration layer.

---

## AWS Bedrock

### Claude 3
Used for:
- escalation reasoning,
- civic summarization,
- citizen-friendly explanations,
- RTI draft generation.

### Titan Embeddings
Used for:
- semantic retrieval,
- vector generation,
- complaint similarity pipelines.

---

## AWS Lambda

Event-driven workflows for:
- ghost-office calculations,
- fraud correlation,
- anomaly processing,
- telemetry enrichment.

---

## Amazon S3

Stores:
- civic datasets,
- GeoJSON files,
- exported reports,
- operational analytics,
- scam evidence.

---

## EventBridge

Schedules:
- accountability scoring,
- anomaly scans,
- ingestion workflows,
- operational jobs.

---

## SNS

Delivers:
- escalation alerts,
- fraud notifications,
- operational anomaly events.

---

## CloudWatch

Used for:
- Lambda monitoring,
- workflow observability,
- operational metrics.

---

# OpenClaw-Inspired Orchestration

WardWatch uses a controlled orchestration layer inspired by OpenClaw.

Instead of one generic AI agent, specialized workflows handle:
- routing analysis,
- complaint tracing,
- fraud intelligence,
- escalation recommendations,
- and civic summaries.

This improves:
- modularity,
- explainability,
- and operational reliability.

---

# Tech Stack

## Frontend
- Next.js 14
- TypeScript
- TailwindCSS
- Radix UI
- Lucide Icons

## Backend
- Node.js
- Express
- TypeScript

## Elastic Stack
- Elasticsearch
- Kibana
- Elastic Maps
- Vector Search (kNN)
- Ingest Pipelines
- Watchers
- Aggregations
- Transforms

## AWS
- AWS Bedrock
- AWS Lambda
- Amazon S3
- EventBridge
- SNS
- CloudWatch

---

# System Architecture

```text
Frontend (Next.js)
       ↓
Backend API Layer (Express)
       ↓
Observability & Intelligence Layer
 ├── Elasticsearch
 ├── Kibana
 ├── Elastic Maps
 ├── Vector Search
 ├── Watchers
 └── Aggregation Pipelines
       ↓
AWS Intelligence Layer
 ├── Bedrock
 ├── Lambda
 ├── S3
 ├── EventBridge
 └── SNS
```

---

# Elasticsearch Indices

| Index | Purpose |
|---|---|
| civic-events | Complaint and outage telemetry |
| escalation-traces | Complaint trace reconstruction |
| scam-reports | Fraud intelligence events |
| ward-metrics | Ward-level operational analytics |
| civic-vectors | Semantic embeddings |
| ghost-offices | Accountability dead-zone scoring |

---

# Data Generation

WardWatch includes synthetic Bengaluru civic telemetry datasets:
- 5000+ complaints
- 500+ scam reports
- 200+ outages
- ward-level operational anomalies
- escalation loop scenarios

Used for:
- observability simulations,
- geo analytics,
- and anomaly workflows.

---

# Local Development

## Prerequisites

- Node.js 18+
- Elastic Cloud account
- AWS account
- Docker (optional)

---

## Clone Repository

```bash
git clone https://github.com/chemicoholic21/WardWatch.git
cd wardwatch
```

---

## Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## Configure Environment Variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Add:
- Elastic Cloud credentials
- AWS Bedrock credentials
- Lambda configuration
- SNS configuration

---

## Start Development

```bash
docker-compose up -d
```

or

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

---

# Future Scope

- Real-time civic observability platform
- Predictive infrastructure failure detection
- Multilingual citizen support
- Cross-city deployment
- Public governance intelligence APIs

---

# License

MIT License

