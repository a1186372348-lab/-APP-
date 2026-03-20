import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/index';
import { transactions, categories } from '../db/schema';

export async function transactionsRoute(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  // GET /transactions — 查询账单列表（支持分页 + 月份筛选）
  app.get<{
    Querystring: { month?: string; page?: string; limit?: string };
  }>('/', auth, async (request) => {
    const { userId } = (request as any).user;
    const { month, page = '1', limit = '50' } = request.query;

    const db = getDb();
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(transactions.userId, userId), eq(transactions.isDeleted, 0)];

    if (month) {
      // month 格式: "2026-03"
      const [year, mon] = month.split('-').map(Number);
      const startOf = new Date(year, mon - 1, 1).getTime();
      const endOf = new Date(year, mon, 0, 23, 59, 59, 999).getTime();
      conditions.push(gte(transactions.occurredAt, startOf));
      conditions.push(lte(transactions.occurredAt, endOf));
    }

    const rows = await db
      .select({
        id: transactions.id,
        direction: transactions.direction,
        amountCents: transactions.amountCents,
        currency: transactions.currency,
        categoryId: transactions.categoryId,
        categoryCode: categories.code,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        occurredAt: transactions.occurredAt,
        merchant: transactions.merchant,
        note: transactions.note,
        source: transactions.source,
        aiConfidence: transactions.aiConfidence,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt))
      .limit(limitNum)
      .offset(offset);

    return { data: rows, page: pageNum, limit: limitNum };
  });

  // POST /transactions — 创建账单
  app.post<{
    Body: {
      direction: string;
      amountCents: number;
      categoryId?: string;
      occurredAt?: number;
      merchant?: string;
      note?: string;
      source: string;
      rawInputText?: string;
      aiConfidence?: number;
    };
  }>('/', auth, async (request, reply) => {
    const { userId } = (request as any).user;
    const body = request.body;

    if (!body.amountCents || body.amountCents <= 0) {
      return reply.code(400).send({ error: 'amount_cents must be a positive integer' });
    }

    const db = getDb();
    const now = Date.now();
    const id = uuidv4();

    await db.insert(transactions).values({
      id,
      userId,
      direction: body.direction || 'expense',
      amountCents: Math.round(body.amountCents),
      currency: 'CNY',
      categoryId: body.categoryId || null,
      occurredAt: body.occurredAt || now,
      merchant: body.merchant || null,
      note: body.note || null,
      source: body.source || 'manual',
      rawInputText: body.rawInputText || null,
      aiConfidence: body.aiConfidence || null,
      isDeleted: 0,
      createdAt: now,
      updatedAt: now,
    });

    return reply.code(201).send({ id });
  });

  // PUT /transactions/:id — 更新账单
  app.put<{
    Params: { id: string };
    Body: {
      amountCents?: number;
      categoryId?: string;
      occurredAt?: number;
      merchant?: string;
      note?: string;
    };
  }>('/:id', auth, async (request, reply) => {
    const { userId } = (request as any).user;
    const { id } = request.params;
    const body = request.body;

    const db = getDb();
    const result = await db
      .update(transactions)
      .set({ ...body, updatedAt: Date.now() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

    return { success: true };
  });

  // DELETE /transactions/:id — 软删除
  app.delete<{ Params: { id: string } }>('/:id', auth, async (request) => {
    const { userId } = (request as any).user;
    const { id } = request.params;

    const db = getDb();
    await db
      .update(transactions)
      .set({ isDeleted: 1, updatedAt: Date.now() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

    return { success: true };
  });

  // GET /transactions/stats/monthly — 月度统计
  app.get<{ Querystring: { month?: string } }>('/stats/monthly', auth, async (request) => {
    const { userId } = (request as any).user;
    const db = getDb();

    const targetMonth = request.query.month || formatMonth(new Date());
    const [year, mon] = targetMonth.split('-').map(Number);
    const startOf = new Date(year, mon - 1, 1).getTime();
    const endOf = new Date(year, mon, 0, 23, 59, 59, 999).getTime();

    const rows = await db
      .select({
        direction: transactions.direction,
        amountCents: transactions.amountCents,
        categoryCode: categories.code,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
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
    const categoryMap = new Map<string, { code: string; name: string; icon: string; color: string; amountCents: number }>();

    for (const row of rows) {
      if (row.direction === 'expense') {
        totalExpenseCents += row.amountCents;
        const key = row.categoryCode || 'other_expense';
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            code: key,
            name: row.categoryName || '其他',
            icon: row.categoryIcon || '📌',
            color: row.categoryColor || '#C7CEEA',
            amountCents: 0,
          });
        }
        categoryMap.get(key)!.amountCents += row.amountCents;
      } else if (row.direction === 'income') {
        totalIncomeCents += row.amountCents;
      }
    }

    const categoryBreakdown = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        percentage: totalExpenseCents > 0 ? (c.amountCents / totalExpenseCents) * 100 : 0,
      }))
      .sort((a, b) => b.amountCents - a.amountCents);

    return {
      month: targetMonth,
      totalExpenseCents,
      totalIncomeCents,
      transactionCount: rows.length,
      categoryBreakdown,
    };
  });
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
