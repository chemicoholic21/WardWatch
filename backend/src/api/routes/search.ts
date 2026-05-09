import { Router, Request, Response } from 'express';
import { esService } from '../../services/elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';

const router = Router();

// Full-text search across all indices
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      q,
      index,
      page = '1',
      limit = '20',
      sort_by,
      sort_order = 'desc',
    } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required',
      });
    }

    const searchIndices = index
      ? [index as string]
      : [ES_INDICES.CIVIC_EVENTS, ES_INDICES.SCAM_REPORTS];

    const query = {
      multi_match: {
        query: q as string,
        fields: [
          'title^3',
          'description^2',
          'content^2',
          'category',
          'department',
          'ward_name',
          'address',
          'explanation',
        ],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const results = await Promise.all(
      searchIndices.map(idx =>
        esService.search(idx, query, {
          size: limitNum,
          from: (pageNum - 1) * limitNum,
          sort: sort_by ? [{ [sort_by as string]: sort_order }] as any : undefined,
        })
      )
    );

    // Combine and sort results
    const allHits = results.flatMap((r, i) =>
      r.hits.map((hit: any) => ({
        ...hit,
        _index: searchIndices[i],
      }))
    );

    const totalHits = results.reduce((sum, r) => sum + r.total, 0);

    res.json({
      success: true,
      data: allHits.slice(0, limitNum),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalHits,
        pages: Math.ceil(totalHits / limitNum),
      },
      indices_searched: searchIndices,
    });
  } catch (error: any) {
    console.error('Error searching:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Semantic search using vector similarity
router.post('/semantic', async (req: Request, res: Response) => {
  try {
    const { query, vector, k = 10, filter } = req.body;

    if (!vector && !query) {
      return res.status(400).json({
        success: false,
        error: 'Either query or vector is required',
      });
    }

    // If query provided, we'd need to generate embeddings
    // For hackathon demo, we'll simulate with stored vectors
    let searchVector = vector;

    if (!searchVector && query) {
      // Generate a mock embedding (in production, use AWS Bedrock)
      searchVector = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    }

    const results = await esService.vectorSearch(
      ES_INDICES.CIVIC_VECTORS,
      'embedding',
      searchVector,
      {
        k: parseInt(k as string, 10),
        filter: filter ? { term: filter } : undefined,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Error in semantic search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Autocomplete/suggest
router.get('/suggest', async (req: Request, res: Response) => {
  try {
    const { q, field = 'title', size = '5' } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query (q) is required',
      });
    }

    const query = {
      match_phrase_prefix: {
        [field as string]: {
          query: q,
          max_expansions: parseInt(size as string, 10) * 2,
        },
      },
    };

    const result = await esService.search(ES_INDICES.CIVIC_EVENTS, query, {
      size: parseInt(size as string, 10),
      _source: [field as string, 'department', 'ward_name', 'status'],
    });

    res.json({
      success: true,
      suggestions: result.hits.map((hit: any) => ({
        text: hit[field as string],
        department: hit.department,
        ward: hit.ward_name,
      })),
    });
  } catch (error: any) {
    console.error('Error in suggest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Find similar complaints
router.get('/similar/:id', async (req: Request, res: Response) => {
  try {
    const { limit = '5' } = req.query;

    // Get the source document
    const sourceDoc = await esService.get<any>(ES_INDICES.CIVIC_EVENTS, req.params.id);

    if (!sourceDoc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Use more_like_this query
    const query = {
      more_like_this: {
        fields: ['title', 'description', 'category'],
        like: [
          {
            _index: ES_INDICES.CIVIC_EVENTS,
            _id: req.params.id,
          },
        ],
        min_term_freq: 1,
        min_doc_freq: 1,
        max_query_terms: 25,
      },
    };

    const result = await esService.search(ES_INDICES.CIVIC_EVENTS, query, {
      size: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      source: sourceDoc,
      similar: result.hits,
    });
  } catch (error: any) {
    console.error('Error finding similar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search with facets
router.post('/faceted', async (req: Request, res: Response) => {
  try {
    const {
      query: searchQuery,
      filters = {},
      facets = ['department', 'status', 'zone', 'priority'],
      page = 1,
      limit = 20,
    } = req.body;

    const query: any = {
      bool: {
        must: searchQuery
          ? [{ multi_match: { query: searchQuery, fields: ['title^2', 'description', 'category'] } }]
          : [{ match_all: {} }],
        filter: [],
      },
    };

    // Apply filters
    for (const [field, value] of Object.entries(filters)) {
      if (value) {
        query.bool.filter.push({ term: { [field]: value } });
      }
    }

    // Build aggregations for facets
    const aggs: any = {};
    for (const facet of facets) {
      aggs[facet] = { terms: { field: facet, size: 20 } };
    }

    const result = await esService.search(ES_INDICES.CIVIC_EVENTS, query, {
      size: limit,
      from: (page - 1) * limit,
      aggs,
    });

    // Format facets
    const formattedFacets: Record<string, Array<{ value: string; count: number }>> = {};
    for (const facet of facets) {
      formattedFacets[facet] = (result.aggregations?.[facet]?.buckets || []).map((b: any) => ({
        value: b.key,
        count: b.doc_count,
      }));
    }

    res.json({
      success: true,
      data: result.hits,
      facets: formattedFacets,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error in faceted search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
