import { Router, Request, Response } from 'express';
import { esService } from '../../services/elasticsearch/client.js';
import { ES_INDICES, ES_PIPELINES } from '../../config/elasticsearch.js';

const router = Router();

// Get all complaints with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      department,
      ward_id,
      zone,
      priority,
      is_overdue,
      date_from,
      date_to,
      page = '1',
      limit = '20',
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;

    const query: any = {
      bool: {
        must: [],
        filter: [],
      },
    };

    // Add filters
    if (status) query.bool.filter.push({ term: { status } });
    if (department) query.bool.filter.push({ term: { department } });
    if (ward_id) query.bool.filter.push({ term: { ward_id } });
    if (zone) query.bool.filter.push({ term: { zone } });
    if (priority) query.bool.filter.push({ term: { priority } });
    if (is_overdue === 'true') query.bool.filter.push({ term: { is_overdue: true } });

    // Date range
    if (date_from || date_to) {
      query.bool.filter.push({
        range: {
          created_at: {
            ...(date_from && { gte: date_from }),
            ...(date_to && { lte: date_to }),
          },
        },
      });
    }

    // Default query if no filters
    if (query.bool.must.length === 0 && query.bool.filter.length === 0) {
      query.bool.must.push({ match_all: {} });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const result = await esService.search(ES_INDICES.CIVIC_EVENTS, query, {
      size: limitNum,
      from: (pageNum - 1) * limitNum,
      sort: [{ [sort_by as string]: sort_order }] as any,
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
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get complaint by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const complaint = await esService.get(ES_INDICES.CIVIC_EVENTS, req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    res.json({ success: true, data: complaint });
  } catch (error: any) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new complaint
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      department,
      ward_id,
      category,
      source,
      citizen_id,
      geo_location,
      address,
      attachments,
    } = req.body;

    if (!title || !description || !department || !ward_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, department, ward_id',
      });
    }

    const complaint = {
      event_id: `CMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_type: 'complaint',
      title,
      description,
      department,
      ward_id,
      category: category || 'general',
      source: source || 'api',
      citizen_id: citizen_id || `CIT_${Math.random().toString(36).substr(2, 9)}`,
      status: 'open',
      priority: 'medium',
      geo_location,
      address,
      attachments: attachments || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      days_open: 0,
      is_overdue: false,
      escalation_count: 0,
      transfer_count: 0,
      timeline: [
        {
          timestamp: new Date().toISOString(),
          action: 'created',
          description: 'Complaint registered',
          actor: 'system',
        },
      ],
    };

    const id = await esService.index(ES_INDICES.CIVIC_EVENTS, complaint, {
      id: complaint.event_id,
      pipeline: ES_PIPELINES.CIVIC_EVENT,
    });

    res.status(201).json({ success: true, data: { ...complaint, _id: id } });
  } catch (error: any) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update complaint
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const complaint = await esService.get(ES_INDICES.CIVIC_EVENTS, req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const { status, priority, assigned_to, notes } = req.body;
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    const timelineEntry: any = {
      timestamp: new Date().toISOString(),
      actor: 'api',
    };

    if (status) {
      updates.status = status;
      timelineEntry.action = 'status_changed';
      timelineEntry.description = `Status changed to ${status}`;
    }
    if (priority) {
      updates.priority = priority;
    }
    if (assigned_to) {
      updates.assigned_to = assigned_to;
    }
    if (notes) {
      timelineEntry.notes = notes;
    }

    await esService.update(ES_INDICES.CIVIC_EVENTS, req.params.id, updates);

    res.json({ success: true, data: { id: req.params.id, ...updates } });
  } catch (error: any) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get complaint statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { department, zone, date_from } = req.query;

    const query: any = {
      bool: {
        must: [{ match_all: {} }],
        filter: [],
      },
    };

    if (department) query.bool.filter.push({ term: { department } });
    if (zone) query.bool.filter.push({ term: { zone } });
    if (date_from) {
      query.bool.filter.push({ range: { created_at: { gte: date_from } } });
    }

    const aggs = {
      by_status: { terms: { field: 'status' } },
      by_department: { terms: { field: 'department', size: 20 } },
      by_priority: { terms: { field: 'priority' } },
      by_zone: { terms: { field: 'zone', size: 10 } },
      overdue_count: { filter: { term: { is_overdue: true } } },
      avg_days_open: { avg: { field: 'days_open' } },
      daily_trend: {
        date_histogram: {
          field: 'created_at',
          calendar_interval: 'day',
        },
      },
    };

    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs, query);
    const total = await esService.count(ES_INDICES.CIVIC_EVENTS, query);

    res.json({
      success: true,
      data: {
        total,
        by_status: Object.fromEntries(
          (result.by_status?.buckets || []).map((b: any) => [b.key, b.doc_count])
        ),
        by_department: Object.fromEntries(
          (result.by_department?.buckets || []).map((b: any) => [b.key, b.doc_count])
        ),
        by_priority: Object.fromEntries(
          (result.by_priority?.buckets || []).map((b: any) => [b.key, b.doc_count])
        ),
        by_zone: Object.fromEntries(
          (result.by_zone?.buckets || []).map((b: any) => [b.key, b.doc_count])
        ),
        overdue_count: result.overdue_count?.doc_count || 0,
        avg_days_open: Math.round((result.avg_days_open?.value || 0) * 100) / 100,
        daily_trend: (result.daily_trend?.buckets || []).map((b: any) => ({
          date: b.key_as_string,
          count: b.doc_count,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
