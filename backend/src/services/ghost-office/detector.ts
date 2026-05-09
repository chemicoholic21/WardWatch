import { esService } from '../elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';

export interface GhostOfficeScore {
  office_id: string;
  department: string;
  ward_id: string;
  ward_name: string;
  zone: string;
  ghost_score: number;
  ghost_probability: number;
  alert_level: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    stagnation_rate: number;
    escalation_loop_frequency: number;
    avg_resolution_days: number;
    overdue_percentage: number;
    transfer_ratio: number;
    suspicious_closure_rate: number;
  };
  complaint_stats: {
    total: number;
    open: number;
    resolved: number;
    overdue: number;
  };
  rank: number;
}

export interface GhostOfficeDetectionResult {
  offices: GhostOfficeScore[];
  summary: {
    total_offices: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    avg_ghost_score: number;
  };
  calculated_at: string;
}

export class GhostOfficeDetector {
  // Calculate ghost scores using Elasticsearch aggregations
  async calculateGhostScores(options?: {
    department?: string;
    zone?: string;
    minComplaints?: number;
    dateRange?: { gte: string; lte?: string };
  }): Promise<GhostOfficeDetectionResult> {
    const query: any = {
      bool: {
        must: [
          {
            range: {
              created_at: {
                gte: options?.dateRange?.gte || 'now-90d',
                lte: options?.dateRange?.lte || 'now',
              },
            },
          },
        ],
        filter: [],
      },
    };

    if (options?.department) {
      query.bool.filter.push({ term: { department: options.department } });
    }
    if (options?.zone) {
      query.bool.filter.push({ term: { zone: options.zone } });
    }

    const aggs = {
      by_office: {
        composite: {
          size: 1000,
          sources: [
            { department: { terms: { field: 'department' } } },
            { ward_id: { terms: { field: 'ward_id' } } },
          ],
        },
        aggs: {
          ward_name: { terms: { field: 'ward_name.keyword', size: 1 } },
          zone: { terms: { field: 'zone', size: 1 } },
          total_complaints: { value_count: { field: 'event_id' } },
          open_complaints: {
            filter: { terms: { status: ['open', 'pending', 'in_progress'] } },
          },
          resolved_complaints: {
            filter: { terms: { status: ['resolved', 'closed'] } },
          },
          overdue_complaints: {
            filter: { term: { is_overdue: true } },
          },
          stagnant_complaints: {
            filter: {
              bool: {
                must: [
                  { terms: { status: ['open', 'pending', 'in_progress'] } },
                  { range: { days_open: { gte: 14 } } },
                ],
              },
            },
          },
          escalation_loops: {
            filter: { range: { escalation_count: { gte: 3 } } },
          },
          high_transfers: {
            filter: { range: { transfer_count: { gte: 2 } } },
          },
          suspicious_closures: {
            filter: { term: { is_suspicious_closure: true } },
          },
          avg_resolution_days: { avg: { field: 'days_open' } },
          geo_location: {
            geo_centroid: { field: 'geo_location' },
          },
        },
      },
    };

    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs, query);

    const offices: GhostOfficeScore[] = [];
    const minComplaints = options?.minComplaints || 3;

    for (const bucket of result.by_office?.buckets || []) {
      const total = bucket.total_complaints?.value || 0;
      if (total < minComplaints) continue;

      const open = bucket.open_complaints?.doc_count || 0;
      const resolved = bucket.resolved_complaints?.doc_count || 0;
      const overdue = bucket.overdue_complaints?.doc_count || 0;
      const stagnant = bucket.stagnant_complaints?.doc_count || 0;
      const escalationLoops = bucket.escalation_loops?.doc_count || 0;
      const highTransfers = bucket.high_transfers?.doc_count || 0;
      const suspiciousClosures = bucket.suspicious_closures?.doc_count || 0;
      const avgDays = bucket.avg_resolution_days?.value || 0;

      // Calculate factor scores
      const stagnationRate = (stagnant / total) * 100;
      const escalationLoopFreq = (escalationLoops / total) * 100;
      const transferRatio = (highTransfers / total) * 100;
      const suspiciousClosureRate = resolved > 0 ? (suspiciousClosures / resolved) * 100 : 0;
      const overduePercentage = (overdue / total) * 100;

      // Calculate ghost score (weighted combination)
      const ghostScore = Math.min(100,
        stagnationRate * 0.25 +
        escalationLoopFreq * 0.20 +
        transferRatio * 0.15 +
        Math.min(avgDays / 60 * 100, 100) * 0.15 +
        suspiciousClosureRate * 0.15 +
        (total < 10 ? 50 : 0) * 0.10
      );

      const alertLevel: 'critical' | 'high' | 'medium' | 'low' =
        ghostScore >= 85 ? 'critical' :
        ghostScore >= 70 ? 'high' :
        ghostScore >= 50 ? 'medium' : 'low';

      offices.push({
        office_id: `${bucket.key.department}_${bucket.key.ward_id}`,
        department: bucket.key.department,
        ward_id: bucket.key.ward_id,
        ward_name: bucket.ward_name?.buckets?.[0]?.key || bucket.key.ward_id,
        zone: bucket.zone?.buckets?.[0]?.key || 'Unknown',
        ghost_score: Math.round(ghostScore * 100) / 100,
        ghost_probability: Math.round(ghostScore / 100 * 1000) / 1000,
        alert_level: alertLevel,
        factors: {
          stagnation_rate: Math.round(stagnationRate * 100) / 100,
          escalation_loop_frequency: Math.round(escalationLoopFreq * 100) / 100,
          avg_resolution_days: Math.round(avgDays * 100) / 100,
          overdue_percentage: Math.round(overduePercentage * 100) / 100,
          transfer_ratio: Math.round(transferRatio * 100) / 100,
          suspicious_closure_rate: Math.round(suspiciousClosureRate * 100) / 100,
        },
        complaint_stats: {
          total,
          open,
          resolved,
          overdue,
        },
        rank: 0,
      });
    }

    // Sort by ghost score and assign ranks
    offices.sort((a, b) => b.ghost_score - a.ghost_score);
    offices.forEach((office, index) => {
      office.rank = index + 1;
    });

    // Calculate summary
    const summary = {
      total_offices: offices.length,
      critical_count: offices.filter(o => o.alert_level === 'critical').length,
      high_count: offices.filter(o => o.alert_level === 'high').length,
      medium_count: offices.filter(o => o.alert_level === 'medium').length,
      low_count: offices.filter(o => o.alert_level === 'low').length,
      avg_ghost_score: offices.length > 0
        ? Math.round(offices.reduce((sum, o) => sum + o.ghost_score, 0) / offices.length * 100) / 100
        : 0,
    };

    return {
      offices,
      summary,
      calculated_at: new Date().toISOString(),
    };
  }

  // Get top ghost offices
  async getTopGhostOffices(limit: number = 10): Promise<GhostOfficeScore[]> {
    const result = await this.calculateGhostScores();
    return result.offices.slice(0, limit);
  }

  // Get ghost office by ID
  async getGhostOfficeById(officeId: string): Promise<GhostOfficeScore | null> {
    const [department, wardId] = officeId.split('_');
    if (!department || !wardId) return null;

    const result = await this.calculateGhostScores({ department });
    return result.offices.find(o => o.office_id === officeId) || null;
  }

  // Get heatmap data for geographic visualization
  async getGhostOfficeHeatmap(): Promise<Array<{
    ward_id: string;
    ward_name: string;
    lat: number;
    lon: number;
    ghost_score: number;
    alert_level: string;
    complaint_count: number;
  }>> {
    const result = await this.calculateGhostScores();

    // Aggregate by ward (combining all departments)
    const wardScores = new Map<string, {
      ghost_scores: number[];
      complaint_counts: number[];
      ward_name: string;
    }>();

    for (const office of result.offices) {
      if (!wardScores.has(office.ward_id)) {
        wardScores.set(office.ward_id, {
          ghost_scores: [],
          complaint_counts: [],
          ward_name: office.ward_name,
        });
      }
      const ward = wardScores.get(office.ward_id)!;
      ward.ghost_scores.push(office.ghost_score);
      ward.complaint_counts.push(office.complaint_stats.total);
    }

    // Get ward centroids from ward metrics
    const wardMetrics = await esService.search(ES_INDICES.WARD_METRICS, { match_all: {} }, {
      size: 200,
      _source: ['ward_id', 'ward_name', 'centroid'],
    });

    const wardLocations = new Map(
      wardMetrics.hits.map((w: any) => [w.ward_id, w.centroid])
    );

    return Array.from(wardScores.entries()).map(([wardId, data]) => {
      const avgScore = data.ghost_scores.reduce((a, b) => a + b, 0) / data.ghost_scores.length;
      const totalComplaints = data.complaint_counts.reduce((a, b) => a + b, 0);
      const location = wardLocations.get(wardId) || { lat: 12.9716, lon: 77.5946 };

      return {
        ward_id: wardId,
        ward_name: data.ward_name,
        lat: location.lat,
        lon: location.lon,
        ghost_score: Math.round(avgScore * 100) / 100,
        alert_level: avgScore >= 85 ? 'critical' : avgScore >= 70 ? 'high' : avgScore >= 50 ? 'medium' : 'low',
        complaint_count: totalComplaints,
      };
    });
  }
}

export const ghostOfficeDetector = new GhostOfficeDetector();
