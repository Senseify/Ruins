import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { GameMode } from '@ruins/shared';
import { db, UserRecord, GameRecord } from '../../db';
import { requireAuth } from '../auth';
import {
  calculateHaversineDistance,
  validateKinematicSpeed,
} from '../../utils/geo';
import { gameModeRegistry } from '../game-modes';
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
      mode?: GameMode;
      boundaryRadiusMeters?: number;
      durationMinutes?: number;
      centerLat?: number;
      centerLng?: number;
    };
  }>('/api/games', {
    preHandler: [requireAuth],
    config: {
      rateLimit: {
        max: 15,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
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

    // Initialize objectives using pluggable GameModeHandler
    const modeHandler = gameModeRegistry.get(mode);
    const objectivesData = modeHandler.initializeObjectives(
      { latitude: centerLat, longitude: centerLng },
      boundaryRadiusMeters
    );

    const objectives = await db.createObjectives(
      objectivesData.map((obj) => ({
        ...obj,
        gameId: game.id,
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
      mode?: GameMode;
    };
  }>('/api/games', async (request, _reply) => {
    const lat = request.query.lat ? Number(request.query.lat) : undefined;
    const lng = request.query.lng ? Number(request.query.lng) : undefined;
    const radius = request.query.radius ? Number(request.query.radius) : undefined;
    const mode = request.query.mode;

    const games = await db.listActiveGames(lat, lng, radius, mode);
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
  }>('/api/games/join', {
    preHandler: [requireAuth],
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
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

      // Auto-finalize match if timeframe expired
      if (remainingSeconds === 0) {
        const results = await db.finalizeMatch(id);
        game.status = 'COMPLETED';
        realtimeManager.broadcastToGame(id, 'game_ended', {
          gameId: id,
          reason: 'TIMEFRAME_EXPIRED',
          results,
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

  // 8. Server-Authoritative Proximity Capture Action (Extensible Game Mode Engine)
  server.post<{
    Params: { id: string };
    Body: {
      objectiveId: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      timestamp?: number;
    };
  }>('/api/games/:id/capture', {
    preHandler: [requireAuth],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { id: gameId } = request.params;
    const { objectiveId, latitude, longitude, accuracy = 5, timestamp = Date.now() } =
      request.body || {};

    // 1. Strict coordinate numeric range and finiteness checks
    if (
      !objectiveId ||
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Coordinate telemetry numbers out of valid geographic range' });
    }

    // 2. Temporal sanity validation: reject stale (>60s) or future (>10s) timestamps
    const currentServerTime = Date.now();
    const parsedTimestamp = typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : currentServerTime;
    if (parsedTimestamp < currentServerTime - 60000 || parsedTimestamp > currentServerTime + 10000) {
      await db.logAntiCheatIncident({
        gameId,
        userId: user.id,
        incidentType: 'TEMPORAL_ANOMALY',
        calculatedValue: parsedTimestamp - currentServerTime,
        thresholdValue: 10000,
        payload: { objectiveId, timestamp: parsedTimestamp, serverTime: currentServerTime },
      });
      return reply.status(400).send({ error: 'TELEMETRY_ANOMALY: Stale or future timestamp rejected' });
    }

    // 3. Accuracy sanity check
    const validAccuracy = typeof accuracy === 'number' && Number.isFinite(accuracy) ? Math.max(accuracy, 0) : 5;
    if (validAccuracy > 150) {
      return reply.status(400).send({ error: 'UNRELIABLE_TELEMETRY: GPS accuracy threshold exceeded (poor fix)' });
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
      await db.logAntiCheatIncident({
        gameId,
        userId: user.id,
        incidentType: 'OUT_OF_RANGE_CAPTURE_ATTEMPT',
        calculatedValue: distanceMeters,
        thresholdValue: allowedRadius,
        payload: { objectiveId, latitude, longitude, accuracy },
      });
      return reply.status(400).send({
        error: 'OUT_OF_RANGE: Proximity verification failed',
        distanceMeters,
        allowedRadius,
      });
    }

    // 3. Pluggable Mode-Specific Rules (Phase 11)
    const allObjectives = await db.getObjectivesByGame(gameId);
    const modeHandler = gameModeRegistry.get(game.mode);
    const modeValidation = modeHandler.validateCapture({
      objective,
      playerCoord: { latitude, longitude },
      accuracy,
      game,
      player,
      allObjectives,
    });

    if (!modeValidation.valid) {
      await db.logAntiCheatIncident({
        gameId,
        userId: user.id,
        incidentType: 'MODE_RULE_VIOLATION',
        calculatedValue: distanceMeters,
        thresholdValue: allowedRadius,
        payload: { error: modeValidation.error, objectiveId, mode: game.mode },
      });
      return reply.status(400).send({
        error: modeValidation.error || 'Capture validation failed',
      });
    }

    // 4. Kinematic check from previous telemetry (Phase 10: Anti-Cheat)
    if (player.lastKnownLat !== undefined && player.lastKnownLng !== undefined && player.lastTelemetryAt) {
      const kinematic = validateKinematicSpeed(
        { latitude: player.lastKnownLat, longitude: player.lastKnownLng },
        new Date(player.lastTelemetryAt).getTime(),
        { latitude, longitude },
        timestamp
      );

      if (!kinematic.isPlausible) {
        await db.logAntiCheatIncident({
          gameId,
          userId: user.id,
          incidentType: 'SPEED_ANOMALY',
          calculatedValue: kinematic.calculatedSpeedMps,
          thresholdValue: 14.0,
          payload: { latitude, longitude, prevLat: player.lastKnownLat, prevLng: player.lastKnownLng },
        });
        return reply.status(400).send({
          error: 'TELEMETRY_ANOMALY: Impossible physical velocity detected',
          calculatedSpeedMps: kinematic.calculatedSpeedMps,
        });
      }
    }

    // Authoritative capture confirmed!
    const pointsAwarded = modeValidation.pointsAwarded || objective.points;
    const updatedObjective = await db.captureObjective(objectiveId, user.id, player.teamIndex);
    if (!updatedObjective) {
      return reply.status(409).send({ error: 'CONFLICT: Objective was secured by another operative concurrently' });
    }
    await db.updatePlayerScore(gameId, user.id, pointsAwarded);
    await db.updatePlayerTelemetry(gameId, user.id, latitude, longitude, 0, new Date(parsedTimestamp));

    // Record audit event
    await db.recordEvent(
      gameId,
      'OBJECTIVE_CAPTURED',
      {
        objectiveId,
        code: objective.code,
        points: pointsAwarded,
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
      points: pointsAwarded,
    });

    realtimeManager.broadcastToGame(gameId, 'score_updated', {
      userId: user.id,
      teamIndex: player.teamIndex,
      pointsAdded: pointsAwarded,
    });

    // Check mode-specific win condition
    const refreshedObjectives = await db.getObjectivesByGame(gameId);
    const refreshedPlayers = await db.getGamePlayers(gameId);
    const winResult = modeHandler.checkWinCondition(game, refreshedObjectives, refreshedPlayers);

    if (winResult.completed) {
      const matchResults = await db.finalizeMatch(gameId);
      realtimeManager.broadcastToGame(gameId, 'game_ended', {
        gameId,
        reason: winResult.reason || 'ALL_OBJECTIVES_SECURED',
        results: matchResults,
      });
    }

    return {
      status: 'ok',
      objective: updatedObjective,
      pointsAwarded,
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

  // 10. Authoritative Match Results & Progression Debrief (Phase 9)
  server.get<{
    Params: { id: string };
  }>('/api/games/:id/results', async (request, reply) => {
    const { id } = request.params;
    const game = await db.findGameById(id);
    if (!game) return reply.status(404).send({ error: 'Operation not found' });

    let results = await db.getMatchResult(id);
    if (!results && (game.status === 'COMPLETED' || game.status === 'ABORTED')) {
      results = await db.finalizeMatch(id);
    }

    if (!results) {
      return reply.status(400).send({ error: 'Match has not concluded yet' });
    }

    return {
      status: 'ok',
      results,
    };
  });
}

