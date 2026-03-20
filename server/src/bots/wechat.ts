/**
 * 微信公众号/服务号 Bot
 * 处理微信 Webhook 消息事件
 */
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { getDb } from '../db/index';
import { channelBindings, channelBindTokens, transactions, categories, users } from '../db/schema';
import { parseAccountingText } from '../ai/accounting';

// 临时存储等待确认的解析结果（Redis 更佳，MVP 先用内存）
const pendingConfirms = new Map<
  string,
  { parsedTx: any; categoryId: string; userId: string; expiresAt: number }
>();

export async function wechatBotRoute(app: FastifyInstance) {
  // 微信服务器验证
  app.get<{
    Querystring: { signature: string; timestamp: string; nonce: string; echostr: string };
  }>('/', async (request, reply) => {
    const { signature, timestamp, nonce, echostr } = request.query;
    const token = process.env.WX_BOT_TOKEN || 'jizhang_wx_token';

    const hash = createHash('sha1')
      .update([token, timestamp, nonce].sort().join(''))
      .digest('hex');

    if (hash === signature) {
      return reply.type('text/plain').send(echostr);
    }
    return reply.code(403).send('Forbidden');
  });

  // 接收微信消息
  app.post('/', async (request, reply) => {
    const body = request.body as any;
    const xml = body; // 需要配置 XML 解析插件（实际使用 xml2js 等）

    // 简化处理：直接解析 XML body
    const openid = extractXml(xml, 'FromUserName');
    const msgType = extractXml(xml, 'MsgType');
    const content = extractXml(xml, 'Content')?.trim() || '';

    if (!openid) return reply.send('<xml></xml>');

    const db = getDb();

    // 查找绑定关系
    const [binding] = await db
      .select()
      .from(channelBindings)
      .where(and(eq(channelBindings.channel, 'wechat'), eq(channelBindings.channelUserId, openid)))
      .limit(1);

    // 关注事件 / 带参数二维码扫描
    if (msgType === 'event') {
      const event = extractXml(xml, 'Event');
      const eventKey = extractXml(xml, 'EventKey') || '';

      if (event === 'subscribe' || event === 'SCAN') {
        // 尝试绑定
        const tokenMatch = eventKey.match(/bind_([a-f0-9-]{36})/);
        if (tokenMatch) {
          await handleBindToken(tokenMatch[1], openid, 'wechat');
        }

        const welcomeMsg = binding
          ? '哼，你已经绑定过了，发消息就能记账了。'
          : tokenMatch
          ? '好了好了，绑定成功了，以后在这里发消息就能记账，哼。'
          : '你好，发一条记账消息试试，比如"午饭35元"。';

        return reply.type('text/xml').send(buildTextReply(extractXml(xml, 'ToUserName')!, openid, welcomeMsg));
      }
    }

    if (msgType !== 'text') {
      return reply.type('text/xml').send(buildTextReply(extractXml(xml, 'ToUserName')!, openid, '请发文字消息来记账，比如"午饭35元"。'));
    }

    if (!binding) {
      return reply
        .type('text/xml')
        .send(
          buildTextReply(
            extractXml(xml, 'ToUserName')!,
            openid,
            '还没有绑定账号，请先在 App 中绑定微信渠道。'
          )
        );
    }

    const userId = binding.userId;

    // 检查是否是确认消息
    const confirmPending = pendingConfirms.get(openid);
    if (confirmPending && Date.now() < confirmPending.expiresAt) {
      if (['确认', '是', 'y', 'yes', '对', '嗯'].includes(content.toLowerCase())) {
        // 入账
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
          source: 'wechat_bot',
          rawInputText: null,
          aiConfidence: confirmPending.parsedTx.confidence,
          isDeleted: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        pendingConfirms.delete(openid);

        const yuan = (confirmPending.parsedTx.amount_cents / 100).toFixed(2).replace(/\.?0+$/, '');
        const replyText = `哼，¥${yuan}，记好了。`;
        return reply.type('text/xml').send(buildTextReply(extractXml(xml, 'ToUserName')!, openid, replyText));
      } else if (['取消', '不', 'n', 'no', '算了'].includes(content.toLowerCase())) {
        pendingConfirms.delete(openid);
        return reply.type('text/xml').send(buildTextReply(extractXml(xml, 'ToUserName')!, openid, '好吧，取消了。'));
      }
    }

    // AI 解析记账
    const parsed = await parseAccountingText(content);

    if ('error' in parsed) {
      return reply
        .type('text/xml')
        .send(
          buildTextReply(
            extractXml(xml, 'ToUserName')!,
            openid,
            '我没看懂这是什么账，说清楚一点，比如"午饭35元"。'
          )
        );
    }

    // 查找分类
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.code, parsed.category_code))
      .limit(1);

    const yuan = (parsed.amount_cents / 100).toFixed(2).replace(/\.?0+$/, '');
    const catName = category?.name || '其他';

    // 高置信度自动入账
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
        source: 'wechat_bot',
        rawInputText: content,
        aiConfidence: parsed.confidence,
        isDeleted: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return reply.type('text/xml').send(buildTextReply(extractXml(xml, 'ToUserName')!, openid, `¥${yuan} ${catName}，已记好了，哼。（如有误请发"撤销"）`));
    }

    // 需要确认
    pendingConfirms.set(openid, {
      parsedTx: parsed,
      categoryId: category?.id || '',
      userId,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });

    return reply
      .type('text/xml')
      .send(
        buildTextReply(
          extractXml(xml, 'ToUserName')!,
          openid,
          `¥${yuan} ${catName}，是这样吗？回复"确认"入账，"取消"放弃。`
        )
      );
  });
}

async function handleBindToken(token: string, channelUserId: string, channel: string) {
  const db = getDb();
  const [tokenRow] = await db
    .select()
    .from(channelBindTokens)
    .where(eq(channelBindTokens.token, token))
    .limit(1);

  if (!tokenRow || Date.now() > tokenRow.expiresAt || tokenRow.usedAt) return;

  // 创建绑定
  await db.insert(channelBindings).values({
    id: uuidv4(),
    userId: tokenRow.userId,
    channel,
    channelUserId,
    isActive: 1,
    boundAt: Date.now(),
  }).onConflictDoNothing();

  // 标记 token 已使用
  await db
    .update(channelBindTokens)
    .set({ usedAt: Date.now() })
    .where(eq(channelBindTokens.token, token));
}

function buildTextReply(toUser: string, fromUser: string, content: string): string {
  return `<xml>
<ToUserName><![CDATA[${fromUser}]]></ToUserName>
<FromUserName><![CDATA[${toUser}]]></FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
}

function extractXml(xml: any, tag: string): string | null {
  if (typeof xml === 'string') {
    const match = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]+)\\]\\]></${tag}>`));
    return match ? match[1] : null;
  }
  return xml?.[tag]?.[0] || null;
}
