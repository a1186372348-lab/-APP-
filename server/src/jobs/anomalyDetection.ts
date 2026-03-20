/**
 * 异常消费检测定时任务（每日执行）
 */
import { getDb } from '../db/index';
import { transactions, users, channelBindings } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { detectAnomaly } from '../ai/analysis';
import { pushService } from '../services/push';

export async function runAnomalyDetection() {
  const db = getDb();
  console.log('[AnomalyDetection] Starting daily check...');

  const allUsers = await db.select({ id: users.id, assistantName: users.assistantName }).from(users);

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  for (const user of allUsers) {
    try {
      // 本周数据
      const currentWeekRows = await db
        .select({ amountCents: transactions.amountCents, categoryId: transactions.categoryId })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, 0),
            eq(transactions.direction, 'expense'),
            gte(transactions.occurredAt, weekAgo),
            lte(transactions.occurredAt, now)
          )
        );

      // 上周数据
      const lastWeekRows = await db
        .select({ amountCents: transactions.amountCents, categoryId: transactions.categoryId })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, 0),
            eq(transactions.direction, 'expense'),
            gte(transactions.occurredAt, twoWeeksAgo),
            lte(transactions.occurredAt, weekAgo)
          )
        );

      const currentWeekByCategory = aggregateByCategory(currentWeekRows);
      const lastWeekByCategory = aggregateByCategory(lastWeekRows);

      const result = await detectAnomaly({
        userId: user.id,
        assistantName: user.assistantName,
        currentWeekByCategory,
        lastWeekByCategory,
        currentMonthTotal: Object.values(currentWeekByCategory).reduce((a, b) => a + b, 0),
        lastMonthTotal: Object.values(lastWeekByCategory).reduce((a, b) => a + b, 0),
      });

      if (result.hasAnomaly && result.alertMessage) {
        await pushService.sendToUser(user.id, {
          title: `${user.assistantName}提醒你`,
          body: result.alertMessage,
          type: 'anomaly_alert',
        });
      }
    } catch (err) {
      console.error(`[AnomalyDetection] Failed for user ${user.id}:`, err);
    }
  }

  console.log(`[AnomalyDetection] Completed, checked ${allUsers.length} users.`);
}

function aggregateByCategory(rows: Array<{ amountCents: number; categoryId: string | null }>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const key = row.categoryId || 'other';
    result[key] = (result[key] || 0) + row.amountCents;
  }
  return result;
}

// 如果直接运行此文件
if (require.main === module) {
  runAnomalyDetection().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
