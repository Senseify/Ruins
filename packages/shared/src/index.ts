/**
 * @ruins/shared
 * Shared contracts, types, and schemas across mobile client and server
 */

export interface ServerHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  uptimeSeconds: number;
  timestamp: string;
  version: string;
}

export interface PlayerProfile {
  id: string;
  username: string;
  callsign: string;
  xp: number;
  level: number;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
  avatarUrl?: string;
}

export type MatchStatus = 'LOBBY' | 'ACTIVE' | 'COMPLETED' | 'ABORTED';

export type GameMode = 'CONVERGENCE';

export type ObjectiveStatus = 'DORMANT' | 'ACTIVE' | 'CAPTURING' | 'SECURED';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface Objective {
  id: string;
  code: string; // e.g. "OBJ 01"
  title: string; // e.g. "THE SIGNAL"
  coordinate: GeoCoordinate;
  captureRadiusMeters: number;
  points: number;
  status: ObjectiveStatus;
  capturedByTeam?: number;
  distanceMeters?: number;
}

export interface LobbyPlayer {
  id: string;
  username: string;
  callsign: string;
  isHost: boolean;
  isReady: boolean;
  teamIndex: number; // 0 = Alpha, 1 = Omega
}

export interface GameDetails {
  id: string;
  roomCode: string;
  title: string;
  mode: GameMode;
  status: MatchStatus;
  radiusMeters: number;
  durationMinutes: number;
  hostId: string;
  players: LobbyPlayer[];
  objectives: Objective[];
  remainingSeconds: number;
}

export interface MatchResult {
  matchId: string;
  roomCode: string;
  title: string;
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
  scoreTeamAlpha: number;
  scoreTeamOmega: number;
  playerPlacement: number;
  playerScore: number;
  objectivesCaptured: number;
  distanceMeters: number;
  durationSeconds: number;
  completedAt: string;
}
