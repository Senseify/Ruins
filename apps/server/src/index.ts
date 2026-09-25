import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { ServerHealthResponse } from '@ruins/shared';
import { config } from './config';
import { authRoutes } from './modules/auth';
import { gameRoutes } from './modules/games';
import { realtimePlugin } from './realtime';

const server = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
  },
});

server.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

server.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB
  },
});

const startTime = Date.now();

// Health check endpoint
server.get<{ Reply: ServerHealthResponse }>('/health', async (_request, _reply) => {
  return {
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: '0.2.0',
  };
});

// Alias status endpoint
server.get<{ Reply: ServerHealthResponse }>('/api/status', async (_request, _reply) => {
  return {
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: '0.2.0',
  };
});

// Register Domain Modules & Realtime Plugin
server.register(authRoutes);
server.register(gameRoutes);
server.register(realtimePlugin);

export async function startServer() {
  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`[Ruins Server] Listening on http://${config.host}:${config.port}`);
    console.log(`[Ruins Server] WebSocket gateway active at ws://${config.host}:${config.port}/ws`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { server };
