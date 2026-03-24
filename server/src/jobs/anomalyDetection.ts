/**
 * 异常检测定时任务
 */
import { getDb } from '../db/index';
import { transactions, users } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { detectAnomaly } from '../ai/analysis';

export async function runAnomalyDetection() {
  const db = getDb();
  const now = Date.now();
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    try {
      const thisWeekStart = now - 7 * 24 * 60 * 60 * 1000;
      const thisWeekTxs = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, user.id), eq(transactions.isDeleted, 0), gte(transactions.occurredAt, thisWeekStart)));

      const lastWeekStart = now - 14 * 24 * 60 * 60 * 1000;
      const lastWeekTxs = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, user.id), eq(transactions.isDeleted, 0), gte(transactions.occurredAt, lastWeekStart), lte(transactions.occurredAt, thisWeekStart)));

      const thisWeekByCategory = aggregateByCategory(thisWeekTxs);
      const lastWeekByCategory = aggregateByCategory(lastWeekTxs);

      const result = await detectAnomaly({
        userId: user.id,
        assistantName: user.assistantName,
        currentWeekByCategory: thisWeekByCategory,
        lastWeekByCategory: lastWeekByCategory,
        currentMonthTotal: 0,
        lastMonthTotal: 0,
      });

      if (result.hasAnomaly && result.alertMessage) {
        console.log(`[Anomaly] User ${user.id}: ${result.alertMessage}`);
      }
    } catch (err) {
      console.error(`[Anomaly] Failed for user ${user.id}:`, err);
    }
  }
}

function aggregateByCategory(txs: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const tx of txs) {
    if (tx.direction === 'expense') {
      map[tx.categoryId || 'other'] = (map[tx.categoryId || 'other'] || 0) + tx.amountCents;
    }
  }
  return map;
}
