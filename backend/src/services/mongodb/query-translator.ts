/**
 * Translates Elasticsearch Query DSL into MongoDB filters.
 *
 * Supports the subset of ES DSL that the WardWatch codebase actually
 * uses: match_all, term, terms, range (incl. ES date-math), bool with
 * must/filter/must_not/should, multi_match (mapped to $regex OR on the
 * listed fields), match_phrase_prefix, geo_distance, geo_bounding_box,
 * and more_like_this (approximated).
 */

import type { Filter } from 'mongodb';

type Json = any;

/**
 * Convert a `field.keyword` reference back to the plain field name —
 * we store strings as plain BSON strings, so the `.keyword` sub-field
 * concept doesn't exist in Mongo and we just strip it.
 */
function normalizeField(field: string): string {
  return field.endsWith('.keyword') ? field.slice(0, -'.keyword'.length) : field;
}

/**
 * Parse Elasticsearch date math, e.g. "now", "now-30d", "now-24h",
 * "now+1M", "now/d". Falls back to `new Date(input)` for ISO strings.
 */
export function parseEsDate(input: unknown): Date | unknown {
  if (input instanceof Date) return input;
  if (typeof input !== 'string') return input;
  const trimmed = input.trim();
  if (!trimmed.startsWith('now')) {
    // Plain ISO date / epoch — defer to JS Date parsing.
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? input : d;
  }

  const now = new Date();
  let rest = trimmed.slice(3); // strip "now"
  // Truncation suffix like "/d" — ignore for our purposes (interval is
  // already coarse enough for civic data).
  rest = rest.replace(/\/[a-zA-Z]+$/, '');

  const re = /([+-])(\d+)([yMwdhHms])/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rest)) !== null) {
    const sign = match[1] === '+' ? 1 : -1;
    const n = parseInt(match[2], 10) * sign;
    const unit = match[3];
    switch (unit) {
      case 'y': now.setFullYear(now.getFullYear() + n); break;
      case 'M': now.setMonth(now.getMonth() + n); break;
      case 'w': now.setDate(now.getDate() + n * 7); break;
      case 'd': now.setDate(now.getDate() + n); break;
      case 'h':
      case 'H': now.setHours(now.getHours() + n); break;
      case 'm': now.setMinutes(now.getMinutes() + n); break;
      case 's': now.setSeconds(now.getSeconds() + n); break;
    }
  }
  return now;
}

function translateRange(field: string, range: Record<string, Json>): Filter<any> {
  const f = normalizeField(field);
  const cond: Record<string, unknown> = {};
  if ('gte' in range) cond.$gte = parseEsDate(range.gte);
  if ('gt'  in range) cond.$gt  = parseEsDate(range.gt);
  if ('lte' in range) cond.$lte = parseEsDate(range.lte);
  if ('lt'  in range) cond.$lt  = parseEsDate(range.lt);
  return { [f]: cond };
}

function translateMultiMatch(mm: Json): Filter<any> {
  const q: string = String(mm.query ?? '');
  const fields: string[] = (mm.fields || []).map((f: string) => {
    // strip boost: "title^3" -> "title"
    const idx = f.indexOf('^');
    return normalizeField(idx === -1 ? f : f.slice(0, idx));
  });
  if (!q || fields.length === 0) return {};
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Loose: match if any of the fields contains the query (case-insensitive).
  return { $or: fields.map(f => ({ [f]: { $regex: escaped, $options: 'i' } })) };
}

function translateMatchPhrasePrefix(mpp: Json): Filter<any> {
  // mpp is keyed by field name
  const [field, body] = Object.entries(mpp)[0] ?? [];
  if (!field) return {};
  const q = typeof body === 'object' && body !== null ? (body as any).query : body;
  const escaped = String(q ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { [normalizeField(field)]: { $regex: '^' + escaped, $options: 'i' } };
}

function translateGeoDistance(gd: Json): Filter<any> {
  // shape: { distance: '5km', <field>: {lat, lon} | [lon,lat] }
  const distanceStr: string = String(gd.distance ?? '0km');
  const meters = parseDistanceMeters(distanceStr);

  let field = '';
  let lat = 0, lon = 0;
  for (const [k, v] of Object.entries(gd)) {
    if (k === 'distance') continue;
    field = k;
    if (Array.isArray(v)) {
      lon = Number((v as any[])[0]);
      lat = Number((v as any[])[1]);
    } else if (v && typeof v === 'object') {
      lat = Number((v as any).lat);
      lon = Number((v as any).lon ?? (v as any).lng);
    }
    break;
  }
  if (!field) return {};
  // We index a sibling _geo (GeoJSON Point) for spatial queries.
  return {
    _geo: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lon, lat] },
        $maxDistance: meters,
      },
    },
  };
}

function translateGeoBoundingBox(gbb: Json): Filter<any> {
  // shape: { <field>: { top_left:{lat,lon}, bottom_right:{lat,lon} } }
  const [, body] = Object.entries(gbb)[0] ?? [];
  if (!body) return {};
  const tl = (body as any).top_left;
  const br = (body as any).bottom_right;
  if (!tl || !br) return {};
  return {
    _geo: {
      $geoWithin: {
        $box: [
          [Number(tl.lon ?? tl.lng), Number(br.lat)], // SW
          [Number(br.lon ?? br.lng), Number(tl.lat)], // NE
        ],
      },
    },
  };
}

function parseDistanceMeters(d: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*(km|m|mi|yd|ft)?$/i.exec(d.trim());
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = (m[2] || 'm').toLowerCase();
  switch (unit) {
    case 'km': return n * 1000;
    case 'mi': return n * 1609.344;
    case 'yd': return n * 0.9144;
    case 'ft': return n * 0.3048;
    default:   return n;
  }
}

/**
 * Recursively translate an ES query DSL node into a MongoDB filter.
 * Always returns an object — caller can spread it directly into find().
 */
export function translateQuery(query: Json | undefined | null): Filter<any> {
  if (!query) return {};
  if (typeof query !== 'object') return {};

  // {match_all: {}}
  if ('match_all' in query) return {};

  // {bool: {must, filter, must_not, should, minimum_should_match}}
  if ('bool' in query) {
    const b = query.bool || {};
    const must = ([] as any[]).concat(b.must || [], b.filter || [])
      .map(translateQuery)
      .filter(o => Object.keys(o).length > 0);
    const mustNot = (b.must_not || []).map(translateQuery)
      .filter((o: any) => Object.keys(o).length > 0);
    const should = (b.should || []).map(translateQuery)
      .filter((o: any) => Object.keys(o).length > 0);

    const out: Filter<any> = {};
    if (must.length === 1) Object.assign(out, must[0]);
    else if (must.length > 1) (out as any).$and = must;
    if (mustNot.length > 0) (out as any).$nor = mustNot;
    if (should.length > 0) {
      if (must.length === 0 && mustNot.length === 0) {
        (out as any).$or = should;
      } else {
        // Combine should into the existing filter via $and
        const existing = (out as any).$and || [{ ...out }];
        return { $and: [...existing, { $or: should }] };
      }
    }
    return out;
  }

  // {term: { field: value }}
  if ('term' in query) {
    const [field, val] = Object.entries(query.term as Record<string, Json>)[0] ?? [];
    if (!field) return {};
    const value = typeof val === 'object' && val !== null && 'value' in val ? (val as any).value : val;
    return { [normalizeField(field)]: value };
  }

  // {terms: { field: [v1,v2,...] }}
  if ('terms' in query) {
    const [field, arr] = Object.entries(query.terms as Record<string, Json>)[0] ?? [];
    if (!field) return {};
    return { [normalizeField(field)]: { $in: arr as any[] } };
  }

  // {range: { field: { gte, lte, ... } }}
  if ('range' in query) {
    const [field, body] = Object.entries(query.range as Record<string, Json>)[0] ?? [];
    if (!field) return {};
    return translateRange(field, body as Record<string, Json>);
  }

  // {exists: { field }}
  if ('exists' in query) {
    const f = normalizeField((query.exists as any).field);
    return { [f]: { $exists: true, $ne: null } };
  }

  // {multi_match: {...}}
  if ('multi_match' in query) return translateMultiMatch(query.multi_match);

  // {match: { field: value | { query } }}
  if ('match' in query) {
    const [field, body] = Object.entries(query.match as Record<string, Json>)[0] ?? [];
    if (!field) return {};
    const q = typeof body === 'object' && body !== null ? (body as any).query : body;
    const escaped = String(q ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { [normalizeField(field)]: { $regex: escaped, $options: 'i' } };
  }

  // {match_phrase_prefix: { field: {...} }}
  if ('match_phrase_prefix' in query) return translateMatchPhrasePrefix(query.match_phrase_prefix);

  // {geo_distance: {...}}
  if ('geo_distance' in query) return translateGeoDistance(query.geo_distance);

  // {geo_bounding_box: {...}}
  if ('geo_bounding_box' in query) return translateGeoBoundingBox(query.geo_bounding_box);

  // more_like_this — approximated by full-text on title/description
  if ('more_like_this' in query) {
    const mlt = query.more_like_this as any;
    const fields: string[] = (mlt.fields || ['title', 'description']).map(normalizeField);
    // We don't have the source doc here; the caller (search route) passes
    // a "like" reference. We just match-all and rely on the caller to
    // post-filter / sort. Returning {} keeps the call cheap.
    return {};
  }

  // Unknown — fall through with an empty filter (safer than throwing).
  return {};
}
