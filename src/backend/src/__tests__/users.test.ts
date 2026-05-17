import express from 'express';
import request from 'supertest';
import { makeChain, makeToken } from './helpers';

jest.mock('../db', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() },
  users: {},
  pushTokens: {},
}));

import { db } from '../db';
import { registerUserRoutes } from '../modules/users/routes';

const mockDb = db as any;

const USER_ROW = {
  id: 1, email: 'user@test.com', name: 'Test', role: 'user',
  province: null, phone: null, address: null, createdAt: new Date().toISOString(),
};

let app: express.Express;
const authHeader = () => ({ Authorization: `Bearer ${makeToken({ sub: 1, role: 'user' })}` });

beforeAll(() => {
  app = express();
  app.use(express.json());
  registerUserRoutes(app);
});

beforeEach(() => {
  (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.insert as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.update as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.delete as jest.Mock).mockReturnValue(makeChain([]));
});

// ── GET /api/users/me ─────────────────────────────────────────────────────
describe('GET /api/users/me', () => {
  it('returns the authenticated user', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([USER_ROW]));

    const res = await request(app)
      .get('/api/users/me')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('user@test.com');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 404 when user no longer exists', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .get('/api/users/me')
      .set(authHeader());

    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/users/me ───────────────────────────────────────────────────
describe('PATCH /api/users/me', () => {
  it('updates allowed fields and returns the updated user', async () => {
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([{ ...USER_ROW, name: 'Updated' }]));

    const res = await request(app)
      .patch('/api/users/me')
      .set(authHeader())
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid phone number', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set(authHeader())
      .send({ phone: '!!!invalid!!!' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .send({ name: 'X' });

    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/users/me ──────────────────────────────────────────────────
describe('DELETE /api/users/me', () => {
  it('deletes the current user and returns 204', async () => {
    (mockDb.delete as jest.Mock).mockReturnValue(makeChain(undefined));

    const res = await request(app)
      .delete('/api/users/me')
      .set(authHeader());

    expect(res.status).toBe(204);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).delete('/api/users/me');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/users/push-token ────────────────────────────────────────────
describe('POST /api/users/push-token', () => {
  it('registers a valid FCM device token', async () => {
    (mockDb.insert as jest.Mock).mockReturnValue(makeChain(undefined));

    const res = await request(app)
      .post('/api/users/push-token')
      .send({ token: 'cX9f2kL8mN3pQ7rS1tU5vW:APA91bHj...' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for a token shorter than 10 chars', async () => {
    const res = await request(app)
      .post('/api/users/push-token')
      .send({ token: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/users/push-token')
      .send({});

    expect(res.status).toBe(400);
  });
});
