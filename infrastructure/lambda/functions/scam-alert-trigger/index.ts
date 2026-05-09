/**
 * AWS Lambda: Scam Alert Trigger
 * Monitors for scam spikes, especially during outages
 * Triggers alerts when scam activity correlates with service disruptions
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

interface OutageInfo {
  department: string;
  outage_count: number;
  affected_wards: string[];
  start_time: string;
}

interface ScamSpike {
  department: string;
  scam_count: number;
  high_risk_count: number;
  avg_scam_probability: number;
  correlation_score: number;
  is_spike: boolean;
}

interface CorrelationResult {
  department: string;
  outage_count: number;
  scam_count: number;
  baseline_scam_rate: number;
  current_scam_rate: number;
  spike_multiplier: number;
  correlation_score: number;
  alert_level: 'low' | 'medium' | 'high' | 'critical';
}

// Find current outages
async function findActiveOutages(hoursBack: number = 24): Promise<OutageInfo[]> {
  const response = await esClient.search({
    index: 'civic-events',
    size: 0,
    query: {
      bool: {
        must: [
          { term: { event_type: 'outage' } },
          { range: { created_at: { gte: `now-${hoursBack}h` } } },
        ],
      },
    },
    aggs: {
      by_department: {
        terms: { field: 'department', size: 10 },
        aggs: {
          affected_wards: { terms: { field: 'ward_id', size: 50 } },
          earliest: { min: { field: 'created_at' } },
        },
      },
    },
  });

  const buckets = (response.aggregations?.by_department as any)?.buckets || [];

  return buckets.map((b: any) => ({
    department: b.key,
    outage_count: b.doc_count,
    affected_wards: b.affected_wards.buckets.map((w: any) => w.key),
    start_time: b.earliest.value_as_string,
  }));
}

// Find scam reports by department
async function findScamsByDepartment(hoursBack: number = 24): Promise<Map<string, ScamSpike>> {
  const response = await esClient.search({
    index: 'scam-reports',
    size: 0,
    query: {
      range: { reported_at: { gte: `now-${hoursBack}h` } },
    },
    aggs: {
      by_department: {
        terms: { field: 'spoofed_department', size: 10 },
        aggs: {
          high_risk: { filter: { terms: { risk_level: ['high', 'critical'] } } },
          avg_probability: { avg: { field: 'scam_probability' } },
        },
      },
      total_scams: { value_count: { field: 'report_id' } },
    },
  });

  const buckets = (response.aggregations?.by_department as any)?.buckets || [];
  const result = new Map<string, ScamSpike>();

  for (const b of buckets) {
    result.set(b.key, {
      department: b.key,
      scam_count: b.doc_count,
      high_risk_count: b.high_risk.doc_count,
      avg_scam_probability: b.avg_probability.value || 0,
      correlation_score: 0,
      is_spike: false,
    });
  }

  return result;
}

// Get baseline scam rates (last 7 days average)
async function getBaselineScamRates(): Promise<Map<string, number>> {
  const response = await esClient.search({
    index: 'scam-reports',
    size: 0,
    query: {
      range: { reported_at: { gte: 'now-7d', lte: 'now-24h' } },
    },
    aggs: {
      by_department: {
        terms: { field: 'spoofed_department', size: 10 },
        aggs: {
          daily_avg: {
            date_histogram: {
              field: 'reported_at',
              calendar_interval: 'day',
            },
          },
        },
      },
    },
  });

  const buckets = (response.aggregations?.by_department as any)?.buckets || [];
  const result = new Map<string, number>();

  for (const b of buckets) {
    const dailyBuckets = b.daily_avg.buckets || [];
    const avgDaily = dailyBuckets.length > 0
      ? dailyBuckets.reduce((sum: number, d: any) => sum + d.doc_count, 0) / dailyBuckets.length
      : 0;
    result.set(b.key, avgDaily);
  }

  return result;
}

// Calculate outage-scam correlation
async function calculateCorrelation(): Promise<CorrelationResult[]> {
  const [outages, currentScams, baselineRates] = await Promise.all([
    findActiveOutages(24),
    findScamsByDepartment(24),
    getBaselineScamRates(),
  ]);

  const correlations: CorrelationResult[] = [];

  for (const outage of outages) {
    const scamData = currentScams.get(outage.department);
    const baselineRate = baselineRates.get(outage.department) || 1;
    const currentRate = scamData?.scam_count || 0;
    const spikeMultiplier = currentRate / Math.max(baselineRate, 1);

    // Calculate correlation score (0-100)
    // Higher when: more scams, higher spike, more outages
    const correlationScore = Math.min(100,
      spikeMultiplier * 20 +
      (scamData?.high_risk_count || 0) * 5 +
      outage.outage_count * 10
    );

    const alertLevel: 'critical' | 'high' | 'medium' | 'low' =
      correlationScore >= 80 || spikeMultiplier >= 3 ? 'critical' :
      correlationScore >= 60 || spikeMultiplier >= 2 ? 'high' :
      correlationScore >= 40 || spikeMultiplier >= 1.5 ? 'medium' : 'low';

    correlations.push({
      department: outage.department,
      outage_count: outage.outage_count,
      scam_count: currentRate,
      baseline_scam_rate: Math.round(baselineRate * 100) / 100,
      current_scam_rate: currentRate,
      spike_multiplier: Math.round(spikeMultiplier * 100) / 100,
      correlation_score: Math.round(correlationScore * 100) / 100,
      alert_level: alertLevel,
    });
  }

  // Sort by correlation score
  correlations.sort((a, b) => b.correlation_score - a.correlation_score);

  return correlations;
}

// Store correlation data
async function storeCorrelationData(correlations: CorrelationResult[]): Promise<void> {
  const timestamp = new Date().toISOString();
  const operations = correlations.flatMap(c => [
    { index: { _index: 'scam-reports', _id: `correlation_${c.department}_${Date.now()}` } },
    {
      report_type: 'outage_correlation',
      ...c,
      calculated_at: timestamp,
    },
  ]);

  if (operations.length > 0) {
    await esClient.bulk({ operations });
  }
}

// Send alerts for high correlations
async function sendCorrelationAlerts(correlations: CorrelationResult[]): Promise<number> {
  const alertTopic = process.env.SNS_SECURITY_ALERTS_TOPIC;
  if (!alertTopic) return 0;

  const criticalCorrelations = correlations.filter(c =>
    c.alert_level === 'critical' || c.alert_level === 'high'
  );

  let alertsSent = 0;

  for (const correlation of criticalCorrelations) {
    const message = {
      alert_type: 'SCAM_OUTAGE_CORRELATION',
      severity: correlation.alert_level.toUpperCase(),
      department: correlation.department,
      outage_count: correlation.outage_count,
      scam_count: correlation.scam_count,
      spike_multiplier: correlation.spike_multiplier,
      correlation_score: correlation.correlation_score,
      warning: `Scam activity for ${correlation.department} is ${correlation.spike_multiplier}x above baseline during active outage`,
      recommendation: 'Issue public warning to citizens. Monitor for phishing attempts.',
      timestamp: new Date().toISOString(),
    };

    await snsClient.send(new PublishCommand({
      TopicArn: alertTopic,
      Message: JSON.stringify(message, null, 2),
      Subject: `SECURITY ALERT: ${correlation.department} Scam Spike During Outage`,
      MessageAttributes: {
        alert_type: { DataType: 'String', StringValue: 'SCAM_OUTAGE_CORRELATION' },
        severity: { DataType: 'String', StringValue: correlation.alert_level.toUpperCase() },
        department: { DataType: 'String', StringValue: correlation.department },
      },
    }));

    alertsSent++;
    console.log(`Alert sent for ${correlation.department} correlation`);
  }

  return alertsSent;
}

// Publish CloudWatch metrics
async function publishMetrics(correlations: CorrelationResult[]): Promise<void> {
  const metrics = correlations.map(c => [
    {
      MetricName: 'ScamSpikeMultiplier',
      Value: c.spike_multiplier,
      Unit: 'None',
      Timestamp: new Date(),
      Dimensions: [{ Name: 'Department', Value: c.department }],
    },
    {
      MetricName: 'CorrelationScore',
      Value: c.correlation_score,
      Unit: 'None',
      Timestamp: new Date(),
      Dimensions: [{ Name: 'Department', Value: c.department }],
    },
  ]).flat();

  if (metrics.length > 0) {
    await cloudWatchClient.send(new PutMetricDataCommand({
      Namespace: 'GhostOffice/Security',
      MetricData: metrics.slice(0, 20), // CloudWatch limit
    }));
  }

  // Also publish aggregate metrics
  await cloudWatchClient.send(new PutMetricDataCommand({
    Namespace: 'GhostOffice/Security',
    MetricData: [
      {
        MetricName: 'ActiveCorrelations',
        Value: correlations.length,
        Unit: 'Count',
        Timestamp: new Date(),
      },
      {
        MetricName: 'CriticalCorrelations',
        Value: correlations.filter(c => c.alert_level === 'critical').length,
        Unit: 'Count',
        Timestamp: new Date(),
      },
      {
        MetricName: 'MaxSpikeMultiplier',
        Value: correlations.length > 0 ? Math.max(...correlations.map(c => c.spike_multiplier)) : 0,
        Unit: 'None',
        Timestamp: new Date(),
      },
    ],
  }));
}

// Main handler
export const handler: Handler = async (event: ScheduledEvent, context: Context) => {
  console.log('Scam Alert Trigger invoked');

  try {
    // Calculate correlations
    const correlations = await calculateCorrelation();
    console.log(`Found ${correlations.length} outage-scam correlations`);

    // Store correlation data
    await storeCorrelationData(correlations);

    // Send alerts for high correlations
    const alertsSent = await sendCorrelationAlerts(correlations);

    // Publish CloudWatch metrics
    await publishMetrics(correlations);

    // Generate summary
    const summary = {
      total_correlations: correlations.length,
      critical_count: correlations.filter(c => c.alert_level === 'critical').length,
      high_count: correlations.filter(c => c.alert_level === 'high').length,
      medium_count: correlations.filter(c => c.alert_level === 'medium').length,
      max_spike: correlations.length > 0
        ? Math.max(...correlations.map(c => c.spike_multiplier))
        : 0,
      departments_with_spikes: correlations
        .filter(c => c.spike_multiplier > 1.5)
        .map(c => c.department),
      alerts_sent: alertsSent,
      correlations: correlations.slice(0, 5), // Top 5
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Scam correlation analysis completed',
        ...summary,
        analyzed_at: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Scam alert analysis failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Analysis failed',
        error: (error as Error).message,
      }),
    };
  }
};
