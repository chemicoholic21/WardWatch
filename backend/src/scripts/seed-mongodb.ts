#!/usr/bin/env tsx
/**
 * Seed MongoDB with WardWatch sample data.
 *
 * Mirrors the original `scripts/seed-data.js` but targets MongoDB and
 * stores `geo_location` as both the original `{lat, lon}` shape (used
 * by the frontend) and a sibling `_geo` GeoJSON Point so MongoDB's
 * 2dsphere index can serve geo queries.
 *
 *   npm run seed
 */

import { getDb, COLLECTIONS, closeMongo } from '../config/mongodb.js';

// ---- reference data --------------------------------------------------

const WARDS = [
  { id: 'ward_001', name: 'Mahadevapura',    zone: 'East',  lat: 12.9698, lng: 77.6970 },
  { id: 'ward_002', name: 'Whitefield',      zone: 'East',  lat: 12.9698, lng: 77.7500 },
  { id: 'ward_003', name: 'HSR Layout',      zone: 'South', lat: 12.9116, lng: 77.6389 },
  { id: 'ward_004', name: 'Koramangala',     zone: 'South', lat: 12.9279, lng: 77.6271 },
  { id: 'ward_005', name: 'Indiranagar',     zone: 'East',  lat: 12.9784, lng: 77.6408 },
  { id: 'ward_006', name: 'Jayanagar',       zone: 'South', lat: 12.9250, lng: 77.5938 },
  { id: 'ward_007', name: 'Malleshwaram',    zone: 'West',  lat: 13.0035, lng: 77.5710 },
  { id: 'ward_008', name: 'Rajajinagar',     zone: 'West',  lat: 12.9910, lng: 77.5550 },
  { id: 'ward_009', name: 'Yelahanka',       zone: 'North', lat: 13.1007, lng: 77.5963 },
  { id: 'ward_010', name: 'Hebbal',          zone: 'North', lat: 13.0358, lng: 77.5970 },
  { id: 'ward_011', name: 'BTM Layout',      zone: 'South', lat: 12.9166, lng: 77.6101 },
  { id: 'ward_012', name: 'JP Nagar',        zone: 'South', lat: 12.9063, lng: 77.5857 },
  { id: 'ward_013', name: 'Banashankari',    zone: 'South', lat: 12.9255, lng: 77.5468 },
  { id: 'ward_014', name: 'Electronic City', zone: 'South', lat: 12.8399, lng: 77.6770 },
  { id: 'ward_015', name: 'KR Puram',        zone: 'East',  lat: 13.0072, lng: 77.6965 },
];

const DEPARTMENTS = ['BBMP', 'BWSSB', 'BESCOM', 'BDA', 'BMTC'];
const CATEGORIES  = ['Water Supply', 'Roads', 'Street Lights', 'Sanitation', 'Sewage', 'Property Tax', 'Building Permit'];
const STATUSES    = ['open', 'pending', 'in_progress', 'resolved', 'closed'];

// Wards seeded to look unresponsive — these get higher stagnation /
// escalation counts so Ghost Office detection has signal to find.
const GHOST_WARDS = new Set(['ward_001', 'ward_002', 'ward_003']);

// ---- helpers ---------------------------------------------------------

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const daysAgoISO = (max: number) => {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, max));
  return d.toISOString();
};

function geoPoint(lat: number, lon: number) {
  return {
    lat,
    lon,
    // Sibling field used by the 2dsphere index. The MongoService also
    // writes this automatically on .index() / .bulkIndex(), but for
    // direct seeds we set it explicitly so the index is usable from
    // the moment seeding completes.
    _geo: { type: 'Point', coordinates: [lon, lat] },
  };
}

// ---- generators ------------------------------------------------------

function generateComplaint(index: number) {
  const ward = pick(WARDS);
  const isGhost = GHOST_WARDS.has(ward.id);
  const department = pick(DEPARTMENTS);
  const category = pick(CATEGORIES);

  const status = isGhost
    ? (Math.random() < 0.7 ? pick(['open', 'pending']) : pick(STATUSES))
    : (Math.random() < 0.6 ? pick(['resolved', 'closed', 'in_progress']) : pick(STATUSES));

  const daysOpen = isGhost ? randInt(10, 60) : randInt(1, 25);
  const escalationCount = isGhost ? randInt(1, 5) : randInt(0, 2);
  const transferCount = isGhost ? randInt(0, 3) : randInt(0, 1);
  const lat = ward.lat + (Math.random() - 0.5) * 0.01;
  const lon = ward.lng + (Math.random() - 0.5) * 0.01;
  const geo = geoPoint(lat, lon);

  return {
    _id: `CMP-2024-${String(index).padStart(5, '0')}`,
    event_id: `CMP-2024-${String(index).padStart(5, '0')}`,
    event_type: 'complaint',
    title: `${category} issue in ${ward.name}`,
    description: `Civic complaint regarding ${category.toLowerCase()} problems in ${ward.name} area.`,
    category,
    department,
    ward_id: ward.id,
    ward_name: ward.name,
    zone: ward.zone,
    geo_location: { lat: geo.lat, lon: geo.lon },
    _geo: geo._geo,
    status,
    priority: pick(['low', 'medium', 'high', 'critical']),
    days_open: daysOpen,
    is_overdue: daysOpen > 14,
    escalation_count: escalationCount,
    transfer_count: transferCount,
    is_suspicious_closure: Math.random() < (isGhost ? 0.2 : 0.05),
    created_at: new Date(daysAgoISO(90)),
    updated_at: new Date(daysAgoISO(30)),
    citizen_id: `CIT_${randInt(1000, 9999)}`,
    timeline: [
      {
        timestamp: new Date(),
        action: 'created',
        description: 'Complaint registered (seed data)',
        actor: 'system',
      },
    ],
  };
}

function generateScamReport(index: number) {
  const ward = pick(WARDS);
  const department = pick(['BESCOM', 'BWSSB', 'BBMP']);
  const templates = [
    `${department} URGENT: Your connection will be disconnected in 2 hours. Pay Rs. ${randInt(500, 3000)} at bit.ly/pay-now`,
    `Dear Customer, ${department} bill overdue. Clear Rs. ${randInt(1000, 5000)} immediately via UPI: ${randInt(7000000000, 9999999999)}@paytm`,
    `ALERT: ${department} detected irregularity in your account. Call ${randInt(7000000000, 9999999999)} to avoid penalty`,
    `${department} Notice: 50% waiver on pending dues if paid today. Contact ${randInt(8000000000, 9999999999)}`,
  ];
  const riskLevel = pick(['critical', 'high', 'medium', 'low']);
  const trustScore =
    riskLevel === 'critical' ? randInt(5, 20) :
    riskLevel === 'high'     ? randInt(20, 40) :
    riskLevel === 'medium'   ? randInt(40, 60) :
                               randInt(60, 85);

  return {
    _id: `SCM-2024-${String(index).padStart(4, '0')}`,
    report_id: `SCM-2024-${String(index).padStart(4, '0')}`,
    content: pick(templates),
    source_type: pick(['sms', 'whatsapp', 'email', 'call']),
    spoofed_department: department,
    scam_type: pick(['phishing', 'impersonation', 'payment_fraud', 'data_theft']),
    risk_level: riskLevel,
    trust_score: trustScore,
    scam_probability: 1 - trustScore / 100,
    ward_id: ward.id,
    zone: ward.zone,
    reported_at: new Date(daysAgoISO(30)),
    victim_reports: riskLevel === 'critical' ? randInt(5, 30) : randInt(0, 10),
    is_outage_correlated: Math.random() < 0.3,
    related_outage: {
      is_correlated: Math.random() < 0.3,
      outage_id: `OUT_${randInt(1000, 9999)}`,
    },
    indicators: {
      urgency_language: Math.random() < 0.8,
      payment_request: Math.random() < 0.9,
      suspicious_url: Math.random() < 0.7,
      phone_number: Math.random() < 0.6,
    },
  };
}

function generateGhostOffice(ward: typeof WARDS[number], department: string) {
  const ghostScore = GHOST_WARDS.has(ward.id) ? randInt(70, 95) : randInt(20, 60);
  return {
    _id: `${department}_${ward.id}`,
    office_id: `${department}_${ward.id}`,
    department,
    ward_id: ward.id,
    ward_name: ward.name,
    zone: ward.zone,
    ghost_score: ghostScore,
    ghost_probability: ghostScore / 100,
    alert_level:
      ghostScore >= 85 ? 'critical' :
      ghostScore >= 70 ? 'high'     :
      ghostScore >= 50 ? 'medium'   : 'low',
    factors: {
      stagnation_rate: randInt(20, 80),
      escalation_loop_frequency: randInt(10, 60),
      avg_resolution_days: randInt(5, 45),
      overdue_percentage: randInt(15, 70),
      transfer_ratio: randInt(5, 40),
    },
    complaint_stats: {
      total: randInt(50, 300),
      open: randInt(20, 150),
      resolved: randInt(20, 150),
      overdue: randInt(10, 80),
    },
    calculated_at: new Date(),
    rank: 0,
  };
}

function generateWardMetric(ward: typeof WARDS[number]) {
  const geo = geoPoint(ward.lat, ward.lng);
  return {
    _id: ward.id,
    ward_id: ward.id,
    ward_name: ward.name,
    ward_number: parseInt(ward.id.replace('ward_', ''), 10),
    zone: ward.zone,
    centroid: { lat: ward.lat, lon: ward.lng },
    _geo: geo._geo,
    updated_at: new Date(),
  };
}

// ---- main ------------------------------------------------------------

async function seed() {
  console.log('\n🌱 Seeding WardWatch (MongoDB)\n');
  const db = await getDb();

  try {
    await db.command({ ping: 1 });
    console.log(`✅ Connected to MongoDB: ${db.databaseName}\n`);
  } catch (err: any) {
    console.error('❌ Could not connect to MongoDB:', err.message);
    process.exit(1);
  }

  // Wipe + reseed so the script is idempotent during dev.
  for (const name of Object.values(COLLECTIONS)) {
    await db.collection(name).deleteMany({});
  }
  console.log('🧹 Cleared existing collections\n');

  // We use string IDs (e.g. "CMP-2024-00001") for human-readable
  // references; cast to any so the driver's default ObjectId typing
  // doesn't fight us.
  const ins = (name: string, docs: any[]) =>
    db.collection(name).insertMany(docs as any, { ordered: false });

  // Complaints
  console.log('📝 Generating 5000 complaints...');
  const complaints = Array.from({ length: 5000 }, (_, i) => generateComplaint(i + 1));
  await ins(COLLECTIONS.CIVIC_EVENTS, complaints);
  console.log(`   ✅ Inserted ${complaints.length} complaints`);

  // Scam reports
  console.log('🚨 Generating 500 scam reports...');
  const scams = Array.from({ length: 500 }, (_, i) => generateScamReport(i + 1));
  await ins(COLLECTIONS.SCAM_REPORTS, scams);
  console.log(`   ✅ Inserted ${scams.length} scam reports`);

  // Ghost offices (cross product of wards × top 3 departments)
  console.log('👻 Generating ghost office scores...');
  const ghostOffices = [];
  for (const ward of WARDS) {
    for (const dept of DEPARTMENTS.slice(0, 3)) {
      ghostOffices.push(generateGhostOffice(ward, dept));
    }
  }
  ghostOffices.sort((a, b) => b.ghost_score - a.ghost_score);
  ghostOffices.forEach((o, i) => { o.rank = i + 1; });
  await ins(COLLECTIONS.GHOST_OFFICES, ghostOffices);
  console.log(`   ✅ Inserted ${ghostOffices.length} ghost office scores`);

  // Ward metrics
  console.log('🗺️  Generating ward metrics...');
  const wardMetrics = WARDS.map(generateWardMetric);
  await ins(COLLECTIONS.WARD_METRICS, wardMetrics);
  console.log(`   ✅ Inserted ${wardMetrics.length} ward metrics`);

  // Indexes — created idempotently. The 2dsphere index makes
  // geo_distance / bounding box queries fast even at scale.
  console.log('\n🔧 Creating indexes...');
  await Promise.all([
    db.collection(COLLECTIONS.CIVIC_EVENTS).createIndex({ _geo: '2dsphere' }),
    db.collection(COLLECTIONS.CIVIC_EVENTS).createIndex({ status: 1 }),
    db.collection(COLLECTIONS.CIVIC_EVENTS).createIndex({ department: 1 }),
    db.collection(COLLECTIONS.CIVIC_EVENTS).createIndex({ ward_id: 1 }),
    db.collection(COLLECTIONS.CIVIC_EVENTS).createIndex({ zone: 1 }),
    db.collection(COLLECTIONS.CIVIC_EVENTS).createIndex({ created_at: -1 }),
    db.collection(COLLECTIONS.CIVIC_EVENTS).createIndex({
      title: 'text', description: 'text', category: 'text',
    }),
    db.collection(COLLECTIONS.SCAM_REPORTS).createIndex({ reported_at: -1 }),
    db.collection(COLLECTIONS.SCAM_REPORTS).createIndex({ risk_level: 1 }),
    db.collection(COLLECTIONS.WARD_METRICS).createIndex({ _geo: '2dsphere' }),
  ]);
  console.log('   ✅ Indexes created');

  // Summary
  const counts = await Promise.all(
    Object.entries(COLLECTIONS).map(async ([key, name]) => [
      key,
      await db.collection(name).estimatedDocumentCount(),
    ]),
  );

  console.log('\n📊 Document counts:');
  for (const [name, count] of counts) console.log(`   - ${name}: ${count}`);
  console.log(
    `\n🏆 Top ghost office: ${ghostOffices[0].department} ${ghostOffices[0].ward_name} (score ${ghostOffices[0].ghost_score})`,
  );

  console.log('\n✅ Seeding complete!\n');
  console.log('Next steps:');
  console.log('  1. npm run dev  (start backend)');
  console.log('  2. Open Mongo Express: http://localhost:8081  (if using docker-compose)\n');
}

seed()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
