import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, UserRecord } from '../../db';
import { requireAuth } from '../auth';

export async function socialRoutes(server: FastifyInstance) {
  // 1. Search Operatives by Callsign
  server.get<{
    Querystring: { q?: string };
  }>('/api/users/search', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const q = request.query.q || '';
    if (!q.trim()) {
      return { status: 'ok', users: [] };
    }

    const matches = await db.searchUsers(q, user.id);
    return {
      status: 'ok',
      users: matches.map((m) => ({
        id: m.id,
        username: m.username,
        displayName: m.displayName,
        level: m.level,
        gamesPlayed: m.gamesPlayed,
        wins: m.wins,
      })),
    };
  });

  // 2. Get User Career Match History (Phase 9)
  server.get<{
    Params: { id: string };
  }>('/api/users/:id/history', async (request, _reply) => {
    const { id } = request.params;
    const history = await db.getUserMatchHistory(id);
    return {
      status: 'ok',
      history,
    };
  });

  // 3. Create Squad / Party
  server.post('/api/parties', { preHandler: [requireAuth] }, async (request, _reply) => {
    const user = (request as any).user as UserRecord;
    const party = await db.createParty(user.id);
    return { status: 'ok', party };
  });

  // 4. Join Squad by Party Code
  server.post<{
    Body: { partyCode: string };
  }>('/api/parties/join', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { partyCode } = request.body || {};
    if (!partyCode) {
      return reply.status(400).send({ error: 'Party code required' });
    }

    const party = await db.findPartyByCode(partyCode);
    if (!party) {
      return reply.status(404).send({ error: 'Squad code not found' });
    }

    const updated = await db.joinParty(party.id, user.id);
    return { status: 'ok', party: updated };
  });

  // 5. Leave Squad
  server.post('/api/parties/leave', { preHandler: [requireAuth] }, async (request, _reply) => {
    const user = (request as any).user as UserRecord;
    const current = await db.findPartyByUserId(user.id);
    if (current) {
      await db.leaveParty(current.id, user.id);
    }
    return { status: 'ok' };
  });

  // 6. Get Current User's Squad
  server.get('/api/parties/me', { preHandler: [requireAuth] }, async (request, _reply) => {
    const user = (request as any).user as UserRecord;
    const party = await db.findPartyByUserId(user.id);
    return { status: 'ok', party };
  });

  // 7. Friends List
  server.get('/api/friends', { preHandler: [requireAuth] }, async (request, _reply) => {
    const user = (request as any).user as UserRecord;
    const friends = await db.getFriends(user.id);
    return { status: 'ok', friends };
  });

  // 8. Send / Add Friend
  server.post<{
    Body: { friendId: string };
  }>('/api/friends/request', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as UserRecord;
    const { friendId } = request.body || {};
    if (!friendId || friendId === user.id) {
      return reply.status(400).send({ error: 'Invalid friend ID' });
    }

    const friend = await db.findUserById(friendId);
    if (!friend) {
      return reply.status(404).send({ error: 'Operative not found' });
    }

    const rel = await db.sendFriendRequest(user.id, friendId);
    return { status: 'ok', relationship: rel };
  });
}
