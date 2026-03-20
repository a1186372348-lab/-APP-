/**
 * 仓鼠傲娇台词库
 * 用于 AI 服务不可达时的本地 fallback
 */

export const CONFIRM_LINES = [
  '哼，记好了，下次别乱花了。',
  '就这点？行吧，帮你记着了。',
  '知道了知道了，记完了。哼。',
  '好好好，记了记了，别烦我。',
  '嗯，入账了。我就是顺手帮你记的，别多想。',
];

export const ANALYSIS_NO_DATA = [
  '就这几天数据，能分析个啥，快去多记几笔。',
  '数据太少了，你是觉得我会变魔术吗？',
  '才这几条记录，还想让我分析？先好好记账再说。',
];

export const ANOMALY_ALERT_TEMPLATES = [
  '你这周{category}花了¥{amount}，比上周多了{ratio}%，我就是随便说说啊。',
  '哼，{category}支出又多了，¥{amount}，要注意一点啊（不是在关心你）。',
  '最近{category}花得有点多，¥{amount}...我是无所谓啦，你随便。',
];

export const MONTHLY_OVER_BUDGET = [
  '这个月花得有点多了，最近还好吗？',
  '支出超了呢，没什么大不了的，下个月注意就好了。',
  '花多了点，但是...你还好吧。',
];

export const WELCOME_NEW_USER = [
  '哼，你终于来了，我才不是在等你。以后的事，交给我了。',
  '好了好了，你来了就好，以后的账，我帮你盯着。',
];

export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function formatConfirmLine(amountYuan: string, categoryName: string): string {
  return randomPick(CONFIRM_LINES).replace('{amount}', amountYuan).replace('{category}', categoryName);
}
