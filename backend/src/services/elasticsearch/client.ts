import { Client, estypes } from '@elastic/elasticsearch';
import { getElasticsearchClient, ES_INDICES } from '../../config/elasticsearch.js';

export class ElasticsearchService {
  private client: Client;

  constructor() {
    this.client = getElasticsearchClient();
  }

  // Generic search
  async search<T>(index: string, query: estypes.QueryDslQueryContainer, options?: {
    size?: number;
    from?: number;
    sort?: estypes.Sort;
    aggs?: Record<string, estypes.AggregationsAggregationContainer>;
    _source?: string[] | boolean;
  }): Promise<{ hits: T[]; total: number; aggregations?: Record<string, any> }> {
    const response = await this.client.search({
      index,
      query,
      size: options?.size ?? 20,
      from: options?.from ?? 0,
      sort: options?.sort,
      aggs: options?.aggs,
      _source: options?._source,
    });

    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? 0;

    return {
      hits: response.hits.hits.map(hit => ({
        _id: hit._id,
        ...hit._source as T,
      })),
      total,
      aggregations: response.aggregations as Record<string, any>,
    };
  }

  // Get document by ID
  async get<T>(index: string, id: string): Promise<T | null> {
    try {
      const response = await this.client.get({ index, id });
      return { _id: response._id, ...response._source as T };
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  // Index document
  async index<T>(index: string, document: T, options?: {
    id?: string;
    pipeline?: string;
    refresh?: boolean;
  }): Promise<string> {
    const response = await this.client.index({
      index,
      id: options?.id,
      document,
      pipeline: options?.pipeline,
      refresh: options?.refresh,
    });
    return response._id;
  }

  // Bulk index
  async bulkIndex<T>(index: string, documents: T[], options?: {
    pipeline?: string;
    idField?: string;
  }): Promise<{ successful: number; failed: number }> {
    const operations = documents.flatMap(doc => {
      const id = options?.idField ? (doc as any)[options.idField] : undefined;
      return [
        { index: { _index: index, _id: id, pipeline: options?.pipeline } },
        doc,
      ];
    });

    const response = await this.client.bulk({ operations, refresh: true });

    let successful = 0;
    let failed = 0;

    if (response.items) {
      for (const item of response.items) {
        if (item.index?.error) {
          failed++;
          console.error('Bulk index error:', item.index.error);
        } else {
          successful++;
        }
      }
    }

    return { successful, failed };
  }

  // Update document
  async update<T>(index: string, id: string, doc: Partial<T>): Promise<void> {
    await this.client.update({
      index,
      id,
      doc,
      refresh: true,
    });
  }

  // Delete document
  async delete(index: string, id: string): Promise<boolean> {
    try {
      await this.client.delete({ index, id, refresh: true });
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) return false;
      throw error;
    }
  }

  // Count documents
  async count(index: string, query?: estypes.QueryDslQueryContainer): Promise<number> {
    const response = await this.client.count({ index, query });
    return response.count;
  }

  // Aggregation query
  async aggregate(index: string, aggs: Record<string, estypes.AggregationsAggregationContainer>, query?: estypes.QueryDslQueryContainer): Promise<Record<string, any>> {
    const response = await this.client.search({
      index,
      size: 0,
      query,
      aggs,
    });
    return response.aggregations as Record<string, any>;
  }

  // Vector search (kNN)
  async vectorSearch<T>(index: string, field: string, vector: number[], options?: {
    k?: number;
    numCandidates?: number;
    filter?: estypes.QueryDslQueryContainer;
    _source?: string[];
  }): Promise<T[]> {
    const response = await this.client.search({
      index,
      knn: {
        field,
        query_vector: vector,
        k: options?.k ?? 10,
        num_candidates: options?.numCandidates ?? 100,
        filter: options?.filter,
      },
      _source: options?._source,
    });

    return response.hits.hits.map(hit => ({
      _id: hit._id,
      _score: hit._score,
      ...hit._source as T,
    }));
  }

  // Get client for direct access
  getClient(): Client {
    return this.client;
  }
}

export const esService = new ElasticsearchService();
