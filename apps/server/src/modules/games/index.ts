import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db, UserRecord, GameRecord } from '../../db';
import { requireAuth } from '../auth';
import {
  calculateHaversineDistance,
  validateKinematicSpeed,
  generateProceduralObjectives,
} from '../../utils/geo';
import { realtimeManager } from '../../realtime';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'RN';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function gameRoutes(server: FastifyInstance) {
  // 1. Create Operation / Game
  server.post<{
    Body: {
      title?: string;
      mode?: string;
      boundaryRadiusMeters?: number;
      durationMinutes?: number;
      centerLat?: number;
      centerLng?: number;
    };
  }>('/api/games', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const {
      title = 'OPERATION CONVERGENCE',
      mode = 'CONVERGENCE',
      boundaryRadiusMeters = 400,
      durationMinutes = 15,
      centerLat = 37.7749,
      centerLng = -122.4194,
    } = request.body || {};

    let roomCode = generateRoomCode();
    while (await db.findGameByRoomCode(roomCode)) {
      roomCode = generateRoomCode();
    }

    const durationSeconds = durationMinutes * 60;

    const game = await db.createGame({
      hostUserId: user.id,
      roomCode,
      title: title.trim(),
      mode,
      status: 'LOBBY',
      boundaryLat: centerLat,
      boundaryLng: centerLng,
      boundaryRadiusMeters,
      durationSeconds,
    });

    // Add host as player
    await db.addPlayerToGame(game.id, user.id, true, 0);

    // Generate procedural objectives distributed safely within perimeter
    const objectivesData = generateProceduralObjectives(
      { latitude: centerLat, longitude: centerLng },
      boundaryRadiusMeters,
      3
    );

    const objectives = await db.createObjectives(
      objectivesData.map((obj) => ({
        gameId: game.id,
        code: obj.code,
        title: obj.title,
        latitude: obj.latitude,
        longitude: obj.longitude,
        captureRadiusMeters: obj.captureRadiusMeters,
        points: obj.points,
        status: 'ACTIVE',
      }))
    );

    return {
      status: 'ok',
      game,
      objectives,
    };
  });

  // 2. List Active or Nearby Operations
  server.get<{
    Querystring: {
      lat?: string;
      lng?: string;
      radius?: string;
    };
  }>('/api/games', async (request, _reply) => {
    const lat = request.query.lat ? Number(request.query.lat) : undefined;
    const lng = request.query.lng ? Number(request.query.lng) : undefined;
    const radius = request.query.radius ? Number(request.query.radius) : undefined;

    const games = await db.listActiveGames(lat, lng, radius);
    return {
      status: 'ok',
      games,
    };
  });

  // 3. Join Operation by Room Code
  server.post<{
    Body: {
      roomCode: string;
    };
  }>('/api/games/join', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { roomCode } = request.body || {};

    if (!roomCode) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Room code required' });
    }

    const game = await db.findGameByRoomCode(roomCode);
    if (!game) {
      return reply.status(404).send({ error: 'NOT_FOUND: No operation found with this code' });
    }

    if (game.status === 'COMPLETED' || game.status === 'ABORTED') {
      return reply.status(400).send({ error: 'OPERATION_CLOSED: Mission already concluded' });
    }

    const players = await db.getGamePlayers(game.id);
    const existing = players.find((p) => p.userId === user.id);

    if (!existing) {
      if (game.status === 'ACTIVE') {
        return reply.status(403).send({ error: 'IN_PROGRESS: Mission already active' });
      }

      // Balance teams (0 vs 1)
      const team0Count = players.filter((p) => p.teamIndex === 0).length;
      const team1Count = players.filter((p) => p.teamIndex === 1).length;
      const assignedTeam = team0Count <= team1Count ? 0 : 1;

      await db.addPlayerToGame(game.id, user.id, false, assignedTeam);
      realtimeManager.broadcastToGame(game.id, 'player_joined', {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        teamIndex: assignedTeam,
      });
    }

    const updatedPlayers = await db.getGamePlayers(game.id);
    const objectives = await db.getObjectivesByGame(game.id);

    return {
      status: 'ok',
      game,
      players: updatedPlayers,
      objectives,
    };
  });

  // 4. Get Game State & Details
  server.get<{
    Params: { id: string };
  }>('/api/games/:id', async (request, reply) => {
    const { id } = request.params;
    const game = await db.findGameById(id);
    if (!game) {
      return reply.status(404).send({ error: 'NOT_FOUND: Operation not found' });
    }

    const players = await db.getGamePlayers(id);
    const objectives = await db.getObjectivesByGame(id);

    let remainingSeconds = game.durationSeconds;
    if (game.status === 'ACTIVE' && game.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(game.startedAt).getTime()) / 1000);
      remainingSeconds = Math.max(game.durationSeconds - elapsed, 0);

      // Auto-complete match if timer expired
      if (remainingSeconds === 0) {
        await db.updateGameStatus(id, 'COMPLETED', game.startedAt, new Date());
        game.status = 'COMPLETED';
        realtimeManager.broadcastToGame(id, 'game_ended', {
          gameId: id,
          reason: 'TIMEFRAME_EXPIRED',
        });
      }
    }

    return {
      status: 'ok',
      game: {
        ...game,
        remainingSeconds,
      },
      players,
      objectives,
    };
  });

  // 5. Toggle Ready in Lobby
  server.post<{
    Params: { id: string };
    Body: { isReady: boolean };
  }>('/api/games/:id/ready', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { id } = request.params;
    const { isReady } = request.body || {};

    const game = await db.findGameById(id);
    if (!game) return reply.status(404).send({ error: 'NOT_FOUND: Operation not found' });
    if (game.status !== 'LOBBY') {
      return reply.status(400).send({ error: 'INVALID_STATE: Match is not in lobby staging' });
    }

    await db.updatePlayerReady(id, user.id, Boolean(isReady));
    realtimeManager.broadcastToGame(id, 'player_ready', {
      userId: user.id,
      isReady: Boolean(isReady),
    });

    return { status: 'ok', isReady };
  });

  // 6. Switch Team in Lobby
  server.post<{
    Params: { id: string };
    Body: { teamIndex: number };
  }>('/api/games/:id/team', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { id } = request.params;
    const { teamIndex } = request.body || {};

    if (teamIndex !== 0 && teamIndex !== 1) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Team must be 0 or 1' });
    }

    const game = await db.findGameById(id);
    if (!game) return reply.status(404).send({ error: 'NOT_FOUND: Operation not found' });
    if (game.status !== 'LOBBY') {
      return reply.status(400).send({ error: 'INVALID_STATE: Match is not in lobby staging' });
    }

    await db.updatePlayerTeam(id, user.id, teamIndex);
    realtimeManager.broadcastToGame(id, 'team_updated', {
      userId: user.id,
      teamIndex,
    });

    return { status: 'ok', teamIndex };
  });

  // 7. Host Start Game
  server.post<{
    Params: { id: string };
  }>('/api/games/:id/start', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { id } = request.params;

    const game = await db.findGameById(id);
    if (!game) return reply.status(404).send({ error: 'NOT_FOUND: Operation not found' });

    if (game.hostUserId !== user.id) {
      return reply.status(403).send({ error: 'FORBIDDEN: Only host dispatcher may initiate mission' });
    }

    if (game.status !== 'LOBBY') {
      return reply.status(400).send({ error: 'INVALID_STATE: Match already active or concluded' });
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + game.durationSeconds * 1000);
    await db.updateGameStatus(id, 'ACTIVE', now, endsAt);

    await db.recordEvent(id, 'GAME_STARTED', { startedAt: now, startedBy: user.id }, user.id);

    realtimeManager.broadcastToGame(id, 'game_started', {
      gameId: id,
      startedAt: now.toISOString(),
      durationSeconds: game.durationSeconds,
    });

    return {
      status: 'ok',
      game: {
        ...game,
        status: 'ACTIVE',
        startedAt: now,
      },
    };
  });

  // 8. Server-Authoritative Proximity Capture Action (CONVERGENCE Loop)
  server.post<{
    Params: { id: string };
    Body: {
      objectiveId: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      timestamp?: number;
    };
  }>('/api/games/:id/capture', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { id: gameId } = request.params;
    const { objectiveId, latitude, longitude, accuracy = 5, timestamp = Date.now() } =
      request.body || {};

    if (!objectiveId || latitude === undefined || longitude === undefined) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Missing coordinate telemetry' });
    }

    const game = await db.findGameById(gameId);
    if (!game) return reply.status(404).send({ error: 'NOT_FOUND: Operation not found' });

    if (game.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'INVALID_STATE: Operation is not active' });
    }

    const player = await db.getGamePlayer(gameId, user.id);
    if (!player) {
      return reply.status(403).send({ error: 'FORBIDDEN: Agent not enrolled in this theater' });
    }

    const objective = await db.getObjectiveById(objectiveId);
    if (!objective || objective.gameId !== gameId) {
      return reply.status(404).send({ error: 'NOT_FOUND: Objective not found in theater' });
    }

    if (objective.status === 'SECURED') {
      return reply.status(409).send({ error: 'CONFLICT: Objective has already been secured' });
    }

    // 1. Calculate physical distance
    const distanceMeters = calculateHaversineDistance(
      { latitude, longitude },
      { latitude: objective.latitude, longitude: objective.longitude }
    );

    // 2. Tolerance buffer: allow captureRadius + GPS noise up to 12m
    const allowedRadius = objective.captureRadiusMeters + Math.min(Math.max(accuracy, 0), 12);

    if (distanceMeters > allowedRadius) {
      return reply.status(400).send({
        error: 'OUT_OF_RANGE: Proximity verification failed',
        distanceMeters,
        allowedRadius,
      });
    }

    // 3. Kinematic check from previous telemetry
    if (player.lastKnownLat !== undefined && player.lastKnownLng !== undefined && player.lastTelemetryAt) {
      const kinematic = validateKinematicSpeed(
        { latitude: player.lastKnownLat, longitude: player.lastKnownLng },
        new Date(player.lastTelemetryAt).getTime(),
        { latitude, longitude },
        timestamp
      );

      if (!kinematic.isPlausible) {
        return reply.status(400).send({
          error: 'TELEMETRY_ANOMALY: Impossible physical velocity detected',
          calculatedSpeedMps: kinematic.calculatedSpeedMps,
        });
      }
    }

    // Capture is verified authoritative by server!
    const updatedObjective = await db.captureObjective(objectiveId, user.id, player.teamIndex);
    await db.updatePlayerScore(gameId, user.id, objective.points);
    await db.updatePlayerTelemetry(gameId, user.id, latitude, longitude, 0);

    // Record audit event
    await db.recordEvent(
      gameId,
      'OBJECTIVE_CAPTURED',
      {
        objectiveId,
        code: objective.code,
        points: objective.points,
        teamIndex: player.teamIndex,
        userId: user.id,
      },
      user.id
    );

    // Broadcast in realtime to all players in match
    realtimeManager.broadcastToGame(gameId, 'objective_updated', {
      objectiveId,
      status: 'SECURED',
      capturedByTeam: player.teamIndex,
      capturedByUserId: user.id,
      points: objective.points,
    });

    realtimeManager.broadcastToGame(gameId, 'score_updated', {
      userId: user.id,
      teamIndex: player.teamIndex,
      pointsAdded: objective.points,
    });

    // Check if all objectives in match are secured -> trigger victory
    const allObjectives = await db.getObjectivesByGame(gameId);
    const allSecured = allObjectives.every((o) => o.status === 'SECURED');
    if (allSecured) {
      await db.updateGameStatus(gameId, 'COMPLETED', game.startedAt, new Date());
      realtimeManager.broadcastToGame(gameId, 'game_ended', {
        gameId,
        reason: 'ALL_OBJECTIVES_SECURED',
      });
    }

    return {
      status: 'ok',
      objective: updatedObjective,
      pointsAwarded: objective.points,
    };
  });

  // 9. Leave Operation
  server.post<{
    Params: { id: string };
  }>('/api/games/:id/leave', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { id } = request.params;

    await db.removePlayerFromGame(id, user.id);
    realtimeManager.broadcastToGame(id, 'player_left', {
      userId: user.id,
      username: user.username,
    });

    return { status: 'ok' };
  });
}
