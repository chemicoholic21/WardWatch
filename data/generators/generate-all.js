import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG, COMPLAINT_TITLES, LANDMARKS, ROAD_SUFFIXES, AREA_PREFIXES, BUILDERS, PROJECT_NAMES } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load seed data
const wardsData = JSON.parse(readFileSync(join(__dirname, '../seed/wards.json'), 'utf-8'));
const departmentsData = JSON.parse(readFileSync(join(__dirname, '../seed/departments.json'), 'utf-8'));
const scamPatternsData = JSON.parse(readFileSync(join(__dirname, '../seed/scam-patterns.json'), 'utf-8'));

const WARDS = wardsData.wards;
const DEPARTMENTS = departmentsData.departments;
const SCAM_TEMPLATES = scamPatternsData.scam_templates;

// Ensure output directory exists
const OUTPUT_DIR = join(__dirname, CONFIG.output_dir);
mkdirSync(OUTPUT_DIR, { recursive: true });

// Helper functions
function weightedRandom(items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomFromDistribution(distribution) {
  const items = Object.keys(distribution);
  const weights = Object.values(distribution);
  return weightedRandom(items, weights);
}

function generateRoad(wardName) {
  const suffix = faker.helpers.arrayElement(ROAD_SUFFIXES);
  return `${wardName} ${suffix}`;
}

function generateLandmark() {
  const prefix = faker.helpers.arrayElement(AREA_PREFIXES);
  const landmark = faker.helpers.arrayElement(LANDMARKS);
  return `${prefix} ${landmark}`;
}

function fillTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

function generateComplaintTitle(department, issueType, ward) {
  const templates = COMPLAINT_TITLES[department]?.[issueType];
  if (!templates) {
    return `${issueType.replace(/_/g, ' ')} issue in ${ward.name}`;
  }

  const template = faker.helpers.arrayElement(templates);
  const vars = {
    road: generateRoad(ward.name),
    landmark: generateLandmark(),
    area: ward.name,
    days: faker.number.int({ min: 2, max: 15 }),
    hours: faker.number.int({ min: 4, max: 48 }),
    amount: faker.number.int({ min: 1000, max: 50000 }),
    units: faker.number.int({ min: 100, max: 500 }),
    months: faker.number.int({ min: 3, max: 24 }),
    builder: faker.helpers.arrayElement(BUILDERS),
    project: faker.helpers.arrayElement(PROJECT_NAMES)
  };

  return fillTemplate(template, vars);
}

function generateEscalationPath(department, escalationCount, startDate) {
  const path = [];
  const deptInfo = DEPARTMENTS.find(d => d.code === department);
  let currentDate = new Date(startDate);

  for (let i = 0; i < escalationCount; i++) {
    const action = i === 0 ? 'received' : faker.helpers.arrayElement(['transferred', 'escalated', 'reviewed', 'assigned']);
    const durationHours = faker.number.float({ min: 2, max: 72, fractionDigits: 1 });

    path.push({
      step_id: `STEP${String(i + 1).padStart(3, '0')}`,
      department: department,
      timestamp: currentDate.toISOString(),
      action: action,
      officer_id: `OFF${faker.string.alphanumeric(6).toUpperCase()}`,
      notes: faker.lorem.sentence(),
      duration_hours: durationHours,
      status: i === escalationCount - 1 ? 'current' : 'completed'
    });

    currentDate = new Date(currentDate.getTime() + durationHours * 60 * 60 * 1000);
  }

  return path;
}

// Generate Complaints
function generateComplaints() {
  console.log(`Generating ${CONFIG.complaints} complaints...`);
  const complaints = [];

  for (let i = 0; i < CONFIG.complaints; i++) {
    const ward = faker.helpers.arrayElement(WARDS);
    const isGhostWard = CONFIG.ghost_wards.includes(ward.id);
    const dept = faker.helpers.arrayElement(DEPARTMENTS);
    const issue = faker.helpers.arrayElement(dept.issues);

    const statusDist = isGhostWard ? CONFIG.ghost_status_distribution : CONFIG.normal_status_distribution;
    const status = randomFromDistribution(statusDist);
    const priority = randomFromDistribution(CONFIG.priority_distribution);

    const createdAt = faker.date.recent({ days: CONFIG.date_range_days });
    const isResolved = ['resolved', 'closed'].includes(status);

    // Ghost wards have longer delays
    const baseDays = isGhostWard
      ? faker.number.int({ min: 14, max: 60 })
      : faker.number.int({ min: 1, max: 21 });

    const daysOpen = isResolved
      ? faker.number.int({ min: 1, max: baseDays })
      : baseDays;

    const escalationCount = isGhostWard
      ? faker.number.int({ min: 2, max: 6 })
      : faker.number.int({ min: 0, max: 2 });

    const resolvedAt = isResolved
      ? new Date(createdAt.getTime() + daysOpen * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const complaint = {
      event_id: `CE${String(i + 1).padStart(6, '0')}`,
      event_type: 'complaint',
      department: dept.code,
      department_code: dept.code,
      department_name: dept.name,
      ward_id: ward.id,
      ward_name: ward.name,
      ward_number: parseInt(ward.id.substring(1)),
      zone: ward.zone,
      issue_type: issue.type,
      issue_category: dept.code,
      title: generateComplaintTitle(dept.code, issue.type, ward),
      description: faker.lorem.paragraphs({ min: 1, max: 3 }),
      status: status,
      priority: priority,
      severity: issue.priority === 'critical' ? 5 : issue.priority === 'high' ? 4 : issue.priority === 'medium' ? 3 : 2,
      created_at: createdAt.toISOString(),
      updated_at: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
      resolved_at: resolvedAt,
      expected_resolution_date: new Date(createdAt.getTime() + issue.sla_days * 24 * 60 * 60 * 1000).toISOString(),
      days_open: daysOpen,
      is_overdue: daysOpen > issue.sla_days,
      geo_location: {
        lat: ward.lat + (Math.random() - 0.5) * 0.01,
        lon: ward.lon + (Math.random() - 0.5) * 0.01
      },
      address: `${faker.location.streetAddress()}, ${ward.name}, Bengaluru - ${faker.helpers.arrayElement(['560001', '560002', '560003', '560004', '560008', '560010', '560011', '560017', '560018', '560034', '560037', '560038', '560041', '560043', '560047', '560068', '560076', '560078', '560085', '560095', '560100'])}`,
      pincode: faker.helpers.arrayElement(['560001', '560002', '560003', '560004', '560008', '560010', '560011', '560017', '560018', '560034', '560037', '560038', '560041', '560043', '560047', '560068', '560076', '560078', '560085', '560095', '560100']),
      citizen_id: `CIT${faker.string.alphanumeric(8).toUpperCase()}`,
      citizen_name: faker.person.fullName(),
      citizen_type: weightedRandom(CONFIG.citizen_types, CONFIG.citizen_type_weights),
      risk_score: 0, // Will be calculated by ingest pipeline
      ghost_contribution_score: 0, // Will be calculated by ingest pipeline
      escalation_count: escalationCount,
      transfer_count: Math.max(0, escalationCount - 1),
      escalation_path: generateEscalationPath(dept.code, escalationCount, createdAt),
      tags: faker.helpers.arrayElements(['urgent', 'repeated', 'escalated', 'vip', 'senior_citizen', 'pwd'], { min: 0, max: 2 }),
      sentiment_score: faker.number.float({ min: -1, max: 0.5, fractionDigits: 2 }),
      is_suspicious_closure: false, // Will be calculated by ingest pipeline
      closure_quality_score: 100, // Will be calculated by ingest pipeline
      resolution_notes: isResolved ? faker.lorem.sentence() : null,
      source: faker.helpers.arrayElement(['web', 'mobile', 'call', 'email', 'walk-in', 'social_media']),
      source_reference: `REF${faker.string.alphanumeric(10).toUpperCase()}`
    };

    complaints.push(complaint);

    if ((i + 1) % 1000 === 0) {
      console.log(`  Generated ${i + 1} complaints...`);
    }
  }

  return complaints;
}

// Generate Scam Reports
function generateScamReports(outages = []) {
  console.log(`Generating ${CONFIG.scam_reports} scam reports...`);
  const scamReports = [];

  for (let i = 0; i < CONFIG.scam_reports; i++) {
    const ward = faker.helpers.arrayElement(WARDS);
    const scamTemplate = faker.helpers.arrayElement(SCAM_TEMPLATES);
    const template = faker.helpers.arrayElement(scamTemplate.templates);

    // Check for outage correlation
    const isOutageCorrelated = Math.random() < CONFIG.scam_outage_correlation_rate;
    let relatedOutageId = null;
    let reportedAt = faker.date.recent({ days: 30 });

    if (isOutageCorrelated && outages.length > 0) {
      const outage = faker.helpers.arrayElement(outages);
      relatedOutageId = outage.outage_id;
      // Scam reported within 24 hours of outage
      reportedAt = new Date(new Date(outage.start_time).getTime() + faker.number.int({ min: 1, max: 24 }) * 60 * 60 * 1000);
    }

    const content = fillTemplate(template, {
      amount: faker.number.int({ min: 500, max: 50000 }),
      consumer_id: `CON${faker.string.alphanumeric(10).toUpperCase()}`,
      property_id: `PID${faker.string.alphanumeric(8).toUpperCase()}`,
      url: faker.helpers.arrayElement([
        `bit.ly/${faker.string.alphanumeric(6)}`,
        `tinyurl.com/${faker.string.alphanumeric(7)}`,
        `bescom-pay.${faker.internet.domainName()}`,
        `bbmp-tax.${faker.internet.domainName()}`,
        `bwssb-kyc.${faker.internet.domainName()}`,
        `gov-refund.${faker.internet.domainName()}`
      ]),
      date: faker.date.soon({ days: 3 }).toLocaleDateString(),
      phone: `+91${faker.string.numeric(10)}`,
      department: scamTemplate.department || faker.helpers.arrayElement(['BESCOM', 'BBMP', 'BWSSB']),
      position: faker.helpers.arrayElement(['Clerk', 'Engineer', 'Inspector', 'Manager']),
      count: faker.number.int({ min: 50, max: 500 })
    });

    const scamReport = {
      report_id: `SR${String(i + 1).padStart(6, '0')}`,
      report_type: 'citizen_report',
      source_type: faker.helpers.arrayElement(['sms', 'whatsapp', 'email', 'call']),
      content: content,
      raw_content: content,
      url: content.match(/https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+/)?.[0] || null,
      sender_id: faker.helpers.arrayElement([
        `+91${faker.string.numeric(10)}`,
        `AD-${faker.string.alpha(6).toUpperCase()}`,
        faker.internet.email()
      ]),
      sender_type: faker.helpers.arrayElement(['unknown', 'suspected_scammer', 'bulk_sender']),
      reported_at: reportedAt.toISOString(),
      geo_location: {
        lat: ward.lat + (Math.random() - 0.5) * 0.01,
        lon: ward.lon + (Math.random() - 0.5) * 0.01
      },
      ward_id: ward.id,
      ward_name: ward.name,
      zone: ward.zone,
      scam_type: scamTemplate.type,
      scam_category: scamTemplate.category,
      spoofed_department: scamTemplate.department,
      // Scores will be calculated by ingest pipeline
      urgency_language_score: 0,
      financial_risk_score: 0,
      impersonation_score: 0,
      link_safety_score: 0,
      trust_score: 0,
      scam_probability: 0,
      risk_level: 'pending',
      related_outage_id: relatedOutageId,
      is_outage_correlated: isOutageCorrelated,
      outage_correlation_score: isOutageCorrelated ? faker.number.float({ min: 0.6, max: 0.95, fractionDigits: 2 }) : 0,
      verified_status: faker.helpers.arrayElement(['pending', 'verified_scam', 'verified_legitimate', 'inconclusive']),
      victim_reports: faker.number.int({ min: 0, max: 15 }),
      estimated_loss_inr: faker.number.int({ min: 0, max: 100000 }),
      reporter_id: `REP${faker.string.alphanumeric(8).toUpperCase()}`,
      reporter_type: faker.helpers.arrayElement(['citizen', 'police', 'bank', 'telecom']),
      tags: faker.helpers.arrayElements(['urgent', 'financial', 'impersonation', 'bulk', 'repeat_offender'], { min: 1, max: 3 })
    };

    scamReports.push(scamReport);
  }

  return scamReports;
}

// Generate Outages
function generateOutages() {
  console.log(`Generating ${CONFIG.outages} outages...`);
  const outages = [];

  const outageTypes = [
    { dept: 'BESCOM', type: 'power_outage', name: 'Power Outage' },
    { dept: 'BESCOM', type: 'transformer_failure', name: 'Transformer Failure' },
    { dept: 'BESCOM', type: 'cable_damage', name: 'Cable Damage' },
    { dept: 'BWSSB', type: 'water_disruption', name: 'Water Supply Disruption' },
    { dept: 'BWSSB', type: 'pipeline_burst', name: 'Pipeline Burst' }
  ];

  for (let i = 0; i < CONFIG.outages; i++) {
    const ward = faker.helpers.arrayElement(WARDS);
    const outageType = faker.helpers.arrayElement(outageTypes);
    const startTime = faker.date.recent({ days: 30 });
    const durationHours = faker.number.float({ min: 1, max: 48, fractionDigits: 1 });
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
    const isOngoing = endTime > new Date();

    outages.push({
      outage_id: `OUT${String(i + 1).padStart(5, '0')}`,
      department: outageType.dept,
      outage_type: outageType.type,
      outage_name: outageType.name,
      ward_id: ward.id,
      ward_name: ward.name,
      zone: ward.zone,
      affected_area: `${ward.name} and surrounding areas`,
      start_time: startTime.toISOString(),
      end_time: isOngoing ? null : endTime.toISOString(),
      duration_hours: isOngoing ? null : durationHours,
      status: isOngoing ? 'ongoing' : 'resolved',
      affected_consumers: faker.number.int({ min: 100, max: 10000 }),
      cause: faker.helpers.arrayElement(['maintenance', 'equipment_failure', 'weather', 'accident', 'overload', 'unknown']),
      geo_location: {
        lat: ward.lat,
        lon: ward.lon
      }
    });
  }

  return outages;
}

// Generate Escalation Traces
function generateEscalationTraces(complaints) {
  console.log(`Generating ${CONFIG.escalation_traces} escalation traces...`);
  const traces = [];

  // Select complaints with escalations
  const escalatedComplaints = complaints.filter(c => c.escalation_count > 0);
  const samplSize = Math.min(CONFIG.escalation_traces, escalatedComplaints.length);
  const selectedComplaints = faker.helpers.arrayElements(escalatedComplaints, samplSize);

  for (let i = 0; i < selectedComplaints.length; i++) {
    const complaint = selectedComplaints[i];
    const startTime = new Date(complaint.created_at);
    const endTime = complaint.resolved_at ? new Date(complaint.resolved_at) : new Date();
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

    // Generate spans from escalation path
    const spans = [];
    let hasCircularPath = false;
    let circularDepts = [];
    const deptVisits = {};

    for (let j = 0; j < complaint.escalation_path.length; j++) {
      const step = complaint.escalation_path[j];
      const dept = step.department;

      // Track department visits for circular detection
      deptVisits[dept] = (deptVisits[dept] || 0) + 1;
      if (deptVisits[dept] > 1) {
        hasCircularPath = true;
        if (!circularDepts.includes(dept)) {
          circularDepts.push(dept);
        }
      }

      spans.push({
        span_id: `SPAN${String(j + 1).padStart(4, '0')}`,
        parent_span_id: j > 0 ? `SPAN${String(j).padStart(4, '0')}` : null,
        sequence: j + 1,
        department: dept,
        department_name: DEPARTMENTS.find(d => d.code === dept)?.name || dept,
        ward_id: complaint.ward_id,
        action: step.action,
        action_description: `${step.action} - ${step.notes}`,
        start_time: step.timestamp,
        end_time: j < complaint.escalation_path.length - 1
          ? complaint.escalation_path[j + 1].timestamp
          : endTime.toISOString(),
        duration_hours: step.duration_hours,
        wait_time_hours: faker.number.float({ min: 0, max: step.duration_hours * 0.6, fractionDigits: 1 }),
        processing_time_hours: faker.number.float({ min: 0, max: step.duration_hours * 0.4, fractionDigits: 1 }),
        officer_id: step.officer_id,
        status: step.status,
        notes: step.notes,
        is_bottleneck: step.duration_hours > 24,
        bottleneck_reason: step.duration_hours > 24 ? faker.helpers.arrayElement(['resource_shortage', 'pending_approval', 'investigation', 'coordination']) : null
      });
    }

    // Find bottleneck
    const bottleneckSpan = spans.reduce((max, span) =>
      span.duration_hours > (max?.duration_hours || 0) ? span : max, null);

    const trace = {
      trace_id: `TR${String(i + 1).padStart(6, '0')}`,
      complaint_id: complaint.event_id,
      complaint_title: complaint.title,
      citizen_id: complaint.citizen_id,
      start_time: startTime.toISOString(),
      end_time: complaint.resolved_at || null,
      duration_hours: durationHours,
      duration_days: durationHours / 24,
      status: complaint.status,
      is_resolved: ['resolved', 'closed'].includes(complaint.status),
      resolution_type: complaint.status === 'resolved' ? 'completed' : complaint.status === 'closed' ? 'closed_without_action' : null,
      total_hops: spans.length,
      unique_departments: new Set(spans.map(s => s.department)).size,
      departments_involved: [...new Set(spans.map(s => s.department))],
      has_circular_path: hasCircularPath,
      circular_path_departments: circularDepts,
      circular_count: hasCircularPath ? Math.max(...Object.values(deptVisits)) : 0,
      is_dead_end: complaint.status === 'pending' && durationHours > 336, // > 14 days
      dead_end_department: complaint.status === 'pending' ? spans[spans.length - 1]?.department : null,
      dead_end_duration_hours: complaint.status === 'pending' ? spans[spans.length - 1]?.duration_hours : null,
      spans: spans,
      bottleneck_department: bottleneckSpan?.department,
      bottleneck_wait_hours: bottleneckSpan?.duration_hours,
      bottleneck_count: spans.filter(s => s.is_bottleneck).length,
      accountability_gaps: [],
      start_location: complaint.geo_location,
      recommendation_generated: false,
      complexity_score: (spans.length * 10 + (hasCircularPath ? 30 : 0) + (complaint.status === 'pending' ? 20 : 0)),
      efficiency_score: Math.max(0, 100 - (durationHours / 24 * 2) - (spans.length * 5)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    traces.push(trace);
  }

  return traces;
}

// Generate Ghost Office Scores
function generateGhostOffices(complaints) {
  console.log('Calculating ghost office scores...');
  const ghostOffices = [];

  // Group complaints by department + ward
  const officeGroups = {};
  for (const complaint of complaints) {
    const key = `${complaint.department}_${complaint.ward_id}`;
    if (!officeGroups[key]) {
      officeGroups[key] = [];
    }
    officeGroups[key].push(complaint);
  }

  let rank = 1;
  const officeScores = [];

  for (const [key, officeComplaints] of Object.entries(officeGroups)) {
    if (officeComplaints.length < 3) continue; // Skip offices with too few complaints

    const [department, wardId] = key.split('_');
    const ward = WARDS.find(w => w.id === wardId);
    const dept = DEPARTMENTS.find(d => d.code === department);

    if (!ward || !dept) continue;

    // Calculate metrics
    const total = officeComplaints.length;
    const open = officeComplaints.filter(c => c.status === 'open').length;
    const pending = officeComplaints.filter(c => c.status === 'pending').length;
    const inProgress = officeComplaints.filter(c => c.status === 'in_progress').length;
    const resolved = officeComplaints.filter(c => c.status === 'resolved').length;
    const closed = officeComplaints.filter(c => c.status === 'closed').length;
    const rejected = officeComplaints.filter(c => c.status === 'rejected').length;
    const transferred = officeComplaints.filter(c => c.status === 'transferred').length;
    const overdue = officeComplaints.filter(c => c.is_overdue).length;

    const stagnant = officeComplaints.filter(c =>
      ['open', 'pending', 'in_progress'].includes(c.status) && c.days_open > 14
    ).length;

    const escalationLoops = officeComplaints.filter(c => c.escalation_count >= 3).length;
    const suspiciousClosures = officeComplaints.filter(c => c.is_suspicious_closure).length;
    const highTransfers = officeComplaints.filter(c => c.transfer_count >= 2).length;

    const avgResolutionDays = officeComplaints.reduce((sum, c) => sum + c.days_open, 0) / total;

    // Calculate factor scores
    const stagnationRate = (stagnant / total) * 100;
    const escalationLoopFreq = (escalationLoops / total) * 100;
    const transferRatio = (highTransfers / total) * 100;
    const suspiciousClosureRate = (suspiciousClosures / Math.max(resolved + closed, 1)) * 100;
    const overduePercentage = (overdue / total) * 100;

    // Calculate ghost score (weighted combination)
    const ghostScore = Math.min(100,
      stagnationRate * 0.25 +
      escalationLoopFreq * 0.20 +
      transferRatio * 0.15 +
      Math.min(avgResolutionDays / 60 * 100, 100) * 0.15 +
      suspiciousClosureRate * 0.15 +
      (total < 10 ? 50 : 0) * 0.10
    );

    const ghostProbability = ghostScore / 100;
    const alertLevel = ghostScore >= 85 ? 'critical' : ghostScore >= 70 ? 'high' : ghostScore >= 50 ? 'medium' : 'low';

    // Other scores
    const accountabilityScore = Math.max(0, 100 - (stagnationRate + suspiciousClosureRate) / 2);
    const responsivenessScore = Math.max(0, 100 - avgResolutionDays * 2);
    const transparencyScore = Math.max(0, 100 - (escalationLoopFreq + transferRatio) / 2);
    const civicIntegrityIndex = (accountabilityScore + responsivenessScore + transparencyScore) / 3;

    officeScores.push({
      office_id: `${department}_${wardId}`,
      department,
      department_name: dept.name,
      ward_id: wardId,
      ward_name: ward.name,
      ward_number: parseInt(wardId.substring(1)),
      zone: ward.zone,
      geo_location: { lat: ward.lat, lon: ward.lon },
      ghost_score: Math.round(ghostScore * 100) / 100,
      ghost_probability: Math.round(ghostProbability * 1000) / 1000,
      alert_level: alertLevel,
      factors: {
        stagnation_rate: Math.round(stagnationRate * 100) / 100,
        escalation_loop_frequency: Math.round(escalationLoopFreq * 100) / 100,
        avg_resolution_days: Math.round(avgResolutionDays * 100) / 100,
        overdue_percentage: Math.round(overduePercentage * 100) / 100,
        transfer_ratio: Math.round(transferRatio * 100) / 100,
        circular_escalation_count: escalationLoops,
        suspicious_closure_rate: Math.round(suspiciousClosureRate * 100) / 100,
        inactivity_days: faker.number.int({ min: 0, max: 30 })
      },
      complaint_stats: {
        total, open, pending, in_progress: inProgress, closed, resolved, rejected, transferred, overdue
      },
      accountability_score: Math.round(accountabilityScore * 100) / 100,
      responsiveness_score: Math.round(responsivenessScore * 100) / 100,
      transparency_score: Math.round(transparencyScore * 100) / 100,
      civic_integrity_index: Math.round(civicIntegrityIndex * 100) / 100,
      risk_factors: [],
      trend_7d: faker.helpers.arrayElement(['improving', 'stable', 'declining']),
      trend_30d: faker.helpers.arrayElement(['improving', 'stable', 'declining']),
      last_activity_date: faker.date.recent({ days: 7 }).toISOString(),
      calculated_at: new Date().toISOString(),
      period_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      period_end: new Date().toISOString()
    });
  }

  // Sort by ghost score and assign ranks
  officeScores.sort((a, b) => b.ghost_score - a.ghost_score);
  officeScores.forEach((office, index) => {
    office.rank = index + 1;
    office.rank_change = faker.number.int({ min: -5, max: 5 });
  });

  return officeScores;
}

// Generate Ward Metrics
function generateWardMetrics(complaints, scamReports, ghostOffices) {
  console.log('Calculating ward metrics...');
  const wardMetrics = [];

  for (const ward of WARDS) {
    const wardComplaints = complaints.filter(c => c.ward_id === ward.id);
    const wardScams = scamReports.filter(s => s.ward_id === ward.id);
    const wardGhostOffices = ghostOffices.filter(g => g.ward_id === ward.id);

    const total = wardComplaints.length;
    const open = wardComplaints.filter(c => c.status === 'open').length;
    const pending = wardComplaints.filter(c => c.status === 'pending').length;
    const resolved = wardComplaints.filter(c => c.status === 'resolved').length;
    const closed = wardComplaints.filter(c => c.status === 'closed').length;
    const rejected = wardComplaints.filter(c => c.status === 'rejected').length;
    const overdue = wardComplaints.filter(c => c.is_overdue).length;

    const avgResolutionDays = total > 0
      ? wardComplaints.reduce((sum, c) => sum + c.days_open, 0) / total
      : 0;

    const escalationRate = total > 0
      ? wardComplaints.filter(c => c.escalation_count > 0).length / total * 100
      : 0;

    const verifiedScams = wardScams.filter(s => s.verified_status === 'verified_scam').length;

    // Calculate scores
    const civicHealthScore = Math.max(0, 100 - (overdue / Math.max(total, 1) * 50) - (avgResolutionDays * 1.5));
    const responsivenessIndex = Math.max(0, 100 - avgResolutionDays * 3);
    const safetyIndex = Math.max(0, 100 - (wardScams.length / 10 * 5));
    const fraudRiskScore = wardScams.length > 0
      ? wardScams.reduce((sum, s) => sum + (s.scam_probability || 0.5), 0) / wardScams.length * 100
      : 0;

    // Department breakdown
    const deptBreakdown = [];
    const deptGroups = {};
    for (const c of wardComplaints) {
      if (!deptGroups[c.department]) {
        deptGroups[c.department] = { total: 0, resolved: 0, days: 0 };
      }
      deptGroups[c.department].total++;
      if (['resolved', 'closed'].includes(c.status)) {
        deptGroups[c.department].resolved++;
      }
      deptGroups[c.department].days += c.days_open;
    }

    for (const [dept, stats] of Object.entries(deptGroups)) {
      const deptInfo = DEPARTMENTS.find(d => d.code === dept);
      const ghostOffice = wardGhostOffices.find(g => g.department === dept);
      deptBreakdown.push({
        department: dept,
        department_name: deptInfo?.name || dept,
        complaints: stats.total,
        open: wardComplaints.filter(c => c.department === dept && c.status === 'open').length,
        resolved: stats.resolved,
        resolution_rate: stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0,
        avg_days: stats.total > 0 ? stats.days / stats.total : 0,
        ghost_score: ghostOffice?.ghost_score || 0
      });
    }

    wardMetrics.push({
      metric_id: `WM_${ward.id}_${Date.now()}`,
      ward_id: ward.id,
      ward_name: ward.name,
      ward_number: parseInt(ward.id.substring(1)),
      zone: ward.zone,
      centroid: { lat: ward.lat, lon: ward.lon },
      population: ward.population,
      area_sqkm: ward.area_sqkm,
      population_density: ward.population / ward.area_sqkm,
      period: 'last_90_days',
      period_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      period_end: new Date().toISOString(),
      calculated_at: new Date().toISOString(),
      metrics: {
        total_complaints: total,
        open_complaints: open,
        pending_complaints: pending,
        resolved_complaints: resolved,
        closed_complaints: closed,
        rejected_complaints: rejected,
        overdue_complaints: overdue,
        new_complaints_7d: wardComplaints.filter(c =>
          new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        resolved_complaints_7d: wardComplaints.filter(c =>
          c.resolved_at && new Date(c.resolved_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        avg_resolution_days: Math.round(avgResolutionDays * 100) / 100,
        median_resolution_days: Math.round(avgResolutionDays * 0.8 * 100) / 100,
        escalation_rate: Math.round(escalationRate * 100) / 100,
        ghost_office_count: wardGhostOffices.filter(g => g.ghost_score > 70).length,
        total_scam_reports: wardScams.length,
        verified_scams: verifiedScams,
        complaints_per_1000_population: Math.round((total / ward.population * 1000) * 100) / 100
      },
      scores: {
        civic_health_score: Math.round(civicHealthScore * 100) / 100,
        responsiveness_index: Math.round(responsivenessIndex * 100) / 100,
        transparency_index: Math.round((100 - escalationRate) * 100) / 100,
        safety_index: Math.round(safetyIndex * 100) / 100,
        fraud_risk_score: Math.round(fraudRiskScore * 100) / 100,
        overall_score: Math.round((civicHealthScore + responsivenessIndex + safetyIndex) / 3 * 100) / 100
      },
      department_breakdown: deptBreakdown,
      trend: faker.helpers.arrayElement(['improving', 'stable', 'declining']),
      anomaly_detected: Math.random() < 0.1,
      anomaly_types: Math.random() < 0.1 ? [faker.helpers.arrayElement(['complaint_spike', 'resolution_drop', 'scam_increase'])] : [],
      alert_count: faker.number.int({ min: 0, max: 5 }),
      rank: 0 // Will be set after sorting
    });
  }

  // Assign ranks based on civic health score
  wardMetrics.sort((a, b) => b.scores.civic_health_score - a.scores.civic_health_score);
  wardMetrics.forEach((m, i) => {
    m.rank = i + 1;
    m.rank_change_7d = faker.number.int({ min: -10, max: 10 });
  });

  return wardMetrics;
}

// Main execution
async function main() {
  console.log('Starting GhostOffice synthetic data generation...\n');

  // Generate outages first (needed for scam correlation)
  const outages = generateOutages();
  writeFileSync(join(OUTPUT_DIR, 'outages.json'), JSON.stringify(outages, null, 2));
  console.log(`✓ Generated ${outages.length} outages\n`);

  // Generate complaints
  const complaints = generateComplaints();
  writeFileSync(join(OUTPUT_DIR, 'complaints.json'), JSON.stringify(complaints, null, 2));
  console.log(`✓ Generated ${complaints.length} complaints\n`);

  // Generate scam reports
  const scamReports = generateScamReports(outages);
  writeFileSync(join(OUTPUT_DIR, 'scam-reports.json'), JSON.stringify(scamReports, null, 2));
  console.log(`✓ Generated ${scamReports.length} scam reports\n`);

  // Generate escalation traces
  const traces = generateEscalationTraces(complaints);
  writeFileSync(join(OUTPUT_DIR, 'escalation-traces.json'), JSON.stringify(traces, null, 2));
  console.log(`✓ Generated ${traces.length} escalation traces\n`);

  // Generate ghost office scores
  const ghostOffices = generateGhostOffices(complaints);
  writeFileSync(join(OUTPUT_DIR, 'ghost-offices.json'), JSON.stringify(ghostOffices, null, 2));
  console.log(`✓ Generated ${ghostOffices.length} ghost office scores\n`);

  // Generate ward metrics
  const wardMetrics = generateWardMetrics(complaints, scamReports, ghostOffices);
  writeFileSync(join(OUTPUT_DIR, 'ward-metrics.json'), JSON.stringify(wardMetrics, null, 2));
  console.log(`✓ Generated ${wardMetrics.length} ward metrics\n`);

  // Summary
  console.log('='.repeat(50));
  console.log('Data Generation Complete!');
  console.log('='.repeat(50));
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`\nGenerated files:`);
  console.log(`  - complaints.json (${complaints.length} records)`);
  console.log(`  - scam-reports.json (${scamReports.length} records)`);
  console.log(`  - escalation-traces.json (${traces.length} records)`);
  console.log(`  - ghost-offices.json (${ghostOffices.length} records)`);
  console.log(`  - ward-metrics.json (${wardMetrics.length} records)`);
  console.log(`  - outages.json (${outages.length} records)`);
  console.log(`\nTotal records: ${complaints.length + scamReports.length + traces.length + ghostOffices.length + wardMetrics.length + outages.length}`);
}

main().catch(console.error);
