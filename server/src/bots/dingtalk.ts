/**
 * 钉钉 Bot
 * 处理钉钉 Webhook 消息
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
  { parsedTx: any; categoryId: string; userId: string; expiresAt: number; webhookUrl: string }
>();

export async function dingtalkBotRoute(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const body = request.body as any;

    // 验证签名
    const timestamp = request.headers['timestamp'] as string;
    const sign = request.headers['sign'] as string;
    if (!verifyDingtalkSignature(timestamp, sign)) {
      return reply.code(403).send({ error: 'Invalid signature' });
    }

    const msgType = body?.msgtype;
    if (msgType !== 'text') {
      return sendDingtalkReply(body?.sessionWebhook, '请发文字消息来记账，比如"午饭35元"。');
    }

    const content: string = body?.text?.content?.trim() || '';
    const senderId: string = body?.senderStaffId || body?.senderId || '';
    const webhookUrl: string = body?.sessionWebhook || '';

    if (!content || !senderId) return { success: true };

    const db = getDb();
    const [binding] = await db
      .select()
      .from(channelBindings)
      .where(and(eq(channelBindings.channel, 'dingtalk'), eq(channelBindings.channelUserId, senderId)))
      .limit(1);

    if (!binding) {
      await sendDingtalkReply(webhookUrl, '还没有绑定账号，请先在 App 中绑定钉钉渠道。');
      return { success: true };
    }

    const userId = binding.userId;

    // 确认流程
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
          source: 'dingtalk_bot',
          rawInputText: null,
          aiConfidence: confirmPending.parsedTx.confidence,
          isDeleted: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        pendingConfirms.delete(senderId);
        const yuan = (confirmPending.parsedTx.amount_cents / 100).toFixed(2).replace(/\.?0+$/, '');
        await sendDingtalkReply(webhookUrl, `哼，¥${yuan}，记好了。`);
        return { success: true };
      } else if (['取消', '不', 'n', 'no'].includes(content.toLowerCase())) {
        pendingConfirms.delete(senderId);
        await sendDingtalkReply(webhookUrl, '好吧，取消了。');
        return { success: true };
      }
    }

    // AI 解析
    const parsed = await parseAccountingText(content);
    if ('error' in parsed) {
      await sendDingtalkReply(webhookUrl, '我没看懂，说清楚一点，比如"午饭35元"。');
      return { success: true };
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
        source: 'dingtalk_bot',
        rawInputText: content,
        aiConfidence: parsed.confidence,
        isDeleted: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await sendDingtalkReply(webhookUrl, `¥${yuan} ${catName}，已记好了，哼。`);
      return { success: true };
    }

    pendingConfirms.set(senderId, {
      parsedTx: parsed,
      categoryId: category?.id || '',
      userId,
      expiresAt: Date.now() + 2 * 60 * 1000,
      webhookUrl,
    });
    await sendDingtalkReply(webhookUrl, `¥${yuan} ${catName}，是这样吗？回复"确认"入账，"取消"放弃。`);
    return { success: true };
  });
}

async function sendDingtalkReply(webhookUrl: string, text: string) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'text', text: { content: text } }),
    });
  } catch (err) {
    console.error('[Dingtalk] Send reply failed:', err);
  }
}

function verifyDingtalkSignature(timestamp: string, sign: string): boolean {
  const secret = process.env.DINGTALK_BOT_SECRET || '';
  if (!secret) return true; // 开发环境跳过验证
  const str = `${timestamp}\n${secret}`;
  const hash = createHmac('sha256', secret).update(str).digest('base64');
  return encodeURIComponent(hash) === sign;
}
