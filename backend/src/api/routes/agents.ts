import { Router, Request, Response } from 'express';
import { esService } from '../../services/elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';
import { ghostOfficeDetector } from '../../services/ghost-office/detector.js';
import { trustLensAnalyzer } from '../../services/trustlens/analyzer.js';

const router = Router();

// OpenClaw Agent Types
const AGENT_TYPES = {
  GHOST_HUNTER: 'ghost-hunter',
  SCAM_DETECTOR: 'scam-detector',
  ESCALATION_TRACER: 'escalation-tracer',
  CIVIC_ANALYZER: 'civic-analyzer',
  RTI_DRAFTER: 'rti-drafter',
};

// Get available agents
router.get('/', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      agents: [
        {
          id: AGENT_TYPES.GHOST_HUNTER,
          name: 'Ghost Hunter',
          description: 'Detects unresponsive government offices using complaint patterns',
          capabilities: ['ghost_office_detection', 'stagnation_analysis', 'zone_ranking'],
          status: 'active',
        },
        {
          id: AGENT_TYPES.SCAM_DETECTOR,
          name: 'TrustLens Scam Detector',
          description: 'Analyzes messages for scam indicators and government impersonation',
          capabilities: ['scam_analysis', 'risk_scoring', 'outage_correlation'],
          status: 'active',
        },
        {
          id: AGENT_TYPES.ESCALATION_TRACER,
          name: 'Escalation Tracer',
          description: 'Traces complaint escalation paths like distributed system traces',
          capabilities: ['escalation_tracking', 'bottleneck_detection', 'timeline_reconstruction'],
          status: 'active',
        },
        {
          id: AGENT_TYPES.CIVIC_ANALYZER,
          name: 'Civic Analyzer',
          description: 'Provides civic health scores and performance analytics',
          capabilities: ['health_scoring', 'trend_analysis', 'comparative_metrics'],
          status: 'active',
        },
        {
          id: AGENT_TYPES.RTI_DRAFTER,
          name: 'RTI Drafter',
          description: 'Generates RTI applications based on complaint patterns',
          capabilities: ['rti_generation', 'legal_formatting', 'evidence_compilation'],
          status: 'active',
        },
      ],
    },
  });
});

// Execute agent task
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { agent_type, task, parameters = {} } = req.body;

    if (!agent_type || !task) {
      return res.status(400).json({
        success: false,
        error: 'agent_type and task are required',
      });
    }

    const executionId = `EXEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let result: any = null;

    switch (agent_type) {
      case AGENT_TYPES.GHOST_HUNTER:
        result = await executeGhostHunter(task, parameters);
        break;
      case AGENT_TYPES.SCAM_DETECTOR:
        result = await executeScamDetector(task, parameters);
        break;
      case AGENT_TYPES.ESCALATION_TRACER:
        result = await executeEscalationTracer(task, parameters);
        break;
      case AGENT_TYPES.CIVIC_ANALYZER:
        result = await executeCivicAnalyzer(task, parameters);
        break;
      case AGENT_TYPES.RTI_DRAFTER:
        result = await executeRtiDrafter(task, parameters);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown agent type: ${agent_type}`,
        });
    }

    res.json({
      success: true,
      data: {
        execution_id: executionId,
        agent_type,
        task,
        result,
        executed_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error executing agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ghost Hunter agent tasks
async function executeGhostHunter(task: string, params: any) {
  switch (task) {
    case 'detect_all':
      return ghostOfficeDetector.calculateGhostScores(params);
    case 'get_top':
      return ghostOfficeDetector.getTopGhostOffices(params.limit || 10);
    case 'get_heatmap':
      return ghostOfficeDetector.getGhostOfficeHeatmap();
    case 'analyze_zone':
      return ghostOfficeDetector.calculateGhostScores({ zone: params.zone });
    case 'analyze_department':
      return ghostOfficeDetector.calculateGhostScores({ department: params.department });
    default:
      throw new Error(`Unknown ghost-hunter task: ${task}`);
  }
}

// Scam Detector agent tasks
async function executeScamDetector(task: string, params: any) {
  switch (task) {
    case 'analyze':
      return trustLensAnalyzer.analyzeContent(params.content, params.url);
    case 'store_report':
      return trustLensAnalyzer.storeReport(params.content, params.source_type || 'api', params.url, params.ward_id);
    case 'get_stats':
      return trustLensAnalyzer.getScamStatistics(params);
    case 'batch_analyze':
      const results = await Promise.all(
        params.messages.map((msg: any) => trustLensAnalyzer.analyzeContent(msg.content, msg.url))
      );
      return { analyzed: results.length, results };
    default:
      throw new Error(`Unknown scam-detector task: ${task}`);
  }
}

// Escalation Tracer agent tasks
async function executeEscalationTracer(task: string, params: any) {
  switch (task) {
    case 'trace_complaint':
      const complaint = await esService.get<any>(ES_INDICES.CIVIC_EVENTS, params.complaint_id);
      if (!complaint) throw new Error('Complaint not found');

      return {
        complaint_id: params.complaint_id,
        timeline: complaint.timeline || [],
        escalation_count: complaint.escalation_count || 0,
        transfer_count: complaint.transfer_count || 0,
        current_status: complaint.status,
        days_open: complaint.days_open,
        bottlenecks: identifyBottlenecks(complaint),
      };

    case 'find_loops':
      const loopQuery = {
        bool: {
          must: [
            { range: { escalation_count: { gte: params.min_escalations || 3 } } },
          ],
        },
      };
      const loops = await esService.search(ES_INDICES.CIVIC_EVENTS, loopQuery, { size: params.limit || 20 });
      return { escalation_loops: loops.hits, total: loops.total };

    case 'department_flow':
      const flowAggs = {
        departments: {
          terms: { field: 'department', size: 20 },
          aggs: {
            avg_escalations: { avg: { field: 'escalation_count' } },
            avg_transfers: { avg: { field: 'transfer_count' } },
            stagnant: { filter: { range: { days_open: { gte: 14 } } } },
          },
        },
      };
      return esService.aggregate(ES_INDICES.CIVIC_EVENTS, flowAggs);

    default:
      throw new Error(`Unknown escalation-tracer task: ${task}`);
  }
}

// Civic Analyzer agent tasks
async function executeCivicAnalyzer(task: string, params: any) {
  switch (task) {
    case 'health_score':
      const healthAggs = {
        metrics: {
          filter: { range: { created_at: { gte: params.date_from || 'now-30d' } } },
          aggs: {
            total: { value_count: { field: 'event_id' } },
            resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
            overdue: { filter: { term: { is_overdue: true } } },
            avg_days: { avg: { field: 'days_open' } },
          },
        },
      };

      const query = params.zone ? { term: { zone: params.zone } } : { match_all: {} };
      const healthResult = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, healthAggs, query);

      const total = healthResult.metrics?.total?.value || 1;
      const resolved = healthResult.metrics?.resolved?.doc_count || 0;
      const overdue = healthResult.metrics?.overdue?.doc_count || 0;
      const avgDays = healthResult.metrics?.avg_days?.value || 0;

      const score = Math.max(0, Math.min(100,
        (resolved / total) * 40 +
        (1 - overdue / total) * 30 +
        Math.max(0, (30 - avgDays) / 30) * 30
      ));

      return {
        zone: params.zone || 'all',
        health_score: Math.round(score * 100) / 100,
        grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F',
        metrics: { total, resolved, overdue, avg_days: avgDays },
      };

    case 'compare_zones':
      const compareAggs = {
        by_zone: {
          terms: { field: 'zone', size: 10 },
          aggs: {
            total: { value_count: { field: 'event_id' } },
            resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
            overdue: { filter: { term: { is_overdue: true } } },
            avg_days: { avg: { field: 'days_open' } },
          },
        },
      };
      return esService.aggregate(ES_INDICES.CIVIC_EVENTS, compareAggs);

    default:
      throw new Error(`Unknown civic-analyzer task: ${task}`);
  }
}

// RTI Drafter agent tasks
async function executeRtiDrafter(task: string, params: any) {
  switch (task) {
    case 'draft_rti':
      return generateRtiDraft(params);
    case 'bulk_draft':
      const drafts = await Promise.all(
        params.complaint_ids.map((id: string) => generateRtiFromComplaint(id))
      );
      return { drafts };
    default:
      throw new Error(`Unknown rti-drafter task: ${task}`);
  }
}

// Helper functions
function identifyBottlenecks(complaint: any) {
  const bottlenecks = [];

  if (complaint.days_open > 30) {
    bottlenecks.push({
      type: 'STAGNATION',
      severity: 'high',
      description: `Complaint open for ${complaint.days_open} days`,
    });
  }

  if (complaint.escalation_count >= 3) {
    bottlenecks.push({
      type: 'ESCALATION_LOOP',
      severity: 'high',
      description: `Escalated ${complaint.escalation_count} times`,
    });
  }

  if (complaint.transfer_count >= 2) {
    bottlenecks.push({
      type: 'TRANSFER_PING_PONG',
      severity: 'medium',
      description: `Transferred ${complaint.transfer_count} times between departments`,
    });
  }

  return bottlenecks;
}

function generateRtiDraft(params: any) {
  const {
    subject,
    department,
    details,
    requester_name = '[YOUR NAME]',
    requester_address = '[YOUR ADDRESS]',
  } = params;

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return {
    type: 'RTI_APPLICATION',
    format: 'text',
    content: `
RIGHT TO INFORMATION APPLICATION
Under Section 6(1) of RTI Act, 2005

Date: ${today}

To,
The Public Information Officer,
${department || '[DEPARTMENT NAME]'},
Government of Karnataka,
Bengaluru

Subject: ${subject || 'Request for Information regarding civic complaint status'}

Sir/Madam,

I, ${requester_name}, resident of ${requester_address}, hereby request the following information under the Right to Information Act, 2005:

${details || `
1. Total number of complaints received by your department in the last 6 months
2. Number of complaints resolved and pending
3. Average resolution time for complaints
4. Reasons for delay in resolution of pending complaints
5. Action taken against officers responsible for delays
`}

I am ready to pay the requisite fee as applicable. Kindly provide the information within 30 days as stipulated under the Act.

I declare that I am a citizen of India.

Thanking you,

${requester_name}
${requester_address}

Enclosures:
- Application fee of Rs. 10/- (IPO/DD/Court Fee Stamp)
- Copy of ID proof
    `.trim(),
    generated_at: new Date().toISOString(),
  };
}

async function generateRtiFromComplaint(complaintId: string) {
  const complaint = await esService.get<any>(ES_INDICES.CIVIC_EVENTS, complaintId);
  if (!complaint) throw new Error(`Complaint ${complaintId} not found`);

  return generateRtiDraft({
    subject: `Request for Information regarding complaint ${complaintId}: ${complaint.title}`,
    department: complaint.department,
    details: `
1. Current status of complaint ID: ${complaintId}
2. Name and designation of officer handling this complaint
3. Reason for delay if complaint is pending beyond SLA
4. Copies of all internal communications regarding this complaint
5. Action taken report and expected resolution date
    `.trim(),
  });
}

// Agent status and monitoring
router.get('/status', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      orchestrator: 'OpenClaw',
      version: '1.0.0',
      active_agents: Object.keys(AGENT_TYPES).length,
      health: 'healthy',
      uptime_seconds: process.uptime(),
    },
  });
});

export default router;
