import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import { users } from '../db/schema';

export async function authRoute(app: FastifyInstance) {
  // 微信快捷登录（OAuth 回调）
  app.post<{
    Body: { code: string; nickname?: string };
  }>('/wechat/callback', async (request, reply) => {
    const { code, nickname } = request.body;

    // 用 code 换取 access_token + openid（调用微信 OAuth 接口）
    const wxRes = await exchangeWxCode(code);
    if (!wxRes.openid) {
      return reply.code(400).send({ error: 'Invalid wechat code' });
    }

    const db = getDb();
    const now = Date.now();

    // 查找或创建用户
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.wxOpenid, wxRes.openid))
      .limit(1);

    if (!user) {
      const newId = uuidv4();
      await db.insert(users).values({
        id: newId,
        wxOpenid: wxRes.openid,
        assistantName: '花生',
        subscriptionTier: 'free',
        createdAt: now,
        updatedAt: now,
      });
      [user] = await db.select().from(users).where(eq(users.id, newId)).limit(1);
    }

    const token = app.jwt.sign(
      { userId: user.id, tier: user.subscriptionTier },
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        assistantName: user.assistantName,
        subscriptionTier: user.subscriptionTier,
        isNewUser: !user.phone && !user.wxOpenid,
      },
    };
  });

  // 手机号发送验证码
  app.post<{ Body: { phone: string } }>('/phone/send-code', async (request, reply) => {
    const { phone } = request.body;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return reply.code(400).send({ error: 'Invalid phone number' });
    }

    // TODO: 接入短信服务商（阿里云 / 腾讯云）
    // 开发阶段统一使用 123456
    const code = process.env.NODE_ENV === 'production' ? generateCode() : '123456';
    await storeVerificationCode(phone, code);

    return { message: 'Code sent', phone };
  });

  // 手机号验证码登录
  app.post<{
    Body: { phone: string; code: string };
  }>('/phone/verify', async (request, reply) => {
    const { phone, code } = request.body;

    const isValid = await verifyCode(phone, code);
    if (!isValid) {
      return reply.code(400).send({ error: 'Invalid or expired code' });
    }

    const db = getDb();
    const now = Date.now();

    let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (!user) {
      const newId = uuidv4();
      await db.insert(users).values({
        id: newId,
        phone,
        assistantName: '花生',
        subscriptionTier: 'free',
        createdAt: now,
        updatedAt: now,
      });
      [user] = await db.select().from(users).where(eq(users.id, newId)).limit(1);
    }

    const token = app.jwt.sign(
      { userId: user.id, tier: user.subscriptionTier },
      { expiresIn: '7d' }
    );

    return { token, user: { id: user.id, assistantName: user.assistantName, subscriptionTier: user.subscriptionTier } };
  });

  // 更新仓鼠名字（引导页起名）
  app.put<{ Body: { assistantName: string } }>(
    '/assistant-name',
    { preHandler: [(app as any).authenticate] },
    async (request, reply) => {
      const { userId } = (request as any).user;
      const { assistantName } = request.body;

      if (!assistantName || assistantName.trim().length > 20) {
        return reply.code(400).send({ error: 'Assistant name must be 1-20 characters' });
      }

      const db = getDb();
      await db
        .update(users)
        .set({ assistantName: assistantName.trim(), updatedAt: Date.now() })
        .where(eq(users.id, userId));

      return { assistantName: assistantName.trim() };
    }
  );

  // 获取当前用户信息
  app.get('/me', { preHandler: [(app as any).authenticate] }, async (request) => {
    const { userId } = (request as any).user;
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { error: 'User not found' };
    return {
      id: user.id,
      phone: user.phone,
      assistantName: user.assistantName,
      subscriptionTier: user.subscriptionTier,
    };
  });
}

// ──── 辅助函数 ────

async function exchangeWxCode(code: string): Promise<{ openid: string }> {
  const appId = process.env.WX_APP_ID;
  const appSecret = process.env.WX_APP_SECRET;
  if (!appId || !appSecret) throw new Error('WeChat credentials not configured');

  const res = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`
  );
  const data = (await res.json()) as { openid?: string; errcode?: number };
  if (!data.openid) throw new Error(`WeChat OAuth failed: ${JSON.stringify(data)}`);
  return { openid: data.openid };
}

const codeStore = new Map<string, { code: string; expiresAt: number }>();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function storeVerificationCode(phone: string, code: string) {
  codeStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
}

async function verifyCode(phone: string, code: string): Promise<boolean> {
  const entry = codeStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    codeStore.delete(phone);
    return false;
  }
  if (entry.code !== code) return false;
  codeStore.delete(phone);
  return true;
}
