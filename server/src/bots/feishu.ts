/**
 * 飞书 Bot
 * 处理飞书消息事件订阅
 */
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { getDb } from '../db/index';
import { channelBindings, transactions, categories } from '../db/schema';
import { parseAccountingText } from '../ai/accounting';

const pendingConfirms = new Map<
  string,
  { parsedTx: any; categoryId: string; userId: string; expiresAt: number }
>();

export async function feishuBotRoute(app: FastifyInstance) {
  // 飞书 Webhook 验证 + 消息接收
  app.post('/', async (request, reply) => {
    const body = request.body as any;

    // 飞书 URL 验证挑战
    if (body?.challenge) {
      return { challenge: body.challenge };
    }

    // 验证签名
    const timestamp = request.headers['x-lark-request-timestamp'] as string;
    const nonce = request.headers['x-lark-request-nonce'] as string;
    const signature = request.headers['x-lark-signature'] as string;

    if (!verifyFeishuSignature(timestamp, nonce, JSON.stringify(body), signature)) {
      return reply.code(403).send({ error: 'Invalid signature' });
    }

    const event = body?.event;
    if (!event) return { success: true };

    const eventType = body.header?.event_type;

    // 消息接收事件
    if (eventType === 'im.message.receive_v1') {
      await handleFeishuMessage(event);
    }

    return { success: true };
  });

  // 飞书渠道绑定页面
  app.get<{ Querystring: { token: string } }>('/bind', async (request, reply) => {
    const { token } = request.query;
    // 这里通常会展示一个网页，引导用户在飞书中授权
    return { message: 'Please complete binding in the Feishu app', token };
  });
}

async function handleFeishuMessage(event: any) {
  const senderId = event.sender?.sender_id?.user_id || event.sender?.sender_id?.open_id;
  const msgType = event.message?.message_type;
  const content = msgType === 'text' ? JSON.parse(event.message?.content || '{}').text?.trim() : '';
  const chatId = event.message?.chat_id;

  if (!senderId || !content) return;

  const db = getDb();
  const [binding] = await db
    .select()
    .from(channelBindings)
    .where(and(eq(channelBindings.channel, 'feishu'), eq(channelBindings.channelUserId, senderId)))
    .limit(1);

  if (!binding) {
    await sendFeishuMessage(chatId, '还没有绑定账号，请先在 App 中绑定飞书渠道。');
    return;
  }

  const userId = binding.userId;

  // 检查确认消息
  const confirmPending = pendingConfirms.get(senderId);
  if (confirmPending && Date.now() < confirmPending.expiresAt) {
    if (['确认', '是', 'y', 'yes', '对'].includes(content.toLowerCase())) {
      await db.insert(transactions).values({
        id: uuidv4(),
        userId,
        direction: confirmPending.parsedTx.direction,
        amountCents: confirmPending.parsedTx.amount_cents,
        currency: 'CNY',
        categoryId: confirmPending.categoryId,
        occurredAt: new Date(confirmPending.parsedTx.occurred_at).getTime(),
        merchant: confirmPending.parsedTx.merchant || null,
        note: confirmPending.parsedTx.note || null,
        source: 'feishu_bot',
        rawInputText: null,
        aiConfidence: confirmPending.parsedTx.confidence,
        isDeleted: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      pendingConfirms.delete(senderId);
      const yuan = (confirmPending.parsedTx.amount_cents / 100).toFixed(2).replace(/\.?0+$/, '');
      await sendFeishuMessage(chatId, `哼，¥${yuan}，记好了。`);
      return;
    } else if (['取消', '不', 'n', 'no'].includes(content.toLowerCase())) {
      pendingConfirms.delete(senderId);
      await sendFeishuMessage(chatId, '好吧，取消了。');
      return;
    }
  }

  // AI 解析
  const parsed = await parseAccountingText(content);
  if ('error' in parsed) {
    await sendFeishuMessage(chatId, '我没看懂，说清楚一点，比如"午饭35元"。');
    return;
  }

  const [category] = await db.select().from(categories).where(eq(categories.code, parsed.category_code)).limit(1);
  const yuan = (parsed.amount_cents / 100).toFixed(2).replace(/\.?0+$/, '');
  const catName = category?.name || '其他';

  if (parsed.confidence >= 0.9) {
    await db.insert(transactions).values({
      id: uuidv4(),
      userId,
      direction: parsed.direction,
      amountCents: parsed.amount_cents,
      currency: 'CNY',
      categoryId: category?.id || null,
      occurredAt: new Date(parsed.occurred_at).getTime(),
      merchant: parsed.merchant || null,
      note: parsed.note || null,
      source: 'feishu_bot',
      rawInputText: content,
      aiConfidence: parsed.confidence,
      isDeleted: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await sendFeishuMessage(chatId, `¥${yuan} ${catName}，已记好了。（如有误请发"撤销"）`);
    return;
  }

  pendingConfirms.set(senderId, {
    parsedTx: parsed,
    categoryId: category?.id || '',
    userId,
    expiresAt: Date.now() + 2 * 60 * 1000,
  });
  await sendFeishuMessage(chatId, `¥${yuan} ${catName}，是这样吗？回复"确认"入账，"取消"放弃。`);
}

async function sendFeishuMessage(chatId: string, text: string) {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    console.warn('[Feishu] App credentials not configured');
    return;
  }

  try {
    // 获取 tenant_access_token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const tokenData = (await tokenRes.json()) as { tenant_access_token: string };
    const token = tokenData.tenant_access_token;

    await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      }),
    });
  } catch (err) {
    console.error('[Feishu] Send message failed:', err);
  }
}

function verifyFeishuSignature(timestamp: string, nonce: string, body: string, signature: string): boolean {
  const secret = process.env.FEISHU_VERIFICATION_TOKEN || '';
  const str = timestamp + nonce + secret + body;
  const hash = createHmac('sha256', secret).update(str).digest('hex');
  return hash === signature;
}
