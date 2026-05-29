/**
 * MongoDB service implementing the same surface area that the rest of
 * the codebase used to call on `esService`. Keeping the names identical
 * means routes and feature services don't need to change.
 */

import { Sort } from 'mongodb';
import { getDb, COLLECTIONS } from '../../config/mongodb.js';
import { translateQuery } from './query-translator.js';
import { evaluateAggs } from './agg-evaluator.js';

// The methods accept loose `any` shapes — they're called from places that
// were originally typed against `@elastic/elasticsearch`'s `estypes`. The
// goal is behavioral compatibility, not preserving those exact types.
type AnyQuery = any;
type AnyAggs = Record<string, any>;

interface SearchOptions {
  size?: number;
  from?: number;
  sort?: Sort | Array<Record<string, 'asc' | 'desc'>> | any;
  aggs?: AnyAggs;
  _source?: string[] | boolean;
}

interface SearchResult<T> {
  hits: T[];
  total: number;
  aggregations?: Record<string, any>;
}

/**
 * Project `_source: ['a','b']` selection onto a result doc, mirroring
 * Elasticsearch behavior. `false` strips everything, `true` (default)
 * keeps everything.
 */
function applySource<T extends Record<string, any>>(
  doc: T,
  src: string[] | boolean | undefined,
): T {
  if (src === undefined || src === true) return doc;
  if (src === false) return { _id: doc._id } as unknown as T;
  const out: Record<string, any> = { _id: doc._id };
  for (const f of src) {
    const norm = f.endsWith('.keyword') ? f.slice(0, -'.keyword'.length) : f;
    if (norm in doc) out[norm] = (doc as any)[norm];
  }
  return out as T;
}

function buildMongoSort(sort: SearchOptions['sort']): Sort | undefined {
  if (!sort) return undefined;
  // Allowed inputs from the codebase:
  //   [{ field: 'asc' | 'desc' }]
  //   { field: 'asc' | 'desc' }
  //   'field'
  if (typeof sort === 'string') return { [sort]: 1 };
  const list = Array.isArray(sort) ? sort : [sort];
  const out: Record<string, 1 | -1> = {};
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    for (const [k, v] of Object.entries(item as any)) {
      const dir = (v === 'asc' || v === 1 || (v && (v as any).order === 'asc')) ? 1 : -1;
      const key = k.endsWith('.keyword') ? k.slice(0, -'.keyword'.length) : k;
      out[key] = dir;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export class MongoService {
  // ---- search ----------------------------------------------------------
  async search<T = any>(
    collection: string,
    query: AnyQuery,
    options: SearchOptions = {},
  ): Promise<SearchResult<T>> {
    const db = await getDb();
    const col = db.collection(collection);
    const filter = translateQuery(query);

    const size = options.size ?? 20;
    const from = options.from ?? 0;
    const sort = buildMongoSort(options.sort);

    // We need both the paged hits AND, when aggs are requested, the full
    // matching set to evaluate them.
    let totalDocs: any[] | null = null;
    let totalCount: number;
    let pagedDocs: any[];

    if (options.aggs) {
      totalDocs = await col.find(filter).toArray();
      totalCount = totalDocs.length;
      let sorted = totalDocs;
      if (sort) {
        const entries = Object.entries(sort);
        sorted = [...totalDocs].sort((a, b) => compareBy(a, b, entries));
      }
      pagedDocs = sorted.slice(from, from + size);
    } else {
      let cursor = col.find(filter);
      if (sort) cursor = cursor.sort(sort);
      totalCount = await col.countDocuments(filter);
      pagedDocs = await cursor.skip(from).limit(size).toArray();
    }

    const hits = pagedDocs.map(d => applySource(d as any, options._source)) as T[];

    const result: SearchResult<T> = { hits, total: totalCount };
    if (options.aggs && totalDocs) {
      result.aggregations = evaluateAggs(options.aggs, totalDocs);
    }
    return result;
  }

  // ---- get -------------------------------------------------------------
  async get<T = any>(collection: string, id: string): Promise<T | null> {
    const db = await getDb();
    const doc = await db.collection(collection).findOne({ _id: id as any });
    if (!doc) return null;
    return doc as unknown as T;
  }

  // ---- index (upsert) --------------------------------------------------
  async index<T = any>(
    collection: string,
    document: T,
    options: { id?: string; pipeline?: string; refresh?: boolean } = {},
  ): Promise<string> {
    const db = await getDb();
    const col = db.collection(collection);
    const docId = options.id ?? (document as any)._id ?? (document as any).id;
    const doc: any = { ...(document as any) };
    enrichGeo(doc);

    if (docId) {
      doc._id = docId;
      await col.replaceOne({ _id: docId as any }, doc, { upsert: true });
      return docId;
    }
    const result = await col.insertOne(doc);
    return String(result.insertedId);
  }

  // ---- bulkIndex -------------------------------------------------------
  async bulkIndex<T = any>(
    collection: string,
    documents: T[],
    options: { pipeline?: string; idField?: string } = {},
  ): Promise<{ successful: number; failed: number }> {
    if (!documents.length) return { successful: 0, failed: 0 };
    const db = await getDb();
    const col = db.collection(collection);

    const operations = documents.map(d => {
      const doc: any = { ...(d as any) };
      enrichGeo(doc);
      const id = options.idField ? (d as any)[options.idField] : doc._id ?? doc.id;
      if (id) doc._id = id;
      return {
        replaceOne: {
          filter: { _id: doc._id ?? new ObjectIdPlaceholder() } as any,
          replacement: doc,
          upsert: true,
        },
      };
    });

    try {
      const result = await col.bulkWrite(operations as any, { ordered: false });
      const successful = (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0) + (result.matchedCount ?? 0);
      return { successful, failed: documents.length - successful };
    } catch (err: any) {
      const writeErrors = err?.writeErrors?.length ?? 0;
      return { successful: documents.length - writeErrors, failed: writeErrors };
    }
  }

  // ---- update ----------------------------------------------------------
  async update<T = any>(collection: string, id: string, doc: Partial<T>): Promise<void> {
    const db = await getDb();
    const update: any = { ...(doc as any) };
    enrichGeo(update);
    await db.collection(collection).updateOne(
      { _id: id as any },
      { $set: update },
      { upsert: false },
    );
  }

  // ---- delete ----------------------------------------------------------
  async delete(collection: string, id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.collection(collection).deleteOne({ _id: id as any });
    return (result.deletedCount ?? 0) > 0;
  }

  // ---- count -----------------------------------------------------------
  async count(collection: string, query?: AnyQuery): Promise<number> {
    const db = await getDb();
    const filter = translateQuery(query);
    return db.collection(collection).countDocuments(filter);
  }

  // ---- aggregate (size=0 search with aggs) -----------------------------
  async aggregate(
    collection: string,
    aggs: AnyAggs,
    query?: AnyQuery,
  ): Promise<Record<string, any>> {
    const db = await getDb();
    const filter = translateQuery(query);
    const docs = await db.collection(collection).find(filter).toArray();
    return evaluateAggs(aggs, docs);
  }

  // ---- vectorSearch (kNN) ---------------------------------------------
  async vectorSearch<T = any>(
    collection: string,
    field: string,
    vector: number[],
    options: { k?: number; numCandidates?: number; filter?: AnyQuery; _source?: string[] } = {},
  ): Promise<T[]> {
    const db = await getDb();
    const filter = translateQuery(options.filter);
    const docs = await db.collection(collection).find(filter).toArray();
    const k = options.k ?? 10;

    // Brute-force cosine similarity. Fine for hackathon-scale data
    // (~thousands of vectors). If/when this grows, switch to Atlas
    // Vector Search ($vectorSearch stage).
    const scored = docs
      .map(d => {
        const v: number[] | undefined = (d as any)[field];
        if (!Array.isArray(v) || v.length !== vector.length) return null;
        return { doc: d, score: cosineSim(vector, v) };
      })
      .filter((x): x is { doc: any; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return scored.map(s => ({
      ...applySource(s.doc, options._source),
      _score: s.score,
    })) as T[];
  }
}

// ---- helpers ---------------------------------------------------------

class ObjectIdPlaceholder { /* sentinel so bulkWrite doesn't crash on null _id */ }

function compareBy(a: any, b: any, entries: Array<[string, 1 | -1]>): number {
  for (const [field, dir] of entries) {
    const av = getNested(a, field);
    const bv = getNested(b, field);
    if (av === bv) continue;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return  1 * dir;
  }
  return 0;
}

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * If a doc has `geo_location: { lat, lon }`, add a sibling `_geo` GeoJSON
 * Point so MongoDB 2dsphere indexes can use it for $geoWithin / $nearSphere.
 * This lets us preserve the existing API response shape (which the frontend
 * expects) while still supporting spatial queries.
 */
function enrichGeo(doc: any): void {
  const g = doc?.geo_location;
  if (!g) return;
  // Already GeoJSON
  if (g.type === 'Point' && Array.isArray(g.coordinates)) {
    doc._geo = g;
    return;
  }
  const lat = Number(g.lat);
  const lon = Number(g.lon ?? g.lng);
  if (isNaN(lat) || isNaN(lon)) return;
  doc._geo = { type: 'Point', coordinates: [lon, lat] };
}

/** Singleton — matches the old `esService` export shape. */
export const mongoService = new MongoService();

/** Backwards-compat alias so legacy imports of `esService` keep working. */
export const esService = mongoService;

export { COLLECTIONS };
