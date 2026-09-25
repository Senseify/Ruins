import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { ServerHealthResponse } from '@ruins/shared';
import { config } from './config';
import { authRoutes } from './modules/auth';
import { gameRoutes } from './modules/games';
import { socialRoutes } from './modules/social';
import { ugcRoutes } from './modules/ugc';
import { aiRoutes } from './modules/ai';
import { realtimePlugin } from './realtime';
import { db } from './db';

const server = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
  },
});

// Security Headers (Phase 17)
server.register(helmet, {
  contentSecurityPolicy: false, // Mobile API / WebSocket gateway
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Production Rate Limiting (Phase 10 & 17: Brute-force & DDoS mitigation)
server.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
  errorResponseBuilder: (_req, context) => ({
    statusCode: 429,
    error: 'TOO_MANY_REQUESTS',
    message: `Rate limit threshold exceeded. Retry after ${context.after}.`,
  }),
});

server.register(cors, {
  origin: config.isProduction ? config.corsOrigin : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

server.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB
  },
});

const startTime = Date.now();

server.after(() => {
  // 1. Comprehensive System Health Probe
  server.get<{ Reply: ServerHealthResponse }>('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.nodeEnv,
      database: config.isProduction ? 'postgresql_postgis' : 'memory_engine',
    };
  });

  // 2. Kubernetes / Cloud Liveness Probe
  server.get('/health/liveness', async (_request, _reply) => {
    return { status: 'alive' };
  });

  // 3. Kubernetes / Cloud Readiness Probe
  server.get('/health/readiness', async (_request, reply) => {
    if (config.isProduction && !config.hasDatabaseUrl) {
      return reply.status(503).send({ status: 'unready', reason: 'Missing DATABASE_URL' });
    }
    return { status: 'ready' };
  });

  // 4. API Status Alias
  server.get<{ Reply: ServerHealthResponse }>('/api/status', async (_request, _reply) => {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.nodeEnv,
      database: config.isProduction ? 'postgresql_postgis' : 'memory_engine',
    };
  });

  // Register Domain Modules & Realtime Subsystems
  server.register(authRoutes);
  server.register(gameRoutes);
  server.register(socialRoutes);
  server.register(ugcRoutes);
  server.register(aiRoutes);
  server.register(realtimePlugin);
});

// Graceful Process Termination (Phase 17)
const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const sig of shutdownSignals) {
  process.on(sig, async () => {
    server.log.info(`[Process] Received ${sig}, initiating graceful shutdown...`);
    try {
      await server.close();
      server.log.info('[Process] Fastify and WebSocket server closed cleanly.');
      process.exit(0);
    } catch (err) {
      server.log.error(err, '[Process] Error encountered during termination');
      process.exit(1);
    }
  });
}

export async function startServer() {
  try {
    // Fail fast on startup if production database is unreachable
    if (config.isProduction || process.env.USE_POSTGRES === 'true') {
      await db.verifyConnection();
      server.log.info('[Ruins Server] PostgreSQL connection verified successfully.');
    }
    await server.listen({ port: config.port, host: config.host });
    console.log(`[Ruins Server] Listening on http://${config.host}:${config.port}`);
    console.log(`[Ruins Server] WebSocket gateway active at ws://${config.host}:${config.port}/ws`);
  } catch (err) {
    server.log.error(err, '[Ruins Server] Fatal startup failure');
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { server };

