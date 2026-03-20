import { FastifyInstance } from 'fastify';
import { getDb } from '../db/index';
import { categories } from '../db/schema';
import { or, isNull, eq } from 'drizzle-orm';

export async function categoriesRoute(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  // GET /categories — 获取分类列表（系统分类 + 用户自定义分类）
  app.get('/', auth, async (request) => {
    const { userId } = (request as any).user;
    const db = getDb();

    const rows = await db
      .select()
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, userId)))
      .orderBy(categories.sortOrder);

    return { data: rows };
  });
}
