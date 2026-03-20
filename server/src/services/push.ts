/**
 * 统一推送服务 — App 推送 + 渠道消息
 */
import { getDb } from '../db/index';
import { channelBindings } from '../db/schema';
import { eq, and } from 'drizzle-orm';

interface PushPayload {
  title: string;
  body: string;
  type: 'anomaly_alert' | 'monthly_report' | 'general';
  data?: Record<string, unknown>;
}

class PushService {
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    await Promise.allSettled([
      this.sendAppPush(userId, payload),
      this.sendChannelMessages(userId, payload),
    ]);
  }

  private async sendAppPush(userId: string, payload: PushPayload): Promise<void> {
    // TODO: 接入 FCM / APNs（通过 Expo Push 或 自建）
    // expo push notification service
    const expoPushToken = await this.getExpoPushToken(userId);
    if (!expoPushToken) return;

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({
          to: expoPushToken,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: 'default',
        }),
      });
    } catch (err) {
      console.error('[Push] App push failed:', err);
    }
  }

  private async sendChannelMessages(userId: string, payload: PushPayload): Promise<void> {
    const db = getDb();
    const bindings = await db
      .select()
      .from(channelBindings)
      .where(and(eq(channelBindings.userId, userId), eq(channelBindings.isActive, 1)));

    for (const binding of bindings) {
      try {
        if (binding.channel === 'wechat') {
          await this.sendWechatTemplateMessage(binding.channelUserId, payload);
        } else if (binding.channel === 'feishu') {
          await this.sendFeishuMessage(binding.channelUserId, payload);
        }
        // 钉钉主动推送需要企业内部应用 token，较复杂，MVP 暂缓
      } catch (err) {
        console.error(`[Push] Channel ${binding.channel} push failed:`, err);
      }
    }
  }

  private async getExpoPushToken(userId: string): Promise<string | null> {
    // TODO: 存储 Expo push token 到 users 表
    return null;
  }

  private async sendWechatTemplateMessage(openid: string, payload: PushPayload): Promise<void> {
    const accessToken = await this.getWechatAccessToken();
    if (!accessToken) return;

    const templateId = process.env.WX_TEMPLATE_ID_ALERT;
    if (!templateId) return;

    await fetch(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: openid,
        template_id: templateId,
        data: {
          first: { value: payload.title, color: '#FF8C42' },
          keyword1: { value: payload.body, color: '#333333' },
          remark: { value: '点击查看详情', color: '#888888' },
        },
      }),
    });
  }

  private async sendFeishuMessage(userId: string, payload: PushPayload): Promise<void> {
    // 需要飞书 app token，复用 feishu bot 的逻辑
    // MVP 阶段暂时跳过复杂的飞书主动推送
    console.log(`[Push] Feishu push to ${userId}: ${payload.body}`);
  }

  private wechatAccessToken: { token: string; expiresAt: number } | null = null;

  private async getWechatAccessToken(): Promise<string | null> {
    if (this.wechatAccessToken && Date.now() < this.wechatAccessToken.expiresAt) {
      return this.wechatAccessToken.token;
    }

    const appId = process.env.WX_APP_ID;
    const appSecret = process.env.WX_APP_SECRET;
    if (!appId || !appSecret) return null;

    try {
      const res = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
      );
      const data = (await res.json()) as { access_token: string; expires_in: number };
      this.wechatAccessToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
      };
      return data.access_token;
    } catch {
      return null;
    }
  }
}

export const pushService = new PushService();
