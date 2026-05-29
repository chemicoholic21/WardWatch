import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { config } from './environment.js';

/**
 * MongoDB connection helper.
 *
 * Replaces the previous Elasticsearch backend. We keep collection names
 * 1:1 with the old ES index names so the rest of the codebase can keep
 * referring to them through the `ES_INDICES` constant.
 */

let client: MongoClient | null = null;
let db: Db | null = null;

const DEFAULT_URI = 'mongodb://localhost:27017';
const DEFAULT_DB = 'wardwatch';

export function getMongoClient(): MongoClient {
  if (client) return client;

  const uri = config.mongo.uri || DEFAULT_URI;
  const options: MongoClientOptions = {
    serverSelectionTimeoutMS: 5000,
    // Allow self-signed certs against local clusters; Atlas works out of the box.
    retryWrites: true,
  };

  client = new MongoClient(uri, options);
  return client;
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  const c = getMongoClient();
  await c.connect();
  db = c.db(config.mongo.dbName || DEFAULT_DB);
  return db;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/**
 * Logical collection names — kept identical to the old ES index names so
 * existing imports of `ES_INDICES.CIVIC_EVENTS` keep working.
 */
export const COLLECTIONS = {
  CIVIC_EVENTS: 'civic-events',
  GHOST_OFFICES: 'ghost-offices',
  SCAM_REPORTS: 'scam-reports',
  ESCALATION_TRACES: 'escalation-traces',
  WARD_METRICS: 'ward-metrics',
  CIVIC_VECTORS: 'civic-vectors',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

/**
 * Pipeline IDs used to be Elasticsearch ingest pipelines. With MongoDB
 * we apply the equivalent enrichment inline in the seed/index path, so
 * these are now just opaque tags kept for backward compat.
 */
export const PIPELINES = {
  CIVIC_EVENT: 'civic-event-pipeline',
  SCAM_DETECTION: 'scam-detection-pipeline',
  GEO_ENRICHMENT: 'geo-enrichment-pipeline',
} as const;
