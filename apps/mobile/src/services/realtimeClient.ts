/**
 * @ruins/mobile - Realtime WebSocket Client
 * Connects to the RUINS backend WebSocket gateway for real-time multiplayer telemetry.
 */

import { apiClient } from './apiClient';

export type RealtimeEventHandler = (payload: any) => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private currentGameId: string | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();

  connect(gameId?: string) {
    if (gameId) this.currentGameId = gameId;

    const baseUrl = apiClient.getBaseUrl();
    const wsUrl =
      process.env.EXPO_PUBLIC_WS_URL ||
      baseUrl.replace(/^http/, 'ws') + '/ws';

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        const token = apiClient.getToken();
        if (token) {
          this.send('AUTH', { token });
        }
        if (this.currentGameId) {
          this.send('JOIN_MATCH', { gameId: this.currentGameId });
        }

        // Start heartbeat ping every 25 seconds
        this.pingTimer = setInterval(() => {
          this.send('PING', {});
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          if (type === 'AUTHENTICATED' && this.currentGameId) {
            this.send('JOIN_MATCH', { gameId: this.currentGameId });
          }

          const handlers = this.listeners.get(type);
          if (handlers) {
            handlers.forEach((h) => h(payload));
          }
        } catch (err) {
          console.warn('[RealtimeClient] Parse message error:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        if (this.pingTimer) clearInterval(this.pingTimer);

        // Schedule auto-reconnect if match is active
        if (this.currentGameId && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[RealtimeClient] WebSocket error:', err);
      };
    } catch (err) {
      console.warn('[RealtimeClient] Connection error:', err);
    }
  }

  joinMatch(gameId: string) {
    this.currentGameId = gameId;
    if (this.isConnected) {
      this.send('JOIN_MATCH', { gameId });
    } else {
      this.connect(gameId);
    }
  }

  sendLocation(coords: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
  }) {
    if (this.isConnected && this.currentGameId) {
      this.send('LOCATION_UPDATE', coords);
    }
  }

  private send(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  on(event: string, handler: RealtimeEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  disconnect() {
    this.currentGameId = null;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

export const realtimeClient = new RealtimeClient();
