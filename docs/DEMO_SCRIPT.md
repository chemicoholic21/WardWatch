# GhostOffice Demo Script

## Pre-Demo Checklist
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Elasticsearch seeded with data
- [ ] AWS Lambda functions deployed
- [ ] Demo data generated (5000+ records)

---

## Demo Flow (10-15 minutes)

### Act 1: The Problem (2 min)

**Opening Statement:**
> "Bengaluru has over 200 wards and multiple government departments handling thousands of civic complaints daily. But how do you identify which offices are actually responsive, and which are 'ghost offices' - appearing active but never resolving issues?"

**Show the pain point:**
> "Citizens file complaints that get stuck in escalation loops, transferred between departments, or simply ignored. Meanwhile, scammers exploit outages to impersonate government agencies."

---

### Act 2: Enter GhostOffice (1 min)

**Navigate to Dashboard**

> "GhostOffice treats civic infrastructure like a distributed system, using observability principles to detect failures."

**Highlight Stats:**
- Total Complaints: 5,247
- Ghost Offices Detected: 12
- Active Scam Alerts: 5
- Average Resolution: 8.3 days (down 15%)

---

### Act 3: Ghost Office Detection (3 min)

**Navigate to Ghost Office Leaderboard**

> "Using Elasticsearch aggregations, we calculate a 'Ghost Score' for every office based on:"

Point to each factor:
1. **Stagnation Rate** - % of complaints stuck > 14 days
2. **Escalation Loops** - Complaints escalated 3+ times
3. **Transfer Ratio** - Ping-pong between departments
4. **Suspicious Closures** - Closed without resolution

**Show Top Ghost Office:**
> "BBMP Mahadevapura has a ghost score of 92.4 - critical level. 187 open complaints, average 45 days open."

**Click on Heatmap:**
> "The heatmap shows concentration of ghost offices by zone. East Zone clearly needs intervention."

**Elasticsearch Query Demo:**
```json
{
  "aggs": {
    "by_office": {
      "composite": {
        "sources": [
          { "department": { "terms": { "field": "department" } } },
          { "ward_id": { "terms": { "field": "ward_id" } } }
        ]
      },
      "aggs": {
        "stagnant": { "filter": { "range": { "days_open": { "gte": 14 } } } },
        "escalation_loops": { "filter": { "range": { "escalation_count": { "gte": 3 } } } }
      }
    }
  }
}
```

---

### Act 4: TrustLens Security (3 min)

**Navigate to TrustLens Panel**

> "Scammers exploit service outages to send fake payment requests. TrustLens detects this pattern."

**Live Demo - Analyze Suspicious Message:**

Paste this in the analyzer:
```
BESCOM URGENT: Power disconnection in 2 hours due to unpaid bill.
Pay Rs. 1,500 immediately at bit.ly/bescom-quick-pay to avoid disconnection.
```

**Show Results:**
- Trust Score: 8/100 (Highly Suspicious)
- Risk Level: CRITICAL
- Detected Patterns:
  - Urgency language ("2 hours", "immediately")
  - Government impersonation (BESCOM)
  - Suspicious shortened URL
  - Payment request

**Show Outage Correlation:**
> "Notice this scam was reported during an actual BESCOM outage. Scammers monitor outage announcements and send targeted messages."

**AWS Integration:**
> "AWS Bedrock Claude 3 helps analyze message content for sophisticated pattern detection beyond keyword matching."

---

### Act 5: OpenClaw Agents (2 min)

**Navigate to Agents Page**

> "OpenClaw is our multi-agent AI system for civic intelligence."

**Show Available Agents:**
1. Ghost Hunter - Detecting unresponsive offices
2. TrustLens Detector - Currently running (show green status)
3. Escalation Tracer - Mapping complaint journeys
4. Civic Analyzer - Computing health scores
5. RTI Drafter - Generating actionable documents

**Run Live Agent Task:**
```javascript
// Execute Ghost Hunter
POST /api/agents/execute
{
  "agent_type": "ghost-hunter",
  "task": "detect_all",
  "parameters": { "zone": "East" }
}
```

**Show Result:**
> "In 2.3 seconds, the agent analyzed 1,250 complaints and identified 4 ghost offices in East Zone."

---

### Act 6: Actionable Outputs (2 min)

> "Every insight in GhostOffice leads to action."

**Generate RTI Application:**

Click "Generate RTI" for the top ghost office:

```
RIGHT TO INFORMATION APPLICATION
Under Section 6(1) of RTI Act, 2005

To,
The Public Information Officer,
BBMP Mahadevapura,
Government of Karnataka

Subject: Request for Information regarding civic complaint resolution

1. Total number of complaints received in the last 6 months
2. Number of complaints resolved and pending
3. Average resolution time for complaints
4. Reasons for delay in resolution of pending complaints
5. Action taken against officers responsible for delays
```

> "Citizens can download and submit this RTI. We're making accountability accessible."

**Show Other Outputs:**
- Escalation letter to Commissioner
- Ward report card for social media
- Department performance ranking

---

### Act 7: Technical Deep Dive (2 min)

**Show Architecture:**
> "Everything is powered by Elastic Cloud and AWS."

**Elasticsearch Features Used:**
- 6 Indices with optimized mappings
- 3 Ingest pipelines for data enrichment
- kNN vector search for semantic similarity
- Geo queries for location-based analysis
- Transforms for pre-computed aggregations
- Watchers for real-time alerts

**AWS Services:**
- Bedrock Claude 3 for AI analysis
- 4 Lambda functions (show SAM template)
- CloudWatch dashboards
- SNS for alerts
- S3 for data storage

**Show CloudWatch Dashboard:**
> "Ghost office metrics are tracked in real-time. When a new critical ghost office is detected, we get an SNS alert."

---

### Closing (1 min)

**Summary:**
> "GhostOffice transforms how citizens interact with civic infrastructure:"

1. **Visibility** - Know which offices are actually working
2. **Security** - Protect from scams during outages
3. **Action** - Generate RTI applications in seconds
4. **Accountability** - Data-driven department rankings

**Call to Action:**
> "This is built for Bengaluru, but the pattern works anywhere. Treat your city like a distributed system, and you'll find the ghost offices hiding in plain sight."

---

## Q&A Preparation

### Expected Questions:

**Q: How do you handle real data vs synthetic?**
> "The architecture supports both. We've generated 5000+ synthetic records with realistic patterns for demo, but the system can ingest real complaint data from government APIs."

**Q: What's the data refresh frequency?**
> "Ghost scores are recalculated hourly via Lambda. Scam detection is real-time. Dashboard refreshes every 2 minutes."

**Q: How accurate is ghost office detection?**
> "We use multiple factors with weighted scoring. An office needs high scores across stagnation, escalations, AND transfers to be flagged. This reduces false positives."

**Q: Can citizens use this directly?**
> "Yes! The TrustLens message analyzer works for anyone. Citizens can paste suspicious messages and get instant analysis."

---

## Backup Demos

If live demo fails:

1. **Screenshot Gallery** - `/docs/screenshots/`
2. **Recorded Video** - `/docs/demo-video.mp4`
3. **API Postman Collection** - `/docs/ghostoffice.postman.json`
