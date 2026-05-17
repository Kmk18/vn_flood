import express from 'express';
import request from 'supertest';
import { makeChain, makeToken } from './helpers';

jest.mock('../db', () => ({
  db: { select: jest.fn(), insert: jest.fn(), delete: jest.fn() },
  users: {},
  sessions: {},
}));

jest.mock('../lib/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('$2b$10$hashed'),
  verifyPassword: jest.fn(),
}));

jest.mock('../middleware/rateLimit', () => ({
  createRateLimiter: () => (_req: any, _res: any, next: any) => next(),
}));

import { db } from '../db';
import { verifyPassword } from '../lib/password'; // eslint-disable-line
import { registerAuthRoutes } from '../modules/auth/routes';

const mockDb = db as any;
const mockVerify = verifyPassword as jest.Mock;

const USER_ROW = {
  id: 1,
  email: 'user@test.com',
  role: 'user',
  name: 'Test User',
  passwordHash: '$2b$10$hashed',
};

let app: express.Express;

beforeAll(() => {
  const redis: any = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  app = express();
  app.use(express.json());
  registerAuthRoutes(app, redis);
});

beforeEach(() => {
  (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.insert as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.delete as jest.Mock).mockReturnValue(makeChain([]));
  mockVerify.mockResolvedValue(true);
});

// ── Register ───────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([])); // no existing user
    (mockDb.insert as jest.Mock)
      .mockReturnValueOnce(makeChain([{ id: 2, email: 'new@test.com', role: 'user', name: 'New' }])) // user insert
      .mockReturnValueOnce(makeChain([])); // session insert

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'password123', name: 'New' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('new@test.com');
  });

  it('returns 409 when email already exists', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([{ id: 1 }]));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'exists@test.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'valid@test.com', password: 'short' });

    expect(res.status).toBe(400);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns tokens on valid credentials and creates a session', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([USER_ROW]));
    mockVerify.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(mockDb.insert).toHaveBeenCalled(); // session stored
  });

  it('returns 401 for wrong password', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([USER_ROW]));
    mockVerify.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent user', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com' });

    expect(res.status).toBe(400);
  });
});

// ── Refresh token ─────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  it('rotates tokens when session exists', async () => {
    const { signRefreshToken } = require('../lib/jwt');
    const refreshToken = signRefreshToken({ sub: 1, email: 'user@test.com', role: 'user' });

    // session found in DB
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([{ id: 42 }]));

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken'); // rotated
    expect(mockDb.delete).toHaveBeenCalled(); // old session deleted
    expect(mockDb.insert).toHaveBeenCalled(); // new session created
  });

  it('returns 401 when session is not found in DB (token revoked)', async () => {
    const { signRefreshToken } = require('../lib/jwt');
    const refreshToken = signRefreshToken({ sub: 1, email: 'user@test.com', role: 'user' });

    // session NOT found
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid JWT', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('deletes the session and returns 204', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'any-token-string' });

    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('returns 204 even when no token is provided (idempotent)', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({});

    expect(res.status).toBe(204);
  });
});
