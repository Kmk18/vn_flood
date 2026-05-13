import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { predictions, basins, alerts, officialAlerts } from '../../db';
import { generateReply } from './gemini';
import { KNOWLEDGE_BASE, type KnowledgeChunk } from './knowledge';

// ── Keyword-based retrieval (no embedding API needed) ─────────────────────
// Tokenise Vietnamese text: lowercase, split on whitespace/punctuation
function tokenise(text: string): string[] {
  return text.toLowerCase().split(/[\s,.\-–—:;!?()[\]]+/).filter((w) => w.length > 1);
}

// TF-IDF-style score: fraction of query tokens found in the chunk
function keywordScore(queryTokens: string[], chunk: KnowledgeChunk): number {
  const text = (chunk.source + ' ' + chunk.content).toLowerCase();
  const matches = queryTokens.filter((t) => text.includes(t)).length;
  return matches / (queryTokens.length || 1);
}

function retrieveChunks(query: string, topK = 4): KnowledgeChunk[] {
  const tokens = tokenise(query);
  return KNOWLEDGE_BASE
    .map((chunk) => ({ chunk, score: keywordScore(tokens, chunk) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk }) => chunk);
}

// ── Dynamic flood context ──────────────────────────────────────────────────
async function getFloodContext(): Promise<string> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [runRes] = await db
      .select({ runDate: sql<string>`max(${predictions.runDate})` })
      .from(predictions);
    const runDate = runRes?.runDate ?? today;

    const [forecastRes] = await db
      .select({ forecastDate: sql<string>`max(${predictions.forecastDate})` })
      .from(predictions)
      .where(sql`${predictions.runDate} = ${runDate}`);
    const forecastDate = forecastRes?.forecastDate ?? today;

    const [rows, alertRows, officialRows] = await Promise.all([
      db.select({
          province: basins.province,
          riskLevel: predictions.riskLevel,
          floodProb: predictions.floodProb,
        })
        .from(predictions)
        .innerJoin(basins, sql`${predictions.hybasId} = ${basins.hybasId}`)
        .where(sql`${predictions.forecastDate} = ${forecastDate} AND ${predictions.runDate} = ${runDate}`)
        .orderBy(sql`${predictions.floodProb} desc`),

      db.select({
          province: basins.province,
          riskLevel: alerts.riskLevel,
          forecastDate: alerts.forecastDate,
        })
        .from(alerts)
        .innerJoin(basins, sql`${alerts.hybasId} = ${basins.hybasId}`)
        .where(sql`${alerts.forecastDate} = ${forecastDate}`)
        .orderBy(sql`${alerts.sentAt} desc`)
        .limit(50),

      db.select({
          title: officialAlerts.title,
          message: officialAlerts.message,
          province: officialAlerts.province,
          isUrgent: officialAlerts.isUrgent,
        })
        .from(officialAlerts)
        .where(sql`${officialAlerts.isActive} = true`)
        .orderBy(sql`${officialAlerts.isUrgent} desc, ${officialAlerts.createdAt} desc`)
        .limit(10),
    ]);

    if (!rows.length) return '';

    // Deduplicate predictions: keep highest risk per province
    const byProvince = new Map<string, string>();
    for (const r of rows) {
      const prov = r.province ?? 'Không xác định';
      if (!byProvince.has(prov)) byProvince.set(prov, r.riskLevel);
    }

    const critical = [...byProvince.entries()].filter(([, l]) => l === 'critical').map(([p]) => p);
    const high     = [...byProvince.entries()].filter(([, l]) => l === 'high').map(([p]) => p);
    const medium   = [...byProvince.entries()].filter(([, l]) => l === 'medium').map(([p]) => p);

    const lines = [`Dữ liệu dự báo lũ lụt cập nhật ngày ${forecastDate}:`];
    if (critical.length) lines.push(`- Nguy hiểm: ${critical.join(', ')}`);
    if (high.length)     lines.push(`- Cao: ${high.join(', ')}`);
    if (medium.length)   lines.push(`- Trung bình: ${medium.join(', ')}`);
    lines.push(`- Tổng số lưu vực theo dõi: ${rows.length}`);

    if (alertRows.length) {
      const alertProvinces = [...new Set(alertRows.map((a) => a.province ?? 'Không xác định'))];
      lines.push(`\nCảnh báo tự động đã gửi (${forecastDate}):`);
      lines.push(`- Tỉnh/thành có cảnh báo: ${alertProvinces.join(', ')}`);
    }

    if (officialRows.length) {
      lines.push(`\nThông báo chính thức đang hiệu lực:`);
      for (const o of officialRows) {
        const urgentTag = o.isUrgent ? '[KHẨN] ' : '';
        const provTag = o.province ? ` (${o.province})` : '';
        lines.push(`- ${urgentTag}${o.title}${provTag}: ${o.message}`);
      }
    }

    return lines.join('\n');
  } catch {
    return '';
  }
}

// ── Route ──────────────────────────────────────────────────────────────────
export const registerChatRoutes = (app: Express) => {
  app.post('/api/chat', async (req: Request, res: Response) => {
    const { message } = req.body as { message?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    try {
      const [chunks, floodContext] = await Promise.all([
        Promise.resolve(retrieveChunks(message)),
        getFloodContext(),
      ]);

      const knowledgeContext = chunks
        .map((c) => `[${c.source}]\n${c.content}`)
        .join('\n\n');

      const systemPrompt = [
        'Bạn là trợ lý VNFlood — hệ thống dự báo và cảnh báo lũ lụt Việt Nam.',
        'Cung cấp thông tin chính xác về rủi ro lũ lụt, hướng dẫn an toàn và ứng phó khẩn cấp.',
        'Luôn trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu và thực tế.',
        'Khi đề cập đến mức độ rủi ro, hãy đưa ra hành động cụ thể.',
        'Nếu không có thông tin trong ngữ cảnh, hãy thành thật nói không biết.',
        '',
        floodContext
          ? `Dữ liệu hiện tại từ hệ thống:\n${floodContext}`
          : 'Không có dữ liệu dự báo hiện tại.',
        '',
        `Kiến thức tham khảo:\n${knowledgeContext}`,
      ].join('\n');

      const reply = await generateReply(systemPrompt, message);
      const sources = [...new Set(chunks.map((c) => c.source))];
      res.json({ reply, sources });
    } catch (err) {
      console.error('[chat] error:', err);
      res.status(500).json({ error: 'Không thể xử lý yêu cầu, vui lòng thử lại.' });
    }
  });
};
