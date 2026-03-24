import { runAnomalyDetection } from './jobs/anomalyDetection';

// 每天凌晨 2:17 运行（避开整点高峰）
const CRON_SCHEDULE = '17 2 * * *';

export function startScheduledJobs() {
  const cron = require('node-cron');

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log('[Cron] Running anomaly detection...');
    try {
      await runAnomalyDetection();
      console.log('[Cron] Anomaly detection complete.');
    } catch (err) {
      console.error('[Cron] Anomaly detection failed:', err);
    }
  });

  console.log(`[Cron] Scheduled anomaly detection at ${CRON_SCHEDULE}`);
}
