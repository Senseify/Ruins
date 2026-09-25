import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, UserRecord } from '../../db';
import { config } from '../../config';

export interface AuthTokenPayload {
  userId: string;
  username: string;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

// Fastify preHandler hook for authenticated routes
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'UNAUTHORIZED: Bearer token required' });
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    return reply.status(401).send({ error: 'UNAUTHORIZED: Invalid or expired access token' });
  }

  const user = await db.findUserById(payload.userId);
  if (!user) {
    return reply.status(401).send({ error: 'UNAUTHORIZED: User not found' });
  }

  (request as any).user = user;
}

export async function authRoutes(server: FastifyInstance) {
  // 1. Register Operative
  server.post<{
    Body: {
      username: string;
      email: string;
      password: string;
      displayName?: string;
    };
  }>('/api/auth/register', async (request, reply) => {
    const { username, email, password, displayName } = request.body || {};

    if (!username || username.trim().length < 3) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Callsign must be at least 3 characters' });
    }
    if (!email || !email.includes('@')) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Valid email address required' });
    }
    if (!password || password.length < 6) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Password must be at least 6 characters' });
    }

    const existingUser = await db.findUserByUsername(username);
    if (existingUser) {
      return reply.status(409).send({ error: 'CONFLICT: Callsign already registered in directory' });
    }

    const existingEmail = await db.findUserByEmail(email);
    if (existingEmail) {
      return reply.status(409).send({ error: 'CONFLICT: Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.createUser({
      username: username.trim(),
      displayName: displayName?.trim() || username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      xp: 0,
      level: 1,
      gamesPlayed: 0,
      wins: 0,
      totalScore: 0,
    });

    const token = generateToken({ userId: user.id, username: user.username });

    return {
      status: 'ok',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        xp: user.xp,
        level: user.level,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        totalScore: user.totalScore,
      },
    };
  });

  // 2. Login Operative
  server.post<{
    Body: {
      emailOrUsername: string;
      password: string;
    };
  }>('/api/auth/login', async (request, reply) => {
    const { emailOrUsername, password } = request.body || {};

    if (!emailOrUsername || !password) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR: Credentials required' });
    }

    const user =
      (await db.findUserByEmail(emailOrUsername)) ||
      (await db.findUserByUsername(emailOrUsername));

    if (!user) {
      return reply.status(401).send({ error: 'UNAUTHORIZED: Invalid callsign or credentials' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'UNAUTHORIZED: Invalid callsign or credentials' });
    }

    const token = generateToken({ userId: user.id, username: user.username });

    return {
      status: 'ok',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        xp: user.xp,
        level: user.level,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        totalScore: user.totalScore,
      },
    };
  });

  // 3. Current User Profile
  server.get(
    '/api/auth/me',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const user = (request as any).user as UserRecord;
      return {
        status: 'ok',
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          xp: user.xp,
          level: user.level,
          gamesPlayed: user.gamesPlayed,
          wins: user.wins,
          totalScore: user.totalScore,
        },
      };
    }
  );
}
