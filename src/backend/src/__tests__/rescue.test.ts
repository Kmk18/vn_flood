import express from 'express';
import request from 'supertest';
import { makeChain, makeToken, mockRedis } from './helpers';

jest.mock('../db', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() },
  rescuePoints: {},
  rescueRequests: {},
  users: {},
}));

// multer reads disk — mock it to avoid filesystem side effects
jest.mock('multer', () => {
  const multer = () => ({ array: () => (_req: any, _res: any, next: any) => next() });
  multer.diskStorage = jest.fn(() => ({}));
  return multer;
});

import { db } from '../db';
import { registerRescueRoutes } from '../modules/rescue/routes';

const mockDb = db as any;

const userToken = (sub = 2) => ({ Authorization: `Bearer ${makeToken({ sub, role: 'user' })}` });
const responderToken = (sub = 3) => ({ Authorization: `Bearer ${makeToken({ sub, role: 'responder' })}` });
const adminToken = (sub = 1) => ({ Authorization: `Bearer ${makeToken({ sub, role: 'admin' })}` });

const POINT = {
  id: 1, name: 'Shelter A', lat: 10.5, lon: 106.5,
  capacity: 100, province: 'HCM', address: '1 Main St', isActive: true,
};
const REQUEST = {
  id: 10, userId: 2, lat: 10.5, lon: 106.5, peopleCount: 3,
  status: 'open', notes: '', photos: [], assignedUsers: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

let app: express.Express;
let redis: ReturnType<typeof mockRedis>;

beforeAll(() => {
  redis = mockRedis();
  app = express();
  app.use(express.json());
  registerRescueRoutes(app, redis as any);
});

beforeEach(() => {
  (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.insert as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.update as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.delete as jest.Mock).mockReturnValue(makeChain([]));
});

// ── GET /api/rescue/points ────────────────────────────────────────────────
describe('GET /api/rescue/points', () => {
  it('returns active rescue points (public, cached)', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([POINT]));

    const res = await request(app).get('/api/rescue/points');

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Shelter A');
  });

  it('returns cached data when Redis has a hit', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify([POINT]));

    const res = await request(app).get('/api/rescue/points');

    expect(res.status).toBe(200);
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});

// ── POST /api/rescue/requests ─────────────────────────────────────────────
describe('POST /api/rescue/requests', () => {
  it('creates a rescue request for an authenticated user', async () => {
    (mockDb.insert as jest.Mock).mockReturnValue(makeChain([REQUEST]));

    const res = await request(app)
      .post('/api/rescue/requests')
      .set(userToken())
      .send({ lat: 10.5, lon: 106.5, peopleCount: 3 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/rescue/requests')
      .send({ lat: 10.5, lon: 106.5 });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid coordinates', async () => {
    const res = await request(app)
      .post('/api/rescue/requests')
      .set(userToken())
      .send({ lat: 999, lon: 999 });

    expect(res.status).toBe(400);
  });
});

// ── GET /api/rescue/requests/mine ─────────────────────────────────────────
describe('GET /api/rescue/requests/mine', () => {
  it('returns the current user\'s requests', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([REQUEST]));

    const res = await request(app)
      .get('/api/rescue/requests/mine')
      .set(userToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/rescue/requests/mine');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/rescue/requests ──────────────────────────────────────────────
describe('GET /api/rescue/requests', () => {
  it('returns all open+assigned requests for a responder', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([REQUEST]));

    const res = await request(app)
      .get('/api/rescue/requests')
      .set(responderToken());

    expect(res.status).toBe(200);
  });

  it('filters by status when ?status= is provided', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([REQUEST]));

    const res = await request(app)
      .get('/api/rescue/requests?status=resolved')
      .set(adminToken());

    expect(res.status).toBe(200);
  });

  it('returns 403 for a regular user', async () => {
    const res = await request(app)
      .get('/api/rescue/requests')
      .set(userToken());

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/rescue/requests');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/rescue/points ───────────────────────────────────────────────
describe('POST /api/rescue/points', () => {
  it('creates a shelter point for a responder', async () => {
    (mockDb.insert as jest.Mock).mockReturnValue(makeChain([POINT]));

    const res = await request(app)
      .post('/api/rescue/points')
      .set(responderToken())
      .send({ name: 'Shelter A', lat: 10.5, lon: 106.5 });

    expect(res.status).toBe(201);
    expect(redis.del).toHaveBeenCalledWith('rescue:points');
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/rescue/points')
      .set(adminToken())
      .send({ name: 'No coords' });

    expect(res.status).toBe(400);
  });

  it('returns 403 for a regular user', async () => {
    const res = await request(app)
      .post('/api/rescue/points')
      .set(userToken())
      .send({ name: 'Shelter A', lat: 10.5, lon: 106.5 });

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/rescue/points/:id ──────────────────────────────────────────
describe('PATCH /api/rescue/points/:id', () => {
  it('updates a shelter point for a responder', async () => {
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([{ ...POINT, name: 'Updated' }]));

    const res = await request(app)
      .patch('/api/rescue/points/1')
      .set(responderToken())
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 404 when the point does not exist', async () => {
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .patch('/api/rescue/points/999')
      .set(adminToken())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/rescue/points/:id ─────────────────────────────────────────
describe('DELETE /api/rescue/points/:id', () => {
  it('deletes a shelter point for an admin', async () => {
    (mockDb.delete as jest.Mock).mockReturnValue(makeChain([POINT]));

    const res = await request(app)
      .delete('/api/rescue/points/1')
      .set(adminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 for a responder', async () => {
    const res = await request(app)
      .delete('/api/rescue/points/1')
      .set(responderToken());

    expect(res.status).toBe(403);
  });

  it('returns 404 when the point does not exist', async () => {
    (mockDb.delete as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .delete('/api/rescue/points/999')
      .set(adminToken());

    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/rescue/requests/:id/assign ────────────────────────────────
describe('PATCH /api/rescue/requests/:id/assign', () => {
  it('assigns the responder to an open request', async () => {
    const assigned = { ...REQUEST, status: 'assigned', assignedUsers: [{ id: 3, name: 'Resp' }] };
    // First select: get current request
    (mockDb.select as jest.Mock)
      .mockReturnValueOnce(makeChain([REQUEST]))  // get request
      .mockReturnValueOnce(makeChain([{ name: 'Resp', email: 'resp@test.com' }])); // get caller
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([assigned]));

    const res = await request(app)
      .patch('/api/rescue/requests/10/assign')
      .set(responderToken(3));

    expect(res.status).toBe(200);
  });

  it('returns 404 when the request does not exist', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .patch('/api/rescue/requests/999/assign')
      .set(responderToken());

    expect(res.status).toBe(404);
  });

  it('returns 403 for a regular user', async () => {
    const res = await request(app)
      .patch('/api/rescue/requests/10/assign')
      .set(userToken());

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/rescue/requests/:id/resolve ────────────────────────────────
describe('PATCH /api/rescue/requests/:id/resolve', () => {
  it('resolves a request for an assigned responder', async () => {
    const assigned = { ...REQUEST, status: 'assigned', assignedUsers: [{ id: 3, name: 'Resp' }] };
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([assigned]));
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([{ ...assigned, status: 'resolved' }]));

    const res = await request(app)
      .patch('/api/rescue/requests/10/resolve')
      .set(responderToken(3));

    expect(res.status).toBe(200);
  });

  it('returns 403 for a responder not assigned to the request', async () => {
    const assigned = { ...REQUEST, status: 'assigned', assignedUsers: [{ id: 99, name: 'Other' }] };
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([assigned]));

    const res = await request(app)
      .patch('/api/rescue/requests/10/resolve')
      .set(responderToken(3));

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/rescue/requests/:id/status ────────────────────────────────
describe('PATCH /api/rescue/requests/:id/status', () => {
  it('allows an admin to set any status', async () => {
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([{ ...REQUEST, status: 'resolved' }]));

    const res = await request(app)
      .patch('/api/rescue/requests/10/status')
      .set(adminToken())
      .send({ status: 'resolved' });

    expect(res.status).toBe(200);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await request(app)
      .patch('/api/rescue/requests/10/status')
      .set(adminToken())
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('returns 403 for a responder', async () => {
    const res = await request(app)
      .patch('/api/rescue/requests/10/status')
      .set(responderToken())
      .send({ status: 'resolved' });

    expect(res.status).toBe(403);
  });
});
