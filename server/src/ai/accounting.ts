/**
 * 记账解析 AI 模块
 * Parser 层：无人格，纯结构化提取
 */
import { aiRouter } from './router';

export interface ParsedTransaction {
  amount_cents: number;
  direction: 'expense' | 'income' | 'transfer';
  category_code: string;
  occurred_at: string; // ISO 8601
  merchant: string | null;
  note: string | null;
  confidence: number;
}

export interface ParseError {
  error: string;
  confidence: 0;
}

const ACCOUNTING_SYSTEM_PROMPT = `You are an accounting parser for a Chinese personal finance app.
Extract transaction information from user input text.
Return ONLY valid JSON. No explanations. No markdown.

Output schema:
{
  "amount_cents": integer (amount in fen/cents, must be positive),
  "direction": "expense" | "income" | "transfer",
  "category_code": "catering" | "transport" | "shopping" | "entertainment" | "medical" | "other_expense" | "salary" | "bonus" | "other_income",
  "occurred_at": ISO 8601 datetime string (infer from context, default to now if unclear),
  "merchant": string | null,
  "note": string | null,
  "confidence": float 0.0~1.0
}

Category mapping hints:
- 餐饮/吃饭/外卖/午饭/晚饭/早饭/奶茶/咖啡 → catering
- 地铁/公交/打车/滴滴/出租车/停车/高速/加油 → transport
- 购物/超市/淘宝/京东/买xxx → shopping
- 电影/游戏/KTV/演唱会/娱乐 → entertainment
- 药/医院/看病/体检 → medical
- 工资/薪资 → salary, direction=income
- 奖金/红包收到 → bonus, direction=income

If you cannot extract a valid positive amount, return: {"error": "cannot_parse", "confidence": 0}`;

export async function parseAccountingText(
  text: string,
  contextHint?: string
): Promise<ParsedTransaction | ParseError> {
  const userContent = contextHint
    ? `Current time: ${new Date().toISOString()}\nUser input: ${text}`
    : `Current time: ${new Date().toISOString()}\nUser input: ${text}`;

  try {
    const raw = await aiRouter.chat(
      [
        { role: 'system', content: ACCOUNTING_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      {
        temperature: 0.1,
        maxTokens: 256,
        responseFormat: { type: 'json_object' },
      }
    );

    const parsed = JSON.parse(raw);

    if (parsed.error) {
      return { error: parsed.error, confidence: 0 };
    }

    // 验证必填字段
    if (!parsed.amount_cents || parsed.amount_cents <= 0) {
      return { error: 'invalid_amount', confidence: 0 };
    }

    return {
      amount_cents: Math.round(parsed.amount_cents),
      direction: parsed.direction || 'expense',
      category_code: parsed.category_code || 'other_expense',
      occurred_at: parsed.occurred_at || new Date().toISOString(),
      merchant: parsed.merchant || null,
      note: parsed.note || null,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
    };
  } catch (err) {
    console.error('[parseAccountingText] Failed:', err);
    return { error: 'ai_error', confidence: 0 };
  }
}

/**
 * 生成记账成功后的傲娇确认台词
 */
const TSUNDERE_SYSTEM_PROMPT = `你是「花生」，一只傲娇仓鼠助手。
根据记账信息，生成一句简短的傲娇确认语（20字以内）。
先说结论，再傲娇，绝不说教。
用年轻人语气，可有语气词，有点毒舌但不伤人。
不要用"您"，不要用"建议"。`;

export async function generateConfirmLine(
  amountCents: number,
  categoryName: string,
  assistantName: string
): Promise<string> {
  const yuan = (amountCents / 100).toFixed(2).replace(/\.?0+$/, '');
  const fallbacks = [
    `哼，¥${yuan}，记好了。`,
    `就这点？行吧，我帮你记着。`,
    `¥${yuan}的${categoryName}，记完了。哼。`,
    `知道了知道了，¥${yuan}，帮你记着了。`,
  ];

  try {
    const result = await aiRouter.chat(
      [
        { role: 'system', content: TSUNDERE_SYSTEM_PROMPT },
        { role: 'user', content: `金额: ¥${yuan}，分类: ${categoryName}，仓鼠名字: ${assistantName}` },
      ],
      { temperature: 0.9, maxTokens: 60 }
    );
    return result.trim() || fallbacks[0];
  } catch {
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}
