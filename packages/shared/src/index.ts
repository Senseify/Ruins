/**
 * @ruins/shared
 * Centralized shared domain models, DTOs, and event contracts across RUINS.
 */

// 1. Health & System
export interface ServerHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  uptimeSeconds: number;
  timestamp: string;
  version: string;
  environment: string;
  database: 'postgresql_postgis' | 'memory_engine';
}

// 2. User & Profile
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  xp: number;
  level: number;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
  avatarUrl?: string;
  createdAt?: string;
}

// 3. Geospatial & Telemetry
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

// 4. Game Modes & Statuses
export type GameMode = 'CONVERGENCE' | 'HUNT' | 'EXTRACTION' | 'TERRITORY' | 'RELAY';

export type MatchStatus = 'LOBBY' | 'ACTIVE' | 'COMPLETED' | 'ABORTED';

export type ObjectiveStatus = 'DORMANT' | 'ACTIVE' | 'CAPTURING' | 'SECURED';

export interface Objective {
  id: string;
  code: string; // e.g. "OBJ 01"
  title: string; // e.g. "THE SIGNAL"
  coordinate: GeoCoordinate;
  captureRadiusMeters: number;
  points: number;
  status: ObjectiveStatus;
  capturedByTeam?: number;
  capturedByUserId?: string;
  capturedAt?: string;
  distanceMeters?: number;
}

// 5. Lobby & Match Details
export interface LobbyPlayer {
  userId: string;
  username: string;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  teamIndex: number; // 0 = Alpha, 1 = Omega
  score?: number;
  distanceTraveledMeters?: number;
  lastKnownLat?: number;
  lastKnownLng?: number;
}

export interface GameDetails {
  id: string;
  roomCode: string;
  title: string;
  mode: GameMode;
  status: MatchStatus;
  boundaryLat: number;
  boundaryLng: number;
  boundaryRadiusMeters: number;
  durationSeconds: number;
  hostUserId: string;
  players: LobbyPlayer[];
  objectives: Objective[];
  remainingSeconds: number;
  startedAt?: string;
  endedAt?: string;
}

// 6. Match Results & Progression
export interface PlayerMatchStat {
  userId: string;
  username: string;
  teamIndex: number;
  placement: number;
  score: number;
  objectivesCaptured: number;
  distanceMeters: number;
  xpEarned: number;
}

export interface MatchResultDetails {
  matchId: string;
  roomCode: string;
  title: string;
  mode: GameMode;
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
  winningTeamIndex?: number;
  scoreTeamAlpha: number;
  scoreTeamOmega: number;
  durationSeconds: number;
  playerStats: PlayerMatchStat[];
  completedAt: string;
}

// 7. User Generated Content (UGC)
export type UGCStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'REPORTED';

export interface UGCObjectiveConfig {
  code: string;
  title: string;
  latitude: number;
  longitude: number;
  captureRadiusMeters: number;
  points: number;
}

export interface UGCGameConfig {
  id?: string;
  creatorId: string;
  title: string;
  description: string;
  mode: GameMode;
  boundaryLat: number;
  boundaryLng: number;
  boundaryRadiusMeters: number;
  durationMinutes: number;
  maxPlayers: number;
  objectives: UGCObjectiveConfig[];
  status: UGCStatus;
  createdAt?: string;
  updatedAt?: string;
}

// 8. Social & Teams
export interface PartyMember {
  userId: string;
  username: string;
  isLeader: boolean;
  joinedAt: string;
}

export interface PartyDetails {
  id: string;
  partyCode: string;
  leaderId: string;
  members: PartyMember[];
  currentGameId?: string;
}

export interface FriendRelationship {
  id: string;
  userId: string;
  friendId: string;
  friendUsername: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: string;
}

// 9. AI Mission Briefing (Structured Schema)
export interface AIMissionBriefing {
  operationCodename: string;
  thematicBriefing: string;
  tacticalAdvisory: string;
  objectiveClues: Array<{
    objectiveCode: string;
    narrativeClue: string;
  }>;
}
