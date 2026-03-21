import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import { users, subscriptions } from '../db/schema';

const auth = (app: FastifyInstance) => ({ preHandler: [(app as any).authenticate] });

export async function subscriptionsRoute(app: FastifyInstance) {
  // GET /subscriptions/status — 查询当前订阅状态
  app.get('/status', auth(app), async (request) => {
    const { userId } = (request as any).user;
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { subscriptionTier: 'free', activeSubscription: null };

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    return {
      subscriptionTier: user.subscriptionTier,
      activeSubscription: sub || null,
    };
  });

  // POST /subscriptions/mock-purchase — 模拟购买（本地闭环用）
  app.post<{
    Body: { productId: string; platform?: string };
  }>('/mock-purchase', auth(app), async (request, reply) => {
    const { userId } = (request as any).user;
    const { productId, platform = 'mock' } = request.body;

    if (!productId) {
      return reply.code(400).send({ error: 'productId is required' });
    }

    const db = getDb();
    const now = Date.now();

    // 按 productId 决定到期时间
    const isYearly = productId.includes('yearly') || productId.includes('annual');
    const expiresAt = isYearly
      ? now + 365 * 24 * 60 * 60 * 1000
      : now + 30 * 24 * 60 * 60 * 1000;

    // 写入订阅记录
    const subId = uuidv4();
    await db.insert(subscriptions).values({
      id: subId,
      userId,
      productId,
      entitlement: 'premium',
      isActive: 1,
      expiresAt,
      platform,
      createdAt: now,
      updatedAt: now,
    });

    // 升级用户等级
    await db
      .update(users)
      .set({ subscriptionTier: 'premium', updatedAt: now })
      .where(eq(users.id, userId));

    return {
      success: true,
      subscriptionTier: 'premium',
      productId,
      expiresAt,
    };
  });

  // DELETE /subscriptions/mock-cancel — 模拟取消订阅
  app.delete('/mock-cancel', auth(app), async (request) => {
    const { userId } = (request as any).user;
    const db = getDb();
    const now = Date.now();

    // 停用订阅记录
    await db
      .update(subscriptions)
      .set({ isActive: 0, updatedAt: now })
      .where(eq(subscriptions.userId, userId));

    // 恢复 free
    await db
      .update(users)
      .set({ subscriptionTier: 'free', updatedAt: now })
      .where(eq(users.id, userId));

    return { success: true, subscriptionTier: 'free' };
  });
}
