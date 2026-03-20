/**
 * AI Provider 路由器 — 支持 OpenAI / 阿里云 Qwen 热切换
 * 国内环境优先使用 Qwen，海外优先使用 OpenAI
 */
import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' | 'text' };
}

class AiRouter {
  private openai: OpenAI | null = null;
  private qwen: OpenAI | null = null; // Qwen 兼容 OpenAI SDK 格式

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY not set');
      this.openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });
    }
    return this.openai;
  }

  private getQwen(): OpenAI {
    if (!this.qwen) {
      const apiKey = process.env.QWEN_API_KEY;
      if (!apiKey) throw new Error('QWEN_API_KEY not set');
      this.qwen = new OpenAI({
        apiKey,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      });
    }
    return this.qwen;
  }

  /**
   * 发起 Chat Completion，主 Provider 失败自动切换备用
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const primaryProvider = process.env.AI_PRIMARY_PROVIDER || 'openai'; // openai | qwen

    const providers: Array<() => Promise<string>> = [];

    if (primaryProvider === 'qwen') {
      providers.push(() => this.chatWithQwen(messages, options));
      providers.push(() => this.chatWithOpenAI(messages, options));
    } else {
      providers.push(() => this.chatWithOpenAI(messages, options));
      providers.push(() => this.chatWithQwen(messages, options));
    }

    let lastError: Error | null = null;
    for (const fn of providers) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        console.warn(`[AiRouter] Provider failed, trying fallback: ${(err as Error).message}`);
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  private async chatWithOpenAI(messages: ChatMessage[], options: ChatOptions): Promise<string> {
    const client = this.getOpenAI();
    const res = await client.chat.completions.create({
      model: options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
      response_format: options.responseFormat,
    } as Parameters<typeof client.chat.completions.create>[0]);
    return res.choices[0]?.message?.content ?? '';
  }

  private async chatWithQwen(messages: ChatMessage[], options: ChatOptions): Promise<string> {
    const client = this.getQwen();
    const res = await client.chat.completions.create({
      model: options.model || process.env.QWEN_MODEL || 'qwen-plus',
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
    } as Parameters<typeof client.chat.completions.create>[0]);
    return res.choices[0]?.message?.content ?? '';
  }

  /**
   * 语音转写（ASR）
   */
  async transcribe(audioBuffer: Buffer, filename: string): Promise<string> {
    const client = this.getOpenAI();
    const { toFile } = await import('openai');
    const file = await toFile(audioBuffer, filename, { type: 'audio/m4a' });
    const res = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'zh',
    });
    return res.text;
  }
}

export const aiRouter = new AiRouter();
