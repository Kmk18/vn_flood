import type { Express, Request, Response } from 'express';
import type { Redis } from 'ioredis';
import { Agent, fetch as undiciFetch } from 'undici';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8080';
const IS_CLOUD_RUN = ML_SERVICE_URL.includes('run.app');

// Use undici's own fetch+Agent (not Node's built-in fetch) so the dispatcher
// is version-compatible. Raises headersTimeout beyond the 300 s default so ML
// cold-starts don't time out before AbortSignal fires.
const mlAgent = new Agent({ headersTimeout: 3_540_000, bodyTimeout: 3_600_000 });

// When running in Cloud Run, calls to other private Cloud Run services need a
// Google-issued identity token (OIDC). The metadata server provides one for free.
async function mlFetch(path: string, init: RequestInit = {}) {
  const opts = { ...init, dispatcher: mlAgent };
  if (!IS_CLOUD_RUN) return undiciFetch(`${ML_SERVICE_URL}${path}`, opts as any);

  // Metadata server is fast — global fetch is fine here.
  const tokenResp = await fetch(
    `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(ML_SERVICE_URL)}`,
    { headers: { 'Metadata-Flavor': 'Google' } },
  );
  const token = await tokenResp.text();
  return undiciFetch(`${ML_SERVICE_URL}${path}`, {
    ...opts,
    headers: { ...(init.headers as Record<string, string> | undefined ?? {}), Authorization: `Bearer ${token}` },
  } as any);
}

const PREDICTION_CACHE_KEYS = [
  'flood:predictions:today:low',
  'flood:predictions:today:medium',
  'flood:predictions:today:high',
  'flood:predictions:today:critical',
  'flood:alerts',
];

export const registerIngestionRoutes = (app: Express, redis: Redis) => {
  app.post('/api/internal/ingest', async (req: Request, res: Response) => {
    const secret = process.env.INGEST_SECRET;
    if (secret && req.headers['x-ingest-secret'] !== secret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const targetDate =
      (req.body?.date as string | undefined) ??
      new Date(Date.now()).toISOString().slice(0, 10);

    try {
      const upstream = await mlFetch(`/ingest/${targetDate}`, {
        method: 'POST',
        signal: AbortSignal.timeout(3_540_000), // 59 min — just under Cloud Run's 3600s limit
      });

      if (!upstream.ok) {
        const text = await upstream.text();
        console.error('[ingestion] ML service error', upstream.status, text);
        res.status(502).json({ error: 'ML service error', detail: text });
        return;
      }

      const body = await upstream.json();
      console.log('[ingestion] complete', body);

      // Invalidate prediction caches so the mobile app sees fresh data immediately
      redis.del(...PREDICTION_CACHE_KEYS).catch(() => {});

      res.json(body);
    } catch (err) {
      console.error('[ingestion] fetch failed', err);
      res.status(503).json({ error: 'ML service unreachable' });
    }
  });

  app.get('/api/internal/ingest/status', async (_req: Request, res: Response) => {
    try {
      const upstream = await mlFetch('/health', { signal: AbortSignal.timeout(5_000) });
      const body = await upstream.json();
      res.json({ ml_service: body });
    } catch {
      res.status(503).json({ ml_service: 'unreachable' });
    }
  });
};
