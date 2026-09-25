import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ServerHealthResponse } from '@ruins/shared';

const server = Fastify({
  logger: true,
});

server.register(cors, {
  origin: true,
});

const startTime = Date.now();

// Health check endpoint
server.get<{ Reply: ServerHealthResponse }>('/health', async (_request, _reply) => {
  return {
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  };
});

// Alias status endpoint
server.get<{ Reply: ServerHealthResponse }>('/api/status', async (_request, _reply) => {
  return {
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  };
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

export async function startServer() {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`[Ruins Server] Listening on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { server };
