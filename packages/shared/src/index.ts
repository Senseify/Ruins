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
  xp: number;
  avatarUrl?: string;
}

export type MatchStatus = 'LOBBY' | 'ACTIVE' | 'COMPLETED' | 'ABORTED';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}
