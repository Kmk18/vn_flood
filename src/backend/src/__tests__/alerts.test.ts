import express from 'express';
import request from 'supertest';
import { makeChain, makeToken } from './helpers';

jest.mock('../db', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() },
  officialAlerts: {},
  alertReads: {},
  pushTokens: {},
}));

const mockSendEachForMulticast = jest.fn().mockResolvedValue({ responses: [] });
jest.mock('../lib/firebase', () => ({
  getMessaging: () => ({ sendEachForMulticast: mockSendEachForMulticast }),
}));

import { db } from '../db';
import { registerAlertsRoutes } from '../modules/alerts/routes';

const mockDb = db as any;

const ALERT = {
  id: 1, title: 'Flood Alert', message: 'Warning', isUrgent: false,
  province: 'Hà Nội', postedBy: 1, createdAt: new Date().toISOString(), isActive: true,
};

const userToken = () => ({ Authorization: `Bearer ${makeToken({ sub: 1, role: 'user' })}` });
const adminToken = () => ({ Authorization: `Bearer ${makeToken({ sub: 2, role: 'admin' })}` });
const responderToken = () => ({ Authorization: `Bearer ${makeToken({ sub: 3, role: 'responder' })}` });

let app: express.Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  registerAlertsRoutes(app);
});

beforeEach(() => {
  (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.insert as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.update as jest.Mock).mockReturnValue(makeChain([]));
  (mockDb.delete as jest.Mock).mockReturnValue(makeChain([]));
});

// ── GET /api/official-alerts ──────────────────────────────────────────────
describe('GET /api/official-alerts', () => {
  it('returns the list of active alerts (public)', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([ALERT]));

    const res = await request(app).get('/api/official-alerts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Flood Alert');
  });

  it('returns empty array when no alerts exist', async () => {
    const res = await request(app).get('/api/official-alerts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── GET /api/official-alerts/reads ───────────────────────────────────────
describe('GET /api/official-alerts/reads', () => {
  it('returns the read alert IDs for the authenticated user', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([{ alertId: 1 }, { alertId: 3 }]));

    const res = await request(app)
      .get('/api/official-alerts/reads')
      .set(userToken());

    expect(res.status).toBe(200);
    expect(res.body).toEqual([1, 3]);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/official-alerts/reads');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/official-alerts/:id/read ───────────────────────────────────
describe('POST /api/official-alerts/:id/read', () => {
  it('marks an alert as read', async () => {
    (mockDb.insert as jest.Mock).mockReturnValue(makeChain(undefined));

    const res = await request(app)
      .post('/api/official-alerts/1/read')
      .set(userToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app)
      .post('/api/official-alerts/abc/read')
      .set(userToken());

    expect(res.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/official-alerts/1/read');
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/official-alerts/:id/read ─────────────────────────────────
describe('DELETE /api/official-alerts/:id/read', () => {
  it('marks an alert as unread', async () => {
    (mockDb.delete as jest.Mock).mockReturnValue(makeChain(undefined));

    const res = await request(app)
      .delete('/api/official-alerts/1/read')
      .set(userToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).delete('/api/official-alerts/1/read');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/official-alerts ─────────────────────────────────────────────
describe('POST /api/official-alerts', () => {
  it('creates an alert when called by an admin', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([])); // push tokens
    (mockDb.insert as jest.Mock).mockReturnValue(makeChain([ALERT]));

    const res = await request(app)
      .post('/api/official-alerts')
      .set(adminToken())
      .send({ title: 'Flood Alert', message: 'Warning', isUrgent: false });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Flood Alert');
  });

  it('creates an alert when called by a responder', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));
    (mockDb.insert as jest.Mock).mockReturnValue(makeChain([ALERT]));

    const res = await request(app)
      .post('/api/official-alerts')
      .set(responderToken())
      .send({ title: 'Flood Alert', message: 'Warning' });

    expect(res.status).toBe(201);
  });

  it('returns 403 when called by a regular user', async () => {
    const res = await request(app)
      .post('/api/official-alerts')
      .set(userToken())
      .send({ title: 'Flood Alert', message: 'Warning' });

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/official-alerts')
      .send({ title: 'Flood Alert', message: 'Warning' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid input (title too long)', async () => {
    const res = await request(app)
      .post('/api/official-alerts')
      .set(adminToken())
      .send({ title: 'x'.repeat(201), message: 'Warning' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when message is empty', async () => {
    const res = await request(app)
      .post('/api/official-alerts')
      .set(adminToken())
      .send({ title: 'Alert', message: '' });

    expect(res.status).toBe(400);
  });

  it('calls FCM sendEachForMulticast for each registered token', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(
      makeChain([{ token: 'fcm-device-token-abc123' }]),
    );
    (mockDb.insert as jest.Mock).mockReturnValue(makeChain([ALERT]));

    await request(app)
      .post('/api/official-alerts')
      .set(adminToken())
      .send({ title: 'Flood Alert', message: 'Warning', isUrgent: false });

    await new Promise((r) => setImmediate(r));

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['fcm-device-token-abc123'],
        notification: { title: 'Flood Alert', body: 'Warning' },
      }),
    );
  });

  it('skips FCM push when no tokens are registered', async () => {
    mockSendEachForMulticast.mockClear();
    (mockDb.select as jest.Mock).mockReturnValue(makeChain([]));
    (mockDb.insert as jest.Mock).mockReturnValue(makeChain([ALERT]));

    await request(app)
      .post('/api/official-alerts')
      .set(adminToken())
      .send({ title: 'Flood Alert', message: 'Warning', isUrgent: false });

    await new Promise((r) => setImmediate(r));

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });
});

// ── DELETE /api/official-alerts/:id ──────────────────────────────────────
describe('DELETE /api/official-alerts/:id', () => {
  it('soft-deletes an alert when called by an admin', async () => {
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([{ id: 1 }]));

    const res = await request(app)
      .delete('/api/official-alerts/1')
      .set(adminToken());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when the alert does not exist', async () => {
    (mockDb.update as jest.Mock).mockReturnValue(makeChain([]));

    const res = await request(app)
      .delete('/api/official-alerts/999')
      .set(adminToken());

    expect(res.status).toBe(404);
  });

  it('returns 403 for a regular user', async () => {
    const res = await request(app)
      .delete('/api/official-alerts/1')
      .set(userToken());

    expect(res.status).toBe(403);
  });
});
