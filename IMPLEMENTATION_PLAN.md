# GhostOffice Implementation Plan
## Elastic-Powered Civic Observability & Accountability Intelligence Platform

---

## 🎯 Hackathon Scoring Optimization

| Criteria | Weight | Our Strategy |
|----------|--------|--------------|
| **Real-world Impact & Relevance** | HIGH | Bengaluru-specific civic pain points, actionable outcomes |
| **Data Effort** | HIGH | 5,000+ synthetic records, realistic patterns, cross-department correlations |
| **Elastic Usage** | **MOST IMP** | 6 indices, ingest pipelines, vector search, aggregations, geo, ML, alerting |
| **AWS Usage** | **MOST IMP** | Bedrock, S3, Lambda, CloudWatch, SNS, EventBridge |
| **Actionability** | **IMPORTANT** | Every insight → concrete action (RTI draft, escalation path, fraud report) |
| **Security Practices** | **IMPORTANT** | TrustLens fraud detection, input validation, secure APIs, threat modeling |

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         GHOSTOFFICE PLATFORM ARCHITECTURE                            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ╔═══════════════════════════════════════════════════════════════════════════════╗  │
│  ║                            AWS CLOUD SERVICES                                  ║  │
│  ║                                                                                ║  │
│  ║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                ║  │
│  ║  │   AWS BEDROCK   │  │    AWS S3       │  │  AWS LAMBDA     │                ║  │
│  ║  │                 │  │                 │  │                 │                ║  │
│  ║  │ Claude 3 Sonnet │  │ civic-documents │  │ scam-scanner    │                ║  │
│  ║  │ Claude 3 Haiku  │  │ scam-evidence   │  │ anomaly-trigger │                ║  │
│  ║  │ Titan Embed     │  │ ward-geojson    │  │ alert-processor │                ║  │
│  ║  │                 │  │ complaint-files │  │ daily-aggregator│                ║  │
│  ║  │ USES:           │  │                 │  │                 │                ║  │
│  ║  │ • Agent LLM     │  │ USES:           │  │ USES:           │                ║  │
│  ║  │ • Summaries     │  │ • Doc storage   │  │ • Async scans   │                ║  │
│  ║  │ • Embeddings    │  │ • Evidence      │  │ • ES alerts     │                ║  │
│  ║  │ • Analysis      │  │ • Backups       │  │ • Scheduled     │                ║  │
│  ║  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                ║  │
│  ║           │                    │                    │                         ║  │
│  ║  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐                ║  │
│  ║  │ AWS CLOUDWATCH  │  │ AWS SNS         │  │ AWS EVENTBRIDGE │                ║  │
│  ║  │                 │  │                 │  │                 │                ║  │
│  ║  │ • Platform logs │  │ • Alert notifs  │  │ • Scheduled     │                ║  │
│  ║  │ • Custom metrics│  │ • Escalation    │  │   jobs          │                ║  │
│  ║  │ • Dashboards    │  │   triggers      │  │ • Event routing │                ║  │
│  ║  │ • Alarms        │  │ • Citizen SMS   │  │                 │                ║  │
│  ║  └─────────────────┘  └─────────────────┘  └─────────────────┘                ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════╝  │
│                                         │                                            │
│                                         ▼                                            │
│  ╔═══════════════════════════════════════════════════════════════════════════════╗  │
│  ║                         ELASTIC CLOUD CLUSTER                                  ║  │
│  ║                                                                                ║  │
│  ║  ┌─────────────────────────────────────────────────────────────────────────┐  ║  │
│  ║  │                        ELASTICSEARCH ENGINE                              │  ║  │
│  ║  │                                                                          │  ║  │
│  ║  │  INDICES (6):                                                            │  ║  │
│  ║  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │  ║  │
│  ║  │  │ civic-events │ │ghost-offices │ │ scam-reports │ │civic-vectors │    │  ║  │
│  ║  │  │              │ │              │ │              │ │              │    │  ║  │
│  ║  │  │ • complaints │ │ • scores     │ │ • frauds     │ │ • embeddings │    │  ║  │
│  ║  │  │ • outages    │ │ • rankings   │ │ • patterns   │ │ • kNN search │    │  ║  │
│  ║  │  │ • maintenance│ │ • factors    │ │ • indicators │ │ • similarity │    │  ║  │
│  ║  │  │ • notices    │ │ • trends     │ │ • correlate  │ │              │    │  ║  │
│  ║  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │  ║  │
│  ║  │  ┌──────────────┐ ┌──────────────┐                                       │  ║  │
│  ║  │  │ escalation-  │ │ ward-metrics │  ELASTIC FEATURES:                    │  ║  │
│  ║  │  │ traces       │ │              │  ✓ Ingest Pipelines (3)               │  ║  │
│  ║  │  │              │ │ • health KPI │  ✓ Dense Vector + kNN                 │  ║  │
│  ║  │  │ • spans      │ │ • geo bounds │  ✓ Aggregations (bucket, metric)      │  ║  │
│  ║  │  │ • bottleneck │ │ • dept stats │  ✓ Geo Point + Geo Shape              │  ║  │
│  ║  │  │ • timeline   │ │ • anomalies  │  ✓ Nested Documents                   │  ║  │
│  ║  │  └──────────────┘ └──────────────┘  ✓ Runtime Fields                     │  ║  │
│  ║  │                                     ✓ Transforms                         │  ║  │
│  ║  │                                     ✓ Watchers/Alerts → Lambda           │  ║  │
│  ║  └─────────────────────────────────────────────────────────────────────────┘  ║  │
│  ║                                                                                ║  │
│  ║  ┌─────────────────────────────────────────────────────────────────────────┐  ║  │
│  ║  │                              KIBANA                                      │  ║  │
│  ║  │                                                                          │  ║  │
│  ║  │  DASHBOARDS:                           FEATURES:                         │  ║  │
│  ║  │  • Ghost Office Command Center         • Elastic Maps (ward heatmaps)    │  ║  │
│  ║  │  • Civic Health Monitor                • Canvas (executive reports)      │  ║  │
│  ║  │  • TrustLens Security Center           • Lens (drag-drop viz)            │  ║  │
│  ║  │  • Escalation Flow Analysis            • Alerting Rules                  │  ║  │
│  ║  │  • Ward Intelligence                   • ML Anomaly Detection            │  ║  │
│  ║  └─────────────────────────────────────────────────────────────────────────┘  ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════╝  │
│                                         │                                            │
│                                         ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                      BACKEND SERVICE (Render / EC2)                           │  │
│  │                                                                               │  │
│  │   ┌─────────────────────────────────────────────────────────────────────┐    │  │
│  │   │                    OpenClaw Agent Orchestration                      │    │  │
│  │   │                                                                      │    │  │
│  │   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │  │
│  │   │  │ Complaint   │ │   Fraud     │ │Accountabil- │ │ Escalation  │    │    │  │
│  │   │  │ Router      │ │ Detector    │ │ity Auditor  │ │ Recommender │    │    │  │
│  │   │  │             │ │             │ │             │ │             │    │    │  │
│  │   │  │→ Route to   │ │→ Analyze    │ │→ Score dept │ │→ Suggest    │    │    │  │
│  │   │  │  department │ │  SMS/URL    │ │  failures   │ │  next steps │    │    │  │
│  │   │  │→ Find similar│ │→ Correlate │ │→ Identify   │ │→ Draft RTI  │    │    │  │
│  │   │  │  complaints │ │  with outage│ │  patterns   │ │→ Contact    │    │    │  │
│  │   │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │    │  │
│  │   │                        │                                             │    │  │
│  │   │                        ▼                                             │    │  │
│  │   │              ┌─────────────────┐                                     │    │  │
│  │   │              │Civic Intelligence│  → Executive summaries             │    │  │
│  │   │              │     Agent       │  → Citizen-friendly explanations   │    │  │
│  │   │              │                 │  → Actionable recommendations       │    │  │
│  │   │              └─────────────────┘                                     │    │  │
│  │   └─────────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                               │  │
│  │   ┌─────────────────────────────────────────────────────────────────────┐    │  │
│  │   │                         REST API SERVICES                            │    │  │
│  │   │  /api/complaints    /api/ghost-offices    /api/trustlens             │    │  │
│  │   │  /api/escalations   /api/analytics        /api/agents                │    │  │
│  │   │  /api/search        /api/actions          /api/wards                 │    │  │
│  │   └─────────────────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                            │
│                                         ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                        FRONTEND (Vercel / Amplify)                            │  │
│  │                                                                               │  │
│  │   Next.js 14 + shadcn/ui + TailwindCSS + Recharts + Leaflet                  │  │
│  │   Dark Observability Theme (Elastic/Datadog/CrowdStrike inspired)            │  │
│  │                                                                               │  │
│  │   PAGES:                                                                      │  │
│  │   ├─ / (Landing)           → Platform overview, key metrics                  │  │
│  │   ├─ /dashboard            → Command center, real-time feeds                 │  │
│  │   ├─ /ghost-offices        → Rankings, detection, patterns                   │  │
│  │   ├─ /complaints           → Timeline traces, flow visualization            │  │
│  │   ├─ /trustlens            → Scam scanner, fraud alerts, security           │  │
│  │   ├─ /analytics            → Trends, correlations, predictions              │  │
│  │   ├─ /wards                → Geographic intelligence, maps                  │  │
│  │   ├─ /agents               → Orchestration console, logs                    │  │
│  │   └─ /actions              → Actionable outputs, RTI drafts                 │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ELASTIC USAGE (Most Important)

### 2.1 Elasticsearch Indices (6 Total)

#### Index 1: `civic-events` (Primary Event Store)
```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "civic_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "snowball"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "event_id": { "type": "keyword" },
      "event_type": { "type": "keyword" },
      "department": { "type": "keyword" },
      "department_code": { "type": "keyword" },
      "ward_id": { "type": "keyword" },
      "ward_name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "zone": { "type": "keyword" },
      "issue_type": { "type": "keyword" },
      "issue_category": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "civic_analyzer" },
      "description": { "type": "text", "analyzer": "civic_analyzer" },
      "status": { "type": "keyword" },
      "priority": { "type": "keyword" },
      "severity": { "type": "integer" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" },
      "resolved_at": { "type": "date" },
      "expected_resolution_date": { "type": "date" },
      "days_open": { "type": "integer" },
      "is_overdue": { "type": "boolean" },
      "geo_location": { "type": "geo_point" },
      "address": { "type": "text" },
      "pincode": { "type": "keyword" },
      "citizen_id": { "type": "keyword" },
      "citizen_type": { "type": "keyword" },
      "risk_score": { "type": "float" },
      "ghost_contribution_score": { "type": "float" },
      "escalation_count": { "type": "integer" },
      "transfer_count": { "type": "integer" },
      "escalation_path": {
        "type": "nested",
        "properties": {
          "department": { "type": "keyword" },
          "timestamp": { "type": "date" },
          "action": { "type": "keyword" },
          "officer_id": { "type": "keyword" },
          "notes": { "type": "text" },
          "duration_hours": { "type": "float" }
        }
      },
      "related_outage_ids": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "sentiment_score": { "type": "float" },
      "is_suspicious_closure": { "type": "boolean" },
      "closure_quality_score": { "type": "float" },
      "source": { "type": "keyword" },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}
```

#### Index 2: `ghost-offices` (Calculated Scores)
```json
{
  "mappings": {
    "properties": {
      "office_id": { "type": "keyword" },
      "department": { "type": "keyword" },
      "ward_id": { "type": "keyword" },
      "ward_name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "zone": { "type": "keyword" },
      "geo_location": { "type": "geo_point" },
      "ghost_score": { "type": "float" },
      "ghost_probability": { "type": "float" },
      "alert_level": { "type": "keyword" },
      "factors": {
        "properties": {
          "stagnation_rate": { "type": "float" },
          "escalation_loop_frequency": { "type": "float" },
          "avg_resolution_days": { "type": "float" },
          "overdue_percentage": { "type": "float" },
          "transfer_ratio": { "type": "float" },
          "circular_escalation_count": { "type": "integer" },
          "suspicious_closure_rate": { "type": "float" },
          "inactivity_days": { "type": "integer" }
        }
      },
      "complaint_stats": {
        "properties": {
          "total": { "type": "integer" },
          "open": { "type": "integer" },
          "closed": { "type": "integer" },
          "rejected": { "type": "integer" },
          "transferred": { "type": "integer" }
        }
      },
      "accountability_score": { "type": "float" },
      "responsiveness_score": { "type": "float" },
      "transparency_score": { "type": "float" },
      "civic_integrity_index": { "type": "float" },
      "risk_factors": {
        "type": "nested",
        "properties": {
          "factor": { "type": "keyword" },
          "severity": { "type": "keyword" },
          "score": { "type": "float" },
          "description": { "type": "text" }
        }
      },
      "trend_7d": { "type": "keyword" },
      "trend_30d": { "type": "keyword" },
      "last_activity_date": { "type": "date" },
      "calculated_at": { "type": "date" }
    }
  }
}
```

#### Index 3: `scam-reports` (Security/Fraud)
```json
{
  "mappings": {
    "properties": {
      "report_id": { "type": "keyword" },
      "report_type": { "type": "keyword" },
      "source_type": { "type": "keyword" },
      "content": { "type": "text", "analyzer": "standard" },
      "raw_content": { "type": "keyword", "index": false },
      "url": { "type": "keyword" },
      "domain": { "type": "keyword" },
      "sender_id": { "type": "keyword" },
      "reported_at": { "type": "date" },
      "analyzed_at": { "type": "date" },
      "geo_location": { "type": "geo_point" },
      "ward_id": { "type": "keyword" },
      "trust_score": { "type": "float" },
      "scam_probability": { "type": "float" },
      "risk_level": { "type": "keyword" },
      "scam_type": { "type": "keyword" },
      "spoofed_department": { "type": "keyword" },
      "risk_indicators": {
        "type": "nested",
        "properties": {
          "indicator": { "type": "keyword" },
          "severity": { "type": "keyword" },
          "weight": { "type": "float" },
          "description": { "type": "text" },
          "matched_pattern": { "type": "keyword" }
        }
      },
      "urgency_language_score": { "type": "float" },
      "financial_risk_score": { "type": "float" },
      "impersonation_score": { "type": "float" },
      "link_safety_score": { "type": "float" },
      "related_outage_id": { "type": "keyword" },
      "is_outage_correlated": { "type": "boolean" },
      "outage_correlation_score": { "type": "float" },
      "action_taken": { "type": "keyword" },
      "verified_status": { "type": "keyword" },
      "victim_reports": { "type": "integer" },
      "similar_report_count": { "type": "integer" },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}
```

#### Index 4: `escalation-traces` (Observability Traces)
```json
{
  "mappings": {
    "properties": {
      "trace_id": { "type": "keyword" },
      "complaint_id": { "type": "keyword" },
      "citizen_id": { "type": "keyword" },
      "start_time": { "type": "date" },
      "end_time": { "type": "date" },
      "duration_hours": { "type": "float" },
      "status": { "type": "keyword" },
      "is_resolved": { "type": "boolean" },
      "total_hops": { "type": "integer" },
      "unique_departments": { "type": "integer" },
      "has_circular_path": { "type": "boolean" },
      "circular_path_departments": { "type": "keyword" },
      "is_dead_end": { "type": "boolean" },
      "dead_end_department": { "type": "keyword" },
      "spans": {
        "type": "nested",
        "properties": {
          "span_id": { "type": "keyword" },
          "parent_span_id": { "type": "keyword" },
          "department": { "type": "keyword" },
          "ward_id": { "type": "keyword" },
          "action": { "type": "keyword" },
          "start_time": { "type": "date" },
          "end_time": { "type": "date" },
          "duration_hours": { "type": "float" },
          "officer_id": { "type": "keyword" },
          "status": { "type": "keyword" },
          "notes": { "type": "text" },
          "is_bottleneck": { "type": "boolean" },
          "wait_time_hours": { "type": "float" }
        }
      },
      "bottleneck_department": { "type": "keyword" },
      "bottleneck_wait_hours": { "type": "float" },
      "accountability_gaps": {
        "type": "nested",
        "properties": {
          "gap_type": { "type": "keyword" },
          "department": { "type": "keyword" },
          "description": { "type": "text" },
          "severity": { "type": "keyword" }
        }
      },
      "geo_path": {
        "type": "geo_shape"
      },
      "recommendation_generated": { "type": "boolean" }
    }
  }
}
```

#### Index 5: `ward-metrics` (Aggregated Analytics)
```json
{
  "mappings": {
    "properties": {
      "ward_id": { "type": "keyword" },
      "ward_name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "ward_number": { "type": "integer" },
      "zone": { "type": "keyword" },
      "geo_boundary": { "type": "geo_shape" },
      "centroid": { "type": "geo_point" },
      "population": { "type": "integer" },
      "area_sqkm": { "type": "float" },
      "period": { "type": "keyword" },
      "period_start": { "type": "date" },
      "period_end": { "type": "date" },
      "calculated_at": { "type": "date" },
      "metrics": {
        "properties": {
          "total_complaints": { "type": "integer" },
          "open_complaints": { "type": "integer" },
          "resolved_complaints": { "type": "integer" },
          "overdue_complaints": { "type": "integer" },
          "avg_resolution_days": { "type": "float" },
          "median_resolution_days": { "type": "float" },
          "escalation_rate": { "type": "float" },
          "ghost_office_count": { "type": "integer" },
          "total_scam_reports": { "type": "integer" },
          "verified_scams": { "type": "integer" },
          "outage_hours": { "type": "float" },
          "outage_count": { "type": "integer" }
        }
      },
      "scores": {
        "properties": {
          "civic_health_score": { "type": "float" },
          "responsiveness_index": { "type": "float" },
          "transparency_index": { "type": "float" },
          "safety_index": { "type": "float" },
          "fraud_risk_score": { "type": "float" }
        }
      },
      "department_breakdown": {
        "type": "nested",
        "properties": {
          "department": { "type": "keyword" },
          "complaints": { "type": "integer" },
          "resolved": { "type": "integer" },
          "resolution_rate": { "type": "float" },
          "avg_days": { "type": "float" }
        }
      },
      "issue_breakdown": {
        "type": "nested",
        "properties": {
          "issue_type": { "type": "keyword" },
          "count": { "type": "integer" },
          "percentage": { "type": "float" }
        }
      },
      "trend": { "type": "keyword" },
      "anomaly_detected": { "type": "boolean" },
      "anomaly_types": { "type": "keyword" },
      "alert_count": { "type": "integer" }
    }
  }
}
```

#### Index 6: `civic-vectors` (Semantic Search)
```json
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "vector_id": { "type": "keyword" },
      "source_type": { "type": "keyword" },
      "source_id": { "type": "keyword" },
      "content_type": { "type": "keyword" },
      "content": { "type": "text" },
      "metadata": {
        "properties": {
          "department": { "type": "keyword" },
          "ward_id": { "type": "keyword" },
          "issue_type": { "type": "keyword" },
          "date": { "type": "date" }
        }
      },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      },
      "indexed_at": { "type": "date" }
    }
  }
}
```

### 2.2 Ingest Pipelines (3 Total)

#### Pipeline 1: `civic-event-pipeline`
```json
{
  "description": "Process and enrich civic events",
  "processors": [
    {
      "set": {
        "field": "ingested_at",
        "value": "{{_ingest.timestamp}}"
      }
    },
    {
      "script": {
        "description": "Calculate days_open",
        "source": "if (ctx.status != 'resolved' && ctx.status != 'closed') { ctx.days_open = ChronoUnit.DAYS.between(ZonedDateTime.parse(ctx.created_at), ZonedDateTime.now()); ctx.is_overdue = ctx.days_open > 14; } else { ctx.days_open = 0; ctx.is_overdue = false; }"
      }
    },
    {
      "script": {
        "description": "Calculate risk_score",
        "source": "double score = 0; if (ctx.days_open > 30) score += 30; else if (ctx.days_open > 14) score += 20; else if (ctx.days_open > 7) score += 10; if (ctx.escalation_count > 3) score += 25; else if (ctx.escalation_count > 1) score += 15; if (ctx.transfer_count > 2) score += 20; if (ctx.priority == 'high') score += 15; else if (ctx.priority == 'critical') score += 25; ctx.risk_score = Math.min(score, 100);"
      }
    },
    {
      "enrich": {
        "policy_name": "ward-enrichment",
        "field": "ward_id",
        "target_field": "ward_info",
        "max_matches": 1
      }
    },
    {
      "set": {
        "field": "zone",
        "value": "{{ward_info.zone}}",
        "if": "ctx.ward_info != null"
      }
    },
    {
      "remove": {
        "field": "ward_info",
        "ignore_missing": true
      }
    }
  ]
}
```

#### Pipeline 2: `scam-detection-pipeline`
```json
{
  "description": "Analyze and score scam reports",
  "processors": [
    {
      "set": {
        "field": "analyzed_at",
        "value": "{{_ingest.timestamp}}"
      }
    },
    {
      "script": {
        "description": "Extract domain from URL",
        "source": "if (ctx.url != null) { def m = /https?:\\/\\/([^\\/]+)/.matcher(ctx.url); if (m.find()) { ctx.domain = m.group(1); } }"
      }
    },
    {
      "script": {
        "description": "Calculate urgency_language_score",
        "source": "def urgency_words = ['urgent', 'immediate', 'last chance', 'act now', 'expires', 'suspended', 'blocked', 'verify now']; def content_lower = ctx.content.toLowerCase(); double score = 0; for (word in urgency_words) { if (content_lower.contains(word)) score += 12.5; } ctx.urgency_language_score = Math.min(score, 100);"
      }
    },
    {
      "script": {
        "description": "Calculate link_safety_score",
        "source": "double score = 100; if (ctx.domain != null) { if (!ctx.domain.endsWith('.gov.in') && !ctx.domain.endsWith('.nic.in')) score -= 40; if (ctx.domain.contains('bit.ly') || ctx.domain.contains('tinyurl') || ctx.domain.length() < 6) score -= 30; if (ctx.domain.matches('.*\\\\d{4,}.*')) score -= 20; } ctx.link_safety_score = Math.max(score, 0);"
      }
    },
    {
      "script": {
        "description": "Calculate overall scam_probability",
        "source": "double prob = 0; prob += (100 - ctx.link_safety_score) * 0.4; prob += ctx.urgency_language_score * 0.3; prob += ctx.financial_risk_score * 0.2; prob += ctx.impersonation_score * 0.1; ctx.scam_probability = Math.min(prob / 100, 1.0); ctx.trust_score = 100 - (ctx.scam_probability * 100); ctx.risk_level = ctx.scam_probability > 0.8 ? 'critical' : ctx.scam_probability > 0.6 ? 'high' : ctx.scam_probability > 0.4 ? 'medium' : 'low';"
      }
    }
  ]
}
```

#### Pipeline 3: `geo-enrichment-pipeline`
```json
{
  "description": "Enrich documents with geo data",
  "processors": [
    {
      "enrich": {
        "policy_name": "ward-geo-enrichment",
        "field": "ward_id",
        "target_field": "geo_enrichment",
        "shape_relation": "CONTAINS"
      }
    },
    {
      "set": {
        "field": "zone",
        "value": "{{geo_enrichment.zone}}",
        "if": "ctx.geo_enrichment != null"
      }
    },
    {
      "set": {
        "field": "ward_name",
        "value": "{{geo_enrichment.ward_name}}",
        "if": "ctx.geo_enrichment != null && ctx.ward_name == null"
      }
    }
  ]
}
```

### 2.3 Key Elasticsearch Queries

#### Ghost Office Detection Aggregation
```json
{
  "size": 0,
  "query": {
    "range": {
      "created_at": {
        "gte": "now-90d"
      }
    }
  },
  "aggs": {
    "by_office": {
      "composite": {
        "size": 500,
        "sources": [
          { "department": { "terms": { "field": "department" } } },
          { "ward_id": { "terms": { "field": "ward_id" } } }
        ]
      },
      "aggs": {
        "total_complaints": { "value_count": { "field": "event_id" } },
        "stagnant_complaints": {
          "filter": {
            "bool": {
              "must": [
                { "terms": { "status": ["open", "pending", "in_progress"] } },
                { "range": { "days_open": { "gte": 14 } } }
              ]
            }
          }
        },
        "escalation_loops": {
          "filter": { "range": { "escalation_count": { "gte": 3 } } }
        },
        "suspicious_closures": {
          "filter": { "term": { "is_suspicious_closure": true } }
        },
        "high_transfers": {
          "filter": { "range": { "transfer_count": { "gte": 2 } } }
        },
        "avg_resolution_days": {
          "avg": { "field": "days_open" }
        },
        "stagnation_rate": {
          "bucket_script": {
            "buckets_path": {
              "stagnant": "stagnant_complaints._count",
              "total": "total_complaints"
            },
            "script": "params.total > 0 ? (params.stagnant / params.total) * 100 : 0"
          }
        },
        "ghost_score": {
          "bucket_script": {
            "buckets_path": {
              "stag_rate": "stagnation_rate",
              "loops": "escalation_loops._count",
              "total": "total_complaints",
              "suspicious": "suspicious_closures._count",
              "transfers": "high_transfers._count",
              "avg_days": "avg_resolution_days"
            },
            "script": "double score = 0; score += params.stag_rate * 0.25; score += (params.loops / Math.max(params.total, 1)) * 100 * 0.20; score += (params.transfers / Math.max(params.total, 1)) * 100 * 0.15; score += Math.min(params.avg_days, 60) / 60 * 100 * 0.15; score += (params.suspicious / Math.max(params.total, 1)) * 100 * 0.15; score += (params.total < 5 ? 50 : 0) * 0.10; return Math.min(score, 100);"
          }
        }
      }
    }
  }
}
```

#### Semantic Similar Complaints (kNN)
```json
{
  "size": 10,
  "query": {
    "bool": {
      "must": [
        {
          "knn": {
            "field": "embedding",
            "query_vector": [/* 1536 dims from Bedrock Titan */],
            "k": 10,
            "num_candidates": 100
          }
        }
      ],
      "filter": [
        { "term": { "department": "BBMP" } },
        { "range": { "created_at": { "gte": "now-180d" } } }
      ]
    }
  },
  "_source": ["event_id", "title", "description", "status", "ward_name", "days_open"]
}
```

#### Scam-Outage Correlation
```json
{
  "size": 0,
  "query": {
    "range": { "reported_at": { "gte": "now-30d" } }
  },
  "aggs": {
    "by_day": {
      "date_histogram": {
        "field": "reported_at",
        "calendar_interval": "day"
      },
      "aggs": {
        "scam_count": { "value_count": { "field": "report_id" } },
        "outage_correlated": {
          "filter": { "term": { "is_outage_correlated": true } }
        },
        "correlation_rate": {
          "bucket_script": {
            "buckets_path": {
              "correlated": "outage_correlated._count",
              "total": "scam_count"
            },
            "script": "params.total > 0 ? (params.correlated / params.total) * 100 : 0"
          }
        },
        "by_scam_type": {
          "terms": { "field": "scam_type", "size": 10 }
        }
      }
    }
  }
}
```

### 2.4 Elasticsearch Transforms

#### Ghost Office Daily Transform
```json
{
  "id": "ghost-office-daily-transform",
  "source": {
    "index": ["civic-events"],
    "query": {
      "range": { "created_at": { "gte": "now-90d" } }
    }
  },
  "dest": {
    "index": "ghost-offices"
  },
  "frequency": "1h",
  "sync": {
    "time": { "field": "updated_at", "delay": "60s" }
  },
  "pivot": {
    "group_by": {
      "office_id": {
        "terms": { "field": "department" }
      },
      "ward_id": {
        "terms": { "field": "ward_id" }
      }
    },
    "aggregations": {
      "total_complaints": { "value_count": { "field": "event_id" } },
      "avg_resolution_days": { "avg": { "field": "days_open" } },
      "last_activity_date": { "max": { "field": "updated_at" } }
    }
  }
}
```

### 2.5 Elasticsearch Watchers/Alerts

#### Ghost Office Threshold Alert
```json
{
  "trigger": {
    "schedule": { "interval": "1h" }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["ghost-offices"],
        "body": {
          "size": 0,
          "query": {
            "bool": {
              "must": [
                { "range": { "ghost_score": { "gte": 85 } } },
                { "range": { "calculated_at": { "gte": "now-2h" } } }
              ]
            }
          },
          "aggs": {
            "critical_offices": {
              "terms": { "field": "office_id", "size": 20 }
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": { "ctx.payload.hits.total.value": { "gt": 0 } }
  },
  "actions": {
    "notify_lambda": {
      "webhook": {
        "method": "POST",
        "url": "{{lambda_alert_endpoint}}",
        "body": "{{#toJson}}ctx.payload{{/toJson}}"
      }
    },
    "log": {
      "logging": {
        "text": "ALERT: {{ctx.payload.hits.total.value}} critical ghost offices detected"
      }
    }
  }
}
```

---

## 3. AWS USAGE (Most Important)

### 3.1 AWS Services Architecture

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| **Bedrock** | LLM for agents, embeddings, summaries | Backend API |
| **S3** | Document storage, evidence, exports | Backend + Lambda |
| **Lambda** | Async processing, triggers, schedulers | ES Alerts, EventBridge |
| **CloudWatch** | Logs, metrics, dashboards, alarms | All services |
| **SNS** | Notifications, escalation alerts | Lambda, CloudWatch |
| **EventBridge** | Scheduled jobs, event routing | Lambda triggers |
| **IAM** | Secure access, roles, policies | All services |
| **Secrets Manager** | API keys, ES credentials | Backend, Lambda |

### 3.2 AWS Lambda Functions

#### Lambda 1: `scam-scanner`
```python
# lambda/scam-scanner/handler.py
import json
import boto3
from elasticsearch import Elasticsearch

bedrock = boto3.client('bedrock-runtime')
es = Elasticsearch(cloud_id=os.environ['ES_CLOUD_ID'], api_key=os.environ['ES_API_KEY'])

def handler(event, context):
    """Async scam analysis triggered by API or S3 upload"""

    content = event.get('content')
    url = event.get('url')
    report_id = event.get('report_id')

    # Analyze with Bedrock
    analysis = analyze_with_bedrock(content, url)

    # Store results in Elasticsearch
    es.update(
        index='scam-reports',
        id=report_id,
        body={
            'doc': {
                'trust_score': analysis['trust_score'],
                'scam_probability': analysis['scam_probability'],
                'risk_indicators': analysis['indicators'],
                'analyzed_at': datetime.utcnow().isoformat()
            }
        }
    )

    # If high risk, trigger SNS notification
    if analysis['scam_probability'] > 0.8:
        sns = boto3.client('sns')
        sns.publish(
            TopicArn=os.environ['ALERT_TOPIC_ARN'],
            Message=json.dumps({
                'type': 'HIGH_RISK_SCAM',
                'report_id': report_id,
                'probability': analysis['scam_probability']
            })
        )

    return {'statusCode': 200, 'body': json.dumps(analysis)}

def analyze_with_bedrock(content, url):
    """Use Claude to analyze scam indicators"""

    prompt = f"""Analyze this message/URL for scam indicators:

Content: {content}
URL: {url}

Evaluate:
1. Urgency language (score 0-100)
2. Financial risk indicators (score 0-100)
3. Impersonation of government (score 0-100)
4. Link safety (score 0-100)
5. Overall scam probability (0-1)

Return JSON with: trust_score, scam_probability, indicators[]"""

    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-haiku-20240307-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 1024,
            'messages': [{'role': 'user', 'content': prompt}]
        })
    )

    return json.loads(response['body'].read())['content'][0]['text']
```

#### Lambda 2: `anomaly-detector`
```python
# lambda/anomaly-detector/handler.py
import json
import boto3
from elasticsearch import Elasticsearch
from datetime import datetime, timedelta

def handler(event, context):
    """Detect anomalies in complaint patterns"""

    es = Elasticsearch(
        cloud_id=os.environ['ES_CLOUD_ID'],
        api_key=os.environ['ES_API_KEY']
    )

    # Query for recent complaint spikes
    result = es.search(
        index='civic-events',
        body={
            'size': 0,
            'query': {
                'range': { 'created_at': { 'gte': 'now-7d' } }
            },
            'aggs': {
                'by_ward': {
                    'terms': { 'field': 'ward_id', 'size': 200 },
                    'aggs': {
                        'daily': {
                            'date_histogram': {
                                'field': 'created_at',
                                'calendar_interval': 'day'
                            }
                        },
                        'avg_daily': {
                            'avg_bucket': {
                                'buckets_path': 'daily._count'
                            }
                        },
                        'max_daily': {
                            'max_bucket': {
                                'buckets_path': 'daily._count'
                            }
                        }
                    }
                }
            }
        }
    )

    anomalies = []
    for ward in result['aggregations']['by_ward']['buckets']:
        avg = ward['avg_daily']['value'] or 0
        max_val = ward['max_daily']['value'] or 0

        # Spike detection: >2x average
        if max_val > avg * 2 and avg > 5:
            anomalies.append({
                'ward_id': ward['key'],
                'type': 'COMPLAINT_SPIKE',
                'avg_daily': avg,
                'max_daily': max_val,
                'severity': 'high' if max_val > avg * 3 else 'medium'
            })

    # Store anomalies
    for anomaly in anomalies:
        es.index(
            index='ward-metrics',
            body={
                'ward_id': anomaly['ward_id'],
                'anomaly_detected': True,
                'anomaly_types': [anomaly['type']],
                'calculated_at': datetime.utcnow().isoformat()
            }
        )

    # Publish to CloudWatch
    cloudwatch = boto3.client('cloudwatch')
    cloudwatch.put_metric_data(
        Namespace='GhostOffice',
        MetricData=[{
            'MetricName': 'AnomaliesDetected',
            'Value': len(anomalies),
            'Unit': 'Count'
        }]
    )

    return {'anomalies_detected': len(anomalies), 'details': anomalies}
```

#### Lambda 3: `alert-processor`
```python
# lambda/alert-processor/handler.py
import json
import boto3
from elasticsearch import Elasticsearch

def handler(event, context):
    """Process alerts from Elasticsearch Watcher"""

    alert_data = json.loads(event['body'])
    alert_type = alert_data.get('type')

    sns = boto3.client('sns')
    bedrock = boto3.client('bedrock-runtime')

    if alert_type == 'GHOST_OFFICE_CRITICAL':
        # Generate human-readable summary with Bedrock
        summary = generate_alert_summary(bedrock, alert_data)

        # Send notification
        sns.publish(
            TopicArn=os.environ['CIVIC_ALERTS_TOPIC'],
            Subject='🚨 Critical Ghost Office Detected',
            Message=summary
        )

        # Log to CloudWatch
        log_to_cloudwatch(alert_data)

    elif alert_type == 'SCAM_SPIKE':
        # Correlate with outages
        correlation = correlate_with_outages(alert_data)

        sns.publish(
            TopicArn=os.environ['SECURITY_ALERTS_TOPIC'],
            Subject='⚠️ Scam Spike Detected',
            Message=json.dumps(correlation)
        )

    return {'statusCode': 200}

def generate_alert_summary(bedrock, data):
    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-haiku-20240307-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 512,
            'messages': [{
                'role': 'user',
                'content': f"Generate a brief alert summary for civic officials: {json.dumps(data)}"
            }]
        })
    )
    return json.loads(response['body'].read())['content'][0]['text']
```

#### Lambda 4: `daily-aggregator`
```python
# lambda/daily-aggregator/handler.py
"""Scheduled daily job to compute ward metrics and ghost scores"""

def handler(event, context):
    es = Elasticsearch(
        cloud_id=os.environ['ES_CLOUD_ID'],
        api_key=os.environ['ES_API_KEY']
    )

    # Compute ghost office scores
    ghost_scores = compute_ghost_scores(es)

    # Compute ward health metrics
    ward_metrics = compute_ward_metrics(es)

    # Store results
    for score in ghost_scores:
        es.index(index='ghost-offices', body=score)

    for metric in ward_metrics:
        es.index(index='ward-metrics', body=metric)

    # Upload summary to S3
    s3 = boto3.client('s3')
    s3.put_object(
        Bucket=os.environ['REPORTS_BUCKET'],
        Key=f"daily-reports/{datetime.utcnow().strftime('%Y-%m-%d')}.json",
        Body=json.dumps({
            'ghost_offices': len([s for s in ghost_scores if s['ghost_score'] > 80]),
            'critical_wards': len([m for m in ward_metrics if m['scores']['civic_health_score'] < 40]),
            'generated_at': datetime.utcnow().isoformat()
        })
    )

    # Publish metrics to CloudWatch
    cloudwatch = boto3.client('cloudwatch')
    cloudwatch.put_metric_data(
        Namespace='GhostOffice',
        MetricData=[
            {
                'MetricName': 'GhostOfficeCount',
                'Value': len([s for s in ghost_scores if s['ghost_score'] > 80]),
                'Unit': 'Count'
            },
            {
                'MetricName': 'CriticalWardCount',
                'Value': len([m for m in ward_metrics if m['scores']['civic_health_score'] < 40]),
                'Unit': 'Count'
            }
        ]
    )

    return {'processed': True}
```

### 3.3 AWS Bedrock Integration

#### Bedrock Client Service
```typescript
// backend/src/services/bedrock/client.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

export async function generateSummary(context: string, type: 'executive' | 'citizen' | 'technical'): Promise<string> {
  const prompts = {
    executive: `Generate a brief executive summary for civic officials. Focus on key metrics, risks, and recommended actions. Context: ${context}`,
    citizen: `Explain this civic issue in simple, citizen-friendly language. Avoid jargon. Provide clear next steps. Context: ${context}`,
    technical: `Provide technical analysis of this civic infrastructure issue. Include root cause analysis and system dependencies. Context: ${context}`
  };

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompts[type] }]
    })
  }));

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v1',
    body: JSON.stringify({ inputText: text })
  }));

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embedding; // 1536 dimensions
}

export async function analyzeScamContent(content: string, url?: string): Promise<ScamAnalysis> {
  const prompt = `You are a fraud detection expert. Analyze this message for scam indicators:

MESSAGE: ${content}
${url ? `URL: ${url}` : ''}

Evaluate these factors (score 0-100 each):
1. Urgency/pressure language
2. Financial risk (payment requests, account access)
3. Government impersonation (fake BBMP, BESCOM, etc.)
4. Link safety (suspicious domains, shortened URLs)
5. Grammar/formatting anomalies

Return JSON:
{
  "trust_score": <0-100, higher=more trustworthy>,
  "scam_probability": <0-1>,
  "risk_level": "<low|medium|high|critical>",
  "indicators": [
    {"type": "<indicator>", "severity": "<low|medium|high>", "description": "<explanation>"}
  ],
  "explanation": "<human-readable summary>",
  "recommended_action": "<what citizen should do>"
}`;

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  }));

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return JSON.parse(result.content[0].text);
}

export async function generateEscalationRecommendation(trace: EscalationTrace): Promise<Recommendation> {
  const prompt = `You are a civic escalation expert for Bengaluru. Based on this complaint trace, recommend the best escalation path:

COMPLAINT: ${trace.complaint_summary}
CURRENT STATUS: ${trace.status}
DEPARTMENTS INVOLVED: ${trace.departments.join(' → ')}
DAYS OPEN: ${trace.days_open}
ESCALATION COUNT: ${trace.escalation_count}
BOTTLENECK: ${trace.bottleneck_department}

Provide:
1. Next recommended escalation step
2. Specific office/authority to contact
3. Draft complaint/RTI if needed
4. Expected timeline
5. Alternative paths if primary fails

Return JSON:
{
  "primary_recommendation": {
    "action": "<specific action>",
    "authority": "<office/person>",
    "contact": "<how to reach>",
    "expected_timeline": "<days>",
    "success_probability": <0-1>
  },
  "draft_complaint": "<if applicable, ready-to-send text>",
  "rti_recommendation": {
    "applicable": <boolean>,
    "draft": "<RTI text if applicable>"
  },
  "alternative_paths": [...]
}`;

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })
  }));

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return JSON.parse(result.content[0].text);
}
```

### 3.4 AWS S3 Structure
```
ghostoffice-civic-data/
├── civic-documents/
│   ├── complaints/
│   │   └── {complaint_id}/
│   │       ├── original.pdf
│   │       ├── attachments/
│   │       └── metadata.json
│   ├── rti-responses/
│   └── notices/
├── scam-evidence/
│   ├── screenshots/
│   ├── sms-exports/
│   └── url-captures/
├── ward-geojson/
│   ├── bengaluru-wards.geojson
│   └── zone-boundaries.geojson
├── daily-reports/
│   └── {YYYY-MM-DD}.json
├── exports/
│   └── {export_id}.csv
└── backups/
    └── elasticsearch/
```

### 3.5 AWS CloudWatch Dashboard
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Ghost Office Alerts",
        "metrics": [
          ["GhostOffice", "GhostOfficeCount"],
          ["GhostOffice", "CriticalWardCount"]
        ],
        "period": 3600
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Scam Detection",
        "metrics": [
          ["GhostOffice", "ScamReportsAnalyzed"],
          ["GhostOffice", "HighRiskScamsDetected"]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "API Performance",
        "metrics": [
          ["GhostOffice", "APILatency", { "stat": "p99" }],
          ["GhostOffice", "APIErrors"]
        ]
      }
    },
    {
      "type": "log",
      "properties": {
        "title": "Recent Alerts",
        "query": "SOURCE '/aws/lambda/alert-processor' | filter @message like /ALERT/"
      }
    }
  ]
}
```

### 3.6 AWS EventBridge Rules
```json
{
  "daily-ghost-score-calculation": {
    "schedule": "cron(0 2 * * ? *)",
    "target": "lambda:daily-aggregator"
  },
  "hourly-anomaly-detection": {
    "schedule": "rate(1 hour)",
    "target": "lambda:anomaly-detector"
  },
  "scam-report-processing": {
    "eventPattern": {
      "source": ["ghostoffice.api"],
      "detail-type": ["ScamReportSubmitted"]
    },
    "target": "lambda:scam-scanner"
  }
}
```

---

## 4. ACTIONABILITY (Important)

### 4.1 Actionable Outputs

Every insight MUST lead to a concrete action:

| Insight | Actionable Output |
|---------|-------------------|
| Ghost Office detected | → Specific escalation path + contact info |
| Complaint stagnant | → RTI draft ready to file |
| Scam detected | → Report to cyber cell + block instructions |
| Pattern identified | → Civic advocacy template |
| Bottleneck found | → Alternative department contact |

### 4.2 Action Templates

#### RTI Draft Generator
```typescript
function generateRTIDraft(complaint: Complaint): RTIDraft {
  return {
    to: `Public Information Officer, ${complaint.department}`,
    subject: `RTI Application - Complaint ${complaint.id} Status`,
    body: `
Under the Right to Information Act, 2005, I request the following information:

1. Current status of complaint ${complaint.id} filed on ${complaint.created_at}
2. Name and designation of officer(s) handling this complaint
3. Reason for delay beyond the stipulated resolution time of 14 days
4. Expected date of resolution
5. Any inter-departmental transfers and reasons thereof

Complaint Details:
- Issue: ${complaint.title}
- Ward: ${complaint.ward_name}
- Filed: ${complaint.created_at}
- Days Pending: ${complaint.days_open}

I am willing to pay the prescribed fee for this information.

Regards,
[Citizen Name]
[Contact Details]
    `,
    filing_instructions: [
      'Submit online at rtionline.gov.in',
      'Fee: ₹10 (waived for BPL)',
      'Response expected within 30 days'
    ]
  };
}
```

#### Escalation Path Generator
```typescript
function generateEscalationPath(trace: EscalationTrace): EscalationPath {
  const paths = {
    BBMP: [
      { level: 1, authority: 'Ward Engineer', contact: 'ward-engineer@bbmp.gov.in' },
      { level: 2, authority: 'Zonal Commissioner', contact: 'zonal-commissioner@bbmp.gov.in' },
      { level: 3, authority: 'BBMP Commissioner', contact: 'commissioner@bbmp.gov.in' },
      { level: 4, authority: 'Mayor Office', contact: 'mayor@bbmp.gov.in' },
      { level: 5, authority: 'Karnataka Lokayukta', contact: 'lokayukta.kar.nic.in' }
    ],
    BESCOM: [
      { level: 1, authority: 'Section Officer', contact: 'local office' },
      { level: 2, authority: 'Assistant Executive Engineer', contact: 'aee@bescom.co.in' },
      { level: 3, authority: 'Executive Engineer', contact: 'ee@bescom.co.in' },
      { level: 4, authority: 'BESCOM MD', contact: 'md@bescom.co.in' },
      { level: 5, authority: 'KERC (Regulatory)', contact: 'kerc.gov.in' }
    ],
    BWSSB: [
      { level: 1, authority: 'Junior Engineer', contact: 'local office' },
      { level: 2, authority: 'Assistant Engineer', contact: 'ae@bwssb.gov.in' },
      { level: 3, authority: 'Executive Engineer', contact: 'ee@bwssb.gov.in' },
      { level: 4, authority: 'Chief Engineer', contact: 'ce@bwssb.gov.in' },
      { level: 5, authority: 'BWSSB Chairman', contact: 'chairman@bwssb.gov.in' }
    ]
  };

  const currentLevel = trace.escalation_count;
  const nextLevel = paths[trace.department]?.[currentLevel];

  return {
    current_level: currentLevel,
    next_step: nextLevel,
    all_levels: paths[trace.department],
    recommended_action: generateActionText(trace, nextLevel),
    draft_complaint: generateComplaintDraft(trace, nextLevel)
  };
}
```

#### Scam Report Generator
```typescript
function generateScamReport(scam: ScamReport): ScamReportAction {
  return {
    immediate_actions: [
      'DO NOT click any links in the message',
      'DO NOT share OTP or banking details',
      'Block the sender number immediately'
    ],
    report_to: [
      {
        authority: 'National Cyber Crime Portal',
        url: 'https://cybercrime.gov.in',
        method: 'Online complaint form'
      },
      {
        authority: 'Bengaluru Cyber Crime Police',
        phone: '1930',
        address: 'CID Headquarters, Carlton House'
      },
      {
        authority: `${scam.spoofed_department} Official`,
        action: 'Report impersonation',
        contact: getDepartmentContact(scam.spoofed_department)
      }
    ],
    evidence_to_preserve: [
      'Screenshot of the message',
      'Sender phone number/email',
      'Any URLs in the message',
      'Time and date received'
    ],
    report_draft: generateCyberComplaintDraft(scam)
  };
}
```

---

## 5. SECURITY PRACTICES (Important)

### 5.1 TrustLens Security Engine

```typescript
// backend/src/services/security/trustlens.ts

interface TrustLensAnalysis {
  trust_score: number;           // 0-100
  scam_probability: number;      // 0-1
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  threat_category: string;
  indicators: RiskIndicator[];
  recommendation: string;
}

class TrustLensEngine {
  private patterns: ScamPattern[] = [
    // BESCOM scam patterns
    {
      type: 'BESCOM_IMPERSONATION',
      indicators: [
        { pattern: /your electricity.*disconnect/i, weight: 0.3 },
        { pattern: /pay.*immediately.*avoid/i, weight: 0.25 },
        { pattern: /click.*link.*update.*kyc/i, weight: 0.35 },
        { pattern: /bescom.*(?!gov\.in|co\.in)/i, weight: 0.4 }
      ]
    },
    // BBMP scam patterns
    {
      type: 'BBMP_IMPERSONATION',
      indicators: [
        { pattern: /property.*tax.*due.*immediate/i, weight: 0.3 },
        { pattern: /bbmp.*(?!gov\.in|karnataka\.gov)/i, weight: 0.4 },
        { pattern: /pay.*fine.*avoid.*legal/i, weight: 0.25 }
      ]
    },
    // Generic phishing patterns
    {
      type: 'GENERIC_PHISHING',
      indicators: [
        { pattern: /bit\.ly|tinyurl|short\.link/i, weight: 0.3 },
        { pattern: /verify.*account.*24.*hours/i, weight: 0.35 },
        { pattern: /otp|password|pin.*share/i, weight: 0.4 },
        { pattern: /lottery|prize|winner/i, weight: 0.35 }
      ]
    }
  ];

  async analyze(content: string, url?: string): Promise<TrustLensAnalysis> {
    const scores = {
      urgency: this.analyzeUrgency(content),
      domain: url ? this.analyzeDomain(url) : 100,
      pattern: this.analyzePatterns(content),
      linguistic: this.analyzeLinguistic(content),
      financial: this.analyzeFinancialRisk(content)
    };

    // Weighted combination
    const scam_probability = (
      (100 - scores.domain) * 0.35 +
      scores.urgency * 0.25 +
      scores.pattern * 0.20 +
      scores.financial * 0.15 +
      scores.linguistic * 0.05
    ) / 100;

    const trust_score = Math.max(0, 100 - (scam_probability * 100));

    return {
      trust_score,
      scam_probability,
      risk_level: this.getRiskLevel(scam_probability),
      threat_category: this.categorize(content, url),
      indicators: this.getIndicators(scores, content, url),
      recommendation: this.getRecommendation(scam_probability)
    };
  }

  private analyzeDomain(url: string): number {
    let score = 100;

    const domain = new URL(url).hostname;

    // Government domains are trustworthy
    if (domain.endsWith('.gov.in') || domain.endsWith('.nic.in')) {
      return 100;
    }

    // Official utility domains
    const officialDomains = ['bescom.co.in', 'bwssb.gov.in', 'bbmp.gov.in'];
    if (officialDomains.some(d => domain.includes(d))) {
      return 95;
    }

    // Suspicious patterns
    if (/bit\.ly|tinyurl|goo\.gl|short/i.test(domain)) score -= 40;
    if (/\d{4,}/.test(domain)) score -= 20; // Many numbers
    if (domain.length < 5) score -= 25;
    if (/bescom|bbmp|bwssb/i.test(domain) && !domain.endsWith('.gov.in')) score -= 50;

    return Math.max(0, score);
  }

  private analyzeUrgency(content: string): number {
    const urgencyPhrases = [
      { phrase: /immediate|immediately/i, weight: 15 },
      { phrase: /urgent|urgently/i, weight: 15 },
      { phrase: /last chance|final notice/i, weight: 20 },
      { phrase: /within.*hours|today only/i, weight: 15 },
      { phrase: /act now|don't delay/i, weight: 10 },
      { phrase: /suspended|terminated|blocked/i, weight: 20 },
      { phrase: /legal action|police|court/i, weight: 15 }
    ];

    let score = 0;
    for (const { phrase, weight } of urgencyPhrases) {
      if (phrase.test(content)) score += weight;
    }

    return Math.min(100, score);
  }

  private analyzeFinancialRisk(content: string): number {
    const financialIndicators = [
      { pattern: /pay.*₹|rs\.|rupees/i, weight: 20 },
      { pattern: /bank.*account|upi|gpay|phonepe/i, weight: 25 },
      { pattern: /otp|password|pin|cvv/i, weight: 35 },
      { pattern: /transfer.*money|send.*payment/i, weight: 25 },
      { pattern: /fine|penalty|due.*amount/i, weight: 15 }
    ];

    let score = 0;
    for (const { pattern, weight } of financialIndicators) {
      if (pattern.test(content)) score += weight;
    }

    return Math.min(100, score);
  }
}
```

### 5.2 Input Validation & Sanitization

```typescript
// backend/src/api/validators/security.ts
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

// Complaint input validation
export const complaintSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters')
    .transform(val => sanitizeHtml(val, { allowedTags: [] })),

  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .transform(val => sanitizeHtml(val, { allowedTags: ['p', 'br'] })),

  department: z.enum(['BBMP', 'BESCOM', 'BWSSB', 'RERA', 'BDA', 'BMTC']),

  ward_id: z.string()
    .regex(/^W\d{3}$/, 'Invalid ward ID format'),

  geo_location: z.object({
    lat: z.number().min(12.7).max(13.2), // Bengaluru bounds
    lon: z.number().min(77.4).max(77.8)
  }).optional(),

  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),

  attachments: z.array(z.string().url()).max(5).optional()
});

// Scam report validation
export const scamReportSchema = z.object({
  content: z.string()
    .min(5)
    .max(2000)
    .transform(val => val.trim()),

  source_type: z.enum(['sms', 'whatsapp', 'email', 'url', 'call']),

  url: z.string().url().optional(),

  sender_id: z.string().max(50).optional()
});

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// API key validation for sensitive endpoints
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
};
```

### 5.3 Security Headers & CORS

```typescript
// backend/src/middleware/security.ts
import helmet from 'helmet';
import cors from 'cors';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", process.env.ES_CLOUD_URL, "https://*.amazonaws.com"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true
    }
  }),

  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true
  })
];
```

---

## 6. DATA EFFORT

### 6.1 Synthetic Data Generation

```typescript
// data/generators/generate-all.ts

const CONFIG = {
  complaints: 5000,
  escalation_traces: 3000,
  scam_reports: 500,
  outages: 200,
  wards: 198, // All Bengaluru wards
  date_range_days: 90
};

// Ward data (all 198 Bengaluru wards)
const WARDS = [
  { id: 'W001', name: 'Kempegowda Ward', zone: 'South', lat: 12.9716, lon: 77.5946 },
  { id: 'W002', name: 'Chickpet', zone: 'South', lat: 12.9716, lon: 77.5780 },
  { id: 'W003', name: 'Cottonpet', zone: 'South', lat: 12.9697, lon: 77.5697 },
  // ... all 198 wards
];

const DEPARTMENTS = [
  { code: 'BBMP', name: 'Bruhat Bengaluru Mahanagara Palike', issues: ['road', 'garbage', 'drainage', 'building', 'license'] },
  { code: 'BESCOM', name: 'Bangalore Electricity Supply Company', issues: ['power_outage', 'billing', 'new_connection', 'transformer', 'streetlight'] },
  { code: 'BWSSB', name: 'Bangalore Water Supply and Sewerage Board', issues: ['water_supply', 'sewage', 'billing', 'pipeline', 'borewell'] },
  { code: 'RERA', name: 'Real Estate Regulatory Authority', issues: ['builder_complaint', 'project_delay', 'refund', 'documentation'] },
  { code: 'BDA', name: 'Bangalore Development Authority', issues: ['land', 'layout', 'encroachment', 'approval'] }
];

// Generate realistic complaint with correlations
function generateComplaint(index: number): CivicEvent {
  const ward = faker.helpers.arrayElement(WARDS);
  const dept = faker.helpers.arrayElement(DEPARTMENTS);
  const issue = faker.helpers.arrayElement(dept.issues);
  const createdAt = faker.date.recent({ days: CONFIG.date_range_days });

  // Simulate realistic patterns
  const isGhostWard = ['W083', 'W015', 'W042', 'W127'].includes(ward.id); // Some wards are problematic
  const baseDelayDays = isGhostWard ? faker.number.int({ min: 14, max: 60 }) : faker.number.int({ min: 1, max: 21 });

  const statuses = isGhostWard
    ? ['open', 'open', 'open', 'pending', 'transferred'] // Ghost wards have more open
    : ['open', 'resolved', 'resolved', 'in_progress', 'closed'];

  const status = faker.helpers.arrayElement(statuses);
  const isResolved = ['resolved', 'closed'].includes(status);

  const escalationCount = isGhostWard
    ? faker.number.int({ min: 2, max: 6 })
    : faker.number.int({ min: 0, max: 2 });

  return {
    event_id: `CE${String(index).padStart(6, '0')}`,
    event_type: 'complaint',
    department: dept.code,
    department_code: dept.code,
    ward_id: ward.id,
    ward_name: ward.name,
    zone: ward.zone,
    issue_type: issue,
    issue_category: dept.code,
    title: generateComplaintTitle(dept.code, issue),
    description: generateComplaintDescription(dept.code, issue),
    status,
    priority: faker.helpers.arrayElement(['low', 'medium', 'medium', 'high', 'critical']),
    severity: faker.number.int({ min: 1, max: 5 }),
    created_at: createdAt.toISOString(),
    updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
    resolved_at: isResolved ? faker.date.between({ from: createdAt, to: new Date() }).toISOString() : null,
    days_open: isResolved ? faker.number.int({ min: 1, max: baseDelayDays }) : baseDelayDays,
    is_overdue: baseDelayDays > 14,
    geo_location: {
      lat: ward.lat + (Math.random() - 0.5) * 0.01,
      lon: ward.lon + (Math.random() - 0.5) * 0.01
    },
    citizen_id: `CIT${faker.string.alphanumeric(8).toUpperCase()}`,
    escalation_count: escalationCount,
    transfer_count: Math.max(0, escalationCount - 1),
    is_suspicious_closure: isResolved && baseDelayDays < 2 && escalationCount > 2,
    escalation_path: generateEscalationPath(dept.code, escalationCount, createdAt)
  };
}

// Generate scam messages with realistic patterns
function generateScamReport(index: number): ScamReport {
  const scamTypes = [
    { type: 'BESCOM_FAKE_BILL', template: 'Dear Customer, Your BESCOM bill of ₹{amount} is overdue. Pay immediately to avoid disconnection: {url}' },
    { type: 'BBMP_TAX_SCAM', template: 'BBMP Notice: Property tax penalty of ₹{amount} due. Clear within 24 hours or face legal action: {url}' },
    { type: 'BWSSB_KYC_SCAM', template: 'BWSSB Alert: Update your KYC to continue water supply. Click here: {url}' },
    { type: 'LOTTERY_SCAM', template: 'Congratulations! You won ₹{amount} in Karnataka State Lottery. Claim now: {url}' },
    { type: 'OTP_PHISHING', template: 'Your {dept} account will be suspended. Share OTP sent to your number to verify.' }
  ];

  const scam = faker.helpers.arrayElement(scamTypes);
  const ward = faker.helpers.arrayElement(WARDS);

  // Correlate with outages (30% of scams happen during outages)
  const isOutageCorrelated = Math.random() < 0.3;

  return {
    report_id: `SR${String(index).padStart(6, '0')}`,
    report_type: 'scam_sms',
    source_type: faker.helpers.arrayElement(['sms', 'whatsapp', 'email']),
    content: scam.template
      .replace('{amount}', String(faker.number.int({ min: 500, max: 50000 })))
      .replace('{url}', faker.helpers.arrayElement([
        'bit.ly/' + faker.string.alphanumeric(6),
        'bescom-pay.' + faker.internet.domainName(),
        'bbmp-tax.' + faker.internet.domainName()
      ]))
      .replace('{dept}', faker.helpers.arrayElement(['BESCOM', 'BBMP', 'BWSSB'])),
    scam_type: scam.type,
    ward_id: ward.id,
    geo_location: { lat: ward.lat, lon: ward.lon },
    is_outage_correlated: isOutageCorrelated,
    reported_at: faker.date.recent({ days: 30 }).toISOString()
  };
}
```

### 6.2 Data Volumes

| Dataset | Records | Fields | Relationships |
|---------|---------|--------|---------------|
| Complaints | 5,000 | 35+ | Ward, Department, Citizen |
| Escalation Traces | 3,000 | 20+ | Complaint, Spans |
| Scam Reports | 500 | 25+ | Ward, Outage correlation |
| Ward Metrics | 198 | 30+ | All complaints aggregated |
| Ghost Office Scores | 500+ | 20+ | Department + Ward combinations |
| Outages | 200 | 15+ | Department, Ward, Duration |

---

## 7. FOLDER STRUCTURE

```
ghostoffice/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── ELASTIC_SETUP.md
│   ├── AWS_SETUP.md
│   ├── DEMO_SCRIPT.md
│   └── PITCH.md
│
├── infrastructure/
│   ├── aws/
│   │   ├── cloudformation/
│   │   │   └── ghostoffice-stack.yaml
│   │   ├── lambda/
│   │   │   ├── scam-scanner/
│   │   │   ├── anomaly-detector/
│   │   │   ├── alert-processor/
│   │   │   └── daily-aggregator/
│   │   └── s3/
│   │       └── bucket-policy.json
│   ├── elasticsearch/
│   │   ├── indices/
│   │   │   ├── civic-events.json
│   │   │   ├── ghost-offices.json
│   │   │   ├── scam-reports.json
│   │   │   ├── escalation-traces.json
│   │   │   ├── ward-metrics.json
│   │   │   └── civic-vectors.json
│   │   ├── pipelines/
│   │   │   ├── civic-event-pipeline.json
│   │   │   ├── scam-detection-pipeline.json
│   │   │   └── geo-enrichment-pipeline.json
│   │   ├── transforms/
│   │   │   └── ghost-office-transform.json
│   │   ├── watchers/
│   │   │   ├── ghost-office-alert.json
│   │   │   └── scam-spike-alert.json
│   │   └── kibana/
│   │       └── dashboards.ndjson
│   └── docker/
│       ├── Dockerfile.backend
│       └── Dockerfile.frontend
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── config/
│       ├── api/
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── validators/
│       ├── services/
│       │   ├── elasticsearch/
│       │   ├── bedrock/
│       │   ├── ghost-office/
│       │   ├── trustlens/
│       │   ├── escalation/
│       │   └── actions/
│       ├── agents/
│       │   ├── orchestrator.ts
│       │   ├── complaint-router.ts
│       │   ├── fraud-detector.ts
│       │   ├── accountability-auditor.ts
│       │   ├── escalation-recommender.ts
│       │   └── civic-intelligence.ts
│       └── utils/
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── dashboard/
│       │   ├── ghost-offices/
│       │   ├── complaints/
│       │   ├── trustlens/
│       │   ├── analytics/
│       │   ├── wards/
│       │   ├── agents/
│       │   └── actions/
│       ├── components/
│       │   ├── ui/
│       │   ├── dashboard/
│       │   ├── visualizations/
│       │   ├── maps/
│       │   └── agents/
│       └── lib/
│
├── data/
│   ├── generators/
│   │   ├── generate-all.ts
│   │   ├── complaints.ts
│   │   ├── scams.ts
│   │   ├── wards.ts
│   │   └── outages.ts
│   ├── seed/
│   │   ├── wards.json
│   │   ├── departments.json
│   │   └── scam-patterns.json
│   └── generated/
│
└── scripts/
    ├── setup-elastic.sh
    ├── setup-aws.sh
    ├── seed-data.sh
    └── deploy.sh
```

---

## 8. IMPLEMENTATION PHASES

### Phase 1: Foundation (4 hours)
- [ ] Project scaffolding
- [ ] Elasticsearch Cloud setup
- [ ] All 6 index mappings created
- [ ] 3 ingest pipelines deployed
- [ ] AWS account setup (Bedrock, S3, Lambda, CloudWatch)

### Phase 2: Data Layer (3 hours)
- [ ] Synthetic data generator (5000+ records)
- [ ] Data seeding scripts
- [ ] S3 bucket with GeoJSON

### Phase 3: Backend Core (4 hours)
- [ ] Express/Node.js API
- [ ] Elasticsearch service layer
- [ ] Ghost Office detection engine
- [ ] TrustLens security engine
- [ ] Bedrock integration

### Phase 4: AWS Integration (3 hours)
- [ ] Lambda functions (4)
- [ ] EventBridge rules
- [ ] CloudWatch dashboard
- [ ] SNS topics

### Phase 5: Agent System (2 hours)
- [ ] OpenClaw orchestrator
- [ ] 5 specialized agents
- [ ] Agent logging/visibility

### Phase 6: Frontend (4 hours)
- [ ] Next.js setup with shadcn/ui
- [ ] Dashboard layout
- [ ] Ghost Office rankings
- [ ] TrustLens scanner
- [ ] Maps and visualizations
- [ ] Agent console

### Phase 7: Actionability (2 hours)
- [ ] RTI draft generator
- [ ] Escalation path recommender
- [ ] Scam report generator
- [ ] Export functionality

### Phase 8: Polish & Demo (2 hours)
- [ ] Kibana dashboards
- [ ] Demo data refinement
- [ ] Demo script
- [ ] Documentation

---

## 9. SUCCESS CRITERIA

| Criteria | Target | Validation |
|----------|--------|------------|
| **Elastic Usage** | 6 indices, 3 pipelines, transforms, watchers, kNN | Kibana visible |
| **AWS Usage** | Bedrock, S3, Lambda (4), CloudWatch, SNS, EventBridge | AWS Console |
| **Data Effort** | 5000+ complaints, 500+ scams, 198 wards | ES count queries |
| **Actionability** | Every insight → action (RTI, escalation, report) | Demo flow |
| **Security** | TrustLens engine, input validation, rate limiting | Scam detection demo |
| **Real-world Impact** | Bengaluru-specific, realistic data, usable outputs | Demo narrative |

---

## Ready for Implementation?

This plan ensures:
- ✅ **Heavy Elastic usage**: 6 indices, 3 pipelines, transforms, watchers, kNN search, geo queries
- ✅ **Heavy AWS usage**: Bedrock, S3, Lambda (4 functions), CloudWatch, SNS, EventBridge
- ✅ **Strong data effort**: 5000+ synthetic records with realistic patterns
- ✅ **Actionability**: RTI drafts, escalation paths, scam reports, export
- ✅ **Security**: TrustLens engine, input validation, rate limiting, secure APIs
- ✅ **Real-world impact**: Bengaluru civic pain points, actionable outcomes

**Approve to start building!**
