/**
 * Backwards-compatibility shim.
 *
 * The original Elasticsearch service has been replaced by a MongoDB
 * implementation that exposes the same surface area. Existing imports
 * of `esService` from this path continue to work — they just hit Mongo
 * underneath now.
 *
 * Prefer importing `mongoService` from `../mongodb/client.js` in new code.
 */

export { esService, mongoService, MongoService } from '../mongodb/client.js';
