import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.js';
import { getElasticsearchClient } from './config/elasticsearch.js';

// Import routes
import complaintsRouter from './api/routes/complaints.js';
import ghostOfficesRouter from './api/routes/ghost-offices.js';
import trustlensRouter from './api/routes/trustlens.js';
import analyticsRouter from './api/routes/analytics.js';
import searchRouter from './api/routes/search.js';
import agentsRouter from './api/routes/agents.js';
import actionsRouter from './api/routes/actions.js';
import wardsRouter from './api/routes/wards.js';
import healthRouter from './api/routes/health.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...config.security.corsOrigins],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.security.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Health check (no rate limit)
app.use('/health', healthRouter);

// API routes
app.use('/api/complaints', complaintsRouter);
app.use('/api/ghost-offices', ghostOfficesRouter);
app.use('/api/trustlens', trustlensRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/search', searchRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/wards', wardsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'GhostOffice API',
    version: '1.0.0',
    description: 'Elastic-Powered Civic Observability & Accountability Intelligence Platform',
    endpoints: {
      health: '/health',
      complaints: '/api/complaints',
      ghostOffices: '/api/ghost-offices',
      trustlens: '/api/trustlens',
      analytics: '/api/analytics',
      search: '/api/search',
      agents: '/api/agents',
      actions: '/api/actions',
      wards: '/api/wards',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  let esConnected = false;
  let esVersion = 'N/A';

  // Try to connect to Elasticsearch (optional)
  try {
    const esClient = getElasticsearchClient();
    const esInfo = await esClient.info();
    esConnected = true;
    esVersion = esInfo.version.number;
    console.log(`✓ Connected to Elasticsearch: ${esInfo.name} (${esVersion})`);
  } catch (error: any) {
    console.warn(`⚠ Elasticsearch not available: ${error.message}`);
    console.warn('  Server will start but ES-dependent endpoints will fail.');
    console.warn('  TrustLens /analyze endpoint will still work for scam detection.');
  }

  app.listen(config.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏛️  GhostOffice API Server                                  ║
║   Civic Observability & Accountability Intelligence Platform ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   🌐 Server:     http://localhost:${config.port}                    ║
║   📊 Mode:       ${config.nodeEnv.padEnd(11)}                            ║
║   🔍 Elastic:    ${esConnected ? 'Connected (' + esVersion + ')' : 'Not Connected (limited mode)'}${esConnected ? ''.padEnd(Math.max(0, 16 - esVersion.length)) : ''}║
║   🤖 Bedrock:    ${config.features.enableBedrock ? 'Enabled ' : 'Disabled'}                                   ║
║                                                               ║
║   📋 Endpoints:                                               ║
║      • /api/complaints      - Civic complaints                ║
║      • /api/ghost-offices   - Ghost office detection          ║
║      • /api/trustlens       - Scam/fraud detection            ║
║      • /api/analytics       - Analytics & insights            ║
║      • /api/agents          - OpenClaw agents                 ║
║      • /api/actions         - Actionable outputs              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer();
