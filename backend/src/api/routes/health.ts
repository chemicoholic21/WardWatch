import { Router, Request, Response } from 'express';
import { getElasticsearchClient } from '../../config/elasticsearch.js';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const esClient = getElasticsearchClient();
    const esHealth = await esClient.cluster.health();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'healthy',
          uptime: process.uptime(),
        },
        elasticsearch: {
          status: esHealth.status,
          cluster_name: esHealth.cluster_name,
          number_of_nodes: esHealth.number_of_nodes,
          active_shards: esHealth.active_shards,
        },
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const esClient = getElasticsearchClient();

    const [clusterHealth, clusterStats, nodesInfo] = await Promise.all([
      esClient.cluster.health(),
      esClient.cluster.stats(),
      esClient.nodes.info(),
    ]);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      application: {
        name: 'GhostOffice API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime_seconds: process.uptime(),
        memory: process.memoryUsage(),
      },
      elasticsearch: {
        health: {
          status: clusterHealth.status,
          cluster_name: clusterHealth.cluster_name,
          number_of_nodes: clusterHealth.number_of_nodes,
          active_primary_shards: clusterHealth.active_primary_shards,
          active_shards: clusterHealth.active_shards,
          relocating_shards: clusterHealth.relocating_shards,
          initializing_shards: clusterHealth.initializing_shards,
          unassigned_shards: clusterHealth.unassigned_shards,
        },
        stats: {
          indices_count: clusterStats.indices?.count || 0,
          docs_count: clusterStats.indices?.docs?.count || 0,
          store_size: clusterStats.indices?.store?.size_in_bytes || 0,
        },
        nodes: Object.keys(nodesInfo.nodes || {}).length,
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Readiness check
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const esClient = getElasticsearchClient();
    await esClient.ping();

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.json({
    live: true,
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
  });
});

export default router;
