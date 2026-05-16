import type { Express, Request, Response, NextFunction } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, officialAlerts, alertReads, pushTokens } from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

// ─── Expo push notifications ─────────────────────────────────────────────────
async function sendPushNotifications(title: string, body: string, alertId: number) {
  const rows = await db.select({ token: pushTokens.token }).from(pushTokens);
  const tokens = rows.map((r) => r.token);
  console.log(`[push] sending to ${tokens.length} device(s) for alert ${alertId}`);
  if (!tokens.length) return;
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map((to) => ({
      to, title, body, sound: 'default', data: { alertId },
    }));
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(batch),
    });
    const result = await resp.json();
    console.log('[push] expo response:', JSON.stringify(result));
  }
}

// ─── SSE broadcast (in-process, single instance) ─────────────────────────────
// For multi-instance deployments (e.g. Cloud Run with min-instances > 1),
// replace with Redis pub/sub so all instances share the broadcast.
const sseClients = new Set<Response>();

function broadcast(payload: object) {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try { res.write(line); } catch { sseClients.delete(res); }
  }
}

// ─── Auth guard ──────────────────────────────────────────────────────────────
const requireAuthority = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role === 'user') { res.status(403).json({ error: 'Forbidden' }); return; }
  next();
};

const createAlertSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  isUrgent: z.boolean().default(false),
  province: z.string().max(100).optional(),
});

export const registerAlertsRoutes = (app: Express) => {
  // GET list — public, newest first
  app.get('/api/official-alerts', async (_req, res) => {
    try {
      const data = await db
        .select()
        .from(officialAlerts)
        .where(eq(officialAlerts.isActive, true))
        .orderBy(sql`${officialAlerts.createdAt} desc`);
      res.json(data);
    } catch (err) {
      console.error('[alerts] list:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET read IDs for current user — authenticated
  app.get('/api/official-alerts/reads', requireAuth, async (req, res) => {
    const userId = req.user!.sub;
    try {
      const rows = await db
        .select({ alertId: alertReads.alertId })
        .from(alertReads)
        .where(eq(alertReads.userId, userId));
      res.json(rows.map((r) => r.alertId));
    } catch (err) {
      console.error('[alerts] reads:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST mark alert as read — authenticated
  app.post('/api/official-alerts/:id/read', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    const userId = req.user!.sub;
    try {
      await db.insert(alertReads).values({ userId, alertId: id }).onConflictDoNothing();
      res.json({ success: true });
    } catch (err) {
      console.error('[alerts] read:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE mark alert as unread — authenticated
  app.delete('/api/official-alerts/:id/read', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    const userId = req.user!.sub;
    try {
      await db.delete(alertReads).where(and(eq(alertReads.userId, userId), eq(alertReads.alertId, id)));
      res.json({ success: true });
    } catch (err) {
      console.error('[alerts] unread:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET SSE stream — public, long-lived
  app.get('/api/official-alerts/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);
    res.write(': connected\n\n');

    const heartbeat = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch { /* client gone */ }
    }, 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // POST — admin/responder only
  app.post('/api/official-alerts', requireAuth, requireAuthority, async (req, res) => {
    const result = createAlertSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: result.error.issues }); return; }

    try {
      const [alert] = await db
        .insert(officialAlerts)
        .values({ ...result.data, postedBy: req.user!.sub })
        .returning();
      res.status(201).json(alert);
      broadcast({ type: 'new', data: alert });
      sendPushNotifications(result.data.title, result.data.message, alert.id).catch(() => {});
    } catch (err) {
      console.error('[alerts] create:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE (soft) — admin/responder only
  app.delete('/api/official-alerts/:id', requireAuth, requireAuthority, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    try {
      const [updated] = await db
        .update(officialAlerts)
        .set({ isActive: false })
        .where(eq(officialAlerts.id, id))
        .returning({ id: officialAlerts.id });

      if (!updated) { res.status(404).json({ error: 'Alert not found' }); return; }
      res.json({ success: true });
      broadcast({ type: 'delete', id });
    } catch (err) {
      console.error('[alerts] delete:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
