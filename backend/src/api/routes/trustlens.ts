import { Router, Request, Response } from 'express';
import { trustLensAnalyzer } from '../../services/trustlens/analyzer.js';
import { esService } from '../../services/elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';

const router = Router();

// Analyze content for scam indicators (real-time)
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { content, url, store = false, source_type, ward_id } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    let result;
    if (store) {
      result = await trustLensAnalyzer.storeReport(content, source_type || 'api', url, ward_id);
    } else {
      result = await trustLensAnalyzer.analyzeContent(content, url);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error analyzing content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get scam reports
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const {
      risk_level,
      scam_type,
      department,
      date_from,
      date_to,
      page = '1',
      limit = '20',
    } = req.query;

    const query: any = {
      bool: {
        must: [{ match_all: {} }],
        filter: [],
      },
    };

    if (risk_level) query.bool.filter.push({ term: { risk_level } });
    if (scam_type) query.bool.filter.push({ term: { scam_type } });
    if (department) query.bool.filter.push({ term: { spoofed_department: department } });
    if (date_from || date_to) {
      query.bool.filter.push({
        range: {
          reported_at: {
            ...(date_from && { gte: date_from }),
            ...(date_to && { lte: date_to }),
          },
        },
      });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const result = await esService.search(ES_INDICES.SCAM_REPORTS, query, {
      size: limitNum,
      from: (pageNum - 1) * limitNum,
      sort: [{ reported_at: 'desc' }] as any,
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
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get scam report by ID
router.get('/reports/:id', async (req: Request, res: Response) => {
  try {
    const report = await esService.get(ES_INDICES.SCAM_REPORTS, req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get scam statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { zone, date_from } = req.query;

    const stats = await trustLensAnalyzer.getScamStatistics({
      zone: zone as string,
      dateRange: date_from ? { gte: date_from as string } : undefined,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get outage-correlated scams
router.get('/outage-correlation', async (req: Request, res: Response) => {
  try {
    const { hours = '24' } = req.query;

    // Find recent outages
    const outages = await esService.search(ES_INDICES.CIVIC_EVENTS, {
      bool: {
        must: [
          { term: { event_type: 'outage' } },
          { range: { created_at: { gte: `now-${hours}h` } } },
        ],
      },
    }, { size: 50 });

    // Find scam reports that correlate with outages
    const correlatedScams = await esService.search(ES_INDICES.SCAM_REPORTS, {
      bool: {
        must: [
          { term: { 'related_outage.is_correlated': true } },
          { range: { reported_at: { gte: `now-${hours}h` } } },
        ],
      },
    }, { size: 100 });

    // Group by department
    const correlationByDept: Record<string, {
      outages: number;
      scams: number;
      spike_detected: boolean;
    }> = {};

    for (const outage of outages.hits) {
      const dept = (outage as any).department;
      if (!correlationByDept[dept]) {
        correlationByDept[dept] = { outages: 0, scams: 0, spike_detected: false };
      }
      correlationByDept[dept].outages++;
    }

    for (const scam of correlatedScams.hits) {
      const dept = (scam as any).spoofed_department;
      if (dept && correlationByDept[dept]) {
        correlationByDept[dept].scams++;
        if (correlationByDept[dept].scams > correlationByDept[dept].outages * 2) {
          correlationByDept[dept].spike_detected = true;
        }
      }
    }

    res.json({
      success: true,
      data: {
        time_window_hours: parseInt(hours as string, 10),
        total_outages: outages.total,
        total_correlated_scams: correlatedScams.total,
        by_department: correlationByDept,
        alert: Object.values(correlationByDept).some(d => d.spike_detected)
          ? 'SCAM_SPIKE_DETECTED'
          : 'NORMAL',
      },
    });
  } catch (error: any) {
    console.error('Error fetching correlation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Report victim (increment count)
router.post('/reports/:id/victim', async (req: Request, res: Response) => {
  try {
    const report = await esService.get<any>(ES_INDICES.SCAM_REPORTS, req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    await esService.update(ES_INDICES.SCAM_REPORTS, req.params.id, {
      victim_reports: (report.victim_reports || 0) + 1,
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: { victim_reports: (report.victim_reports || 0) + 1 },
    });
  } catch (error: any) {
    console.error('Error updating victim count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify/mark report status
router.patch('/reports/:id/verify', async (req: Request, res: Response) => {
  try {
    const { status, verified_by, notes } = req.body;

    if (!['verified_scam', 'verified_safe', 'pending', 'under_review'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: verified_scam, verified_safe, pending, or under_review',
      });
    }

    await esService.update(ES_INDICES.SCAM_REPORTS, req.params.id, {
      verified_status: status,
      verified_by,
      verification_notes: notes,
      verified_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: { status, verified_at: new Date().toISOString() },
    });
  } catch (error: any) {
    console.error('Error verifying report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
