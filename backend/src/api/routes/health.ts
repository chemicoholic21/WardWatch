import { Router, Request, Response } from 'express';
import { getDb, getMongoClient, COLLECTIONS } from '../../config/mongodb.js';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const ping = await db.command({ ping: 1 });

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'healthy',
          uptime: process.uptime(),
        },
        mongodb: {
          status: ping.ok === 1 ? 'green' : 'yellow',
          database: db.databaseName,
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

// Detailed health check — includes per-collection doc counts so we can
// quickly tell whether the database has been seeded.
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const client = getMongoClient();

    const [serverStatus, collectionCounts] = await Promise.all([
      db.command({ serverStatus: 1 }).catch(() => null),
      Promise.all(
        Object.values(COLLECTIONS).map(async name => ({
          name,
          count: await db.collection(name).estimatedDocumentCount().catch(() => 0),
        })),
      ),
    ]);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      application: {
        name: 'WardWatch API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime_seconds: process.uptime(),
        memory: process.memoryUsage(),
      },
      mongodb: {
        database: db.databaseName,
        connection: client ? 'connected' : 'disconnected',
        host: serverStatus?.host ?? null,
        version: serverStatus?.version ?? null,
        collections: collectionCounts,
        total_docs: collectionCounts.reduce((acc, c) => acc + (c.count ?? 0), 0),
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
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ ready: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Liveness check (no DB dependency)
router.get('/live', (req: Request, res: Response) => {
  res.json({
    live: true,
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
  });
});

export default router;
