/**
 * AWS Lambda: Civic Event Processor
 * Triggered by S3 uploads or EventBridge rules
 * Processes civic complaints and enriches them with geo/ward data
 */

import { S3Event, EventBridgeEvent, Context, Handler } from 'aws-lambda';
import { Client } from '@elastic/elasticsearch';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Elasticsearch client configuration
const esClient = new Client({
  cloud: { id: process.env.ES_CLOUD_ID! },
  auth: { apiKey: process.env.ES_API_KEY! },
});

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Ward to zone mapping
const WARD_ZONE_MAP: Record<string, string> = {
  'South': ['W001', 'W002', 'W003', 'W004', 'W005', 'W006', 'W007', 'W008', 'W009', 'W010'],
  'West': ['W011', 'W012', 'W013', 'W014', 'W015', 'W016', 'W017', 'W018', 'W019', 'W020'],
  'East': ['W021', 'W022', 'W023', 'W024', 'W025', 'W026', 'W027', 'W028', 'W029', 'W030'],
  'North': ['W031', 'W032', 'W033', 'W034', 'W035', 'W036', 'W037', 'W038', 'W039', 'W040'],
  'Mahadevapura': ['W041', 'W042', 'W043', 'W044', 'W045', 'W046', 'W047', 'W048'],
  'Bommanahalli': ['W049', 'W050', 'W051', 'W052', 'W053', 'W054', 'W055', 'W056'],
  'Yelahanka': ['W057', 'W058', 'W059', 'W060', 'W061', 'W062', 'W063', 'W064'],
}.entries().reduce((acc, [zone, wards]) => {
  for (const ward of wards as unknown as string[]) {
    acc[ward] = zone;
  }
  return acc;
}, {} as Record<string, string>);

interface CivicEvent {
  event_id: string;
  event_type: string;
  title: string;
  description: string;
  department: string;
  ward_id: string;
  status: string;
  priority: string;
  created_at: string;
  [key: string]: any;
}

// Get zone from ward ID
function getZoneFromWard(wardId: string): string {
  if (WARD_ZONE_MAP[wardId]) {
    return WARD_ZONE_MAP[wardId];
  }
  // Default zone assignment based on ward number
  const wardNum = parseInt(wardId.replace('W', ''), 10);
  if (wardNum <= 30) return 'South';
  if (wardNum <= 60) return 'East';
  if (wardNum <= 90) return 'West';
  if (wardNum <= 120) return 'North';
  if (wardNum <= 150) return 'Mahadevapura';
  if (wardNum <= 175) return 'Bommanahalli';
  return 'Yelahanka';
}

// Process a single civic event
async function processCivicEvent(event: CivicEvent): Promise<void> {
  // Enrich with zone information
  if (event.ward_id && !event.zone) {
    event.zone = getZoneFromWard(event.ward_id);
  }

  // Calculate days open
  const createdAt = new Date(event.created_at);
  const now = new Date();
  event.days_open = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Determine if overdue (SLA: 7 days)
  event.is_overdue = event.days_open > 7 && !['resolved', 'closed'].includes(event.status);

  // Set processing metadata
  event.processed_at = now.toISOString();
  event.processed_by = 'civic-event-processor-lambda';

  // Index to Elasticsearch
  await esClient.index({
    index: 'civic-events',
    id: event.event_id,
    document: event,
    pipeline: 'civic-event-pipeline',
  });

  // Check for alert conditions
  if (event.priority === 'critical' || event.is_overdue) {
    await sendAlert(event);
  }

  console.log(`Processed event: ${event.event_id}, zone: ${event.zone}, overdue: ${event.is_overdue}`);
}

// Send alert via SNS
async function sendAlert(event: CivicEvent): Promise<void> {
  const alertTopic = process.env.SNS_CIVIC_ALERTS_TOPIC;
  if (!alertTopic) return;

  const message = {
    alert_type: event.is_overdue ? 'OVERDUE_COMPLAINT' : 'CRITICAL_PRIORITY',
    event_id: event.event_id,
    department: event.department,
    ward_id: event.ward_id,
    zone: event.zone,
    days_open: event.days_open,
    title: event.title,
    timestamp: new Date().toISOString(),
  };

  await snsClient.send(new PublishCommand({
    TopicArn: alertTopic,
    Message: JSON.stringify(message),
    Subject: `GhostOffice Alert: ${message.alert_type}`,
    MessageAttributes: {
      alert_type: { DataType: 'String', StringValue: message.alert_type },
      department: { DataType: 'String', StringValue: event.department },
      zone: { DataType: 'String', StringValue: event.zone || 'Unknown' },
    },
  }));

  console.log(`Alert sent for event: ${event.event_id}`);
}

// S3 event handler
async function handleS3Event(s3Event: S3Event): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (const record of s3Event.Records) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      // Get object from S3
      const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = await response.Body?.transformToString();

      if (!body) {
        console.warn(`Empty body for s3://${bucket}/${key}`);
        continue;
      }

      // Parse and process events
      const events: CivicEvent[] = JSON.parse(body);
      const eventArray = Array.isArray(events) ? events : [events];

      for (const event of eventArray) {
        try {
          await processCivicEvent(event);
          processed++;
        } catch (error) {
          console.error(`Failed to process event ${event.event_id}:`, error);
          failed++;
        }
      }
    } catch (error) {
      console.error(`Failed to process S3 record:`, error);
      failed++;
    }
  }

  return { processed, failed };
}

// EventBridge handler for scheduled processing
async function handleScheduledEvent(): Promise<{ updated: number }> {
  // Query for overdue complaints and update their status
  const response = await esClient.search({
    index: 'civic-events',
    query: {
      bool: {
        must: [
          { terms: { status: ['open', 'pending', 'in_progress'] } },
          { range: { created_at: { lte: 'now-7d' } } },
        ],
        must_not: [
          { term: { is_overdue: true } },
        ],
      },
    },
    size: 1000,
  });

  const updateOps = response.hits.hits.map(hit => [
    { update: { _index: 'civic-events', _id: hit._id } },
    {
      doc: {
        is_overdue: true,
        updated_at: new Date().toISOString(),
        updated_by: 'civic-event-processor-lambda',
      },
    },
  ]).flat();

  if (updateOps.length > 0) {
    await esClient.bulk({ operations: updateOps });
  }

  console.log(`Updated ${response.hits.hits.length} overdue complaints`);

  return { updated: response.hits.hits.length };
}

// Main handler
export const handler: Handler = async (event: S3Event | EventBridgeEvent<string, any>, context: Context) => {
  console.log('Lambda invoked:', JSON.stringify({ eventType: (event as any).source || 'S3' }));

  try {
    // Determine event source
    if ((event as S3Event).Records && (event as S3Event).Records[0]?.s3) {
      // S3 trigger
      const result = await handleS3Event(event as S3Event);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'S3 events processed',
          ...result,
        }),
      };
    } else if ((event as EventBridgeEvent<string, any>).source === 'aws.events') {
      // Scheduled EventBridge trigger
      const result = await handleScheduledEvent();
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Scheduled processing completed',
          ...result,
        }),
      };
    } else {
      // Direct invocation with event payload
      const events = Array.isArray(event) ? event : [event];
      let processed = 0;
      let failed = 0;

      for (const e of events) {
        try {
          await processCivicEvent(e as CivicEvent);
          processed++;
        } catch (error) {
          failed++;
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Direct invocation processed',
          processed,
          failed,
        }),
      };
    }
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Processing failed',
        error: (error as Error).message,
      }),
    };
  }
};
