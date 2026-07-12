import cron from 'node-cron';
import {
  loadActivitySummaryConfig,
  loadActivitySummaryGistConfig,
  loadStatsConfig,
  loadStatsGistConfig,
} from './config.js';
import { startHealthServer } from './health-server.js';
import {
  GENERATION_CRON_EXPRESSIONS,
  runActivityScheduledJob,
} from './scheduler.js';
import { runStatsScheduledJob } from './stats-scheduler.js';

function scheduleJob(runJob) {
  const timezone = process.env.CRON_TZ?.trim();

  for (const expression of GENERATION_CRON_EXPRESSIONS) {
    cron.schedule(
      expression,
      () => {
        void runJob();
      },
      timezone ? { timezone } : undefined,
    );
  }
}

function main() {
  loadActivitySummaryConfig();
  loadActivitySummaryGistConfig();
  loadStatsConfig();
  loadStatsGistConfig();
  startHealthServer();

  const timezone = process.env.CRON_TZ?.trim();
  const scheduleLabel = GENERATION_CRON_EXPRESSIONS.join(', ');

  console.log('GitHub Activity + Stats Card schedulers');
  console.log(`Cron: ${scheduleLabel}`);
  if (timezone) {
    console.log(`Timezone: ${timezone}`);
  } else {
    console.log('Timezone: server local (set CRON_TZ e.g. America/Sao_Paulo)');
  }
  console.log('Press Ctrl+C to stop.\n');

  scheduleJob(runActivityScheduledJob);
  scheduleJob(runStatsScheduledJob);

  if (process.env.SCHEDULER_RUN_ON_START === '1') {
    void runActivityScheduledJob();
    void runStatsScheduledJob();
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Configuration error: ${message}`);
  process.exit(1);
}
