import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, UserRecord } from '../../db';
import { requireAuth } from '../auth';
import { calculateHaversineDistance } from '../../utils/geo';
import { GameMode, UGCGameConfig } from '@ruins/shared';

export const VALID_GAME_MODES: GameMode[] = [
  'CONVERGENCE',
  'HUNT',
  'EXTRACTION',
  'TERRITORY',
  'RELAY',
];

export interface UGCValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUGCGamePayload(body: any): UGCValidationResult {
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
  } = body || {};

  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 64) {
    return { valid: false, error: 'VALIDATION_ERROR: Operation title must be between 3 and 64 characters' };
  }

  if (typeof description !== 'string' || description.length > 500) {
    return { valid: false, error: 'VALIDATION_ERROR: Description exceeds maximum 500 characters' };
  }

  if (!VALID_GAME_MODES.includes(mode)) {
    return { valid: false, error: `VALIDATION_ERROR: Invalid game mode '${mode}'. Allowed: ${VALID_GAME_MODES.join(', ')}` };
  }

  if (
    typeof boundaryLat !== 'number' ||
    !Number.isFinite(boundaryLat) ||
    boundaryLat < -90 ||
    boundaryLat > 90 ||
    typeof boundaryLng !== 'number' ||
    !Number.isFinite(boundaryLng) ||
    boundaryLng < -180 ||
    boundaryLng > 180
  ) {
    return { valid: false, error: 'VALIDATION_ERROR: Boundary coordinates must be valid finite latitude [-90, 90] and longitude [-180, 180]' };
  }

  if (typeof boundaryRadiusMeters !== 'number' || !Number.isFinite(boundaryRadiusMeters) || boundaryRadiusMeters < 50 || boundaryRadiusMeters > 3000) {
    return { valid: false, error: 'VALIDATION_ERROR: Perimeter radius must be between 50m and 3000m' };
  }

  if (typeof durationMinutes !== 'number' || !Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 60) {
    return { valid: false, error: 'VALIDATION_ERROR: Mission duration must be between 5 and 60 minutes' };
  }

  if (typeof maxPlayers !== 'number' || !Number.isFinite(maxPlayers) || maxPlayers < 2 || maxPlayers > 32) {
    return { valid: false, error: 'VALIDATION_ERROR: Player limit must be between 2 and 32 operatives' };
  }

  if (!Array.isArray(objectives) || objectives.length === 0 || objectives.length > 20) {
    return { valid: false, error: 'VALIDATION_ERROR: Objective count must be between 1 and 20' };
  }

  const seenCodes = new Set<string>();

  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    if (!obj || typeof obj !== 'object') {
      return { valid: false, error: `VALIDATION_ERROR: Objective at index ${i} is malformed` };
    }

    if (
      typeof obj.latitude !== 'number' ||
      !Number.isFinite(obj.latitude) ||
      obj.latitude < -90 ||
      obj.latitude > 90 ||
      typeof obj.longitude !== 'number' ||
      !Number.isFinite(obj.longitude) ||
      obj.longitude < -180 ||
      obj.longitude > 180
    ) {
      return { valid: false, error: `VALIDATION_ERROR: Objective at index ${i} has invalid coordinates` };
    }

    const code = (obj.code || `OBJ 0${i + 1}`).trim().toUpperCase();
    if (code.length > 16) {
      return { valid: false, error: `VALIDATION_ERROR: Objective code [${code}] exceeds 16 characters` };
    }
    if (seenCodes.has(code)) {
      return { valid: false, error: `VALIDATION_ERROR: Duplicate objective code detected: [${code}]` };
    }
    seenCodes.add(code);

    const points = obj.points !== undefined ? obj.points : 100;
    if (typeof points !== 'number' || !Number.isFinite(points) || points < 10 || points > 1000) {
      return { valid: false, error: `VALIDATION_ERROR: Objective [${code}] points must be between 10 and 1000` };
    }

    // Safety perimeter check: Objective must fall inside boundary radius
    const dist = calculateHaversineDistance(
      { latitude: boundaryLat, longitude: boundaryLng },
      { latitude: obj.latitude, longitude: obj.longitude }
    );
    if (dist > boundaryRadiusMeters) {
      return {
        valid: false,
        error: `SAFETY_ERROR: Objective [${code}] is outside the perimeter boundary (${Math.round(dist)}m > ${boundaryRadiusMeters}m)`,
      };
    }

    // Spacing check: Each objective must be at least 15m away from other objectives
    for (let j = 0; j < i; j++) {
      const other = objectives[j];
      const spacingDist = calculateHaversineDistance(
        { latitude: obj.latitude, longitude: obj.longitude },
        { latitude: other.latitude, longitude: other.longitude }
      );
      if (spacingDist < 15) {
        return {
          valid: false,
          error: `SAFETY_ERROR: Objective [${code}] is too close to [${other.code || `OBJ 0${j + 1}`}] (${Math.round(spacingDist)}m < 15m minimum spacing)`,
        };
      }
    }
  }

  return { valid: true };
}

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
  }>('/api/ugc/games', {
    preHandler: [requireAuth],
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const body = request.body || ({} as any);

    // Run unified UGC safety & schema validation pipeline
    const validation = validateUGCGamePayload(body);
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.error });
    }

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
    } = body;

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
      objectives: objectives.map((o: any, idx: number) => ({
        code: (o.code || `OBJ 0${idx + 1}`).trim().toUpperCase(),
        title: (o.title || `OBJECTIVE 0${idx + 1}`).trim().slice(0, 64),
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
  }>('/api/ugc/games/:id/report', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
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
