import { Router, Request, Response } from 'express';
import { esService } from '../../services/elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';
import { ghostOfficeDetector } from '../../services/ghost-office/detector.js';

const router = Router();

// Get dashboard overview
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { date_from = 'now-30d' } = req.query;

    // Run multiple aggregations in parallel
    const [
      complaintStats,
      ghostStats,
      scamStats,
      zoneMetrics,
    ] = await Promise.all([
      // Complaint statistics
      esService.aggregate(ES_INDICES.CIVIC_EVENTS, {
        total: { value_count: { field: 'event_id' } },
        by_status: { terms: { field: 'status' } },
        overdue: { filter: { term: { is_overdue: true } } },
        avg_resolution: { avg: { field: 'days_open' } },
        daily_volume: {
          date_histogram: {
            field: 'created_at',
            calendar_interval: 'day',
          },
        },
      }, {
        range: { created_at: { gte: date_from } },
      }),

      // Ghost office statistics
      ghostOfficeDetector.calculateGhostScores({
        dateRange: { gte: date_from as string },
      }),

      // Scam statistics
      esService.aggregate(ES_INDICES.SCAM_REPORTS, {
        total: { value_count: { field: 'report_id' } },
        by_risk_level: { terms: { field: 'risk_level' } },
        by_department: { terms: { field: 'spoofed_department' } },
        avg_trust_score: { avg: { field: 'trust_score' } },
      }, {
        range: { reported_at: { gte: date_from } },
      }),

      // Zone metrics
      esService.aggregate(ES_INDICES.CIVIC_EVENTS, {
        by_zone: {
          terms: { field: 'zone', size: 10 },
          aggs: {
            complaints: { value_count: { field: 'event_id' } },
            overdue: { filter: { term: { is_overdue: true } } },
            avg_days: { avg: { field: 'days_open' } },
          },
        },
      }, {
        range: { created_at: { gte: date_from } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        complaints: {
          total: complaintStats.total?.value || 0,
          by_status: Object.fromEntries(
            (complaintStats.by_status?.buckets || []).map((b: any) => [b.key, b.doc_count])
          ),
          overdue_count: complaintStats.overdue?.doc_count || 0,
          avg_resolution_days: Math.round((complaintStats.avg_resolution?.value || 0) * 100) / 100,
          daily_trend: (complaintStats.daily_volume?.buckets || []).slice(-14).map((b: any) => ({
            date: b.key_as_string,
            count: b.doc_count,
          })),
        },
        ghost_offices: ghostStats.summary,
        scams: {
          total: scamStats.total?.value || 0,
          by_risk_level: Object.fromEntries(
            (scamStats.by_risk_level?.buckets || []).map((b: any) => [b.key, b.doc_count])
          ),
          by_department: Object.fromEntries(
            (scamStats.by_department?.buckets || []).filter((b: any) => b.key).map((b: any) => [b.key, b.doc_count])
          ),
          avg_trust_score: Math.round((scamStats.avg_trust_score?.value || 0) * 100) / 100,
        },
        zones: (zoneMetrics.by_zone?.buckets || []).map((b: any) => ({
          zone: b.key,
          complaints: b.complaints?.value || b.doc_count,
          overdue: b.overdue?.doc_count || 0,
          avg_resolution_days: Math.round((b.avg_days?.value || 0) * 100) / 100,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get civic health score by zone
router.get('/civic-health', async (req: Request, res: Response) => {
  try {
    const { zone } = req.query;

    const query: any = zone
      ? { bool: { filter: [{ term: { zone } }] } }
      : { match_all: {} };

    const aggs = {
      by_zone: {
        terms: { field: 'zone', size: 10 },
        aggs: {
          total: { value_count: { field: 'event_id' } },
          resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
          overdue: { filter: { term: { is_overdue: true } } },
          escalated: { filter: { range: { escalation_count: { gte: 2 } } } },
          avg_days: { avg: { field: 'days_open' } },
        },
      },
    };

    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs, query);

    const healthScores = (result.by_zone?.buckets || []).map((b: any) => {
      const total = b.total?.value || 1;
      const resolved = b.resolved?.doc_count || 0;
      const overdue = b.overdue?.doc_count || 0;
      const escalated = b.escalated?.doc_count || 0;
      const avgDays = b.avg_days?.value || 0;

      // Calculate health score (0-100)
      const resolutionRate = (resolved / total) * 100;
      const overdueRate = (overdue / total) * 100;
      const escalationRate = (escalated / total) * 100;
      const speedFactor = Math.max(0, 100 - avgDays * 2);

      const healthScore = Math.max(0, Math.min(100,
        resolutionRate * 0.4 +
        (100 - overdueRate) * 0.25 +
        (100 - escalationRate) * 0.20 +
        speedFactor * 0.15
      ));

      return {
        zone: b.key,
        health_score: Math.round(healthScore * 100) / 100,
        grade: healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : healthScore >= 20 ? 'D' : 'F',
        metrics: {
          total_complaints: total,
          resolution_rate: Math.round(resolutionRate * 100) / 100,
          overdue_rate: Math.round(overdueRate * 100) / 100,
          escalation_rate: Math.round(escalationRate * 100) / 100,
          avg_resolution_days: Math.round(avgDays * 100) / 100,
        },
      };
    }).sort((a: any, b: any) => b.health_score - a.health_score);

    res.json({
      success: true,
      data: healthScores,
    });
  } catch (error: any) {
    console.error('Error fetching civic health:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get department performance
router.get('/department-performance', async (req: Request, res: Response) => {
  try {
    const aggs = {
      by_department: {
        terms: { field: 'department', size: 20 },
        aggs: {
          total: { value_count: { field: 'event_id' } },
          resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
          overdue: { filter: { term: { is_overdue: true } } },
          avg_days: { avg: { field: 'days_open' } },
          high_priority: { filter: { term: { priority: 'high' } } },
          critical_priority: { filter: { term: { priority: 'critical' } } },
        },
      },
    };

    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs);

    const performance = (result.by_department?.buckets || []).map((b: any) => {
      const total = b.total?.value || 1;
      const resolved = b.resolved?.doc_count || 0;
      const overdue = b.overdue?.doc_count || 0;

      return {
        department: b.key,
        total_complaints: total,
        resolved: resolved,
        resolution_rate: Math.round((resolved / total) * 10000) / 100,
        overdue_count: overdue,
        overdue_rate: Math.round((overdue / total) * 10000) / 100,
        avg_resolution_days: Math.round((b.avg_days?.value || 0) * 100) / 100,
        high_priority_count: b.high_priority?.doc_count || 0,
        critical_priority_count: b.critical_priority?.doc_count || 0,
      };
    }).sort((a: any, b: any) => b.total_complaints - a.total_complaints);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    console.error('Error fetching department performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get time-series trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const {
      metric = 'complaints',
      interval = 'day',
      date_from = 'now-30d',
      department,
      zone,
    } = req.query;

    const query: any = {
      bool: {
        must: [{ range: { created_at: { gte: date_from } } }],
        filter: [],
      },
    };

    if (department) query.bool.filter.push({ term: { department } });
    if (zone) query.bool.filter.push({ term: { zone } });

    const index = metric === 'scams' ? ES_INDICES.SCAM_REPORTS : ES_INDICES.CIVIC_EVENTS;
    const dateField = metric === 'scams' ? 'reported_at' : 'created_at';

    const aggs = {
      trend: {
        date_histogram: {
          field: dateField,
          calendar_interval: interval as string,
        },
        aggs: metric === 'complaints' ? {
          resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
          overdue: { filter: { term: { is_overdue: true } } },
        } : {
          high_risk: { filter: { terms: { risk_level: ['high', 'critical'] } } },
        },
      },
    };

    const result = await esService.aggregate(index, aggs, query);

    const trend = (result.trend?.buckets || []).map((b: any) => ({
      date: b.key_as_string,
      timestamp: b.key,
      total: b.doc_count,
      ...(metric === 'complaints' ? {
        resolved: b.resolved?.doc_count || 0,
        overdue: b.overdue?.doc_count || 0,
      } : {
        high_risk: b.high_risk?.doc_count || 0,
      }),
    }));

    res.json({
      success: true,
      data: {
        metric,
        interval,
        trend,
      },
    });
  } catch (error: any) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get geo-spatial analytics
router.get('/geo', async (req: Request, res: Response) => {
  try {
    const { bounds, precision = '6' } = req.query;

    const aggs = {
      geo_grid: {
        geohash_grid: {
          field: 'geo_location',
          precision: parseInt(precision as string, 10),
        },
        aggs: {
          centroid: { geo_centroid: { field: 'geo_location' } },
          by_status: { terms: { field: 'status' } },
          overdue: { filter: { term: { is_overdue: true } } },
        },
      },
      zone_centroids: {
        terms: { field: 'zone', size: 10 },
        aggs: {
          centroid: { geo_centroid: { field: 'geo_location' } },
          count: { value_count: { field: 'event_id' } },
        },
      },
    };

    let query: any = { match_all: {} };
    if (bounds) {
      const [topLeft, bottomRight] = (bounds as string).split(',');
      const [topLat, leftLon] = topLeft.split(':').map(Number);
      const [bottomLat, rightLon] = bottomRight.split(':').map(Number);

      query = {
        geo_bounding_box: {
          geo_location: {
            top_left: { lat: topLat, lon: leftLon },
            bottom_right: { lat: bottomLat, lon: rightLon },
          },
        },
      };
    }

    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs, query);

    res.json({
      success: true,
      data: {
        clusters: (result.geo_grid?.buckets || []).map((b: any) => ({
          geohash: b.key,
          count: b.doc_count,
          centroid: b.centroid?.location || null,
          overdue_count: b.overdue?.doc_count || 0,
        })),
        zones: (result.zone_centroids?.buckets || []).map((b: any) => ({
          zone: b.key,
          count: b.count?.value || b.doc_count,
          centroid: b.centroid?.location || null,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching geo analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
