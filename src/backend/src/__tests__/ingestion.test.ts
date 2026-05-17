import express from 'express';
import request from 'supertest';
import { mockRedis } from './helpers';

const mockUndiciFetch = jest.fn();

jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation(() => ({})),
  fetch: mockUndiciFetch,
}));

import { registerIngestionRoutes } from '../modules/ingestion/routes';

let app: express.Express;
let redis: ReturnType<typeof mockRedis>;

beforeAll(() => {
  redis = mockRedis();
  app = express();
  app.use(express.json());
  registerIngestionRoutes(app, redis as any);
});

beforeEach(() => {
  mockUndiciFetch.mockReset();
});

// ── POST /api/internal/ingest ─────────────────────────────────────────────
describe('POST /api/internal/ingest', () => {
  it('returns 401 when no secret header is provided', async () => {
    const res = await request(app).post('/api/internal/ingest');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the secret is wrong', async () => {
    const res = await request(app)
      .post('/api/internal/ingest')
      .set('x-ingest-secret', 'wrong-secret');

    expect(res.status).toBe(401);
  });

  it('proxies the request to the ML service with the correct secret', async () => {
    mockUndiciFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', predictions: 42 }),
    });

    const res = await request(app)
      .post('/api/internal/ingest')
      .set('x-ingest-secret', 'test-ingest-secret')
      .send({ date: '2025-01-01' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(redis.del).toHaveBeenCalled();
  });

  it('returns 502 when the ML service returns an error', async () => {
    mockUndiciFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'ML error',
    });

    const res = await request(app)
      .post('/api/internal/ingest')
      .set('x-ingest-secret', 'test-ingest-secret');

    expect(res.status).toBe(502);
  });

  it('returns 503 when the ML service is unreachable', async () => {
    mockUndiciFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app)
      .post('/api/internal/ingest')
      .set('x-ingest-secret', 'test-ingest-secret');

    expect(res.status).toBe(503);
  });
});

// ── GET /api/internal/ingest/status ──────────────────────────────────────
describe('GET /api/internal/ingest/status', () => {
  it('returns ML service health when reachable', async () => {
    mockUndiciFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    });

    const res = await request(app).get('/api/internal/ingest/status');

    expect(res.status).toBe(200);
    expect(res.body.ml_service).toHaveProperty('status', 'healthy');
  });

  it('returns 503 when ML service is unreachable', async () => {
    mockUndiciFetch.mockRejectedValue(new Error('timeout'));

    const res = await request(app).get('/api/internal/ingest/status');

    expect(res.status).toBe(503);
    expect(res.body.ml_service).toBe('unreachable');
  });
});
