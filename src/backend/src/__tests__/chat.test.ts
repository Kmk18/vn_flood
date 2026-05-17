import express from 'express';
import request from 'supertest';
import { makeChain } from './helpers';

jest.mock('../db', () => ({
  db: { select: jest.fn() },
  predictions: {},
  basins: {},
  alerts: {},
  officialAlerts: {},
}));

jest.mock('../modules/chat/gemini', () => ({
  generateReply: jest.fn().mockResolvedValue('Câu trả lời kiểm tra từ AI.'),
}));

import { db } from '../db';
import { registerChatRoutes } from '../modules/chat/routes';

const mockDb = db as any;

let app: express.Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  registerChatRoutes(app);
});

beforeEach(() => {
  // getFloodContext() runs several selects — return empty results by default
  (mockDb.select as jest.Mock).mockReturnValue(makeChain([{}]));
});

// ── POST /api/chat ────────────────────────────────────────────────────────
describe('POST /api/chat', () => {
  it('returns an AI reply and sources for a valid message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Tình hình lũ lụt Hà Nội như thế nào?' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reply');
    expect(res.body).toHaveProperty('sources');
    expect(Array.isArray(res.body.sources)).toBe(true);
    expect(res.body.reply).toBe('Câu trả lời kiểm tra từ AI.');
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/i);
  });

  it('returns 400 when message is an empty string', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: '   ' });

    expect(res.status).toBe(400);
  });

  it('retrieves relevant knowledge chunks based on query keywords', async () => {
    const { generateReply } = require('../modules/chat/gemini');

    await request(app)
      .post('/api/chat')
      .send({ message: 'Làm thế nào để thoát khỏi vùng lũ lụt?' });

    expect(generateReply).toHaveBeenCalled();
    const [systemPrompt] = generateReply.mock.calls[generateReply.mock.calls.length - 1];
    expect(systemPrompt).toContain('Kiến thức tham khảo');
  });

  it('returns 500 when the AI service throws', async () => {
    const { generateReply } = require('../modules/chat/gemini');
    generateReply.mockRejectedValueOnce(new Error('AI unavailable'));

    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Test message' });

    expect(res.status).toBe(500);
  });
});
