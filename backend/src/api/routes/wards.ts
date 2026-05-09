import { Router, Request, Response } from 'express';
import { esService } from '../../services/elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';

const router = Router();

// Get all wards
router.get('/', async (req: Request, res: Response) => {
  try {
    const { zone, page = '1', limit = '50' } = req.query;

    const query: any = zone
      ? { term: { zone } }
      : { match_all: {} };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const result = await esService.search(ES_INDICES.WARD_METRICS, query, {
      size: limitNum,
      from: (pageNum - 1) * limitNum,
      sort: [{ ward_number: 'asc' }] as any,
    });

    res.json({
      success: true,
      data: result.hits,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ward by ID
router.get('/:wardId', async (req: Request, res: Response) => {
  try {
    const ward = await esService.get(ES_INDICES.WARD_METRICS, req.params.wardId);

    if (!ward) {
      return res.status(404).json({ success: false, error: 'Ward not found' });
    }

    // Get complaint statistics for this ward
    const complaintStats = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, {
      by_status: { terms: { field: 'status' } },
      by_department: { terms: { field: 'department', size: 10 } },
      by_category: { terms: { field: 'category', size: 10 } },
      overdue: { filter: { term: { is_overdue: true } } },
      avg_days: { avg: { field: 'days_open' } },
    }, {
      term: { ward_id: req.params.wardId },
    });

    const totalComplaints = await esService.count(ES_INDICES.CIVIC_EVENTS, {
      term: { ward_id: req.params.wardId },
    });

    res.json({
      success: true,
      data: {
        ...ward,
        complaint_stats: {
          total: totalComplaints,
          by_status: Object.fromEntries(
            (complaintStats.by_status?.buckets || []).map((b: any) => [b.key, b.doc_count])
          ),
          by_department: Object.fromEntries(
            (complaintStats.by_department?.buckets || []).map((b: any) => [b.key, b.doc_count])
          ),
          by_category: Object.fromEntries(
            (complaintStats.by_category?.buckets || []).map((b: any) => [b.key, b.doc_count])
          ),
          overdue_count: complaintStats.overdue?.doc_count || 0,
          avg_resolution_days: Math.round((complaintStats.avg_days?.value || 0) * 100) / 100,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching ward:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ward leaderboard
router.get('/leaderboard/performance', async (req: Request, res: Response) => {
  try {
    const { zone, limit = '20' } = req.query;

    const query: any = zone
      ? { term: { zone } }
      : { match_all: {} };

    const aggs = {
      by_ward: {
        terms: { field: 'ward_id', size: 200 },
        aggs: {
          ward_name: { terms: { field: 'ward_name.keyword', size: 1 } },
          zone: { terms: { field: 'zone', size: 1 } },
          total: { value_count: { field: 'event_id' } },
          resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
          overdue: { filter: { term: { is_overdue: true } } },
          avg_days: { avg: { field: 'days_open' } },
        },
      },
    };

    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs, query);

    const leaderboard = (result.by_ward?.buckets || [])
      .map((b: any) => {
        const total = b.total?.value || 1;
        const resolved = b.resolved?.doc_count || 0;
        const overdue = b.overdue?.doc_count || 0;
        const avgDays = b.avg_days?.value || 0;

        const resolutionRate = (resolved / total) * 100;
        const overdueRate = (overdue / total) * 100;
        const score = Math.max(0, Math.min(100,
          resolutionRate * 0.4 +
          (100 - overdueRate) * 0.3 +
          Math.max(0, (15 - avgDays) / 15 * 100) * 0.3
        ));

        return {
          ward_id: b.key,
          ward_name: b.ward_name?.buckets?.[0]?.key || b.key,
          zone: b.zone?.buckets?.[0]?.key || 'Unknown',
          score: Math.round(score * 100) / 100,
          grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F',
          metrics: {
            total_complaints: total,
            resolution_rate: Math.round(resolutionRate * 100) / 100,
            overdue_rate: Math.round(overdueRate * 100) / 100,
            avg_resolution_days: Math.round(avgDays * 100) / 100,
          },
        };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, parseInt(limit as string, 10))
      .map((item: any, index: number) => ({ ...item, rank: index + 1 }));

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get zone summary
router.get('/zones/summary', async (req: Request, res: Response) => {
  try {
    const aggs = {
      by_zone: {
        terms: { field: 'zone', size: 10 },
        aggs: {
          ward_count: { cardinality: { field: 'ward_id' } },
          total_complaints: { value_count: { field: 'event_id' } },
          resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
          overdue: { filter: { term: { is_overdue: true } } },
          avg_days: { avg: { field: 'days_open' } },
          centroid: { geo_centroid: { field: 'geo_location' } },
        },
      },
    };

    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs);

    const zones = (result.by_zone?.buckets || []).map((b: any) => {
      const total = b.total_complaints?.value || 1;
      const resolved = b.resolved?.doc_count || 0;
      const overdue = b.overdue?.doc_count || 0;

      return {
        zone: b.key,
        ward_count: b.ward_count?.value || 0,
        total_complaints: total,
        resolved: resolved,
        overdue: overdue,
        resolution_rate: Math.round((resolved / total) * 10000) / 100,
        overdue_rate: Math.round((overdue / total) * 10000) / 100,
        avg_resolution_days: Math.round((b.avg_days?.value || 0) * 100) / 100,
        centroid: b.centroid?.location || null,
      };
    });

    res.json({
      success: true,
      data: zones,
    });
  } catch (error: any) {
    console.error('Error fetching zone summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get nearby wards
router.get('/nearby/:wardId', async (req: Request, res: Response) => {
  try {
    const { distance = '5km' } = req.query;

    // Get source ward
    const sourceWard = await esService.get<any>(ES_INDICES.WARD_METRICS, req.params.wardId);
    if (!sourceWard) {
      return res.status(404).json({ success: false, error: 'Ward not found' });
    }

    if (!sourceWard.centroid) {
      return res.status(400).json({ success: false, error: 'Ward has no location data' });
    }

    // Find nearby wards using geo_distance
    const query = {
      bool: {
        must: [
          {
            geo_distance: {
              distance,
              centroid: sourceWard.centroid,
            },
          },
        ],
        must_not: [
          { term: { ward_id: req.params.wardId } },
        ],
      },
    };

    const nearbyWards = await esService.search(ES_INDICES.WARD_METRICS, query, {
      size: 10,
    });

    res.json({
      success: true,
      data: {
        source: sourceWard,
        nearby: nearbyWards.hits,
        search_radius: distance,
      },
    });
  } catch (error: any) {
    console.error('Error fetching nearby wards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
