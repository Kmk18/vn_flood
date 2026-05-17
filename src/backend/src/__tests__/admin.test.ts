import express from 'express';
import request from 'supertest';
import { makeChain, makeToken } from './helpers';

jest.mock('../db', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() },
  users: {},
  rescueRequests: {},
  predictions: {},
  officialAlerts: {},
}));

import { db } from '../db';
import { registerAdminRoutes } from '../modules/admin/routes';

const mockDb = db as any;

const adminToken = () => ({ Authorization: `Bearer ${makeToken({ sub: 1, role: 'admin' })}` });
const userToken = () => ({ Authorization: `Bearer ${makeToken({ sub: 2, role: 'user' })}` });
const responderToken = () => ({ Authorization: `Bearer ${makeToken({ sub: 3, role: 'responder' })}` });

const USER_ROW = {
  id: 2, email: 'other@test.com', name: 'Other', role: 'user',
  province: null, createdAt: new Date().toISOString(),
};

let app: express.Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  registerAdminRoutes(app);
});

beforeEach(() => {
  (mockDb.select as jest.Mock).mockReturnValue(makeChain([{ count: 0 }]));
  (mockDb.update as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.delete as jest.Mock).mockReturnValue(makeChain([]));
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────
describe('GET /api/admin/stats', () => {
  it('returns dashboard stats for an admin', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([{ count: 5 }]));

    const res = await request(app)
      .get('/api/admin/stats')
      .set(adminToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('activeRescueRequests');
    expect(res.body).toHaveProperty('predictionsToday');
    expect(res.body).toHaveProperty('activeAlerts');
  });

  it('returns 403 for a regular user', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set(userToken());

    expect(res.status).toBe(403);
  });

  it('returns 403 for a responder', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set(responderToken());

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────
describe('GET /api/admin/users', () => {
  it('returns a paginated list of users', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([USER_ROW]));

    const res = await request(app)
      .get('/api/admin/users')
      .set(adminToken());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].email).toBe('other@test.com');
  });

  it('filters users when ?search= is provided', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([USER_ROW]));

    const res = await request(app)
      .get('/api/admin/users?search=other')
      .set(adminToken());

    expect(res.status).toBe(200);
  });

  it('returns 403 for a non-admin', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set(userToken());

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/admin/users/:id ────────────────────────────────────────────
describe('PATCH /api/admin/users/:id', () => {
  it('updates a user\'s role', async () => {
    (mockDb.update as jest.Mock).mockReturnValue(
      makeChain([{ id: 2, email: 'other@test.com', name: 'Other', role: 'responder' }]),
    );

    const res = await request(app)
      .patch('/api/admin/users/2')
      .set(adminToken())
      .send({ role: 'responder' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('responder');
  });

  it('returns 400 when trying to change own role', async () => {
    const res = await request(app)
      .patch('/api/admin/users/1')  // same as admin token sub
      .set(adminToken())
      .send({ role: 'user' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid role', async () => {
    const res = await request(app)
      .patch('/api/admin/users/2')
      .set(adminToken())
      .send({ role: 'superadmin' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when the user does not exist', async () => {
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .patch('/api/admin/users/999')
      .set(adminToken())
      .send({ role: 'responder' });

    expect(res.status).toBe(404);
  });

  it('returns 403 for a non-admin', async () => {
    const res = await request(app)
      .patch('/api/admin/users/2')
      .set(userToken())
      .send({ role: 'responder' });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────
describe('DELETE /api/admin/users/:id', () => {
  it('deletes a user', async () => {
    (mockDb.delete as jest.Mock).mockReturnValue(makeChain([{ id: 2 }]));

    const res = await request(app)
      .delete('/api/admin/users/2')
      .set(adminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when trying to delete yourself', async () => {
    const res = await request(app)
      .delete('/api/admin/users/1')  // same as admin token sub
      .set(adminToken());

    expect(res.status).toBe(400);
  });

  it('returns 404 when the user does not exist', async () => {
    (mockDb.delete as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .delete('/api/admin/users/999')
      .set(adminToken());

    expect(res.status).toBe(404);
  });

  it('returns 403 for a non-admin', async () => {
    const res = await request(app)
      .delete('/api/admin/users/2')
      .set(userToken());

    expect(res.status).toBe(403);
  });
});
