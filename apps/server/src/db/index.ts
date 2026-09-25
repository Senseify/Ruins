import { Pool } from 'pg';
import crypto from 'crypto';
import { config } from '../config';
import { calculateHaversineDistance } from '../utils/geo';
import {
  GameMode,
  MatchResultDetails,
  PlayerMatchStat,
  UGCGameConfig,
  UGCStatus,
  PartyDetails,
  FriendRelationship,
} from '@ruins/shared';

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
  mode: GameMode;
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

export interface MatchResultRecord {
  id: string;
  gameId: string;
  roomCode: string;
  title: string;
  mode: GameMode;
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
  winningTeamIndex?: number;
  scoreTeamAlpha: number;
  scoreTeamOmega: number;
  durationSeconds: number;
  completedAt: Date;
}

export interface AntiCheatLogRecord {
  id: string;
  gameId?: string;
  userId?: string;
  incidentType: string;
  calculatedValue?: number;
  thresholdValue?: number;
  payload: Record<string, any>;
  createdAt: Date;
}

export interface DatabaseStore {
  // Users
  createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  searchUsers(query: string, excludeUserId?: string): Promise<UserRecord[]>;
  updateUserStats(userId: string, xpEarned: number, won: boolean, score: number): Promise<void>;

  // Games
  createGame(game: Omit<GameRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<GameRecord>;
  findGameById(id: string): Promise<GameRecord | null>;
  findGameByRoomCode(code: string): Promise<GameRecord | null>;
  listActiveGames(lat?: number, lng?: number, maxDistanceMeters?: number, mode?: GameMode): Promise<GameRecord[]>;
  updateGameStatus(id: string, status: GameRecord['status'], startedAt?: Date, endedAt?: Date): Promise<void>;

  // Players
  addPlayerToGame(gameId: string, userId: string, isHost?: boolean, teamIndex?: number): Promise<GamePlayerRecord>;
  getGamePlayers(gameId: string): Promise<GamePlayerRecord[]>;
  getGamePlayer(gameId: string, userId: string): Promise<GamePlayerRecord | null>;
  updatePlayerReady(gameId: string, userId: string, isReady: boolean): Promise<void>;
  updatePlayerTeam(gameId: string, userId: string, teamIndex: number): Promise<void>;
  updatePlayerScore(gameId: string, userId: string, pointsDelta: number): Promise<void>;
  updatePlayerTelemetry(gameId: string, userId: string, lat: number, lng: number, distanceDelta: number, telemetryAt?: Date): Promise<void>;
  removePlayerFromGame(gameId: string, userId: string): Promise<void>;

  // Objectives
  createObjectives(objectives: Omit<ObjectiveRecord, 'id' | 'createdAt'>[]): Promise<ObjectiveRecord[]>;
  getObjectivesByGame(gameId: string): Promise<ObjectiveRecord[]>;
  getObjectiveById(id: string): Promise<ObjectiveRecord | null>;
  captureObjective(id: string, userId: string, teamIndex: number): Promise<ObjectiveRecord | null>;

  // Phase 9: Results & Progression
  finalizeMatch(gameId: string): Promise<MatchResultDetails>;
  getMatchResult(gameId: string): Promise<MatchResultDetails | null>;
  getUserMatchHistory(userId: string): Promise<PlayerMatchStat[]>;

  // Phase 12: Teams & Social
  createParty(leaderId: string): Promise<PartyDetails>;
  findPartyByCode(code: string): Promise<PartyDetails | null>;
  findPartyByUserId(userId: string): Promise<PartyDetails | null>;
  joinParty(partyId: string, userId: string): Promise<PartyDetails>;
  leaveParty(partyId: string, userId: string): Promise<void>;
  sendFriendRequest(userId: string, friendId: string): Promise<FriendRelationship>;
  acceptFriendRequest(userId: string, friendId: string): Promise<void>;
  getFriends(userId: string): Promise<FriendRelationship[]>;

  // Phase 13: UGC
  createUGCGame(ugc: Omit<UGCGameConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<UGCGameConfig>;
  getUGCGame(id: string): Promise<UGCGameConfig | null>;
  listUGCGames(status?: UGCStatus, creatorId?: string): Promise<UGCGameConfig[]>;
  publishUGCGame(id: string, creatorId: string): Promise<UGCGameConfig>;
  reportUGCGame(id: string): Promise<void>;

  // Phase 10: Anti-Cheat & Auditing
  logAntiCheatIncident(record: Omit<AntiCheatLogRecord, 'id' | 'createdAt'>): Promise<void>;
  recordEvent(gameId: string, eventType: string, payload: Record<string, any>, userId?: string): Promise<void>;

  // Lifecycle & Connectivity
  verifyConnection(): Promise<void>;
}

// In-Memory Spatial & Relational Engine (Development & Tests)
export class MemoryDatabaseStore implements DatabaseStore {
  private users: Map<string, UserRecord> = new Map();
  private games: Map<string, GameRecord> = new Map();
  private players: Map<string, GamePlayerRecord[]> = new Map();
  private objectives: Map<string, ObjectiveRecord> = new Map();
  private matchResults: Map<string, MatchResultDetails> = new Map();
  private userHistories: Map<string, PlayerMatchStat[]> = new Map();
  private parties: Map<string, PartyDetails> = new Map();
  private friends: Map<string, FriendRelationship[]> = new Map();
  private ugcGames: Map<string, UGCGameConfig> = new Map();
  private antiCheatLogs: AntiCheatLogRecord[] = [];

  async verifyConnection(): Promise<void> {
    return Promise.resolve();
  }

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

  async searchUsers(query: string, excludeUserId?: string): Promise<UserRecord[]> {
    const norm = query.trim().toLowerCase();
    const results: UserRecord[] = [];
    for (const u of this.users.values()) {
      if (u.id === excludeUserId) continue;
      if (u.username.toLowerCase().includes(norm) || u.displayName.toLowerCase().includes(norm)) {
        results.push(u);
      }
    }
    return results.slice(0, 10);
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

  async listActiveGames(
    lat?: number,
    lng?: number,
    maxDistanceMeters: number = 20000,
    mode?: GameMode
  ): Promise<GameRecord[]> {
    const active: GameRecord[] = [];
    for (const g of this.games.values()) {
      if (g.status === 'LOBBY' || g.status === 'ACTIVE') {
        if (mode && g.mode !== mode) continue;
        if (lat !== undefined && lng !== undefined) {
          const dist = calculateHaversineDistance(
            { latitude: lat, longitude: lng },
            { latitude: g.boundaryLat, longitude: g.boundaryLng }
          );
          if (dist <= maxDistanceMeters) active.push(g);
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
    distanceDelta: number,
    telemetryAt?: Date
  ): Promise<void> {
    const list = this.players.get(gameId) || [];
    const player = list.find((p) => p.userId === userId);
    if (player) {
      player.lastKnownLat = lat;
      player.lastKnownLng = lng;
      player.distanceTraveledMeters += distanceDelta;
      player.lastTelemetryAt = telemetryAt || new Date();
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

  // Phase 9: Results & Progression Persistence
  async finalizeMatch(gameId: string): Promise<MatchResultDetails> {
    const existing = this.matchResults.get(gameId);
    if (existing) return existing;

    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');

    const players = this.players.get(gameId) || [];
    const scoreAlpha = players.filter((p) => p.teamIndex === 0).reduce((s, p) => s + p.score, 0);
    const scoreOmega = players.filter((p) => p.teamIndex === 1).reduce((s, p) => s + p.score, 0);

    let outcome: 'VICTORY' | 'DEFEAT' | 'DRAW' = 'DRAW';
    let winningTeamIndex: number | undefined = undefined;

    if (scoreAlpha > scoreOmega) {
      outcome = 'VICTORY';
      winningTeamIndex = 0;
    } else if (scoreOmega > scoreAlpha) {
      outcome = 'DEFEAT';
      winningTeamIndex = 1;
    }

    // Sort players by score descending to determine deterministic placements
    const sorted = [...players].sort((a, b) => b.score - a.score);

    const playerStats: PlayerMatchStat[] = sorted.map((p, index) => {
      const isWinner = winningTeamIndex !== undefined && p.teamIndex === winningTeamIndex;
      // Formula: 100 for finishing + 50 per capture + 150 for team victory
      const xpEarned = 100 + p.objectivesCaptured * 50 + (isWinner ? 150 : 0);

      // Update persistent user career stats
      this.updateUserStats(p.userId, xpEarned, isWinner, p.score);

      const stat: PlayerMatchStat = {
        userId: p.userId,
        username: p.username,
        teamIndex: p.teamIndex,
        placement: index + 1,
        score: p.score,
        objectivesCaptured: p.objectivesCaptured,
        distanceMeters: Math.round(p.distanceTraveledMeters),
        xpEarned,
      };

      // Push to user match history
      const hist = this.userHistories.get(p.userId) || [];
      hist.unshift(stat);
      this.userHistories.set(p.userId, hist);

      return stat;
    });

    const now = new Date();
    await this.updateGameStatus(gameId, 'COMPLETED', game.startedAt, now);

    const durationSeconds = game.startedAt
      ? Math.floor((now.getTime() - new Date(game.startedAt).getTime()) / 1000)
      : game.durationSeconds;

    const result: MatchResultDetails = {
      matchId: gameId,
      roomCode: game.roomCode,
      title: game.title,
      mode: game.mode,
      outcome,
      winningTeamIndex,
      scoreTeamAlpha: scoreAlpha,
      scoreTeamOmega: scoreOmega,
      durationSeconds,
      playerStats,
      completedAt: now.toISOString(),
    };

    this.matchResults.set(gameId, result);
    return result;
  }

  async getMatchResult(gameId: string): Promise<MatchResultDetails | null> {
    return this.matchResults.get(gameId) || null;
  }

  async getUserMatchHistory(userId: string): Promise<PlayerMatchStat[]> {
    return this.userHistories.get(userId) || [];
  }

  // Phase 12: Teams & Social Parties
  async createParty(leaderId: string): Promise<PartyDetails> {
    const user = await this.findUserById(leaderId);
    const id = crypto.randomUUID();
    const partyCode = 'SQ' + Math.floor(1000 + Math.random() * 9000);
    const party: PartyDetails = {
      id,
      partyCode,
      leaderId,
      members: [
        {
          userId: leaderId,
          username: user?.username || 'leader',
          isLeader: true,
          joinedAt: new Date().toISOString(),
        },
      ],
    };
    this.parties.set(id, party);
    return party;
  }

  async findPartyByCode(code: string): Promise<PartyDetails | null> {
    const norm = code.trim().toUpperCase();
    for (const p of this.parties.values()) {
      if (p.partyCode.toUpperCase() === norm) return p;
    }
    return null;
  }

  async findPartyByUserId(userId: string): Promise<PartyDetails | null> {
    for (const p of this.parties.values()) {
      if (p.members.some((m) => m.userId === userId)) return p;
    }
    return null;
  }

  async joinParty(partyId: string, userId: string): Promise<PartyDetails> {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');
    const user = await this.findUserById(userId);
    if (!party.members.some((m) => m.userId === userId)) {
      party.members.push({
        userId,
        username: user?.username || 'member',
        isLeader: false,
        joinedAt: new Date().toISOString(),
      });
    }
    return party;
  }

  async leaveParty(partyId: string, userId: string): Promise<void> {
    const party = this.parties.get(partyId);
    if (!party) return;
    party.members = party.members.filter((m) => m.userId !== userId);
    if (party.members.length === 0) {
      this.parties.delete(partyId);
    } else if (party.leaderId === userId) {
      party.leaderId = party.members[0].userId;
      party.members[0].isLeader = true;
    }
  }

  async sendFriendRequest(userId: string, friendId: string): Promise<FriendRelationship> {
    const friend = await this.findUserById(friendId);
    const rel: FriendRelationship = {
      id: crypto.randomUUID(),
      userId,
      friendId,
      friendUsername: friend?.username || 'operative',
      status: 'ACCEPTED', // automatic acceptance for smooth testing
      createdAt: new Date().toISOString(),
    };
    const list = this.friends.get(userId) || [];
    list.push(rel);
    this.friends.set(userId, list);
    return rel;
  }

  async acceptFriendRequest(userId: string, friendId: string): Promise<void> {
    const list = this.friends.get(userId) || [];
    const rel = list.find((r) => r.friendId === friendId);
    if (rel) rel.status = 'ACCEPTED';
  }

  async getFriends(userId: string): Promise<FriendRelationship[]> {
    return this.friends.get(userId) || [];
  }

  // Phase 13: User Generated Content (UGC)
  async createUGCGame(ugc: Omit<UGCGameConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<UGCGameConfig> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: UGCGameConfig = {
      ...ugc,
      id,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };
    this.ugcGames.set(id, record);
    return record;
  }

  async getUGCGame(id: string): Promise<UGCGameConfig | null> {
    return this.ugcGames.get(id) || null;
  }

  async listUGCGames(status?: UGCStatus, creatorId?: string): Promise<UGCGameConfig[]> {
    const list: UGCGameConfig[] = [];
    for (const g of this.ugcGames.values()) {
      if (status && g.status !== status) continue;
      if (creatorId && g.creatorId !== creatorId) continue;
      list.push(g);
    }
    return list;
  }

  async publishUGCGame(id: string, creatorId: string): Promise<UGCGameConfig> {
    const game = this.ugcGames.get(id);
    if (!game) throw new Error('UGC Operation not found');
    if (game.creatorId !== creatorId) throw new Error('Unauthorized');
    game.status = 'PUBLISHED';
    game.updatedAt = new Date().toISOString();
    return game;
  }

  async reportUGCGame(id: string): Promise<void> {
    const game = this.ugcGames.get(id);
    if (game) {
      game.status = 'REPORTED';
    }
  }

  // Phase 10: Anti-Cheat
  async logAntiCheatIncident(record: Omit<AntiCheatLogRecord, 'id' | 'createdAt'>): Promise<void> {
    this.antiCheatLogs.push({
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  // Audit Events
  private events: Array<{
    id: string;
    gameId: string;
    eventType: string;
    payload: Record<string, any>;
    userId?: string;
    createdAt: Date;
  }> = [];

  async recordEvent(gameId: string, eventType: string, payload: Record<string, any>, userId?: string): Promise<void> {
    this.events.push({
      id: crypto.randomUUID(),
      gameId,
      eventType,
      payload,
      userId,
      createdAt: new Date(),
    });
  }
}

/**
 * PostgreSQL 15+ with PostGIS Spatial Engine
 * Authoritative production database store.
 */
export class PostgresDatabaseStore implements DatabaseStore {
  private pool: Pool;

  constructor(connectionString?: string) {
    const connStr = connectionString || config.databaseUrl;
    this.pool = new Pool({
      connectionString: connStr,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  getPool(): Pool {
    return this.pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async verifyConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  async createUser(data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord> {
    const res = await this.pool.query(
      `INSERT INTO users (username, display_name, email, password_hash, xp, level, games_played, wins, total_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, username, display_name AS "displayName", email, password_hash AS "passwordHash",
                 xp, level, games_played AS "gamesPlayed", wins, total_score AS "totalScore",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.username,
        data.displayName,
        data.email,
        data.passwordHash,
        data.xp || 0,
        data.level || 1,
        data.gamesPlayed || 0,
        data.wins || 0,
        data.totalScore || 0,
      ]
    );
    return res.rows[0];
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const res = await this.pool.query(
      `SELECT id, username, display_name AS "displayName", email, password_hash AS "passwordHash",
              xp, level, games_played AS "gamesPlayed", wins, total_score AS "totalScore",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    );
    return res.rows[0] || null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const res = await this.pool.query(
      `SELECT id, username, display_name AS "displayName", email, password_hash AS "passwordHash",
              xp, level, games_played AS "gamesPlayed", wins, total_score AS "totalScore",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const res = await this.pool.query(
      `SELECT id, username, display_name AS "displayName", email, password_hash AS "passwordHash",
              xp, level, games_played AS "gamesPlayed", wins, total_score AS "totalScore",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async searchUsers(query: string, excludeUserId?: string): Promise<UserRecord[]> {
    const pattern = `%${query.trim().toLowerCase()}%`;
    const res = await this.pool.query(
      `SELECT id, username, display_name AS "displayName", email, password_hash AS "passwordHash",
              xp, level, games_played AS "gamesPlayed", wins, total_score AS "totalScore",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users
       WHERE (LOWER(username) LIKE $1 OR LOWER(display_name) LIKE $1)
         AND ($2::uuid IS NULL OR id != $2::uuid)
       LIMIT 10`,
      [pattern, excludeUserId || null]
    );
    return res.rows;
  }

  async updateUserStats(userId: string, xpEarned: number, won: boolean, score: number): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET xp = xp + $1,
           level = FLOOR((xp + $1) / 500) + 1,
           games_played = games_played + 1,
           wins = wins + (CASE WHEN $2 = true THEN 1 ELSE 0 END),
           total_score = total_score + $3,
           updated_at = NOW()
       WHERE id = $4`,
      [xpEarned, won, score, userId]
    );
  }

  async createGame(data: Omit<GameRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<GameRecord> {
    const res = await this.pool.query(
      `INSERT INTO games (host_user_id, room_code, title, mode, status, boundary_lat, boundary_lng, boundary_radius_meters, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, host_user_id AS "hostUserId", room_code AS "roomCode", title, mode, status,
                 boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
                 boundary_radius_meters AS "boundaryRadiusMeters", duration_seconds AS "durationSeconds",
                 started_at AS "startedAt", ended_at AS "endedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        data.hostUserId,
        data.roomCode,
        data.title,
        data.mode,
        data.status,
        data.boundaryLat,
        data.boundaryLng,
        data.boundaryRadiusMeters,
        data.durationSeconds,
      ]
    );
    return res.rows[0];
  }

  async findGameById(id: string): Promise<GameRecord | null> {
    const res = await this.pool.query(
      `SELECT id, host_user_id AS "hostUserId", room_code AS "roomCode", title, mode, status,
              boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
              boundary_radius_meters AS "boundaryRadiusMeters", duration_seconds AS "durationSeconds",
              started_at AS "startedAt", ended_at AS "endedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM games WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async findGameByRoomCode(code: string): Promise<GameRecord | null> {
    const res = await this.pool.query(
      `SELECT id, host_user_id AS "hostUserId", room_code AS "roomCode", title, mode, status,
              boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
              boundary_radius_meters AS "boundaryRadiusMeters", duration_seconds AS "durationSeconds",
              started_at AS "startedAt", ended_at AS "endedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM games WHERE UPPER(room_code) = UPPER($1)`,
      [code.trim()]
    );
    return res.rows[0] || null;
  }

  async listActiveGames(
    lat?: number,
    lng?: number,
    maxDistanceMeters: number = 20000,
    mode?: GameMode
  ): Promise<GameRecord[]> {
    if (lat !== undefined && lng !== undefined) {
      // PostGIS spatial query using ST_DWithin and geography casting
      const res = await this.pool.query(
        `SELECT id, host_user_id AS "hostUserId", room_code AS "roomCode", title, mode, status,
                boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
                boundary_radius_meters AS "boundaryRadiusMeters", duration_seconds AS "durationSeconds",
                started_at AS "startedAt", ended_at AS "endedAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM games
         WHERE status IN ('LOBBY', 'ACTIVE')
           AND ($1::text IS NULL OR mode = $1)
           AND ST_DWithin(
             ST_MakePoint(boundary_lng, boundary_lat)::geography,
             ST_MakePoint($2, $3)::geography,
             $4
           )
         ORDER BY created_at DESC
         LIMIT 25`,
        [mode || null, lng, lat, maxDistanceMeters]
      );
      return res.rows;
    }

    const res = await this.pool.query(
      `SELECT id, host_user_id AS "hostUserId", room_code AS "roomCode", title, mode, status,
              boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
              boundary_radius_meters AS "boundaryRadiusMeters", duration_seconds AS "durationSeconds",
              started_at AS "startedAt", ended_at AS "endedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM games
       WHERE status IN ('LOBBY', 'ACTIVE')
         AND ($1::text IS NULL OR mode = $1)
       ORDER BY created_at DESC
       LIMIT 25`,
      [mode || null]
    );
    return res.rows;
  }

  async updateGameStatus(
    id: string,
    status: GameRecord['status'],
    startedAt?: Date,
    endedAt?: Date
  ): Promise<void> {
    await this.pool.query(
      `UPDATE games
       SET status = $1,
           started_at = COALESCE($2, started_at),
           ended_at = COALESCE($3, ended_at),
           updated_at = NOW()
       WHERE id = $4`,
      [status, startedAt || null, endedAt || null, id]
    );
  }

  async addPlayerToGame(
    gameId: string,
    userId: string,
    isHost: boolean = false,
    teamIndex: number = 0
  ): Promise<GamePlayerRecord> {
    const res = await this.pool.query(
      `INSERT INTO game_players (game_id, user_id, is_host, is_ready, team_index)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (game_id, user_id) DO UPDATE SET team_index = $5
       RETURNING game_id AS "gameId", user_id AS "userId", team_index AS "teamIndex",
                 is_host AS "isHost", is_ready AS "isReady", score,
                 objectives_captured AS "objectivesCaptured",
                 distance_traveled_meters AS "distanceTraveledMeters",
                 last_known_lat AS "lastKnownLat", last_known_lng AS "lastKnownLng",
                 last_telemetry_at AS "lastTelemetryAt", joined_at AS "joinedAt"`,
      [gameId, userId, isHost, isHost, teamIndex]
    );

    const user = await this.findUserById(userId);
    return {
      ...res.rows[0],
      username: user?.username || 'operative',
      displayName: user?.displayName || 'Operative',
    };
  }

  async getGamePlayers(gameId: string): Promise<GamePlayerRecord[]> {
    const res = await this.pool.query(
      `SELECT gp.game_id AS "gameId", gp.user_id AS "userId", u.username, u.display_name AS "displayName",
              gp.team_index AS "teamIndex", gp.is_host AS "isHost", gp.is_ready AS "isReady",
              gp.score, gp.objectives_captured AS "objectivesCaptured",
              gp.distance_traveled_meters AS "distanceTraveledMeters",
              gp.last_known_lat AS "lastKnownLat", gp.last_known_lng AS "lastKnownLng",
              gp.last_telemetry_at AS "lastTelemetryAt", gp.joined_at AS "joinedAt"
       FROM game_players gp
       JOIN users u ON u.id = gp.user_id
       WHERE gp.game_id = $1
       ORDER BY gp.joined_at ASC`,
      [gameId]
    );
    return res.rows;
  }

  async getGamePlayer(gameId: string, userId: string): Promise<GamePlayerRecord | null> {
    const res = await this.pool.query(
      `SELECT gp.game_id AS "gameId", gp.user_id AS "userId", u.username, u.display_name AS "displayName",
              gp.team_index AS "teamIndex", gp.is_host AS "isHost", gp.is_ready AS "isReady",
              gp.score, gp.objectives_captured AS "objectivesCaptured",
              gp.distance_traveled_meters AS "distanceTraveledMeters",
              gp.last_known_lat AS "lastKnownLat", gp.last_known_lng AS "lastKnownLng",
              gp.last_telemetry_at AS "lastTelemetryAt", gp.joined_at AS "joinedAt"
       FROM game_players gp
       JOIN users u ON u.id = gp.user_id
       WHERE gp.game_id = $1 AND gp.user_id = $2`,
      [gameId, userId]
    );
    return res.rows[0] || null;
  }

  async updatePlayerReady(gameId: string, userId: string, isReady: boolean): Promise<void> {
    await this.pool.query(
      `UPDATE game_players SET is_ready = $1 WHERE game_id = $2 AND user_id = $3`,
      [isReady, gameId, userId]
    );
  }

  async updatePlayerTeam(gameId: string, userId: string, teamIndex: number): Promise<void> {
    await this.pool.query(
      `UPDATE game_players SET team_index = $1 WHERE game_id = $2 AND user_id = $3`,
      [teamIndex, gameId, userId]
    );
  }

  async updatePlayerScore(gameId: string, userId: string, pointsDelta: number): Promise<void> {
    await this.pool.query(
      `UPDATE game_players
       SET score = score + $1,
           objectives_captured = objectives_captured + 1
       WHERE game_id = $2 AND user_id = $3`,
      [pointsDelta, gameId, userId]
    );
  }

  async updatePlayerTelemetry(
    gameId: string,
    userId: string,
    lat: number,
    lng: number,
    distanceDelta: number,
    telemetryAt?: Date
  ): Promise<void> {
    const timestamp = telemetryAt || new Date();
    await this.pool.query(
      `UPDATE game_players
       SET last_known_lat = $1,
           last_known_lng = $2,
           distance_traveled_meters = distance_traveled_meters + $3,
           last_telemetry_at = $4
       WHERE game_id = $5 AND user_id = $6`,
      [lat, lng, distanceDelta, timestamp, gameId, userId]
    );
  }

  async removePlayerFromGame(gameId: string, userId: string): Promise<void> {
    await this.pool.query(`DELETE FROM game_players WHERE game_id = $1 AND user_id = $2`, [gameId, userId]);
  }

  async createObjectives(objectivesData: Omit<ObjectiveRecord, 'id' | 'createdAt'>[]): Promise<ObjectiveRecord[]> {
    const created: ObjectiveRecord[] = [];
    for (const obj of objectivesData) {
      const res = await this.pool.query(
        `INSERT INTO objectives (game_id, code, title, latitude, longitude, capture_radius_meters, points, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, game_id AS "gameId", code, title, latitude, longitude,
                   capture_radius_meters AS "captureRadiusMeters", points, status,
                   captured_by_team AS "capturedByTeam", captured_by_user_id AS "capturedByUserId",
                   captured_at AS "capturedAt", created_at AS "createdAt"`,
        [
          obj.gameId,
          obj.code,
          obj.title,
          obj.latitude,
          obj.longitude,
          obj.captureRadiusMeters,
          obj.points,
          obj.status,
        ]
      );
      created.push(res.rows[0]);
    }
    return created;
  }

  async getObjectivesByGame(gameId: string): Promise<ObjectiveRecord[]> {
    const res = await this.pool.query(
      `SELECT id, game_id AS "gameId", code, title, latitude, longitude,
              capture_radius_meters AS "captureRadiusMeters", points, status,
              captured_by_team AS "capturedByTeam", captured_by_user_id AS "capturedByUserId",
              captured_at AS "capturedAt", created_at AS "createdAt"
       FROM objectives WHERE game_id = $1 ORDER BY code ASC`,
      [gameId]
    );
    return res.rows;
  }

  async getObjectiveById(id: string): Promise<ObjectiveRecord | null> {
    const res = await this.pool.query(
      `SELECT id, game_id AS "gameId", code, title, latitude, longitude,
              capture_radius_meters AS "captureRadiusMeters", points, status,
              captured_by_team AS "capturedByTeam", captured_by_user_id AS "capturedByUserId",
              captured_at AS "capturedAt", created_at AS "createdAt"
       FROM objectives WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async captureObjective(id: string, userId: string, teamIndex: number): Promise<ObjectiveRecord | null> {
    const res = await this.pool.query(
      `UPDATE objectives
       SET status = 'SECURED',
           captured_by_user_id = $1,
           captured_by_team = $2,
           captured_at = NOW()
       WHERE id = $3 AND status != 'SECURED'
       RETURNING id, game_id AS "gameId", code, title, latitude, longitude,
                 capture_radius_meters AS "captureRadiusMeters", points, status,
                 captured_by_team AS "capturedByTeam", captured_by_user_id AS "capturedByUserId",
                 captured_at AS "capturedAt", created_at AS "createdAt"`,
      [userId, teamIndex, id]
    );
    return res.rows[0] || null;
  }

  // Phase 9: Results & Progression with ACID Transaction
  async finalizeMatch(gameId: string): Promise<MatchResultDetails> {
    const existing = await this.getMatchResult(gameId);
    if (existing) return existing;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const gameRes = await client.query(
        `SELECT id, room_code AS "roomCode", title, mode, duration_seconds AS "durationSeconds", started_at AS "startedAt"
         FROM games WHERE id = $1 FOR UPDATE`,
        [gameId]
      );
      if (gameRes.rows.length === 0) throw new Error('Game not found');
      const game = gameRes.rows[0];

      const playersRes = await client.query(
        `SELECT gp.user_id AS "userId", u.username, gp.team_index AS "teamIndex", gp.score,
                gp.objectives_captured AS "objectivesCaptured", gp.distance_traveled_meters AS "distanceTraveledMeters"
         FROM game_players gp
         JOIN users u ON u.id = gp.user_id
         WHERE gp.game_id = $1`,
        [gameId]
      );
      const players = playersRes.rows;

      const scoreAlpha = players.filter((p: any) => p.teamIndex === 0).reduce((s: number, p: any) => s + p.score, 0);
      const scoreOmega = players.filter((p: any) => p.teamIndex === 1).reduce((s: number, p: any) => s + p.score, 0);

      let outcome: 'VICTORY' | 'DEFEAT' | 'DRAW' = 'DRAW';
      let winningTeamIndex: number | undefined = undefined;

      if (scoreAlpha > scoreOmega) {
        outcome = 'VICTORY';
        winningTeamIndex = 0;
      } else if (scoreOmega > scoreAlpha) {
        outcome = 'DEFEAT';
        winningTeamIndex = 1;
      }

      const now = new Date();
      const durationSeconds = game.startedAt
        ? Math.floor((now.getTime() - new Date(game.startedAt).getTime()) / 1000)
        : game.durationSeconds;

      // 1. Insert match_results
      const matchResultRes = await client.query(
        `INSERT INTO match_results (game_id, room_code, title, mode, outcome, winning_team_index, score_team_alpha, score_team_omega, duration_seconds, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          gameId,
          game.roomCode,
          game.title,
          game.mode,
          outcome,
          winningTeamIndex ?? null,
          scoreAlpha,
          scoreOmega,
          durationSeconds,
          now,
        ]
      );
      const matchResultId = matchResultRes.rows[0].id;

      // 2. Insert player_match_results & update user career progression
      const sorted = [...players].sort((a: any, b: any) => b.score - a.score);
      const playerStats: PlayerMatchStat[] = [];

      for (let idx = 0; idx < sorted.length; idx++) {
        const p = sorted[idx];
        const isWinner = winningTeamIndex !== undefined && p.teamIndex === winningTeamIndex;
        const xpEarned = 100 + p.objectivesCaptured * 50 + (isWinner ? 150 : 0);

        await client.query(
          `INSERT INTO player_match_results (match_result_id, user_id, username, team_index, placement, score, objectives_captured, distance_traveled_meters, xp_earned, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            matchResultId,
            p.userId,
            p.username,
            p.teamIndex,
            idx + 1,
            p.score,
            p.objectivesCaptured,
            p.distanceTraveledMeters,
            xpEarned,
            now,
          ]
        );

        await client.query(
          `UPDATE users
           SET xp = xp + $1,
               level = FLOOR((xp + $1) / 500) + 1,
               games_played = games_played + 1,
               wins = wins + (CASE WHEN $2 = true THEN 1 ELSE 0 END),
               total_score = total_score + $3,
               updated_at = NOW()
           WHERE id = $4`,
          [xpEarned, isWinner, p.score, p.userId]
        );

        playerStats.push({
          userId: p.userId,
          username: p.username,
          teamIndex: p.teamIndex,
          placement: idx + 1,
          score: p.score,
          objectivesCaptured: p.objectivesCaptured,
          distanceMeters: Math.round(p.distanceTraveledMeters),
          xpEarned,
        });
      }

      // 3. Mark game as COMPLETED
      await client.query(
        `UPDATE games SET status = 'COMPLETED', ended_at = $1, updated_at = NOW() WHERE id = $2`,
        [now, gameId]
      );

      await client.query('COMMIT');

      return {
        matchId: gameId,
        roomCode: game.roomCode,
        title: game.title,
        mode: game.mode,
        outcome,
        winningTeamIndex,
        scoreTeamAlpha: scoreAlpha,
        scoreTeamOmega: scoreOmega,
        durationSeconds,
        playerStats,
        completedAt: now.toISOString(),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getMatchResult(gameId: string): Promise<MatchResultDetails | null> {
    const res = await this.pool.query(
      `SELECT id, game_id AS "gameId", room_code AS "roomCode", title, mode, outcome,
              winning_team_index AS "winningTeamIndex", score_team_alpha AS "scoreTeamAlpha",
              score_team_omega AS "scoreTeamOmega", duration_seconds AS "durationSeconds",
              completed_at AS "completedAt"
       FROM match_results WHERE game_id = $1`,
      [gameId]
    );
    if (res.rows.length === 0) return null;
    const mr = res.rows[0];

    const statsRes = await this.pool.query(
      `SELECT user_id AS "userId", username, team_index AS "teamIndex", placement,
              score, objectives_captured AS "objectivesCaptured",
              distance_traveled_meters AS "distanceMeters", xp_earned AS "xpEarned"
       FROM player_match_results WHERE match_result_id = $1 ORDER BY placement ASC`,
      [mr.id]
    );

    return {
      matchId: mr.gameId,
      roomCode: mr.roomCode,
      title: mr.title,
      mode: mr.mode,
      outcome: mr.outcome,
      winningTeamIndex: mr.winningTeamIndex,
      scoreTeamAlpha: mr.scoreTeamAlpha,
      scoreTeamOmega: mr.scoreTeamOmega,
      durationSeconds: mr.durationSeconds,
      playerStats: statsRes.rows,
      completedAt: new Date(mr.completedAt).toISOString(),
    };
  }

  async getUserMatchHistory(userId: string): Promise<PlayerMatchStat[]> {
    const res = await this.pool.query(
      `SELECT pmr.user_id AS "userId", pmr.username, pmr.team_index AS "teamIndex",
              pmr.placement, pmr.score, pmr.objectives_captured AS "objectivesCaptured",
              pmr.distance_traveled_meters AS "distanceMeters", pmr.xp_earned AS "xpEarned"
       FROM player_match_results pmr
       JOIN match_results mr ON mr.id = pmr.match_result_id
       WHERE pmr.user_id = $1
       ORDER BY mr.completed_at DESC
       LIMIT 20`,
      [userId]
    );
    return res.rows;
  }

  // Phase 12: Parties & Squads
  async createParty(leaderId: string): Promise<PartyDetails> {
    const partyCode = 'SQ' + Math.floor(1000 + Math.random() * 9000);
    const res = await this.pool.query(
      `INSERT INTO parties (party_code, leader_id) VALUES ($1, $2) RETURNING id`,
      [partyCode, leaderId]
    );
    const partyId = res.rows[0].id;

    await this.pool.query(`INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)`, [partyId, leaderId]);
    const leader = await this.findUserById(leaderId);

    return {
      id: partyId,
      partyCode,
      leaderId,
      members: [
        {
          userId: leaderId,
          username: leader?.username || 'leader',
          isLeader: true,
          joinedAt: new Date().toISOString(),
        },
      ],
    };
  }

  async findPartyByCode(code: string): Promise<PartyDetails | null> {
    const res = await this.pool.query(
      `SELECT id, party_code AS "partyCode", leader_id AS "leaderId", current_game_id AS "currentGameId"
       FROM parties WHERE UPPER(party_code) = UPPER($1)`,
      [code.trim()]
    );
    if (res.rows.length === 0) return null;
    const p = res.rows[0];

    const membersRes = await this.pool.query(
      `SELECT pm.user_id AS "userId", u.username, (pm.user_id = $1) AS "isLeader", pm.joined_at AS "joinedAt"
       FROM party_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.party_id = $2
       ORDER BY pm.joined_at ASC`,
      [p.leaderId, p.id]
    );

    return {
      id: p.id,
      partyCode: p.partyCode,
      leaderId: p.leaderId,
      currentGameId: p.currentGameId,
      members: membersRes.rows.map((m: any) => ({
        ...m,
        joinedAt: new Date(m.joinedAt).toISOString(),
      })),
    };
  }

  async findPartyByUserId(userId: string): Promise<PartyDetails | null> {
    const res = await this.pool.query(
      `SELECT p.id, p.party_code AS "partyCode", p.leader_id AS "leaderId", p.current_game_id AS "currentGameId"
       FROM parties p
       JOIN party_members pm ON pm.party_id = p.id
       WHERE pm.user_id = $1`,
      [userId]
    );
    if (res.rows.length === 0) return null;
    const p = res.rows[0];

    const membersRes = await this.pool.query(
      `SELECT pm.user_id AS "userId", u.username, (pm.user_id = $1) AS "isLeader", pm.joined_at AS "joinedAt"
       FROM party_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.party_id = $2
       ORDER BY pm.joined_at ASC`,
      [p.leaderId, p.id]
    );

    return {
      id: p.id,
      partyCode: p.partyCode,
      leaderId: p.leaderId,
      currentGameId: p.currentGameId,
      members: membersRes.rows.map((m: any) => ({
        ...m,
        joinedAt: new Date(m.joinedAt).toISOString(),
      })),
    };
  }

  async joinParty(partyId: string, userId: string): Promise<PartyDetails> {
    await this.pool.query(
      `INSERT INTO party_members (party_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [partyId, userId]
    );
    const party = await this.pool.query(
      `SELECT id, party_code AS "partyCode", leader_id AS "leaderId", current_game_id AS "currentGameId"
       FROM parties WHERE id = $1`,
      [partyId]
    );
    const p = party.rows[0];
    const membersRes = await this.pool.query(
      `SELECT pm.user_id AS "userId", u.username, (pm.user_id = $1) AS "isLeader", pm.joined_at AS "joinedAt"
       FROM party_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.party_id = $2
       ORDER BY pm.joined_at ASC`,
      [p.leaderId, p.id]
    );
    return {
      id: p.id,
      partyCode: p.partyCode,
      leaderId: p.leaderId,
      currentGameId: p.currentGameId,
      members: membersRes.rows.map((m: any) => ({
        ...m,
        joinedAt: new Date(m.joinedAt).toISOString(),
      })),
    };
  }

  async leaveParty(partyId: string, userId: string): Promise<void> {
    await this.pool.query(`DELETE FROM party_members WHERE party_id = $1 AND user_id = $2`, [partyId, userId]);
    const remaining = await this.pool.query(`SELECT user_id FROM party_members WHERE party_id = $1 ORDER BY joined_at ASC`, [partyId]);
    if (remaining.rows.length === 0) {
      await this.pool.query(`DELETE FROM parties WHERE id = $1`, [partyId]);
    } else {
      await this.pool.query(`UPDATE parties SET leader_id = $1 WHERE id = $2`, [remaining.rows[0].user_id, partyId]);
    }
  }

  async sendFriendRequest(userId: string, friendId: string): Promise<FriendRelationship> {
    const res = await this.pool.query(
      `INSERT INTO friends (user_id, friend_id, status)
       VALUES ($1, $2, 'ACCEPTED')
       ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'ACCEPTED'
       RETURNING id, user_id AS "userId", friend_id AS "friendId", status, created_at AS "createdAt"`,
      [userId, friendId]
    );
    const friend = await this.findUserById(friendId);
    return {
      ...res.rows[0],
      friendUsername: friend?.username || 'operative',
      createdAt: new Date(res.rows[0].createdAt).toISOString(),
    };
  }

  async acceptFriendRequest(userId: string, friendId: string): Promise<void> {
    await this.pool.query(
      `UPDATE friends SET status = 'ACCEPTED' WHERE user_id = $1 AND friend_id = $2`,
      [userId, friendId]
    );
  }

  async getFriends(userId: string): Promise<FriendRelationship[]> {
    const res = await this.pool.query(
      `SELECT f.id, f.user_id AS "userId", f.friend_id AS "friendId", u.username AS "friendUsername",
              f.status, f.created_at AS "createdAt"
       FROM friends f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = $1`,
      [userId]
    );
    return res.rows.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  }

  // Phase 13: UGC Custom Operations
  async createUGCGame(ugc: Omit<UGCGameConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<UGCGameConfig> {
    const res = await this.pool.query(
      `INSERT INTO ugc_games (creator_id, title, description, mode, boundary_lat, boundary_lng, boundary_radius_meters, duration_minutes, max_players, objectives, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DRAFT')
       RETURNING id, creator_id AS "creatorId", title, description, mode,
                 boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
                 boundary_radius_meters AS "boundaryRadiusMeters", duration_minutes AS "durationMinutes",
                 max_players AS "maxPlayers", objectives, status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        ugc.creatorId,
        ugc.title,
        ugc.description,
        ugc.mode,
        ugc.boundaryLat,
        ugc.boundaryLng,
        ugc.boundaryRadiusMeters,
        ugc.durationMinutes,
        ugc.maxPlayers,
        JSON.stringify(ugc.objectives),
      ]
    );
    const r = res.rows[0];
    return {
      ...r,
      objectives: typeof r.objectives === 'string' ? JSON.parse(r.objectives) : r.objectives,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  async getUGCGame(id: string): Promise<UGCGameConfig | null> {
    const res = await this.pool.query(
      `SELECT id, creator_id AS "creatorId", title, description, mode,
              boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
              boundary_radius_meters AS "boundaryRadiusMeters", duration_minutes AS "durationMinutes",
              max_players AS "maxPlayers", objectives, status,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM ugc_games WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      objectives: typeof r.objectives === 'string' ? JSON.parse(r.objectives) : r.objectives,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  async listUGCGames(status?: UGCStatus, creatorId?: string): Promise<UGCGameConfig[]> {
    const res = await this.pool.query(
      `SELECT id, creator_id AS "creatorId", title, description, mode,
              boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
              boundary_radius_meters AS "boundaryRadiusMeters", duration_minutes AS "durationMinutes",
              max_players AS "maxPlayers", objectives, status,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM ugc_games
       WHERE ($1::text IS NULL OR status = $1)
         AND ($2::uuid IS NULL OR creator_id = $2::uuid)
       ORDER BY created_at DESC LIMIT 50`,
      [status || null, creatorId || null]
    );
    return res.rows.map((r: any) => ({
      ...r,
      objectives: typeof r.objectives === 'string' ? JSON.parse(r.objectives) : r.objectives,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    }));
  }

  async publishUGCGame(id: string, creatorId: string): Promise<UGCGameConfig> {
    const res = await this.pool.query(
      `UPDATE ugc_games
       SET status = 'PUBLISHED', updated_at = NOW()
       WHERE id = $1 AND creator_id = $2
       RETURNING id, creator_id AS "creatorId", title, description, mode,
                 boundary_lat AS "boundaryLat", boundary_lng AS "boundaryLng",
                 boundary_radius_meters AS "boundaryRadiusMeters", duration_minutes AS "durationMinutes",
                 max_players AS "maxPlayers", objectives, status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, creatorId]
    );
    if (res.rows.length === 0) throw new Error('UGC Operation not found or unauthorized');
    const r = res.rows[0];
    return {
      ...r,
      objectives: typeof r.objectives === 'string' ? JSON.parse(r.objectives) : r.objectives,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  async reportUGCGame(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE ugc_games SET status = 'REPORTED', report_count = report_count + 1 WHERE id = $1`,
      [id]
    );
  }

  // Phase 10: Anti-Cheat & Telemetry
  async logAntiCheatIncident(record: Omit<AntiCheatLogRecord, 'id' | 'createdAt'>): Promise<void> {
    await this.pool.query(
      `INSERT INTO anti_cheat_logs (game_id, user_id, incident_type, calculated_value, threshold_value, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        record.gameId || null,
        record.userId || null,
        record.incidentType,
        record.calculatedValue || null,
        record.thresholdValue || null,
        JSON.stringify(record.payload || {}),
      ]
    );
  }

  async recordEvent(gameId: string, eventType: string, payload: Record<string, any>, userId?: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO game_events (game_id, user_id, event_type, payload)
       VALUES ($1, $2, $3, $4)`,
      [gameId, userId || null, eventType, JSON.stringify(payload || {})]
    );
  }
}

/**
 * Factory function for creating a database store instance.
 * Enforces production rules:
 * - Production strictly requires DATABASE_URL
 * - Production strictly connects to PostgreSQL
 * - Production must NEVER silently downgrade to memory store
 */
export function createDatabaseStore(options?: {
  isProduction?: boolean;
  usePostgres?: boolean;
  databaseUrl?: string;
}): DatabaseStore {
  const isProd = options?.isProduction !== undefined ? options.isProduction : config.isProduction;
  const usePg = options?.usePostgres !== undefined ? options.usePostgres : (process.env.USE_POSTGRES === 'true');
  const dbUrl = options?.databaseUrl !== undefined ? options.databaseUrl : config.databaseUrl;

  if (isProd) {
    if (!dbUrl || dbUrl.trim() === '') {
      throw new Error(
        '[FATAL CONFIG ERROR] DATABASE_URL environment variable is required in production mode. ' +
          'Production must never silently downgrade to in-memory infrastructure.'
      );
    }
    return new PostgresDatabaseStore(dbUrl);
  }

  if (usePg) {
    return new PostgresDatabaseStore(dbUrl);
  }

  return new MemoryDatabaseStore();
}

// Global active store instance
export const db: DatabaseStore = createDatabaseStore();


