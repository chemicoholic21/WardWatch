/**
 * Backwards-compatibility shim.
 *
 * The project originally targeted Elasticsearch; we've migrated to
 * MongoDB. To keep route and service imports unchanged, this module
 * re-exports the MongoDB collection/pipeline constants under the
 * historical `ES_*` names.
 *
 * `getElasticsearchClient` is retained as a no-op alias for the Mongo
 * client so the few callers that ping for liveness still compile —
 * prefer `getMongoClient` / `getDb` for new code.
 */

import { COLLECTIONS, PIPELINES, getMongoClient } from './mongodb.js';

export const ES_INDICES = COLLECTIONS;
export const ES_PIPELINES = PIPELINES;

export type ESIndex = typeof ES_INDICES[keyof typeof ES_INDICES];
export type ESPipeline = typeof ES_PIPELINES[keyof typeof ES_PIPELINES];

/** @deprecated Use `getMongoClient` / `getDb` from `./mongodb` instead. */
export function getElasticsearchClient() {
  return getMongoClient();
}
