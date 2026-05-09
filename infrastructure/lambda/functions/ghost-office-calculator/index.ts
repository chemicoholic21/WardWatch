/**
 * AWS Lambda: Ghost Office Calculator
 * Scheduled Lambda that calculates ghost office scores
 * and stores results for dashboard consumption
 */

import { ScheduledEvent, Context, Handler } from 'aws-lambda';
import { Client } from '@elastic/elasticsearch';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// Initialize clients
const esClient = new Client({
  cloud: { id: process.env.ES_CLOUD_ID! },
  auth: { apiKey: process.env.ES_API_KEY! },
});

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface GhostOfficeScore {
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
  calculated_at: string;
  rank: number;
}

// Calculate ghost scores using Elasticsearch aggregations
async function calculateGhostScores(dateRange: string = 'now-90d'): Promise<GhostOfficeScore[]> {
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
        geo_centroid: { geo_centroid: { field: 'geo_location' } },
      },
    },
  };

  const result = await esClient.search({
    index: 'civic-events',
    size: 0,
    query: {
      range: {
        created_at: { gte: dateRange, lte: 'now' },
      },
    },
    aggs,
  });

  const offices: GhostOfficeScore[] = [];
  const buckets = (result.aggregations?.by_office as any)?.buckets || [];

  for (const bucket of buckets) {
    const total = bucket.total_complaints?.value || 0;
    if (total < 3) continue; // Minimum complaints threshold

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
      calculated_at: new Date().toISOString(),
      rank: 0,
    });
  }

  // Sort by ghost score and assign ranks
  offices.sort((a, b) => b.ghost_score - a.ghost_score);
  offices.forEach((office, index) => {
    office.rank = index + 1;
  });

  return offices;
}

// Store ghost office scores in Elasticsearch
async function storeGhostOffices(offices: GhostOfficeScore[]): Promise<void> {
  const operations = offices.flatMap(office => [
    { index: { _index: 'ghost-offices', _id: office.office_id } },
    office,
  ]);

  if (operations.length > 0) {
    await esClient.bulk({ operations, refresh: true });
  }

  console.log(`Stored ${offices.length} ghost office scores`);
}

// Send alerts for critical ghost offices
async function sendGhostOfficeAlerts(offices: GhostOfficeScore[]): Promise<number> {
  const alertTopic = process.env.SNS_CIVIC_ALERTS_TOPIC;
  if (!alertTopic) return 0;

  const criticalOffices = offices.filter(o => o.alert_level === 'critical');
  let alertsSent = 0;

  for (const office of criticalOffices.slice(0, 10)) { // Limit to top 10
    const message = {
      alert_type: 'GHOST_OFFICE_CRITICAL',
      office_id: office.office_id,
      department: office.department,
      ward_id: office.ward_id,
      ward_name: office.ward_name,
      zone: office.zone,
      ghost_score: office.ghost_score,
      rank: office.rank,
      factors: office.factors,
      timestamp: new Date().toISOString(),
    };

    await snsClient.send(new PublishCommand({
      TopicArn: alertTopic,
      Message: JSON.stringify(message),
      Subject: `Ghost Office Alert: ${office.department} ${office.ward_name} (Score: ${office.ghost_score})`,
      MessageAttributes: {
        alert_type: { DataType: 'String', StringValue: 'GHOST_OFFICE_CRITICAL' },
        department: { DataType: 'String', StringValue: office.department },
        zone: { DataType: 'String', StringValue: office.zone },
      },
    }));

    alertsSent++;
  }

  return alertsSent;
}

// Publish CloudWatch metrics
async function publishMetrics(offices: GhostOfficeScore[]): Promise<void> {
  const summary = {
    totalOffices: offices.length,
    criticalCount: offices.filter(o => o.alert_level === 'critical').length,
    highCount: offices.filter(o => o.alert_level === 'high').length,
    avgGhostScore: offices.length > 0
      ? offices.reduce((sum, o) => sum + o.ghost_score, 0) / offices.length
      : 0,
  };

  await cloudWatchClient.send(new PutMetricDataCommand({
    Namespace: 'GhostOffice',
    MetricData: [
      {
        MetricName: 'TotalGhostOffices',
        Value: summary.totalOffices,
        Unit: 'Count',
        Timestamp: new Date(),
      },
      {
        MetricName: 'CriticalGhostOffices',
        Value: summary.criticalCount,
        Unit: 'Count',
        Timestamp: new Date(),
      },
      {
        MetricName: 'HighRiskGhostOffices',
        Value: summary.highCount,
        Unit: 'Count',
        Timestamp: new Date(),
      },
      {
        MetricName: 'AverageGhostScore',
        Value: summary.avgGhostScore,
        Unit: 'None',
        Timestamp: new Date(),
      },
    ],
  }));

  console.log('Published CloudWatch metrics:', summary);
}

// Main handler
export const handler: Handler = async (event: ScheduledEvent, context: Context) => {
  console.log('Ghost Office Calculator invoked');

  try {
    // Calculate ghost scores
    const offices = await calculateGhostScores();
    console.log(`Calculated scores for ${offices.length} offices`);

    // Store in Elasticsearch
    await storeGhostOffices(offices);

    // Send alerts for critical offices
    const alertsSent = await sendGhostOfficeAlerts(offices);

    // Publish CloudWatch metrics
    await publishMetrics(offices);

    // Generate summary
    const summary = {
      total_offices: offices.length,
      critical_count: offices.filter(o => o.alert_level === 'critical').length,
      high_count: offices.filter(o => o.alert_level === 'high').length,
      medium_count: offices.filter(o => o.alert_level === 'medium').length,
      low_count: offices.filter(o => o.alert_level === 'low').length,
      avg_ghost_score: offices.length > 0
        ? Math.round(offices.reduce((sum, o) => sum + o.ghost_score, 0) / offices.length * 100) / 100
        : 0,
      top_ghost_offices: offices.slice(0, 5).map(o => ({
        office_id: o.office_id,
        ghost_score: o.ghost_score,
        department: o.department,
        ward_name: o.ward_name,
      })),
      alerts_sent: alertsSent,
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ghost office calculation completed',
        ...summary,
        calculated_at: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Ghost office calculation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Calculation failed',
        error: (error as Error).message,
      }),
    };
  }
};
