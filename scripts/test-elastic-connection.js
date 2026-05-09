#!/usr/bin/env node
/**
 * Test Elasticsearch Connection
 * Run: node scripts/test-elastic-connection.js
 */

import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

async function testConnection() {
  console.log('\n🔍 Testing Elasticsearch Connection...\n');

  // Check environment variables
  const cloudId = process.env.ES_CLOUD_ID;
  const apiKey = process.env.ES_API_KEY;
  const nodeUrl = process.env.ES_NODE;

  if (!cloudId && !nodeUrl) {
    console.error('❌ Error: Neither ES_CLOUD_ID nor ES_NODE is set');
    console.log('\nPlease set one of the following in backend/.env:');
    console.log('  ES_CLOUD_ID=your-cloud-id');
    console.log('  ES_NODE=https://your-cluster-url');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('❌ Error: ES_API_KEY is not set');
    console.log('\nPlease set ES_API_KEY in backend/.env');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Cloud ID: ${cloudId ? cloudId.substring(0, 30) + '...' : 'Not set'}`);
  console.log(`   API Key: ${apiKey ? apiKey.substring(0, 20) + '...' : 'Not set'}`);
  console.log(`   Node URL: ${nodeUrl || 'Using Cloud ID'}\n`);

  // Create client
  let client;
  try {
    if (cloudId && apiKey) {
      client = new Client({
        cloud: { id: cloudId },
        auth: { apiKey: apiKey },
      });
    } else {
      client = new Client({
        node: nodeUrl,
        auth: { apiKey: apiKey },
      });
    }
  } catch (err) {
    console.error('❌ Failed to create client:', err.message);
    process.exit(1);
  }

  // Test connection
  try {
    console.log('🔌 Connecting to Elasticsearch...');

    // Ping
    const ping = await client.ping();
    console.log('✅ Ping successful!\n');

    // Get cluster info
    const info = await client.info();
    console.log('📊 Cluster Information:');
    console.log(`   Name: ${info.cluster_name}`);
    console.log(`   UUID: ${info.cluster_uuid}`);
    console.log(`   Version: ${info.version.number}`);
    console.log(`   Lucene: ${info.version.lucene_version}\n`);

    // Get cluster health
    const health = await client.cluster.health();
    console.log('💚 Cluster Health:');
    console.log(`   Status: ${health.status}`);
    console.log(`   Nodes: ${health.number_of_nodes}`);
    console.log(`   Active Shards: ${health.active_shards}`);
    console.log(`   Indices: ${health.active_primary_shards}\n`);

    // List indices
    const indices = await client.cat.indices({ format: 'json' });
    console.log('📁 Existing Indices:');
    if (indices.length === 0) {
      console.log('   (No indices yet - run the setup script to create them)');
    } else {
      indices.forEach(idx => {
        console.log(`   - ${idx.index} (${idx['docs.count']} docs, ${idx['store.size']})`);
      });
    }

    console.log('\n✅ Connection test successful! Your Elasticsearch is ready.\n');
    console.log('Next steps:');
    console.log('  1. Run: npm run setup-indices (to create GhostOffice indices)');
    console.log('  2. Run: npm run seed (to load sample data)');
    console.log('  3. Run: npm run dev (to start the backend)\n');

  } catch (err) {
    console.error('\n❌ Connection failed:', err.message);

    if (err.message.includes('ENOTFOUND')) {
      console.log('\n💡 Tip: Check your ES_CLOUD_ID or ES_NODE URL');
    } else if (err.message.includes('401') || err.message.includes('403')) {
      console.log('\n💡 Tip: Check your ES_API_KEY - it may be invalid or expired');
    } else if (err.message.includes('certificate')) {
      console.log('\n💡 Tip: SSL certificate issue - ensure using https://');
    }

    process.exit(1);
  }
}

testConnection();
