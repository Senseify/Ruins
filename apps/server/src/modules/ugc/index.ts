import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, UserRecord } from '../../db';
import { requireAuth } from '../auth';
import { calculateHaversineDistance } from '../../utils/geo';
import { GameMode, UGCGameConfig } from '@ruins/shared';

export async function ugcRoutes(server: FastifyInstance) {
  // 1. Create Draft UGC Game
  server.post<{
    Body: {
      title: string;
      description?: string;
      mode?: GameMode;
      boundaryLat: number;
      boundaryLng: number;
      boundaryRadiusMeters?: number;
      durationMinutes?: number;
      maxPlayers?: number;
      objectives: Array<{
        code: string;
        title: string;
        latitude: number;
        longitude: number;
        captureRadiusMeters?: number;
        points?: number;
      }>;
    };
  }>('/api/ugc/games', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const {
      title,
      description = '',
      mode = 'CONVERGENCE',
      boundaryLat,
      boundaryLng,
      boundaryRadiusMeters = 400,
      durationMinutes = 15,
      maxPlayers = 8,
      objectives = [],
    } = request.body || {};

    if (!title || title.trim().length < 3) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Operation title required' });
    }
    if (boundaryLat === undefined || boundaryLng === undefined) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Boundary coordinates required' });
    }
    if (boundaryRadiusMeters < 50 || boundaryRadiusMeters > 3000) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Perimeter radius must be 50m - 3000m' });
    }
    if (durationMinutes < 5 || durationMinutes > 60) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Mission duration must be 5 - 60 minutes' });
    }
    if (objectives.length === 0) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: At least 1 physical objective required' });
    }

    // Safety validation: Ensure all objective points fall strictly within the boundary radius
    for (const obj of objectives) {
      const dist = calculateHaversineDistance(
        { latitude: boundaryLat, longitude: boundaryLng },
        { latitude: obj.latitude, longitude: obj.longitude }
      );
      if (dist > boundaryRadiusMeters) {
        return reply.status(400).send({
          error: `SAFETY_ERROR: Objective [${obj.code}] is located outside the configured perimeter boundary`,
          distanceMeters: dist,
          boundaryRadiusMeters,
        });
      }
    }

    const created = await db.createUGCGame({
      creatorId: user.id,
      title: title.trim(),
      description: description.trim(),
      mode,
      boundaryLat,
      boundaryLng,
      boundaryRadiusMeters,
      durationMinutes,
      maxPlayers,
      objectives: objectives.map((o, idx) => ({
        code: o.code || `OBJ 0${idx + 1}`,
        title: o.title || `OBJECTIVE 0${idx + 1}`,
        latitude: o.latitude,
        longitude: o.longitude,
        captureRadiusMeters: o.captureRadiusMeters || 20,
        points: o.points || 100,
      })),
      status: 'DRAFT',
    });

    return { status: 'ok', ugcGame: created };
  });

  // 2. Publish UGC Game
  server.post<{
    Params: { id: string };
  }>('/api/ugc/games/:id/publish', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { id } = request.params;

    const game = await db.getUGCGame(id);
    if (!game) return reply.status(404).send({ error: 'UGC Game not found' });
    if (game.creatorId !== user.id) {
      return reply.status(403).send({ error: 'FORBIDDEN: Only creator may publish operation' });
    }

    const published = await db.publishUGCGame(id, user.id);
    return { status: 'ok', ugcGame: published };
  });

  // 3. Report UGC Game (Moderation)
  server.post<{
    Params: { id: string };
  }>('/api/ugc/games/:id/report', async (request, reply) => {
    const { id } = request.params;
    await db.reportUGCGame(id);
    return { status: 'ok', message: 'Report received and queued for safety audit' };
  });

  // 4. Discovery Feed: Featured & Community Operations
  server.get<{
    Querystring: {
      q?: string;
      mode?: GameMode;
      lat?: string;
      lng?: string;
      radius?: string;
    };
  }>('/api/discovery/featured', async (request, _reply) => {
    const { q, mode, lat, lng, radius } = request.query;

    const publishedUGC = await db.listUGCGames('PUBLISHED');
    let filtered = publishedUGC;

    if (q) {
      const norm = q.toLowerCase();
      filtered = filtered.filter(
        (g) => g.title.toLowerCase().includes(norm) || g.description.toLowerCase().includes(norm)
      );
    }
    if (mode) {
      filtered = filtered.filter((g) => g.mode === mode);
    }
    if (lat && lng) {
      const centerLat = Number(lat);
      const centerLng = Number(lng);
      const maxDist = radius ? Number(radius) : 25000;
      filtered = filtered.filter((g) => {
        const dist = calculateHaversineDistance(
          { latitude: centerLat, longitude: centerLng },
          { latitude: g.boundaryLat, longitude: g.boundaryLng }
        );
        return dist <= maxDist;
      });
    }

    return {
      status: 'ok',
      featured: filtered.slice(0, 10),
    };
  });
}
