#!/usr/bin/env node
/**
 * Seed Elasticsearch with GhostOffice sample data
 * Run: node scripts/seed-data.js
 */

import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../backend/.env') });

// Bengaluru wards data
const WARDS = [
  { id: 'ward_001', name: 'Mahadevapura', zone: 'East', lat: 12.9698, lng: 77.6970 },
  { id: 'ward_002', name: 'Whitefield', zone: 'East', lat: 12.9698, lng: 77.7500 },
  { id: 'ward_003', name: 'HSR Layout', zone: 'South', lat: 12.9116, lng: 77.6389 },
  { id: 'ward_004', name: 'Koramangala', zone: 'South', lat: 12.9279, lng: 77.6271 },
  { id: 'ward_005', name: 'Indiranagar', zone: 'East', lat: 12.9784, lng: 77.6408 },
  { id: 'ward_006', name: 'Jayanagar', zone: 'South', lat: 12.9250, lng: 77.5938 },
  { id: 'ward_007', name: 'Malleshwaram', zone: 'West', lat: 13.0035, lng: 77.5710 },
  { id: 'ward_008', name: 'Rajajinagar', zone: 'West', lat: 12.9910, lng: 77.5550 },
  { id: 'ward_009', name: 'Yelahanka', zone: 'North', lat: 13.1007, lng: 77.5963 },
  { id: 'ward_010', name: 'Hebbal', zone: 'North', lat: 13.0358, lng: 77.5970 },
  { id: 'ward_011', name: 'BTM Layout', zone: 'South', lat: 12.9166, lng: 77.6101 },
  { id: 'ward_012', name: 'JP Nagar', zone: 'South', lat: 12.9063, lng: 77.5857 },
  { id: 'ward_013', name: 'Banashankari', zone: 'South', lat: 12.9255, lng: 77.5468 },
  { id: 'ward_014', name: 'Electronic City', zone: 'South', lat: 12.8399, lng: 77.6770 },
  { id: 'ward_015', name: 'KR Puram', zone: 'East', lat: 13.0072, lng: 77.6965 },
];

const DEPARTMENTS = ['BBMP', 'BWSSB', 'BESCOM', 'BDA', 'BMTC'];
const CATEGORIES = ['Water Supply', 'Roads', 'Street Lights', 'Sanitation', 'Sewage', 'Property Tax', 'Building Permit'];
const STATUSES = ['open', 'pending', 'in_progress', 'resolved', 'closed'];

// Ghost wards - these will have higher stagnation
const GHOST_WARDS = ['ward_001', 'ward_002', 'ward_003'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysBack));
  return date.toISOString();
}

function generateComplaint(index) {
  const ward = randomElement(WARDS);
  const isGhostWard = GHOST_WARDS.includes(ward.id);
  const department = randomElement(DEPARTMENTS);
  const category = randomElement(CATEGORIES);

  // Ghost wards have more stagnant complaints
  let status;
  if (isGhostWard) {
    status = Math.random() < 0.7 ? randomElement(['open', 'pending']) : randomElement(STATUSES);
  } else {
    status = Math.random() < 0.6 ? randomElement(['resolved', 'closed', 'in_progress']) : randomElement(STATUSES);
  }

  const daysOpen = isGhostWard ? randomInt(10, 60) : randomInt(1, 25);
  const escalationCount = isGhostWard ? randomInt(1, 5) : randomInt(0, 2);
  const transferCount = isGhostWard ? randomInt(0, 3) : randomInt(0, 1);

  return {
    event_id: `CMP-2024-${String(index).padStart(5, '0')}`,
    event_type: 'complaint',
    title: `${category} issue in ${ward.name}`,
    description: `Civic complaint regarding ${category.toLowerCase()} problems in ${ward.name} area.`,
    category,
    department,
    ward_id: ward.id,
    ward_name: ward.name,
    zone: ward.zone,
    geo_location: {
      lat: ward.lat + (Math.random() - 0.5) * 0.01,
      lon: ward.lng + (Math.random() - 0.5) * 0.01,
    },
    status,
    priority: randomElement(['low', 'medium', 'high', 'critical']),
    days_open: daysOpen,
    is_overdue: daysOpen > 14,
    escalation_count: escalationCount,
    transfer_count: transferCount,
    created_at: randomDate(90),
    updated_at: randomDate(30),
    citizen_id: `CIT_${randomInt(1000, 9999)}`,
  };
}

function generateScamReport(index) {
  const ward = randomElement(WARDS);
  const department = randomElement(['BESCOM', 'BWSSB', 'BBMP']);

  const scamTemplates = [
    `${department} URGENT: Your connection will be disconnected in 2 hours. Pay Rs. ${randomInt(500, 3000)} at bit.ly/pay-now`,
    `Dear Customer, ${department} bill overdue. Clear Rs. ${randomInt(1000, 5000)} immediately via UPI: ${randomInt(7000000000, 9999999999)}@paytm`,
    `ALERT: ${department} detected irregularity in your account. Call ${randomInt(7000000000, 9999999999)} to avoid penalty`,
    `${department} Notice: 50% waiver on pending dues if paid today. Contact ${randomInt(8000000000, 9999999999)}`,
  ];

  const riskLevel = randomElement(['critical', 'high', 'medium', 'low']);
  const trustScore = riskLevel === 'critical' ? randomInt(5, 20) :
                     riskLevel === 'high' ? randomInt(20, 40) :
                     riskLevel === 'medium' ? randomInt(40, 60) : randomInt(60, 85);

  return {
    report_id: `SCM-2024-${String(index).padStart(4, '0')}`,
    content: randomElement(scamTemplates),
    source_type: randomElement(['sms', 'whatsapp', 'email', 'call']),
    spoofed_department: department,
    scam_type: randomElement(['phishing', 'impersonation', 'payment_fraud', 'data_theft']),
    risk_level: riskLevel,
    trust_score: trustScore,
    scam_probability: 1 - (trustScore / 100),
    ward_id: ward.id,
    zone: ward.zone,
    reported_at: randomDate(30),
    victim_reports: riskLevel === 'critical' ? randomInt(5, 30) : randomInt(0, 10),
    related_outage: {
      is_correlated: Math.random() < 0.3,
      outage_id: `OUT_${randomInt(1000, 9999)}`,
    },
    indicators: {
      urgency_language: Math.random() < 0.8,
      payment_request: Math.random() < 0.9,
      suspicious_url: Math.random() < 0.7,
      phone_number: Math.random() < 0.6,
    },
  };
}

function generateGhostOffice(ward, department) {
  const ghostScore = GHOST_WARDS.includes(ward.id)
    ? randomInt(70, 95)
    : randomInt(20, 60);

  return {
    office_id: `${department}_${ward.id}`,
    department,
    ward_id: ward.id,
    ward_name: ward.name,
    zone: ward.zone,
    ghost_score: ghostScore,
    ghost_probability: ghostScore / 100,
    alert_level: ghostScore >= 85 ? 'critical' :
                 ghostScore >= 70 ? 'high' :
                 ghostScore >= 50 ? 'medium' : 'low',
    factors: {
      stagnation_rate: randomInt(20, 80),
      escalation_loop_frequency: randomInt(10, 60),
      avg_resolution_days: randomInt(5, 45),
      overdue_percentage: randomInt(15, 70),
      transfer_ratio: randomInt(5, 40),
    },
    complaint_stats: {
      total: randomInt(50, 300),
      open: randomInt(20, 150),
      resolved: randomInt(20, 150),
      overdue: randomInt(10, 80),
    },
    calculated_at: new Date().toISOString(),
    rank: 0,
  };
}

async function seedData() {
  console.log('\n🌱 Seeding GhostOffice with sample data\n');

  const cloudId = process.env.ES_CLOUD_ID;
  const apiKey = process.env.ES_API_KEY;

  if (!cloudId || !apiKey) {
    console.error('❌ Missing ES_CLOUD_ID or ES_API_KEY');
    process.exit(1);
  }

  const client = new Client({
    cloud: { id: cloudId },
    auth: { apiKey: apiKey },
  });

  try {
    await client.ping();
    console.log('✅ Connected to Elasticsearch\n');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  // Generate complaints
  console.log('📝 Generating complaints...');
  const complaints = [];
  for (let i = 1; i <= 5000; i++) {
    complaints.push(generateComplaint(i));
  }

  // Bulk index complaints
  console.log('   Indexing 5000 complaints...');
  const complaintOps = complaints.flatMap(doc => [
    { index: { _index: 'civic-events', _id: doc.event_id } },
    doc,
  ]);

  let bulkResponse = await client.bulk({ operations: complaintOps, refresh: true });
  console.log(`   ✅ Indexed ${complaints.length} complaints (errors: ${bulkResponse.errors ? 'yes' : 'no'})\n`);

  // Generate scam reports
  console.log('🚨 Generating scam reports...');
  const scamReports = [];
  for (let i = 1; i <= 500; i++) {
    scamReports.push(generateScamReport(i));
  }

  console.log('   Indexing 500 scam reports...');
  const scamOps = scamReports.flatMap(doc => [
    { index: { _index: 'scam-reports', _id: doc.report_id } },
    doc,
  ]);

  bulkResponse = await client.bulk({ operations: scamOps, refresh: true });
  console.log(`   ✅ Indexed ${scamReports.length} scam reports\n`);

  // Generate ghost offices
  console.log('👻 Generating ghost office scores...');
  const ghostOffices = [];
  for (const ward of WARDS) {
    for (const dept of DEPARTMENTS.slice(0, 3)) { // BBMP, BWSSB, BESCOM
      ghostOffices.push(generateGhostOffice(ward, dept));
    }
  }

  // Sort and assign ranks
  ghostOffices.sort((a, b) => b.ghost_score - a.ghost_score);
  ghostOffices.forEach((office, i) => {
    office.rank = i + 1;
  });

  console.log('   Indexing ghost office scores...');
  const ghostOps = ghostOffices.flatMap(doc => [
    { index: { _index: 'ghost-offices', _id: doc.office_id } },
    doc,
  ]);

  bulkResponse = await client.bulk({ operations: ghostOps, refresh: true });
  console.log(`   ✅ Indexed ${ghostOffices.length} ghost office scores\n`);

  // Summary
  console.log('📊 Seeding Summary:');
  console.log(`   - Complaints: 5,000`);
  console.log(`   - Scam Reports: 500`);
  console.log(`   - Ghost Offices: ${ghostOffices.length}`);
  console.log(`   - Top Ghost Office: ${ghostOffices[0].department} ${ghostOffices[0].ward_name} (Score: ${ghostOffices[0].ghost_score})`);

  // Verify
  const counts = await Promise.all([
    client.count({ index: 'civic-events' }),
    client.count({ index: 'scam-reports' }),
    client.count({ index: 'ghost-offices' }),
  ]);

  console.log('\n📁 Index Document Counts:');
  console.log(`   - civic-events: ${counts[0].count}`);
  console.log(`   - scam-reports: ${counts[1].count}`);
  console.log(`   - ghost-offices: ${counts[2].count}`);

  console.log('\n✅ Seeding complete!\n');
  console.log('Next steps:');
  console.log('  1. Run: npm run dev (to start the backend)');
  console.log('  2. Open Kibana to explore the data\n');
}

seedData().catch(console.error);
