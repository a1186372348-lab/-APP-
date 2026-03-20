import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/index';
import { channelBindings, channelBindTokens } from '../db/schema';

export async function channelsRoute(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  // GET /channels/:channel/bind-url — 获取渠道绑定二维码/链接
  app.get<{ Params: { channel: string } }>('/:channel/bind-url', auth, async (request, reply) => {
    const { userId } = (request as any).user;
    const { channel } = request.params;

    if (!['wechat', 'feishu', 'dingtalk'].includes(channel)) {
      return reply.code(400).send({ error: 'Invalid channel' });
    }

    const token = uuidv4();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟

    const db = getDb();
    await db.insert(channelBindTokens).values({
      token,
      userId,
      channel,
      expiresAt,
    });

    const bindUrl = getBindUrl(channel, token);
    return { token, bindUrl, expiresAt };
  });

  // GET /channels/bindings — 查询当前绑定状态
  app.get('/bindings', auth, async (request) => {
    const { userId } = (request as any).user;
    const db = getDb();

    const bindings = await db
      .select()
      .from(channelBindings)
      .where(and(eq(channelBindings.userId, userId), eq(channelBindings.isActive, 1)));

    return { bindings };
  });

  // DELETE /channels/:channel/binding — 解绑渠道
  app.delete<{ Params: { channel: string } }>('/:channel/binding', auth, async (request) => {
    const { userId } = (request as any).user;
    const { channel } = request.params;

    const db = getDb();
    await db
      .update(channelBindings)
      .set({ isActive: 0 })
      .where(and(eq(channelBindings.userId, userId), eq(channelBindings.channel, channel)));

    return { success: true };
  });
}

function getBindUrl(channel: string, token: string): string {
  const serverBase = process.env.SERVER_BASE_URL || 'https://your-domain.com';

  switch (channel) {
    case 'wechat': {
      const wxAppId = process.env.WX_APP_ID || '';
      // 微信关注链接带 scene 参数
      return `https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=${wxAppId}&scene=bind_${token}`;
    }
    case 'feishu':
      return `${serverBase}/webhooks/feishu/bind?token=${token}`;
    case 'dingtalk':
      return `${serverBase}/webhooks/dingtalk/bind?token=${token}`;
    default:
      return '';
  }
}
