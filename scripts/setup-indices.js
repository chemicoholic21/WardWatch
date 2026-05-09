#!/usr/bin/env node
/**
 * Setup Elasticsearch Indices for GhostOffice
 * Run: node scripts/setup-indices.js
 */

import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../backend/.env') });

// Index definitions
const INDICES = [
  'civic-events',
  'ghost-offices',
  'scam-reports',
  'escalation-traces',
  'ward-metrics',
  'civic-vectors',
];

// Pipeline definitions
const PIPELINES = [
  'civic-event-pipeline',
  'geo-enrichment-pipeline',
  'scam-detection-pipeline',
];

async function setupIndices() {
  console.log('\n🚀 Setting up GhostOffice Elasticsearch Indices\n');

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

  // Test connection
  try {
    await client.ping();
    console.log('✅ Connected to Elasticsearch\n');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  // Create ingest pipelines
  console.log('📦 Creating Ingest Pipelines...\n');
  for (const pipeline of PIPELINES) {
    try {
      const pipelinePath = join(__dirname, `../infrastructure/elasticsearch/pipelines/${pipeline}.json`);
      const pipelineConfig = JSON.parse(readFileSync(pipelinePath, 'utf-8'));

      await client.ingest.putPipeline({
        id: pipeline,
        body: pipelineConfig,
      });
      console.log(`   ✅ ${pipeline}`);
    } catch (err) {
      console.log(`   ⚠️  ${pipeline}: ${err.message}`);
    }
  }

  // Create indices
  console.log('\n📁 Creating Indices...\n');
  for (const indexName of INDICES) {
    try {
      // Check if index exists
      const exists = await client.indices.exists({ index: indexName });

      if (exists) {
        console.log(`   ⏭️  ${indexName} (already exists)`);
        continue;
      }

      // Read index configuration
      const indexPath = join(__dirname, `../infrastructure/elasticsearch/indices/${indexName}.json`);
      const indexConfig = JSON.parse(readFileSync(indexPath, 'utf-8'));

      // Create the index
      await client.indices.create({
        index: indexName,
        body: indexConfig,
      });

      console.log(`   ✅ ${indexName}`);
    } catch (err) {
      console.log(`   ❌ ${indexName}: ${err.message}`);
    }
  }

  // Verify setup
  console.log('\n📊 Verifying Setup...\n');
  const indices = await client.cat.indices({ format: 'json' });
  const ghostOfficeIndices = indices.filter(idx =>
    INDICES.includes(idx.index)
  );

  console.log('   Created Indices:');
  ghostOfficeIndices.forEach(idx => {
    console.log(`   - ${idx.index} (health: ${idx.health})`);
  });

  const pipelines = await client.ingest.getPipeline();
  const ghostOfficePipelines = Object.keys(pipelines).filter(p =>
    PIPELINES.includes(p)
  );

  console.log('\n   Created Pipelines:');
  ghostOfficePipelines.forEach(p => {
    console.log(`   - ${p}`);
  });

  console.log('\n✅ Setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Run: npm run seed (to load sample data)');
  console.log('  2. Run: npm run dev (to start the backend)\n');
}

setupIndices().catch(console.error);
