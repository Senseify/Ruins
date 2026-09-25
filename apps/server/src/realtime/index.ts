import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { verifyToken } from '../modules/auth';
import { db } from '../db';

interface ConnectedClient {
  socket: WebSocket;
  userId: string;
  username: string;
  gameId?: string;
  lastTelemetrySentAt: number;
}

class RealtimeManager {
  private clients: Map<string, ConnectedClient> = new Map(); // socketKey -> client
  private gameRooms: Map<string, Set<string>> = new Map(); // gameId -> socketKeys

  registerSocket(socket: WebSocket) {
    const socketKey = crypto.randomUUID();
    let clientRecord: ConnectedClient | null = null;

    socket.on('message', async (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;

        switch (type) {
          // 1. Authenticate Socket
          case 'AUTH': {
            const token = payload?.token;
            const verified = token ? verifyToken(token) : null;
            if (!verified) {
              socket.send(JSON.stringify({ type: 'ERROR', message: 'INVALID_AUTH_TOKEN' }));
              return;
            }

            const user = await db.findUserById(verified.userId);
            if (!user) {
              socket.send(JSON.stringify({ type: 'ERROR', message: 'USER_NOT_FOUND' }));
              return;
            }

            clientRecord = {
              socket,
              userId: user.id,
              username: user.username,
              lastTelemetrySentAt: 0,
            };
            this.clients.set(socketKey, clientRecord);

            socket.send(
              JSON.stringify({
                type: 'AUTHENTICATED',
                payload: { userId: user.id, username: user.username },
              })
            );
            break;
          }

          // 2. Join Match Realtime Room
          case 'JOIN_MATCH': {
            if (!clientRecord) {
              socket.send(JSON.stringify({ type: 'ERROR', message: 'UNAUTHENTICATED' }));
              return;
            }

            const gameId = payload?.gameId;
            const game = await db.findGameById(gameId);
            if (!game) {
              socket.send(JSON.stringify({ type: 'ERROR', message: 'GAME_NOT_FOUND' }));
              return;
            }

            clientRecord.gameId = gameId;

            // Add to room
            if (!this.gameRooms.has(gameId)) {
              this.gameRooms.set(gameId, new Set());
            }
            this.gameRooms.get(gameId)!.add(socketKey);

            // Reconnect state synchronization: Send full match snapshot to client
            const players = await db.getGamePlayers(gameId);
            const objectives = await db.getObjectivesByGame(gameId);

            socket.send(
              JSON.stringify({
                type: 'STATE_SYNC',
                payload: {
                  game,
                  players,
                  objectives,
                },
              })
            );
            break;
          }

          // 3. Location Telemetry from Client (Throttled & Validated)
          case 'LOCATION_UPDATE': {
            if (!clientRecord || !clientRecord.gameId) return;

            const { latitude, longitude, speed = 0, heading = 0 } = payload || {};
            const now = Date.now();

            // Throttle to 1 Hz max to conserve mobile client battery and server network bandwidth
            if (now - clientRecord.lastTelemetrySentAt < 900) {
              return;
            }
            clientRecord.lastTelemetrySentAt = now;

            // Update in-memory player state
            await db.updatePlayerTelemetry(clientRecord.gameId, clientRecord.userId, latitude, longitude, 0);

            // Broadcast to other operatives in this game room
            this.broadcastToGame(
              clientRecord.gameId,
              'player_location_updated',
              {
                userId: clientRecord.userId,
                latitude,
                longitude,
                speed,
                heading,
              },
              socketKey // don't echo back to sender
            );
            break;
          }

          // 4. Heartbeat Ping / Pong
          case 'PING': {
            socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            break;
          }
        }
      } catch (err) {
        console.warn('[RealtimeManager] Message handling error:', err);
      }
    });

    socket.on('close', () => {
      if (clientRecord?.gameId) {
        const room = this.gameRooms.get(clientRecord.gameId);
        if (room) {
          room.delete(socketKey);
          if (room.size === 0) {
            this.gameRooms.delete(clientRecord.gameId);
          }
        }

        // Notify peers of disconnect
        this.broadcastToGame(clientRecord.gameId, 'player_disconnected', {
          userId: clientRecord.userId,
          username: clientRecord.username,
        });
      }
      this.clients.delete(socketKey);
    });
  }

  /**
   * Broadcasts an event to all connected sockets in a game room
   */
  broadcastToGame(
    gameId: string,
    eventType: string,
    payload: any,
    excludeSocketKey?: string
  ) {
    const room = this.gameRooms.get(gameId);
    if (!room) return;

    const message = JSON.stringify({ type: eventType, payload });
    for (const sKey of room) {
      if (sKey === excludeSocketKey) continue;
      const client = this.clients.get(sKey);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    }
  }
}

export const realtimeManager = new RealtimeManager();

export async function realtimePlugin(server: FastifyInstance) {
  server.get('/ws', { websocket: true }, (connection: any, _req) => {
    const socket = connection.socket || connection;
    realtimeManager.registerSocket(socket);
  });
}
