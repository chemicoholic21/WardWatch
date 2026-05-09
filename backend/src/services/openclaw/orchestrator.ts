/**
 * OpenClaw Agent Orchestrator
 * Multi-agent system for civic intelligence
 * Coordinates specialized agents for different analysis tasks
 */

import { ghostOfficeDetector } from '../ghost-office/detector.js';
import { trustLensAnalyzer } from '../trustlens/analyzer.js';
import { esService } from '../elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';

// Agent types
export enum AgentType {
  GHOST_HUNTER = 'ghost-hunter',
  SCAM_DETECTOR = 'scam-detector',
  ESCALATION_TRACER = 'escalation-tracer',
  CIVIC_ANALYZER = 'civic-analyzer',
  RTI_DRAFTER = 'rti-drafter',
  PATTERN_DETECTOR = 'pattern-detector',
}

// Agent status
export interface AgentStatus {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastRun?: string;
  capabilities: string[];
  metrics?: Record<string, number>;
}

// Task definition
export interface AgentTask {
  id: string;
  agentType: AgentType;
  action: string;
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

// Workflow step
export interface WorkflowStep {
  agentType: AgentType;
  action: string;
  parameters?: Record<string, any>;
  dependsOn?: string[];
}

// Workflow definition
export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  trigger: 'manual' | 'scheduled' | 'event';
}

class OpenClawOrchestrator {
  private agents: Map<AgentType, AgentStatus> = new Map();
  private taskQueue: AgentTask[] = [];
  private activeWorkflows: Map<string, { workflow: Workflow; progress: number }> = new Map();

  constructor() {
    this.initializeAgents();
  }

  // Initialize all agents
  private initializeAgents(): void {
    const agentConfigs: Array<{
      type: AgentType;
      name: string;
      description: string;
      capabilities: string[];
    }> = [
      {
        type: AgentType.GHOST_HUNTER,
        name: 'Ghost Hunter',
        description: 'Detects unresponsive government offices using complaint pattern analysis',
        capabilities: [
          'ghost_office_detection',
          'stagnation_analysis',
          'zone_ranking',
          'department_ranking',
          'heatmap_generation',
        ],
      },
      {
        type: AgentType.SCAM_DETECTOR,
        name: 'TrustLens Scam Detector',
        description: 'Analyzes messages for scam indicators and impersonation attempts',
        capabilities: [
          'scam_analysis',
          'risk_scoring',
          'outage_correlation',
          'pattern_matching',
          'batch_analysis',
        ],
      },
      {
        type: AgentType.ESCALATION_TRACER,
        name: 'Escalation Tracer',
        description: 'Traces complaint escalation paths like distributed system traces',
        capabilities: [
          'escalation_tracking',
          'bottleneck_detection',
          'timeline_reconstruction',
          'department_flow_analysis',
        ],
      },
      {
        type: AgentType.CIVIC_ANALYZER,
        name: 'Civic Analyzer',
        description: 'Provides civic health scores and performance analytics',
        capabilities: [
          'health_scoring',
          'trend_analysis',
          'zone_comparison',
          'performance_metrics',
        ],
      },
      {
        type: AgentType.RTI_DRAFTER,
        name: 'RTI Drafter',
        description: 'Generates RTI applications based on complaint patterns',
        capabilities: [
          'rti_generation',
          'escalation_letters',
          'report_cards',
          'social_media_posts',
        ],
      },
      {
        type: AgentType.PATTERN_DETECTOR,
        name: 'Pattern Detector',
        description: 'Identifies recurring patterns across complaints and departments',
        capabilities: [
          'pattern_recognition',
          'anomaly_detection',
          'cluster_analysis',
          'correlation_detection',
        ],
      },
    ];

    for (const config of agentConfigs) {
      this.agents.set(config.type, {
        id: `agent_${config.type}_${Date.now()}`,
        type: config.type,
        name: config.name,
        description: config.description,
        status: 'idle',
        capabilities: config.capabilities,
      });
    }
  }

  // Get all agents
  getAgents(): AgentStatus[] {
    return Array.from(this.agents.values());
  }

  // Get specific agent
  getAgent(type: AgentType): AgentStatus | undefined {
    return this.agents.get(type);
  }

  // Execute a task on an agent
  async executeTask(task: Omit<AgentTask, 'id' | 'createdAt' | 'status'>): Promise<AgentTask> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTask: AgentTask = {
      ...task,
      id: taskId,
      createdAt: new Date().toISOString(),
      status: 'running',
    };

    const agent = this.agents.get(task.agentType);
    if (!agent) {
      fullTask.status = 'failed';
      fullTask.error = `Unknown agent type: ${task.agentType}`;
      return fullTask;
    }

    // Update agent status
    agent.status = 'running';
    agent.lastRun = new Date().toISOString();

    try {
      fullTask.result = await this.dispatchTask(task.agentType, task.action, task.parameters);
      fullTask.status = 'completed';
      fullTask.completedAt = new Date().toISOString();
    } catch (error: any) {
      fullTask.status = 'failed';
      fullTask.error = error.message;
    } finally {
      agent.status = 'idle';
    }

    return fullTask;
  }

  // Dispatch task to appropriate agent
  private async dispatchTask(
    agentType: AgentType,
    action: string,
    params: Record<string, any>
  ): Promise<any> {
    switch (agentType) {
      case AgentType.GHOST_HUNTER:
        return this.executeGhostHunterTask(action, params);
      case AgentType.SCAM_DETECTOR:
        return this.executeScamDetectorTask(action, params);
      case AgentType.ESCALATION_TRACER:
        return this.executeEscalationTracerTask(action, params);
      case AgentType.CIVIC_ANALYZER:
        return this.executeCivicAnalyzerTask(action, params);
      case AgentType.RTI_DRAFTER:
        return this.executeRtiDrafterTask(action, params);
      case AgentType.PATTERN_DETECTOR:
        return this.executePatternDetectorTask(action, params);
      default:
        throw new Error(`Unhandled agent type: ${agentType}`);
    }
  }

  // Ghost Hunter tasks
  private async executeGhostHunterTask(action: string, params: any): Promise<any> {
    switch (action) {
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
        throw new Error(`Unknown ghost-hunter action: ${action}`);
    }
  }

  // Scam Detector tasks
  private async executeScamDetectorTask(action: string, params: any): Promise<any> {
    switch (action) {
      case 'analyze':
        return trustLensAnalyzer.analyzeContent(params.content, params.url);
      case 'store_report':
        return trustLensAnalyzer.storeReport(
          params.content,
          params.source_type || 'api',
          params.url,
          params.ward_id
        );
      case 'get_stats':
        return trustLensAnalyzer.getScamStatistics(params);
      case 'batch_analyze':
        const results = await Promise.all(
          params.messages.map((msg: any) =>
            trustLensAnalyzer.analyzeContent(msg.content, msg.url)
          )
        );
        return { analyzed: results.length, results };
      default:
        throw new Error(`Unknown scam-detector action: ${action}`);
    }
  }

  // Escalation Tracer tasks
  private async executeEscalationTracerTask(action: string, params: any): Promise<any> {
    switch (action) {
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
          bottlenecks: this.identifyBottlenecks(complaint),
        };

      case 'find_loops':
        const loopQuery = {
          bool: {
            must: [
              { range: { escalation_count: { gte: params.min_escalations || 3 } } },
            ],
          },
        };
        const loops = await esService.search(ES_INDICES.CIVIC_EVENTS, loopQuery, {
          size: params.limit || 20,
        });
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
        throw new Error(`Unknown escalation-tracer action: ${action}`);
    }
  }

  // Civic Analyzer tasks
  private async executeCivicAnalyzerTask(action: string, params: any): Promise<any> {
    switch (action) {
      case 'health_score':
        return this.calculateHealthScore(params);
      case 'compare_zones':
        return this.compareZones(params);
      case 'trend_analysis':
        return this.analyzeTrends(params);
      default:
        throw new Error(`Unknown civic-analyzer action: ${action}`);
    }
  }

  // RTI Drafter tasks
  private async executeRtiDrafterTask(action: string, params: any): Promise<any> {
    switch (action) {
      case 'draft_rti':
        return this.generateRtiDraft(params);
      case 'draft_escalation':
        return this.generateEscalationLetter(params);
      case 'report_card':
        return this.generateReportCard(params);
      default:
        throw new Error(`Unknown rti-drafter action: ${action}`);
    }
  }

  // Pattern Detector tasks
  private async executePatternDetectorTask(action: string, params: any): Promise<any> {
    switch (action) {
      case 'detect_patterns':
        return this.detectPatterns(params);
      case 'find_anomalies':
        return this.findAnomalies(params);
      case 'cluster_complaints':
        return this.clusterComplaints(params);
      default:
        throw new Error(`Unknown pattern-detector action: ${action}`);
    }
  }

  // Execute a workflow
  async executeWorkflow(workflow: Workflow, inputs: Record<string, any> = {}): Promise<{
    workflowId: string;
    results: Record<string, any>;
    completedAt: string;
  }> {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results: Record<string, any> = { ...inputs };

    this.activeWorkflows.set(workflowId, { workflow, progress: 0 });

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepId = `step_${i}`;

        // Resolve parameters from previous results
        const resolvedParams = this.resolveParameters(step.parameters || {}, results);

        // Execute step
        const task = await this.executeTask({
          agentType: step.agentType,
          action: step.action,
          parameters: resolvedParams,
          priority: 'high',
        });

        if (task.status === 'failed') {
          throw new Error(`Step ${stepId} failed: ${task.error}`);
        }

        results[stepId] = task.result;
        this.activeWorkflows.get(workflowId)!.progress = ((i + 1) / workflow.steps.length) * 100;
      }

      return {
        workflowId,
        results,
        completedAt: new Date().toISOString(),
      };
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  // Predefined workflows
  getPrebuiltWorkflows(): Workflow[] {
    return [
      {
        id: 'wf_comprehensive_analysis',
        name: 'Comprehensive Civic Analysis',
        description: 'Full analysis of ghost offices, scams, and health scores',
        trigger: 'manual',
        steps: [
          { agentType: AgentType.GHOST_HUNTER, action: 'detect_all' },
          { agentType: AgentType.SCAM_DETECTOR, action: 'get_stats' },
          { agentType: AgentType.CIVIC_ANALYZER, action: 'compare_zones' },
          { agentType: AgentType.PATTERN_DETECTOR, action: 'detect_patterns' },
        ],
      },
      {
        id: 'wf_scam_investigation',
        name: 'Scam Investigation',
        description: 'Analyze scam patterns and correlate with outages',
        trigger: 'manual',
        steps: [
          { agentType: AgentType.SCAM_DETECTOR, action: 'get_stats' },
          { agentType: AgentType.PATTERN_DETECTOR, action: 'find_anomalies', parameters: { type: 'scam' } },
          { agentType: AgentType.RTI_DRAFTER, action: 'report_card', parameters: { type: 'security' } },
        ],
      },
      {
        id: 'wf_complaint_deep_dive',
        name: 'Complaint Deep Dive',
        description: 'Deep analysis of a specific complaint with RTI generation',
        trigger: 'manual',
        steps: [
          { agentType: AgentType.ESCALATION_TRACER, action: 'trace_complaint' },
          { agentType: AgentType.PATTERN_DETECTOR, action: 'detect_patterns' },
          { agentType: AgentType.RTI_DRAFTER, action: 'draft_rti' },
        ],
      },
    ];
  }

  // Helper methods
  private identifyBottlenecks(complaint: any): Array<{
    type: string;
    severity: string;
    description: string;
  }> {
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
        description: `Transferred ${complaint.transfer_count} times`,
      });
    }

    return bottlenecks;
  }

  private async calculateHealthScore(params: any): Promise<any> {
    const aggs = {
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
    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs, query);

    const total = result.metrics?.total?.value || 1;
    const resolved = result.metrics?.resolved?.doc_count || 0;
    const overdue = result.metrics?.overdue?.doc_count || 0;
    const avgDays = result.metrics?.avg_days?.value || 0;

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
  }

  private async compareZones(params: any): Promise<any> {
    const aggs = {
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
    return esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs);
  }

  private async analyzeTrends(params: any): Promise<any> {
    const aggs = {
      trend: {
        date_histogram: {
          field: 'created_at',
          calendar_interval: params.interval || 'day',
        },
        aggs: {
          resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
          overdue: { filter: { term: { is_overdue: true } } },
        },
      },
    };
    return esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs, {
      range: { created_at: { gte: params.date_from || 'now-30d' } },
    });
  }

  private generateRtiDraft(params: any): any {
    const today = new Date().toLocaleDateString('en-IN');
    return {
      type: 'RTI_APPLICATION',
      content: `RTI Application generated for: ${params.subject || 'Civic Information Request'}`,
      generated_at: new Date().toISOString(),
    };
  }

  private generateEscalationLetter(params: any): any {
    return {
      type: 'ESCALATION_LETTER',
      content: `Escalation letter for complaint: ${params.complaint_id}`,
      generated_at: new Date().toISOString(),
    };
  }

  private generateReportCard(params: any): any {
    return {
      type: 'REPORT_CARD',
      scope: params.zone || params.department || 'all',
      generated_at: new Date().toISOString(),
    };
  }

  private async detectPatterns(params: any): Promise<any> {
    const aggs = {
      by_category: { terms: { field: 'category', size: 20 } },
      by_department: { terms: { field: 'department', size: 20 } },
      hourly_distribution: {
        date_histogram: {
          field: 'created_at',
          calendar_interval: 'hour',
        },
      },
    };
    return esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs);
  }

  private async findAnomalies(params: any): Promise<any> {
    // Find statistical anomalies
    const aggs = {
      by_zone: {
        terms: { field: 'zone', size: 10 },
        aggs: {
          avg_complaints: { avg: { field: 'days_open' } },
          std_dev: { extended_stats: { field: 'days_open' } },
        },
      },
    };
    return esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs);
  }

  private async clusterComplaints(params: any): Promise<any> {
    // Group similar complaints
    const aggs = {
      clusters: {
        terms: { field: 'category', size: 10 },
        aggs: {
          by_ward: { terms: { field: 'ward_id', size: 20 } },
          by_status: { terms: { field: 'status' } },
        },
      },
    };
    return esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs);
  }

  private resolveParameters(
    params: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Reference to previous step result
        const path = value.slice(1).split('.');
        let val = context;
        for (const p of path) {
          val = val?.[p];
        }
        resolved[key] = val;
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }
}

export const openClawOrchestrator = new OpenClawOrchestrator();
