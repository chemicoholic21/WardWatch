import { Router, Request, Response } from 'express';
import { esService } from '../../services/elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';
import { ghostOfficeDetector } from '../../services/ghost-office/detector.js';

const router = Router();

// Generate RTI application
router.post('/rti/generate', async (req: Request, res: Response) => {
  try {
    const {
      complaint_id,
      ghost_office_id,
      custom_query,
      requester_name = '[YOUR NAME]',
      requester_address = '[YOUR ADDRESS]',
      requester_phone = '[YOUR PHONE]',
    } = req.body;

    let subject = '';
    let department = '';
    let details = '';
    let evidencePoints: string[] = [];

    if (complaint_id) {
      // Generate RTI for specific complaint
      const complaint = await esService.get<any>(ES_INDICES.CIVIC_EVENTS, complaint_id);
      if (!complaint) {
        return res.status(404).json({ success: false, error: 'Complaint not found' });
      }

      subject = `Request for Information regarding complaint ${complaint_id}`;
      department = complaint.department;
      details = `
1. Current status of complaint ID: ${complaint_id} filed on ${complaint.created_at?.split('T')[0]}
2. Name and designation of officer(s) assigned to this complaint
3. Copies of all file notings and internal communications
4. Reason for delay (complaint pending for ${complaint.days_open} days)
5. Timeline for resolution and action taken report
6. Details of any escalations and their outcomes
      `.trim();

      evidencePoints = [
        `Original complaint dated ${complaint.created_at?.split('T')[0]}`,
        `Category: ${complaint.category}`,
        `Days open: ${complaint.days_open}`,
        `Escalation count: ${complaint.escalation_count}`,
      ];
    } else if (ghost_office_id) {
      // Generate RTI for ghost office investigation
      const office = await ghostOfficeDetector.getGhostOfficeById(ghost_office_id);
      if (!office) {
        return res.status(404).json({ success: false, error: 'Ghost office not found' });
      }

      subject = `Request for Information regarding ${office.department} office performance in ${office.ward_name}`;
      department = office.department;
      details = `
1. Total number of complaints received by ${office.department} office in ${office.ward_name} in last 6 months
2. Number of complaints resolved, pending, and overdue
3. Average resolution time and comparison with department SLA
4. Reasons for ${Math.round(office.factors.overdue_percentage)}% overdue complaints
5. Names of officers responsible and action taken for delays
6. Measures being implemented to improve response times
      `.trim();

      evidencePoints = [
        `Ghost Score: ${office.ghost_score}/100`,
        `Overdue Rate: ${office.factors.overdue_percentage}%`,
        `Stagnation Rate: ${office.factors.stagnation_rate}%`,
        `Total complaints: ${office.complaint_stats.total}`,
      ];
    } else if (custom_query) {
      subject = custom_query.subject || 'Request for Civic Information';
      department = custom_query.department || '[DEPARTMENT]';
      details = custom_query.details || '[SPECIFY YOUR INFORMATION REQUEST]';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either complaint_id, ghost_office_id, or custom_query is required',
      });
    }

    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const rtiApplication = {
      type: 'RTI_APPLICATION',
      reference_id: complaint_id || ghost_office_id || `RTI_${Date.now()}`,
      generated_at: new Date().toISOString(),
      format: 'text',
      content: `
═══════════════════════════════════════════════════════════════════════════════
                    RIGHT TO INFORMATION APPLICATION
                  Under Section 6(1) of RTI Act, 2005
═══════════════════════════════════════════════════════════════════════════════

Date: ${today}

To,
The Public Information Officer,
${department},
Government of Karnataka,
Bengaluru - 560001

Subject: ${subject}

Respected Sir/Madam,

I, ${requester_name}, a citizen of India, resident of ${requester_address}, hereby submit this application under the Right to Information Act, 2005, seeking the following information:

INFORMATION REQUESTED:
─────────────────────
${details}

SUPPORTING EVIDENCE:
───────────────────
${evidencePoints.length > 0 ? evidencePoints.map((p, i) => `${i + 1}. ${p}`).join('\n') : 'N/A'}

I am ready to pay the requisite fee of Rs. 10/- as applicable under the RTI Act. Please provide the information within 30 days as stipulated under Section 7(1) of the Act.

I declare that:
1. I am a citizen of India
2. The information is being sought for lawful purposes
3. The information does not relate to any third party

Contact Details:
- Name: ${requester_name}
- Address: ${requester_address}
- Phone: ${requester_phone}

Thanking you,

Yours faithfully,

[Signature]
${requester_name}

Enclosures:
1. Application fee - Rs. 10/- (IPO/DD/Court Fee Stamp)
2. Copy of ID proof (Aadhaar/Voter ID)

═══════════════════════════════════════════════════════════════════════════════
Generated by GhostOffice Platform | https://ghostoffice.civic.in
For assistance, visit: https://rtionline.gov.in
═══════════════════════════════════════════════════════════════════════════════
      `.trim(),
      metadata: {
        department,
        subject,
        evidence_points: evidencePoints,
        fee_required: 10,
        response_deadline_days: 30,
      },
    };

    res.json({
      success: true,
      data: rtiApplication,
    });
  } catch (error: any) {
    console.error('Error generating RTI:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate escalation letter
router.post('/escalation/generate', async (req: Request, res: Response) => {
  try {
    const {
      complaint_id,
      escalation_level = 'department_head',
      additional_context = '',
    } = req.body;

    if (!complaint_id) {
      return res.status(400).json({
        success: false,
        error: 'complaint_id is required',
      });
    }

    const complaint = await esService.get<any>(ES_INDICES.CIVIC_EVENTS, complaint_id);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const escalationTargets: Record<string, { title: string; office: string }> = {
      department_head: {
        title: 'Commissioner',
        office: `${complaint.department} Head Office`,
      },
      mayor: {
        title: "Hon'ble Mayor",
        office: 'BBMP Office, Bengaluru',
      },
      mla: {
        title: "Hon'ble MLA",
        office: `${complaint.ward_name} Constituency`,
      },
      lokayukta: {
        title: 'Karnataka Lokayukta',
        office: 'Lokayukta Bhavan, Bengaluru',
      },
    };

    const target = escalationTargets[escalation_level] || escalationTargets.department_head;
    const today = new Date().toLocaleDateString('en-IN');

    const escalationLetter = {
      type: 'ESCALATION_LETTER',
      complaint_id,
      escalation_level,
      generated_at: new Date().toISOString(),
      content: `
═══════════════════════════════════════════════════════════════════════════════
                         ESCALATION LETTER
═══════════════════════════════════════════════════════════════════════════════

Date: ${today}

To,
${target.title},
${target.office}

Subject: Escalation of Unresolved Complaint - ${complaint_id}

Respected Sir/Madam,

I am writing to escalate complaint ${complaint_id}, which has remained unresolved for ${complaint.days_open} days despite multiple follow-ups.

COMPLAINT DETAILS:
─────────────────
- Complaint ID: ${complaint_id}
- Filed On: ${complaint.created_at?.split('T')[0]}
- Department: ${complaint.department}
- Ward: ${complaint.ward_name}
- Category: ${complaint.category}
- Current Status: ${complaint.status}
- Days Pending: ${complaint.days_open}
- Previous Escalations: ${complaint.escalation_count || 0}

ISSUE SUMMARY:
─────────────
${complaint.description}

REASON FOR ESCALATION:
─────────────────────
The complaint has been pending for ${complaint.days_open} days, exceeding the standard SLA of 7 days. Despite ${complaint.escalation_count || 0} previous escalation(s), no satisfactory resolution has been provided.

${additional_context ? `\nADDITIONAL CONTEXT:\n${additional_context}\n` : ''}

REQUESTED ACTION:
────────────────
1. Immediate attention to resolve this complaint
2. Written explanation for the delay
3. Action against officials responsible for negligence
4. Compensation for inconvenience caused (if applicable)

I request your urgent intervention to ensure resolution within 7 days.

Thanking you,

[CITIZEN NAME]
[CONTACT DETAILS]

CC:
- Chief Secretary, Government of Karnataka
- Bengaluru Development Minister
- Local Corporator

═══════════════════════════════════════════════════════════════════════════════
Generated by GhostOffice Platform
═══════════════════════════════════════════════════════════════════════════════
      `.trim(),
      metadata: {
        target,
        complaint_summary: {
          id: complaint_id,
          days_open: complaint.days_open,
          department: complaint.department,
          status: complaint.status,
        },
      },
    };

    res.json({
      success: true,
      data: escalationLetter,
    });
  } catch (error: any) {
    console.error('Error generating escalation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate citizen report card
router.post('/report-card/generate', async (req: Request, res: Response) => {
  try {
    const { zone, department, date_from = 'now-30d' } = req.body;

    const query: any = {
      bool: {
        must: [{ range: { created_at: { gte: date_from } } }],
        filter: [],
      },
    };

    if (zone) query.bool.filter.push({ term: { zone } });
    if (department) query.bool.filter.push({ term: { department } });

    const aggs = {
      total: { value_count: { field: 'event_id' } },
      resolved: { filter: { terms: { status: ['resolved', 'closed'] } } },
      overdue: { filter: { term: { is_overdue: true } } },
      avg_days: { avg: { field: 'days_open' } },
      by_category: { terms: { field: 'category', size: 10 } },
      by_priority: { terms: { field: 'priority' } },
      escalated: { filter: { range: { escalation_count: { gte: 2 } } } },
    };

    const result = await esService.aggregate(ES_INDICES.CIVIC_EVENTS, aggs, query);

    const total = result.total?.value || 0;
    const resolved = result.resolved?.doc_count || 0;
    const overdue = result.overdue?.doc_count || 0;
    const avgDays = result.avg_days?.value || 0;
    const escalated = result.escalated?.doc_count || 0;

    // Calculate grades
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
    const overdueRate = total > 0 ? (overdue / total) * 100 : 0;
    const overallScore = Math.max(0, Math.min(100,
      resolutionRate * 0.4 +
      (100 - overdueRate) * 0.3 +
      Math.max(0, (15 - avgDays) / 15 * 100) * 0.3
    ));

    const getGrade = (score: number) =>
      score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';

    const reportCard = {
      type: 'CITIZEN_REPORT_CARD',
      generated_at: new Date().toISOString(),
      period: date_from,
      scope: {
        zone: zone || 'All Zones',
        department: department || 'All Departments',
      },
      metrics: {
        total_complaints: total,
        resolved: resolved,
        pending: total - resolved,
        overdue: overdue,
        avg_resolution_days: Math.round(avgDays * 100) / 100,
        escalation_rate: total > 0 ? Math.round((escalated / total) * 10000) / 100 : 0,
      },
      scores: {
        overall: Math.round(overallScore * 100) / 100,
        grade: getGrade(overallScore),
        resolution_rate: Math.round(resolutionRate * 100) / 100,
        timeliness: Math.round((100 - overdueRate) * 100) / 100,
        speed: Math.round(Math.max(0, (15 - avgDays) / 15 * 100) * 100) / 100,
      },
      top_categories: (result.by_category?.buckets || []).map((b: any) => ({
        category: b.key,
        count: b.doc_count,
      })),
      recommendations: generateRecommendations(overallScore, resolutionRate, overdueRate, avgDays),
    };

    res.json({
      success: true,
      data: reportCard,
    });
  } catch (error: any) {
    console.error('Error generating report card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate social media post
router.post('/social/generate', async (req: Request, res: Response) => {
  try {
    const { complaint_id, ghost_office_id, platform = 'twitter' } = req.body;

    let content = '';
    let hashtags = ['#BengaluruCitizen', '#CivicRights', '#GhostOffice'];

    if (complaint_id) {
      const complaint = await esService.get<any>(ES_INDICES.CIVIC_EVENTS, complaint_id);
      if (!complaint) {
        return res.status(404).json({ success: false, error: 'Complaint not found' });
      }

      hashtags.push(`#${complaint.department.replace(/\s+/g, '')}`);

      content = platform === 'twitter'
        ? `⚠️ Complaint ${complaint_id} pending for ${complaint.days_open} days with @${complaint.department}!\n\n📍 ${complaint.ward_name}\n📋 ${complaint.category}\n⏳ Status: ${complaint.status}\n\nDear @ABORINGDYSTOPIA, please act! ${hashtags.join(' ')}`
        : `🚨 ATTENTION @${complaint.department}\n\nComplaint ID: ${complaint_id}\nPending: ${complaint.days_open} days\nWard: ${complaint.ward_name}\nCategory: ${complaint.category}\n\nCitizens deserve better! When will this be resolved?\n\n${hashtags.join(' ')}`;
    } else if (ghost_office_id) {
      const office = await ghostOfficeDetector.getGhostOfficeById(ghost_office_id);
      if (!office) {
        return res.status(404).json({ success: false, error: 'Ghost office not found' });
      }

      hashtags.push(`#${office.department.replace(/\s+/g, '')}`);

      content = platform === 'twitter'
        ? `👻 GHOST OFFICE ALERT!\n\n${office.department} in ${office.ward_name} has a Ghost Score of ${office.ghost_score}/100\n\n📊 ${office.factors.overdue_percentage}% complaints overdue\n🔄 ${office.factors.stagnation_rate}% stagnation rate\n\n@CMofKarnataka please investigate! ${hashtags.join(' ')}`
        : `👻 Is anyone working at ${office.department} ${office.ward_name}?\n\nOur analysis shows:\n- Ghost Score: ${office.ghost_score}/100 (Alert Level: ${office.alert_level})\n- Overdue: ${office.factors.overdue_percentage}%\n- Avg Resolution: ${office.factors.avg_resolution_days} days\n\nCitizens are suffering! ${hashtags.join(' ')}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either complaint_id or ghost_office_id is required',
      });
    }

    res.json({
      success: true,
      data: {
        platform,
        content,
        character_count: content.length,
        hashtags,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating social post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function
function generateRecommendations(overall: number, resolution: number, overdue: number, avgDays: number): string[] {
  const recommendations: string[] = [];

  if (resolution < 50) {
    recommendations.push('Critical: Resolution rate below 50%. Consider filing RTI to understand bottlenecks.');
  }
  if (overdue > 30) {
    recommendations.push('High overdue rate. Escalate pending complaints to department heads.');
  }
  if (avgDays > 14) {
    recommendations.push('Average resolution time exceeds 2 weeks. File formal complaint with Lokayukta.');
  }
  if (overall < 40) {
    recommendations.push('Overall civic health poor. Consider organizing community awareness campaigns.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Performance within acceptable range. Continue monitoring.');
  }

  return recommendations;
}

export default router;
