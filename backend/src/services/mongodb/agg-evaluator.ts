/**
 * In-memory evaluator for Elasticsearch aggregations.
 *
 * We trade a bit of perf (we materialize all matching docs) for a huge
 * gain in correctness and developer ergonomics — translating ES agg
 * trees into Mongo aggregation pipelines is error-prone, and the
 * WardWatch dataset is on the order of 5k docs so this is fast enough.
 *
 * Supported agg types:
 *   - value_count, cardinality, avg, sum, min, max, extended_stats
 *   - terms (with sub-aggs)
 *   - filter (with sub-aggs)
 *   - composite (multi-source terms, with sub-aggs)
 *   - date_histogram (calendar_interval: minute/hour/day/week/month/year)
 *   - geo_centroid, geohash_grid
 *
 * Each agg result mirrors the ES response shape so existing route code
 * that reads `.buckets`, `.doc_count`, `.value`, etc. keeps working.
 */

import { translateQuery } from './query-translator.js';

type Doc = Record<string, any>;
type AggDef = Record<string, any>;
type AggResult = Record<string, any>;

// ---- helpers ---------------------------------------------------------

function getField(doc: Doc, field: string): any {
  if (!field) return undefined;
  const normalized = field.endsWith('.keyword') ? field.slice(0, -'.keyword'.length) : field;
  if (!normalized.includes('.')) return doc[normalized];
  return normalized.split('.').reduce<any>((acc, part) => (acc == null ? acc : acc[part]), doc);
}

/** Materialize a doc value as primitive(s) — arrays expand. */
function valuesOf(doc: Doc, field: string): any[] {
  const v = getField(doc, field);
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Apply a translated Mongo filter to an in-memory doc. */
function matchesFilter(doc: Doc, filter: Record<string, any>): boolean {
  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$and') {
      if (!(cond as any[]).every(c => matchesFilter(doc, c))) return false;
      continue;
    }
    if (key === '$or') {
      if (!(cond as any[]).some(c => matchesFilter(doc, c))) return false;
      continue;
    }
    if (key === '$nor') {
      if ((cond as any[]).some(c => matchesFilter(doc, c))) return false;
      continue;
    }
    const docVal = getField(doc, key);
    if (!matchValue(docVal, cond)) return false;
  }
  return true;
}

function matchValue(docVal: any, cond: any): boolean {
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) {
    return Array.isArray(docVal) ? docVal.includes(cond) : docVal === cond;
  }
  for (const [op, target] of Object.entries(cond)) {
    switch (op) {
      case '$eq':  if (!(Array.isArray(docVal) ? docVal.includes(target) : docVal === target)) return false; break;
      case '$ne':  if (Array.isArray(docVal) ? docVal.includes(target) : docVal === target) return false; break;
      case '$in':  if (!(target as any[]).some(t => Array.isArray(docVal) ? docVal.includes(t) : docVal === t)) return false; break;
      case '$nin': if ((target as any[]).some(t => Array.isArray(docVal) ? docVal.includes(t) : docVal === t)) return false; break;
      case '$gt':  if (!(docVal > (target as any))) return false; break;
      case '$gte': if (!(docVal >= (target as any))) return false; break;
      case '$lt':  if (!(docVal < (target as any))) return false; break;
      case '$lte': if (!(docVal <= (target as any))) return false; break;
      case '$exists': if (((docVal !== undefined && docVal !== null)) !== Boolean(target)) return false; break;
      case '$regex': {
        const flags = (cond as any).$options || '';
        const re = new RegExp(String(target), flags);
        const ok = Array.isArray(docVal) ? docVal.some(v => re.test(String(v))) : re.test(String(docVal));
        if (!ok) return false;
        break;
      }
      case '$options': break; // handled with $regex
      default:
        // Unsupported op — be conservative and skip.
        break;
    }
  }
  return true;
}

// ---- interval bucketing for date_histogram --------------------------

function bucketStart(d: Date, interval: string): Date {
  const x = new Date(d);
  switch (interval) {
    case 'minute': x.setSeconds(0, 0); break;
    case 'hour':   x.setMinutes(0, 0, 0); break;
    case 'day':    x.setHours(0, 0, 0, 0); break;
    case 'week': {
      x.setHours(0, 0, 0, 0);
      const day = x.getDay() || 7;
      x.setDate(x.getDate() - (day - 1));
      break;
    }
    case 'month': x.setHours(0, 0, 0, 0); x.setDate(1); break;
    case 'year':  x.setHours(0, 0, 0, 0); x.setMonth(0, 1); break;
    default:      x.setHours(0, 0, 0, 0);
  }
  return x;
}

// ---- core dispatch --------------------------------------------------

export function evaluateAggs(aggs: AggDef, docs: Doc[]): AggResult {
  const out: AggResult = {};
  for (const [name, def] of Object.entries(aggs)) {
    out[name] = evaluateOne(def, docs);
  }
  return out;
}

function evaluateOne(def: AggDef, docs: Doc[]): AggResult {
  const subAggs: AggDef | undefined = def.aggs || def.aggregations;

  if ('value_count' in def) {
    const f = def.value_count.field;
    let n = 0;
    for (const d of docs) n += valuesOf(d, f).length;
    return { value: n };
  }

  if ('cardinality' in def) {
    const f = def.cardinality.field;
    const set = new Set<any>();
    for (const d of docs) for (const v of valuesOf(d, f)) set.add(v);
    return { value: set.size };
  }

  if ('avg' in def) {
    const f = def.avg.field;
    const nums: number[] = [];
    for (const d of docs) for (const v of valuesOf(d, f)) {
      const n = Number(v);
      if (!isNaN(n)) nums.push(n);
    }
    const value = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    return { value };
  }

  if ('sum' in def) {
    const f = def.sum.field;
    let s = 0;
    for (const d of docs) for (const v of valuesOf(d, f)) {
      const n = Number(v); if (!isNaN(n)) s += n;
    }
    return { value: s };
  }

  if ('min' in def) {
    const f = def.min.field;
    let m: number | null = null;
    for (const d of docs) for (const v of valuesOf(d, f)) {
      const n = Number(v); if (!isNaN(n)) m = m === null ? n : Math.min(m, n);
    }
    return { value: m };
  }

  if ('max' in def) {
    const f = def.max.field;
    let m: number | null = null;
    for (const d of docs) for (const v of valuesOf(d, f)) {
      const n = Number(v); if (!isNaN(n)) m = m === null ? n : Math.max(m, n);
    }
    return { value: m };
  }

  if ('extended_stats' in def) {
    const f = def.extended_stats.field;
    const nums: number[] = [];
    for (const d of docs) for (const v of valuesOf(d, f)) {
      const n = Number(v); if (!isNaN(n)) nums.push(n);
    }
    const count = nums.length;
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = count ? sum / count : 0;
    const variance = count ? nums.reduce((acc, n) => acc + (n - avg) ** 2, 0) / count : 0;
    return {
      count,
      sum,
      avg: count ? avg : null,
      min: count ? Math.min(...nums) : null,
      max: count ? Math.max(...nums) : null,
      variance,
      std_deviation: Math.sqrt(variance),
    };
  }

  if ('filter' in def) {
    const filter = translateQuery(def.filter);
    const filtered = docs.filter(d => matchesFilter(d, filter));
    const result: AggResult = { doc_count: filtered.length };
    if (subAggs) Object.assign(result, evaluateAggs(subAggs, filtered));
    return result;
  }

  if ('terms' in def) {
    const f = def.terms.field;
    const size = def.terms.size ?? 10;
    const counts = new Map<any, Doc[]>();
    for (const d of docs) {
      for (const v of valuesOf(d, f)) {
        if (v === undefined || v === null || v === '') continue;
        const key = typeof v === 'object' ? JSON.stringify(v) : v;
        const arr = counts.get(key);
        if (arr) arr.push(d);
        else counts.set(key, [d]);
      }
    }
    const buckets = Array.from(counts.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, size)
      .map(([key, members]) => {
        const bucket: AggResult = { key, doc_count: members.length };
        if (subAggs) Object.assign(bucket, evaluateAggs(subAggs, members));
        return bucket;
      });
    return { buckets, doc_count_error_upper_bound: 0, sum_other_doc_count: 0 };
  }

  if ('composite' in def) {
    const sources: Array<Record<string, any>> = def.composite.sources || [];
    const size = def.composite.size ?? 10;
    // Build composite key per doc — { name: value, ... }
    const groups = new Map<string, { key: Record<string, any>; members: Doc[] }>();
    for (const d of docs) {
      const key: Record<string, any> = {};
      let skip = false;
      for (const src of sources) {
        const [name, body] = Object.entries(src)[0]!;
        const field = (body as any).terms?.field;
        const vals = valuesOf(d, field);
        if (vals.length === 0) { skip = true; break; }
        key[name] = vals[0];
      }
      if (skip) continue;
      const k = JSON.stringify(key);
      const g = groups.get(k);
      if (g) g.members.push(d);
      else groups.set(k, { key, members: [d] });
    }
    const buckets = Array.from(groups.values())
      .sort((a, b) => b.members.length - a.members.length)
      .slice(0, size)
      .map(({ key, members }) => {
        const bucket: AggResult = { key, doc_count: members.length };
        if (subAggs) Object.assign(bucket, evaluateAggs(subAggs, members));
        return bucket;
      });
    return { buckets, after_key: buckets.length ? buckets[buckets.length - 1].key : undefined };
  }

  if ('date_histogram' in def) {
    const f = def.date_histogram.field;
    const interval = def.date_histogram.calendar_interval || def.date_histogram.fixed_interval || 'day';
    const groups = new Map<number, { date: Date; members: Doc[] }>();
    for (const d of docs) {
      for (const v of valuesOf(d, f)) {
        const dt = v instanceof Date ? v : new Date(v);
        if (isNaN(dt.getTime())) continue;
        const start = bucketStart(dt, interval);
        const k = start.getTime();
        const g = groups.get(k);
        if (g) g.members.push(d);
        else groups.set(k, { date: start, members: [d] });
      }
    }
    const buckets = Array.from(groups.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ date, members }) => {
        const bucket: AggResult = {
          key: date.getTime(),
          key_as_string: date.toISOString(),
          doc_count: members.length,
        };
        if (subAggs) Object.assign(bucket, evaluateAggs(subAggs, members));
        return bucket;
      });
    return { buckets };
  }

  if ('geo_centroid' in def) {
    const f = def.geo_centroid.field;
    let lat = 0, lon = 0, n = 0;
    for (const d of docs) {
      const v = getField(d, f);
      if (!v) continue;
      const pLat = Number(v.lat ?? (Array.isArray(v.coordinates) ? v.coordinates[1] : NaN));
      const pLon = Number(v.lon ?? v.lng ?? (Array.isArray(v.coordinates) ? v.coordinates[0] : NaN));
      if (isNaN(pLat) || isNaN(pLon)) continue;
      lat += pLat; lon += pLon; n++;
    }
    return n
      ? { count: n, location: { lat: lat / n, lon: lon / n } }
      : { count: 0, location: null };
  }

  if ('geohash_grid' in def) {
    const f = def.geohash_grid.field;
    const precision = Math.max(1, Math.min(12, def.geohash_grid.precision ?? 5));
    // Approximate "geohash" by rounding to N decimal places — close enough for
    // visualization purposes. Decimal places ≈ precision/2.
    const decimals = Math.max(1, Math.round(precision / 2));
    const groups = new Map<string, { centroid: { lat: number; lon: number }; members: Doc[] }>();
    for (const d of docs) {
      const v = getField(d, f);
      if (!v) continue;
      const lat = Number(v.lat ?? (Array.isArray(v.coordinates) ? v.coordinates[1] : NaN));
      const lon = Number(v.lon ?? v.lng ?? (Array.isArray(v.coordinates) ? v.coordinates[0] : NaN));
      if (isNaN(lat) || isNaN(lon)) continue;
      const key = `${lat.toFixed(decimals)},${lon.toFixed(decimals)}`;
      const g = groups.get(key);
      if (g) g.members.push(d);
      else groups.set(key, { centroid: { lat, lon }, members: [d] });
    }
    const buckets = Array.from(groups.entries())
      .sort((a, b) => b[1].members.length - a[1].members.length)
      .map(([key, { centroid, members }]) => {
        const bucket: AggResult = {
          key,
          doc_count: members.length,
        };
        if (subAggs) Object.assign(bucket, evaluateAggs(subAggs, members));
        // ES geohash buckets carry a centroid sub-agg by default — include it.
        bucket.centroid = bucket.centroid || { location: centroid, count: members.length };
        return bucket;
      });
    return { buckets };
  }

  // Unknown — return doc_count for safety
  return { doc_count: docs.length };
}
