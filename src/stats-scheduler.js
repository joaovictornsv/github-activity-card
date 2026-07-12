import cron from 'node-cron';
import { loadStatsConfig, loadStatsGistConfig } from './config.js';
import { generateStatsGif } from './generate-stats.js';
import { startHealthServer } from './health-server.js';
import { GENERATION_CRON_EXPRESSIONS } from './scheduler.js';
import { publishStatsGif } from './upload-stats.js';

async function runScheduledJob() {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Stats scheduled run started`);

  try {
    const appConfig = loadStatsConfig();
    const outputPath = await generateStatsGif(appConfig);

    const gistConfig = loadStatsGistConfig();
    if (gistConfig) {
      console.log('Updating stats gist…');
      await publishStatsGif(outputPath, gistConfig);
    }

    console.log(`[${new Date().toISOString()}] Stats scheduled run finished`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[${new Date().toISOString()}] Stats scheduled run failed: ${message}`,
    );
    console.error(
      'Local output GIF was left unchanged on failure.',
    );
  }
}

function main() {
  loadStatsConfig();
  loadStatsGistConfig();
  startHealthServer();

  const timezone = process.env.CRON_TZ?.trim();
  const scheduleLabel = GENERATION_CRON_EXPRESSIONS.join(', ');

  console.log('GitHub Stats Card scheduler');
  console.log(`Cron: ${scheduleLabel}`);
  if (timezone) {
    console.log(`Timezone: ${timezone}`);
  } else {
    console.log('Timezone: server local (set CRON_TZ e.g. America/Sao_Paulo)');
  }
  console.log('Press Ctrl+C to stop.\n');

  for (const expression of GENERATION_CRON_EXPRESSIONS) {
    cron.schedule(
      expression,
      () => {
        void runScheduledJob();
      },
      timezone ? { timezone } : undefined,
    );
  }

  if (process.env.SCHEDULER_RUN_ON_START === '1') {
    void runScheduledJob();
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Configuration error: ${message}`);
  process.exit(1);
}
