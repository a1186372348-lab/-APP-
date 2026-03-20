import { FastifyInstance } from 'fastify';
import { parseAccountingText, generateConfirmLine } from '../ai/accounting';
import {
  generateInstantAnalysis,
  calculateHealthScore,
  generateMonthlyReport,
} from '../ai/analysis';
import { aiRouter } from '../ai/router';
import { getDb } from '../db/index';
import { users, categories } from '../db/schema';
import { eq } from 'drizzle-orm';
import { MultipartFile } from '@fastify/multipart';

export async function aiRoute(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  // POST /ai/parse-accounting — 文字 AI 解析
  app.post<{ Body: { text: string } }>('/parse-accounting', auth, async (request, reply) => {
    const { text } = request.body;
    if (!text || !text.trim()) {
      return reply.code(400).send({ error: 'text is required' });
    }

    const result = await parseAccountingText(text.trim());

    if ('error' in result) {
      return reply.code(422).send({ error: result.error, confidence: 0 });
    }

    // 查找对应 category
    const db = getDb();
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.code, result.category_code))
      .limit(1);

    return {
      ...result,
      category: category
        ? { id: category.id, code: category.code, name: category.name, icon: category.icon }
        : null,
    };
  });

  // POST /ai/transcribe — 语音转写（接收音频文件）
  app.post('/transcribe', auth, async (request, reply) => {
    const data = await (request as any).file() as MultipartFile;
    if (!data) {
      return reply.code(400).send({ error: 'No audio file provided' });
    }

    const buffer = await data.toBuffer();
    if (buffer.length > 5 * 1024 * 1024) {
      return reply.code(400).send({ error: 'Audio file too large (max 5MB)' });
    }

    try {
      const text = await aiRouter.transcribe(buffer, data.filename || 'audio.m4a');
      return { text };
    } catch (err) {
      return reply.code(503).send({ error: 'ASR service unavailable', fallback: true });
    }
  });

  // POST /ai/confirm-line — 生成傲娇确认台词
  app.post<{
    Body: { amountCents: number; categoryName: string };
  }>('/confirm-line', auth, async (request) => {
    const { userId } = (request as any).user;
    const { amountCents, categoryName } = request.body;

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const assistantName = user?.assistantName || '花生';

    const line = await generateConfirmLine(amountCents, categoryName, assistantName);
    return { line };
  });

  // POST /ai/analyze — 即时财务分析（付费）
  app.post<{ Body: { month?: string } }>('/analyze', auth, async (request, reply) => {
    const { userId, tier } = (request as any).user;
    if (tier !== 'premium') {
      return reply.code(403).send({ error: 'Premium subscription required', paywall: true });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // 获取月度统计（复用 stats 逻辑）
    const stats = await getMonthlyStats(userId, request.body.month);
    const analysis = await generateInstantAnalysis({
      ...stats,
      assistantName: user?.assistantName || '花生',
    });

    return { analysis, stats };
  });

  // GET /ai/health-score — 消费健康评分（付费）
  app.get('/health-score', auth, async (request, reply) => {
    const { userId, tier } = (request as any).user;
    if (tier !== 'premium') {
      return reply.code(403).send({ error: 'Premium subscription required', paywall: true });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const stats = await getMonthlyStats(userId);
    const result = await calculateHealthScore({ ...stats, assistantName: user?.assistantName || '花生' });

    return result;
  });

  // GET /ai/monthly-report — 月度报告（付费）
  app.get<{ Querystring: { month?: string } }>('/monthly-report', auth, async (request, reply) => {
    const { userId, tier } = (request as any).user;
    if (tier !== 'premium') {
      return reply.code(403).send({ error: 'Premium subscription required', paywall: true });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const stats = await getMonthlyStats(userId, request.query.month);
    const report = await generateMonthlyReport({ ...stats, assistantName: user?.assistantName || '花生' });

    return { report, stats };
  });
}

// ──── 辅助：获取月度统计数据 ────
async function getMonthlyStats(userId: string, month?: string) {
  const db = getDb();
  const { transactions, categories: cats } = await import('../db/schema');
  const { eq, and, gte, lte } = await import('drizzle-orm');

  const targetMonth = month || formatMonth(new Date());
  const [year, mon] = targetMonth.split('-').map(Number);
  const startOf = new Date(year, mon - 1, 1).getTime();
  const endOf = new Date(year, mon, 0, 23, 59, 59, 999).getTime();

  const rows = await db
    .select({
      direction: transactions.direction,
      amountCents: transactions.amountCents,
      categoryCode: cats.code,
      categoryName: cats.name,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .leftJoin(cats, eq(transactions.categoryId, cats.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isDeleted, 0),
        gte(transactions.occurredAt, startOf),
        lte(transactions.occurredAt, endOf)
      )
    );

  let totalExpenseCents = 0;
  let totalIncomeCents = 0;
  const catMap = new Map<string, { code: string; name: string; amountCents: number }>();

  for (const row of rows) {
    if (row.direction === 'expense') {
      totalExpenseCents += row.amountCents;
      const key = row.categoryCode || 'other_expense';
      if (!catMap.has(key)) catMap.set(key, { code: key, name: row.categoryName || '其他', amountCents: 0 });
      catMap.get(key)!.amountCents += row.amountCents;
    } else if (row.direction === 'income') {
      totalIncomeCents += row.amountCents;
    }
  }

  const categoryBreakdown = Array.from(catMap.values())
    .map((c) => ({
      ...c,
      percentage: totalExpenseCents > 0 ? (c.amountCents / totalExpenseCents) * 100 : 0,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const dates = rows.map((r) => r.occurredAt).sort();

  return {
    totalExpenseCents,
    totalIncomeCents,
    categoryBreakdown,
    transactionCount: rows.length,
    dataStartDate: dates.length > 0 ? new Date(dates[0]).toLocaleDateString('zh-CN') : '',
    dataEndDate: dates.length > 0 ? new Date(dates[dates.length - 1]).toLocaleDateString('zh-CN') : '',
  };
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
