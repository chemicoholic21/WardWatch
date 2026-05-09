import { Client } from '@elastic/elasticsearch';
import { config } from './environment.js';

let esClient: Client | null = null;

export function getElasticsearchClient(): Client {
  if (esClient) return esClient;

  // Use Cloud ID if available, otherwise use node URL
  if (config.elasticsearch.cloudId && config.elasticsearch.apiKey) {
    esClient = new Client({
      cloud: { id: config.elasticsearch.cloudId },
      auth: { apiKey: config.elasticsearch.apiKey },
    });
  } else {
    esClient = new Client({
      node: config.elasticsearch.node,
    });
  }

  return esClient;
}

export const ES_INDICES = {
  CIVIC_EVENTS: 'civic-events',
  GHOST_OFFICES: 'ghost-offices',
  SCAM_REPORTS: 'scam-reports',
  ESCALATION_TRACES: 'escalation-traces',
  WARD_METRICS: 'ward-metrics',
  CIVIC_VECTORS: 'civic-vectors',
} as const;

export const ES_PIPELINES = {
  CIVIC_EVENT: 'civic-event-pipeline',
  SCAM_DETECTION: 'scam-detection-pipeline',
  GEO_ENRICHMENT: 'geo-enrichment-pipeline',
} as const;

export type ESIndex = typeof ES_INDICES[keyof typeof ES_INDICES];
export type ESPipeline = typeof ES_PIPELINES[keyof typeof ES_PIPELINES];
