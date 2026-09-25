import { Pool } from 'pg';
import crypto from 'crypto';
import { config } from '../config';
import { calculateHaversineDistance } from '../utils/geo';

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  xp: number;
  level: number;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameRecord {
  id: string;
  hostUserId: string;
  roomCode: string;
  title: string;
  mode: string;
  status: 'LOBBY' | 'ACTIVE' | 'COMPLETED' | 'ABORTED';
  boundaryLat: number;
  boundaryLng: number;
  boundaryRadiusMeters: number;
  durationSeconds: number;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GamePlayerRecord {
  gameId: string;
  userId: string;
  username: string;
  displayName: string;
  teamIndex: number;
  isHost: boolean;
  isReady: boolean;
  score: number;
  objectivesCaptured: number;
  distanceTraveledMeters: number;
  lastKnownLat?: number;
  lastKnownLng?: number;
  lastTelemetryAt?: Date;
  joinedAt: Date;
}

export interface ObjectiveRecord {
  id: string;
  gameId: string;
  code: string;
  title: string;
  latitude: number;
  longitude: number;
  captureRadiusMeters: number;
  points: number;
  status: 'DORMANT' | 'ACTIVE' | 'CAPTURING' | 'SECURED';
  capturedByTeam?: number;
  capturedByUserId?: string;
  capturedAt?: Date;
  createdAt: Date;
}

export interface GameEventRecord {
  id: string;
  gameId: string;
  userId?: string;
  eventType: string;
  payload: Record<string, any>;
  createdAt: Date;
}

export interface DatabaseStore {
  // Users
  createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  updateUserStats(userId: string, xpEarned: number, won: boolean, score: number): Promise<void>;

  // Games
  createGame(game: Omit<GameRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<GameRecord>;
  findGameById(id: string): Promise<GameRecord | null>;
  findGameByRoomCode(code: string): Promise<GameRecord | null>;
  listActiveGames(lat?: number, lng?: number, maxDistanceMeters?: number): Promise<GameRecord[]>;
  updateGameStatus(id: string, status: GameRecord['status'], startedAt?: Date, endedAt?: Date): Promise<void>;

  // Players
  addPlayerToGame(gameId: string, userId: string, isHost?: boolean, teamIndex?: number): Promise<GamePlayerRecord>;
  getGamePlayers(gameId: string): Promise<GamePlayerRecord[]>;
  getGamePlayer(gameId: string, userId: string): Promise<GamePlayerRecord | null>;
  updatePlayerReady(gameId: string, userId: string, isReady: boolean): Promise<void>;
  updatePlayerTeam(gameId: string, userId: string, teamIndex: number): Promise<void>;
  updatePlayerScore(gameId: string, userId: string, pointsDelta: number): Promise<void>;
  updatePlayerTelemetry(gameId: string, userId: string, lat: number, lng: number, distanceDelta: number): Promise<void>;
  removePlayerFromGame(gameId: string, userId: string): Promise<void>;

  // Objectives
  createObjectives(objectives: Omit<ObjectiveRecord, 'id' | 'createdAt'>[]): Promise<ObjectiveRecord[]>;
  getObjectivesByGame(gameId: string): Promise<ObjectiveRecord[]>;
  getObjectiveById(id: string): Promise<ObjectiveRecord | null>;
  captureObjective(id: string, userId: string, teamIndex: number): Promise<ObjectiveRecord | null>;

  // Events
  recordEvent(gameId: string, eventType: string, payload: Record<string, any>, userId?: string): Promise<void>;
}

// In-Memory Database Implementation (PostGIS equivalent)
class MemoryDatabaseStore implements DatabaseStore {
  private users: Map<string, UserRecord> = new Map();
  private games: Map<string, GameRecord> = new Map();
  private players: Map<string, GamePlayerRecord[]> = new Map(); // gameId -> players
  private objectives: Map<string, ObjectiveRecord> = new Map();
  private events: GameEventRecord[] = [];

  async createUser(data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const record: UserRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, record);
    return record;
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const norm = username.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === norm) return u;
    }
    return null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const norm = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === norm) return u;
    }
    return null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  async updateUserStats(userId: string, xpEarned: number, won: boolean, score: number): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    user.xp += xpEarned;
    user.level = Math.floor(user.xp / 500) + 1;
    user.gamesPlayed += 1;
    if (won) user.wins += 1;
    user.totalScore += score;
    user.updatedAt = new Date();
  }

  async createGame(data: Omit<GameRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<GameRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const record: GameRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.games.set(id, record);
    this.players.set(id, []);
    return record;
  }

  async findGameById(id: string): Promise<GameRecord | null> {
    return this.games.get(id) || null;
  }

  async findGameByRoomCode(code: string): Promise<GameRecord | null> {
    const norm = code.trim().toUpperCase();
    for (const g of this.games.values()) {
      if (g.roomCode.toUpperCase() === norm) return g;
    }
    return null;
  }

  async listActiveGames(lat?: number, lng?: number, maxDistanceMeters: number = 20000): Promise<GameRecord[]> {
    const active: GameRecord[] = [];
    for (const g of this.games.values()) {
      if (g.status === 'LOBBY' || g.status === 'ACTIVE') {
        if (lat !== undefined && lng !== undefined) {
          const dist = calculateHaversineDistance(
            { latitude: lat, longitude: lng },
            { latitude: g.boundaryLat, longitude: g.boundaryLng }
          );
          if (dist <= maxDistanceMeters) {
            active.push(g);
          }
        } else {
          active.push(g);
        }
      }
    }
    return active;
  }

  async updateGameStatus(
    id: string,
    status: GameRecord['status'],
    startedAt?: Date,
    endedAt?: Date
  ): Promise<void> {
    const game = this.games.get(id);
    if (!game) return;
    game.status = status;
    if (startedAt) game.startedAt = startedAt;
    if (endedAt) game.endedAt = endedAt;
    game.updatedAt = new Date();
  }

  async addPlayerToGame(
    gameId: string,
    userId: string,
    isHost: boolean = false,
    teamIndex: number = 0
  ): Promise<GamePlayerRecord> {
    const user = await this.findUserById(userId);
    const list = this.players.get(gameId) || [];
    const existing = list.find((p) => p.userId === userId);
    if (existing) return existing;

    const record: GamePlayerRecord = {
      gameId,
      userId,
      username: user?.username || 'operative',
      displayName: user?.displayName || 'Operative',
      teamIndex,
      isHost,
      isReady: isHost,
      score: 0,
      objectivesCaptured: 0,
      distanceTraveledMeters: 0,
      joinedAt: new Date(),
    };

    list.push(record);
    this.players.set(gameId, list);
    return record;
  }

  async getGamePlayers(gameId: string): Promise<GamePlayerRecord[]> {
    return this.players.get(gameId) || [];
  }

  async getGamePlayer(gameId: string, userId: string): Promise<GamePlayerRecord | null> {
    const list = this.players.get(gameId) || [];
    return list.find((p) => p.userId === userId) || null;
  }

  async updatePlayerReady(gameId: string, userId: string, isReady: boolean): Promise<void> {
    const list = this.players.get(gameId) || [];
    const player = list.find((p) => p.userId === userId);
    if (player) player.isReady = isReady;
  }

  async updatePlayerTeam(gameId: string, userId: string, teamIndex: number): Promise<void> {
    const list = this.players.get(gameId) || [];
    const player = list.find((p) => p.userId === userId);
    if (player) player.teamIndex = teamIndex;
  }

  async updatePlayerScore(gameId: string, userId: string, pointsDelta: number): Promise<void> {
    const list = this.players.get(gameId) || [];
    const player = list.find((p) => p.userId === userId);
    if (player) {
      player.score += pointsDelta;
      player.objectivesCaptured += 1;
    }
  }

  async updatePlayerTelemetry(
    gameId: string,
    userId: string,
    lat: number,
    lng: number,
    distanceDelta: number
  ): Promise<void> {
    const list = this.players.get(gameId) || [];
    const player = list.find((p) => p.userId === userId);
    if (player) {
      player.lastKnownLat = lat;
      player.lastKnownLng = lng;
      player.distanceTraveledMeters += distanceDelta;
      player.lastTelemetryAt = new Date();
    }
  }

  async removePlayerFromGame(gameId: string, userId: string): Promise<void> {
    const list = this.players.get(gameId) || [];
    this.players.set(
      gameId,
      list.filter((p) => p.userId !== userId)
    );
  }

  async createObjectives(objectivesData: Omit<ObjectiveRecord, 'id' | 'createdAt'>[]): Promise<ObjectiveRecord[]> {
    const created: ObjectiveRecord[] = [];
    const now = new Date();
    for (const d of objectivesData) {
      const id = crypto.randomUUID();
      const obj: ObjectiveRecord = {
        ...d,
        id,
        createdAt: now,
      };
      this.objectives.set(id, obj);
      created.push(obj);
    }
    return created;
  }

  async getObjectivesByGame(gameId: string): Promise<ObjectiveRecord[]> {
    const list: ObjectiveRecord[] = [];
    for (const obj of this.objectives.values()) {
      if (obj.gameId === gameId) list.push(obj);
    }
    return list;
  }

  async getObjectiveById(id: string): Promise<ObjectiveRecord | null> {
    return this.objectives.get(id) || null;
  }

  async captureObjective(id: string, userId: string, teamIndex: number): Promise<ObjectiveRecord | null> {
    const obj = this.objectives.get(id);
    if (!obj || obj.status === 'SECURED') return null;

    obj.status = 'SECURED';
    obj.capturedByUserId = userId;
    obj.capturedByTeam = teamIndex;
    obj.capturedAt = new Date();
    return obj;
  }

  async recordEvent(
    gameId: string,
    eventType: string,
    payload: Record<string, any>,
    userId?: string
  ): Promise<void> {
    this.events.push({
      id: crypto.randomUUID(),
      gameId,
      userId,
      eventType,
      payload,
      createdAt: new Date(),
    });
  }
}

// Global active store instance
export const db: DatabaseStore = new MemoryDatabaseStore();
