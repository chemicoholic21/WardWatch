# GhostOffice

> Elastic-Powered Civic Observability and Accountability Intelligence Platform for Bengaluru

GhostOffice treats Bengaluru's civic infrastructure like a distributed system, using observability principles to detect bureaucratic failures, complaint stagnation, escalation loops, and scam spikes.

## Key Features

### Ghost Office Detection
Identifies unresponsive government offices using complaint pattern analysis:
- Stagnation rate tracking
- Escalation loop detection
- Department ranking by responsiveness
- Zone-wise health scoring

### TrustLens Security
Real-time scam detection engine that:
- Analyzes SMS/messages for scam indicators
- Correlates scams with service outages
- Tracks victim reports
- Provides trust scores for suspicious content

### OpenClaw Agent System
Multi-agent AI orchestration for civic intelligence:
- **Ghost Hunter**: Detects unresponsive offices
- **Scam Detector**: Analyzes fraud attempts
- **Escalation Tracer**: Maps complaint journeys
- **Civic Analyzer**: Computes health metrics
- **RTI Drafter**: Generates actionable documents

### Actionable Outputs
Every insight leads to concrete action:
- Auto-generated RTI applications
- Escalation letter templates
- Ward/Department report cards
- Social media ready posts

## Tech Stack

### Elastic Cloud (Primary)
- **6 Indices**: civic-events, ghost-offices, scam-reports, escalation-traces, ward-metrics, civic-vectors
- **3 Ingest Pipelines**: Geo enrichment, civic event processing, scam detection
- **kNN Vector Search**: Semantic similarity for complaints
- **Transforms & Watchers**: Real-time anomaly detection

### AWS Integration
- **Bedrock Claude 3**: AI analysis and embeddings
- **Lambda Functions**: Scheduled ghost office calculation, scam correlation
- **S3**: Civic data storage
- **SNS**: Alert notifications
- **CloudWatch**: Metrics and dashboards

### Backend
- Node.js with Express and TypeScript
- Full REST API for all features
- Rate limiting and security headers

### Frontend
- Next.js 14 with App Router
- TailwindCSS with dark observability theme
- Lucide icons
- Radix UI components

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │GhostView │ │TrustLens │ │ Agents   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Express)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Complaints│ │Ghost Det │ │TrustLens │ │ OpenClaw │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐
│ Elastic Cloud  │  │     AWS        │  │      Lambda            │
│ ┌────────────┐ │  │ ┌────────────┐ │  │ ┌────────────────────┐ │
│ │civic-events│ │  │ │  Bedrock   │ │  │ │ghost-calculator    │ │
│ │ghost-office│ │  │ │  (Claude)  │ │  │ │scam-alert-trigger  │ │
│ │scam-reports│ │  │ │    S3      │ │  │ │bedrock-analyzer    │ │
│ │civic-vector│ │  │ │    SNS     │ │  │ │civic-event-proc    │ │
│ └────────────┘ │  │ └────────────┘ │  │ └────────────────────┘ │
└────────────────┘  └────────────────┘  └────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for local Elasticsearch)
- Elastic Cloud account (free trial)
- AWS account (free tier)

### Local Development

1. **Clone and Install**
```bash
git clone <repository>
cd ghostoffice

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

2. **Environment Setup**
```bash
# Backend .env
cp backend/.env.example backend/.env
# Add your Elastic Cloud and AWS credentials

# Frontend .env
cp frontend/.env.example frontend/.env.local
```

3. **Start Services**
```bash
# Using Docker Compose
docker-compose up -d

# Or manually
cd backend && npm run dev
cd frontend && npm run dev
```

4. **Seed Data**
```bash
cd backend && npm run seed
```

### Production Deployment

#### Elastic Cloud Setup
1. Create a deployment at cloud.elastic.co
2. Copy Cloud ID and create API key
3. Run index creation script
4. Configure ingest pipelines

#### AWS Setup
1. Deploy Lambda functions using SAM
```bash
cd infrastructure/lambda
sam build && sam deploy --guided
```

2. Configure environment variables
3. Set up EventBridge schedules

## API Reference

### Complaints
```
GET    /api/complaints           - List complaints
GET    /api/complaints/:id       - Get complaint details
POST   /api/complaints           - Create complaint
GET    /api/complaints/search    - Search complaints
```

### Ghost Offices
```
GET    /api/ghost-offices        - List ghost offices
GET    /api/ghost-offices/top    - Get top ghost offices
GET    /api/ghost-offices/heatmap- Get heatmap data
```

### TrustLens
```
POST   /api/trustlens/analyze    - Analyze content for scams
GET    /api/trustlens/reports    - List scam reports
GET    /api/trustlens/stats      - Get scam statistics
```

### Agents
```
GET    /api/agents               - List available agents
POST   /api/agents/execute       - Execute agent task
GET    /api/agents/status        - Get agent status
```

## Elasticsearch Indices

### civic-events
Main complaints index with geo_point, nested timelines, and full-text search.

### ghost-offices
Stores ghost office scores calculated by Lambda functions.

### scam-reports
TrustLens scam analysis results with risk indicators.

### civic-vectors
Dense vector embeddings for semantic search using kNN.

### ward-metrics
Aggregated metrics for each ward.

### escalation-traces
Detailed escalation path data for complaint tracking.

## Data Generation

Generate 5000+ synthetic records:
```bash
cd data/generators
node generate-all.js
```

This creates:
- 5000+ complaints across all wards/departments
- 500+ scam reports with varying risk levels
- 200+ simulated outages
- Realistic patterns including ghost wards

## Judging Criteria Alignment

| Criteria | Implementation |
|----------|---------------|
| **Elastic Usage** | 6 indices, 3 pipelines, kNN vectors, geo queries, transforms, watchers |
| **AWS Usage** | Bedrock Claude 3, 4 Lambda functions, S3, SNS, CloudWatch |
| **Real-world Impact** | Targets actual Bengaluru civic problems |
| **Data Effort** | 5000+ synthetic records with realistic patterns |
| **Actionability** | RTI generation, escalation letters, report cards |
| **Security** | TrustLens scam detection, outage correlation |

## Demo Script

1. **Overview Dashboard**
   - Show real-time stats
   - Highlight ghost office count

2. **Ghost Office Detection**
   - Navigate to leaderboard
   - Show scoring factors
   - Demonstrate heatmap

3. **TrustLens Security**
   - Analyze sample scam message
   - Show outage correlation
   - View victim reports

4. **OpenClaw Agents**
   - Run Ghost Hunter task
   - Generate RTI draft
   - Execute workflow

5. **Actionable Outputs**
   - Download RTI application
   - View department report card

## License

MIT License - Built for Elastic x AWS Hackathon
