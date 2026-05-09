import { Router, Request, Response } from 'express';
import { ghostOfficeDetector } from '../../services/ghost-office/detector.js';
import { esService } from '../../services/elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';

const router = Router();

// Get ghost office scores
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      department,
      zone,
      min_complaints,
      date_from,
      date_to,
      limit = '50',
    } = req.query;

    const result = await ghostOfficeDetector.calculateGhostScores({
      department: department as string,
      zone: zone as string,
      minComplaints: min_complaints ? parseInt(min_complaints as string, 10) : undefined,
      dateRange: date_from ? {
        gte: date_from as string,
        lte: date_to as string,
      } : undefined,
    });

    const limitNum = parseInt(limit as string, 10);
    const offices = result.offices.slice(0, limitNum);

    res.json({
      success: true,
      data: {
        offices,
        summary: result.summary,
        calculated_at: result.calculated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching ghost offices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top ghost offices (leaderboard)
router.get('/top', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '10', 10);
    const offices = await ghostOfficeDetector.getTopGhostOffices(limit);

    res.json({
      success: true,
      data: offices,
    });
  } catch (error: any) {
    console.error('Error fetching top ghost offices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ghost office heatmap data
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const heatmapData = await ghostOfficeDetector.getGhostOfficeHeatmap();

    res.json({
      success: true,
      data: heatmapData,
    });
  } catch (error: any) {
    console.error('Error fetching heatmap:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ghost office by ID
router.get('/:officeId', async (req: Request, res: Response) => {
  try {
    const office = await ghostOfficeDetector.getGhostOfficeById(req.params.officeId);

    if (!office) {
      return res.status(404).json({ success: false, error: 'Ghost office not found' });
    }

    // Get related complaints
    const [department, wardId] = req.params.officeId.split('_');
    const complaints = await esService.search(ES_INDICES.CIVIC_EVENTS, {
      bool: {
        filter: [
          { term: { department } },
          { term: { ward_id: wardId } },
        ],
      },
    }, {
      size: 20,
      sort: [{ created_at: 'desc' }] as any,
    });

    res.json({
      success: true,
      data: {
        ...office,
        recent_complaints: complaints.hits,
      },
    });
  } catch (error: any) {
    console.error('Error fetching ghost office:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get zone rankings
router.get('/rankings/zones', async (req: Request, res: Response) => {
  try {
    const result = await ghostOfficeDetector.calculateGhostScores();

    // Group by zone
    const zoneStats = new Map<string, {
      offices: number;
      total_score: number;
      critical: number;
      high: number;
    }>();

    for (const office of result.offices) {
      if (!zoneStats.has(office.zone)) {
        zoneStats.set(office.zone, {
          offices: 0,
          total_score: 0,
          critical: 0,
          high: 0,
        });
      }
      const zone = zoneStats.get(office.zone)!;
      zone.offices++;
      zone.total_score += office.ghost_score;
      if (office.alert_level === 'critical') zone.critical++;
      if (office.alert_level === 'high') zone.high++;
    }

    const rankings = Array.from(zoneStats.entries())
      .map(([zone, stats]) => ({
        zone,
        offices: stats.offices,
        avg_ghost_score: Math.round(stats.total_score / stats.offices * 100) / 100,
        critical_count: stats.critical,
        high_count: stats.high,
      }))
      .sort((a, b) => b.avg_ghost_score - a.avg_ghost_score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    res.json({
      success: true,
      data: rankings,
    });
  } catch (error: any) {
    console.error('Error fetching zone rankings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get department rankings
router.get('/rankings/departments', async (req: Request, res: Response) => {
  try {
    const result = await ghostOfficeDetector.calculateGhostScores();

    // Group by department
    const deptStats = new Map<string, {
      offices: number;
      total_score: number;
      critical: number;
      high: number;
    }>();

    for (const office of result.offices) {
      if (!deptStats.has(office.department)) {
        deptStats.set(office.department, {
          offices: 0,
          total_score: 0,
          critical: 0,
          high: 0,
        });
      }
      const dept = deptStats.get(office.department)!;
      dept.offices++;
      dept.total_score += office.ghost_score;
      if (office.alert_level === 'critical') dept.critical++;
      if (office.alert_level === 'high') dept.high++;
    }

    const rankings = Array.from(deptStats.entries())
      .map(([department, stats]) => ({
        department,
        offices: stats.offices,
        avg_ghost_score: Math.round(stats.total_score / stats.offices * 100) / 100,
        critical_count: stats.critical,
        high_count: stats.high,
      }))
      .sort((a, b) => b.avg_ghost_score - a.avg_ghost_score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    res.json({
      success: true,
      data: rankings,
    });
  } catch (error: any) {
    console.error('Error fetching department rankings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
