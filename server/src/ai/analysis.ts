/**
 * AI 财务分析模块（付费功能）
 * 包含：即时分析、异常检测、健康评分、月度报告
 */
import { aiRouter } from './router';

const TSUNDERE_ANALYST_PROMPT = `你是「花生」，一只傲娇仓鼠财务助手。
分析风格要求：
- 先给结论，再傲娇，绝不说教
- 关心但嘴硬：批评时带着关心，但绝不承认自己在关心
- 月末超预算时自动减弱傲娇，变得轻声关心（可以说"最近是不是有什么事..."）
- 数据不足时：「就这几天数据，能分析个啥，快去多记几笔。」
- 禁止用：「您」「建议您」「应该」「必须」等说教措辞
- 用年轻人说话方式，有语气词，有时候有点小毒舌但不伤人
- 回复使用 Markdown 格式，但语气保持傲娇`;

export interface MonthlyStats {
  totalExpenseCents: number;
  totalIncomeCents: number;
  categoryBreakdown: Array<{
    code: string;
    name: string;
    amountCents: number;
    percentage: number;
  }>;
  transactionCount: number;
  dataStartDate: string;
  dataEndDate: string;
  assistantName: string;
}

export async function generateInstantAnalysis(stats: MonthlyStats): Promise<string> {
  const yuan = (c: number) => `¥${(c / 100).toFixed(0)}`;

  const statsText = `
用户数据概览：
- 统计周期：${stats.dataStartDate} ~ ${stats.dataEndDate}
- 本月总支出：${yuan(stats.totalExpenseCents)}
- 本月总收入：${yuan(stats.totalIncomeCents)}
- 记录笔数：${stats.transactionCount}
- 支出构成：
${stats.categoryBreakdown.map((c) => `  · ${c.name}: ${yuan(c.amountCents)} (${c.percentage.toFixed(1)}%)`).join('\n')}
- 仓鼠名字：${stats.assistantName}`;

  const isDataSparse = stats.transactionCount < 5;

  const userPrompt = isDataSparse
    ? `数据还很少（只有 ${stats.transactionCount} 笔），请以引导性语气分析，不要强行给结论。\n${statsText}`
    : `请分析以下财务数据，给出消费结构解读和改进方向。\n${statsText}`;

  return aiRouter.chat(
    [
      { role: 'system', content: TSUNDERE_ANALYST_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 600 }
  );
}

export interface AnomalyInput {
  userId: string;
  assistantName: string;
  currentWeekByCategory: Record<string, number>; // category_code -> cents
  lastWeekByCategory: Record<string, number>;
  currentMonthTotal: number;
  lastMonthTotal: number;
}

export interface AnomalyResult {
  hasAnomaly: boolean;
  alertMessage: string | null;
  anomalyType: string | null;
}

export async function detectAnomaly(input: AnomalyInput): Promise<AnomalyResult> {
  // 规则检测：某分类本周比上周增加超过 50%
  const alerts: string[] = [];

  for (const [code, currentCents] of Object.entries(input.currentWeekByCategory)) {
    const lastCents = input.lastWeekByCategory[code] || 0;
    if (lastCents === 0 && currentCents > 5000) {
      alerts.push(`新增${code}支出 ¥${(currentCents / 100).toFixed(0)}`);
    } else if (lastCents > 0) {
      const ratio = currentCents / lastCents;
      if (ratio > 1.5 && currentCents > 10000) {
        const increase = ((ratio - 1) * 100).toFixed(0);
        alerts.push(`${code}支出比上周增加了 ${increase}%（¥${(currentCents / 100).toFixed(0)}）`);
      }
    }
  }

  if (alerts.length === 0) {
    return { hasAnomaly: false, alertMessage: null, anomalyType: null };
  }

  const alertContext = alerts.join('；');
  const prompt = `用户${input.assistantName}的账单出现异常：${alertContext}。请用傲娇但关心的语气，生成一条主动预警消息（50字以内）。`;

  try {
    const message = await aiRouter.chat(
      [
        { role: 'system', content: TSUNDERE_ANALYST_PROMPT },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.8, maxTokens: 100 }
    );
    return { hasAnomaly: true, alertMessage: message.trim(), anomalyType: 'spending_spike' };
  } catch {
    return {
      hasAnomaly: true,
      alertMessage: `你最近消费有点异常：${alerts[0]}，我就是随便说说。`,
      anomalyType: 'spending_spike',
    };
  }
}

export async function calculateHealthScore(stats: MonthlyStats): Promise<{
  score: number;
  level: 'excellent' | 'good' | 'warning' | 'danger';
  comment: string;
}> {
  if (stats.transactionCount < 3) {
    return { score: 0, level: 'good', comment: '数据太少，先多记几笔再说。' };
  }

  // 简单评分算法
  let score = 80;
  const savingRate =
    stats.totalIncomeCents > 0
      ? (stats.totalIncomeCents - stats.totalExpenseCents) / stats.totalIncomeCents
      : 0;

  if (savingRate < 0) score -= 30; // 入不敷出
  else if (savingRate < 0.1) score -= 15;
  else if (savingRate > 0.3) score += 10;

  // 娱乐占比过高扣分
  const entertainment = stats.categoryBreakdown.find((c) => c.code === 'entertainment');
  if (entertainment && entertainment.percentage > 30) score -= 10;

  score = Math.max(0, Math.min(100, score));

  const level =
    score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'warning' : 'danger';

  const levelTexts = {
    excellent: '财务状况不错，哼，也就一般吧。',
    good: '还行，但还有提升空间。',
    warning: '有点需要注意了，不是说你不好，就是...关心一下。',
    danger: '这个月花太多了，最近还好吗？',
  };

  return { score, level, comment: levelTexts[level] };
}

export async function generateMonthlyReport(stats: MonthlyStats): Promise<string> {
  const yuan = (c: number) => `¥${(c / 100).toFixed(0)}`;
  const isOverBudget = stats.totalExpenseCents > stats.totalIncomeCents * 0.9;

  const prompt = `
请生成一份月度财务总结报告（300字以内，Markdown格式）。
${isOverBudget ? '注意：用户本月支出接近或超过收入，请减弱傲娇感，用温柔语气关心。' : ''}

数据：
- 本月总支出：${yuan(stats.totalExpenseCents)}
- 本月总收入：${yuan(stats.totalIncomeCents)}
- 支出构成：${stats.categoryBreakdown.map((c) => `${c.name}${yuan(c.amountCents)}(${c.percentage.toFixed(0)}%)`).join('、')}
- 仓鼠名字：${stats.assistantName}

报告需包含：整体评价、最大支出亮点/问题、下月建议（用傲娇语气，不说教）。`;

  return aiRouter.chat(
    [
      { role: 'system', content: TSUNDERE_ANALYST_PROMPT },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.7, maxTokens: 800 }
  );
}
