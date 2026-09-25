import { GameMode } from '@ruins/shared';
import { GameRecord, GamePlayerRecord, ObjectiveRecord } from '../../db';
import { calculateHaversineDistance, generateProceduralObjectives, LatLng } from '../../utils/geo';

export interface CaptureValidationResult {
  valid: boolean;
  pointsAwarded: number;
  error?: string;
}

export interface WinConditionResult {
  completed: boolean;
  reason?: string;
}

export interface GameModeHandler {
  mode: GameMode;
  name: string;
  description: string;
  initializeObjectives(center: LatLng, radiusMeters: number): Omit<ObjectiveRecord, 'id' | 'createdAt'>[];
  validateCapture(params: {
    objective: ObjectiveRecord;
    playerCoord: LatLng;
    accuracy: number;
    game: GameRecord;
    player: GamePlayerRecord;
    allObjectives: ObjectiveRecord[];
  }): CaptureValidationResult;
  checkWinCondition(
    game: GameRecord,
    objectives: ObjectiveRecord[],
    players: GamePlayerRecord[]
  ): WinConditionResult;
}

// 1. CONVERGENCE Mode Handler
class ConvergenceHandler implements GameModeHandler {
  mode: GameMode = 'CONVERGENCE';
  name = 'CONVERGENCE';
  description = 'Simultaneous territorial extraction across active nodes';

  initializeObjectives(center: LatLng, radiusMeters: number) {
    const raw = generateProceduralObjectives(center, radiusMeters, 3);
    return raw.map((obj) => ({
      gameId: '',
      code: obj.code,
      title: obj.title,
      latitude: obj.latitude,
      longitude: obj.longitude,
      captureRadiusMeters: obj.captureRadiusMeters,
      points: obj.points,
      status: 'ACTIVE' as const,
    }));
  }

  validateCapture({ objective, playerCoord, accuracy }: { objective: ObjectiveRecord; playerCoord: LatLng; accuracy: number }) {
    const dist = calculateHaversineDistance(playerCoord, {
      latitude: objective.latitude,
      longitude: objective.longitude,
    });
    const allowed = objective.captureRadiusMeters + Math.min(Math.max(accuracy, 0), 12);
    if (dist > allowed) {
      return { valid: false, pointsAwarded: 0, error: 'OUT_OF_RANGE: Proximity verification failed' };
    }
    return { valid: true, pointsAwarded: objective.points };
  }

  checkWinCondition(_game: GameRecord, objectives: ObjectiveRecord[]): WinConditionResult {
    const allSecured = objectives.length > 0 && objectives.every((o) => o.status === 'SECURED');
    if (allSecured) {
      return { completed: true, reason: 'ALL_OBJECTIVES_SECURED' };
    }
    return { completed: false };
  }
}

// 2. HUNT Mode Handler (Sequential Breadcrumb Tracking)
class HuntHandler implements GameModeHandler {
  mode: GameMode = 'HUNT';
  name = 'HUNT';
  description = 'Sequential tracking; each node reveals the next frequency breadcrumb';

  initializeObjectives(center: LatLng, radiusMeters: number) {
    const raw = generateProceduralObjectives(center, radiusMeters, 4);
    return raw.map((obj, idx) => ({
      gameId: '',
      code: `HUNT 0${idx + 1}`,
      title: idx === 0 ? 'PRIMARY BEACON' : `RELAY PHASE 0${idx + 1}`,
      latitude: obj.latitude,
      longitude: obj.longitude,
      captureRadiusMeters: 20,
      points: 150,
      // First is ACTIVE; subsequent are DORMANT until previous is secured
      status: idx === 0 ? ('ACTIVE' as const) : ('DORMANT' as const),
    }));
  }

  validateCapture({
    objective,
    playerCoord,
    accuracy,
    allObjectives,
  }: {
    objective: ObjectiveRecord;
    playerCoord: LatLng;
    accuracy: number;
    allObjectives: ObjectiveRecord[];
  }) {
    if (objective.status !== 'ACTIVE') {
      return { valid: false, pointsAwarded: 0, error: 'LOCKED: Prior beacon must be secured first' };
    }

    const dist = calculateHaversineDistance(playerCoord, {
      latitude: objective.latitude,
      longitude: objective.longitude,
    });
    const allowed = objective.captureRadiusMeters + Math.min(Math.max(accuracy, 0), 12);
    if (dist > allowed) {
      return { valid: false, pointsAwarded: 0, error: 'OUT_OF_RANGE: Beacon frequency out of range' };
    }

    // Unlock next sequential objective
    const nextDormant = allObjectives.find((o) => o.status === 'DORMANT');
    if (nextDormant) {
      nextDormant.status = 'ACTIVE';
    }

    return { valid: true, pointsAwarded: objective.points };
  }

  checkWinCondition(_game: GameRecord, objectives: ObjectiveRecord[]): WinConditionResult {
    const allSecured = objectives.length > 0 && objectives.every((o) => o.status === 'SECURED');
    return { completed: allSecured, reason: allSecured ? 'HUNT_SEQUENCE_COMPLETE' : undefined };
  }
}

// 3. EXTRACTION Mode Handler (Retrieve Payload Node -> Return to Zone Perimeter)
class ExtractionHandler implements GameModeHandler {
  mode: GameMode = 'EXTRACTION';
  name = 'EXTRACTION';
  description = 'Secure the classified core and courier it to the extraction zone';

  initializeObjectives(center: LatLng, radiusMeters: number) {
    const raw = generateProceduralObjectives(center, radiusMeters * 0.5, 1);
    return [
      {
        gameId: '',
        code: 'CORE 01',
        title: 'CLASSIFIED CORE RELIC',
        latitude: raw[0].latitude,
        longitude: raw[0].longitude,
        captureRadiusMeters: 15,
        points: 200,
        status: 'ACTIVE' as const,
      },
      {
        gameId: '',
        code: 'EXTRACT',
        title: 'ZONE EXTRACTION PERIMETER',
        latitude: center.latitude,
        longitude: center.longitude,
        captureRadiusMeters: 30,
        points: 300,
        status: 'DORMANT' as const,
      },
    ];
  }

  validateCapture({
    objective,
    playerCoord,
    accuracy,
    allObjectives,
  }: {
    objective: ObjectiveRecord;
    playerCoord: LatLng;
    accuracy: number;
    allObjectives: ObjectiveRecord[];
  }) {
    if (objective.status !== 'ACTIVE') {
      return { valid: false, pointsAwarded: 0, error: 'DORMANT: Extraction point inactive without core' };
    }

    const dist = calculateHaversineDistance(playerCoord, {
      latitude: objective.latitude,
      longitude: objective.longitude,
    });
    const allowed = objective.captureRadiusMeters + Math.min(Math.max(accuracy, 0), 12);
    if (dist > allowed) {
      return { valid: false, pointsAwarded: 0, error: 'OUT_OF_RANGE: Extraction threshold failed' };
    }

    // If core secured, activate extract zone
    if (objective.code === 'CORE 01') {
      const extractZone = allObjectives.find((o) => o.code === 'EXTRACT');
      if (extractZone) extractZone.status = 'ACTIVE';
    }

    return { valid: true, pointsAwarded: objective.points };
  }

  checkWinCondition(_game: GameRecord, objectives: ObjectiveRecord[]): WinConditionResult {
    const extract = objectives.find((o) => o.code === 'EXTRACT');
    const completed = extract?.status === 'SECURED';
    return { completed: Boolean(completed), reason: completed ? 'EXTRACTION_SUCCESS' : undefined };
  }
}

// 4. TERRITORY Mode Handler (Area Influence Nodes)
class TerritoryHandler implements GameModeHandler {
  mode: GameMode = 'TERRITORY';
  name = 'TERRITORY';
  description = 'Competitive territory dominance across perimeter quadrants';

  initializeObjectives(center: LatLng, radiusMeters: number) {
    const raw = generateProceduralObjectives(center, radiusMeters, 4);
    return raw.map((obj, idx) => ({
      gameId: '',
      code: `QUAD 0${idx + 1}`,
      title: `SECTOR HUB 0${idx + 1}`,
      latitude: obj.latitude,
      longitude: obj.longitude,
      captureRadiusMeters: 25,
      points: 120,
      status: 'ACTIVE' as const,
    }));
  }

  validateCapture({ objective, playerCoord, accuracy }: { objective: ObjectiveRecord; playerCoord: LatLng; accuracy: number }) {
    const dist = calculateHaversineDistance(playerCoord, {
      latitude: objective.latitude,
      longitude: objective.longitude,
    });
    const allowed = objective.captureRadiusMeters + Math.min(Math.max(accuracy, 0), 12);
    if (dist > allowed) {
      return { valid: false, pointsAwarded: 0, error: 'OUT_OF_RANGE' };
    }
    return { valid: true, pointsAwarded: objective.points };
  }

  checkWinCondition(_game: GameRecord, objectives: ObjectiveRecord[]): WinConditionResult {
    const allSecured = objectives.every((o) => o.status === 'SECURED');
    return { completed: allSecured, reason: allSecured ? 'TERRITORY_SECURED' : undefined };
  }
}

// 5. RELAY Mode Handler (Alternating Team Runner Checkpoints)
class RelayHandler implements GameModeHandler {
  mode: GameMode = 'RELAY';
  name = 'RELAY';
  description = 'Team relay checkpoints requiring coordinated operative handoffs';

  initializeObjectives(center: LatLng, radiusMeters: number) {
    const raw = generateProceduralObjectives(center, radiusMeters, 3);
    return raw.map((obj, idx) => ({
      gameId: '',
      code: `RELAY 0${idx + 1}`,
      title: `HANDOFF GATE 0${idx + 1}`,
      latitude: obj.latitude,
      longitude: obj.longitude,
      captureRadiusMeters: 20,
      points: 150,
      status: 'ACTIVE' as const,
    }));
  }

  validateCapture({ objective, playerCoord, accuracy }: { objective: ObjectiveRecord; playerCoord: LatLng; accuracy: number }) {
    const dist = calculateHaversineDistance(playerCoord, {
      latitude: objective.latitude,
      longitude: objective.longitude,
    });
    const allowed = objective.captureRadiusMeters + Math.min(Math.max(accuracy, 0), 12);
    if (dist > allowed) {
      return { valid: false, pointsAwarded: 0, error: 'OUT_OF_RANGE' };
    }
    return { valid: true, pointsAwarded: objective.points };
  }

  checkWinCondition(_game: GameRecord, objectives: ObjectiveRecord[]): WinConditionResult {
    const allSecured = objectives.every((o) => o.status === 'SECURED');
    return { completed: allSecured, reason: allSecured ? 'RELAY_CHAIN_COMPLETED' : undefined };
  }
}

// Registry
export class GameModeRegistry {
  private handlers: Map<GameMode, GameModeHandler> = new Map();

  constructor() {
    this.register(new ConvergenceHandler());
    this.register(new HuntHandler());
    this.register(new ExtractionHandler());
    this.register(new TerritoryHandler());
    this.register(new RelayHandler());
  }

  register(handler: GameModeHandler) {
    this.handlers.set(handler.mode, handler);
  }

  get(mode: GameMode): GameModeHandler {
    const handler = this.handlers.get(mode);
    if (!handler) {
      // Default to Convergence if unrecognized
      return this.handlers.get('CONVERGENCE')!;
    }
    return handler;
  }

  getAllModes(): Array<{ mode: GameMode; name: string; description: string }> {
    return Array.from(this.handlers.values()).map((h) => ({
      mode: h.mode,
      name: h.name,
      description: h.description,
    }));
  }
}

export const gameModeRegistry = new GameModeRegistry();
