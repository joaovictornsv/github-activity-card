import cron from 'node-cron';
import { fileURLToPath } from 'node:url';
import { loadStatsConfig, loadStatsGistConfig } from './config.js';
import { generateStatsPng } from './generate-stats.js';
import { startHealthServer } from './health-server.js';
import { GENERATION_CRON_EXPRESSIONS } from './scheduler.js';
import { publishStatsPng } from './upload-stats.js';

export async function runStatsScheduledJob() {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Stats scheduled run started`);

  try {
    const appConfig = loadStatsConfig();
    const outputPath = await generateStatsPng(appConfig);

    const gistConfig = loadStatsGistConfig();
    if (gistConfig) {
      console.log('Updating stats gist…');
      await publishStatsPng(outputPath, gistConfig);
    }

    console.log(`[${new Date().toISOString()}] Stats scheduled run finished`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[${new Date().toISOString()}] Stats scheduled run failed: ${message}`,
    );
    console.error(
      'Local output PNG was left unchanged on failure.',
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
        void runStatsScheduledJob();
      },
      timezone ? { timezone } : undefined,
    );
  }

  if (process.env.SCHEDULER_RUN_ON_START === '1') {
    void runStatsScheduledJob();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Configuration error: ${message}`);
    process.exit(1);
  }
}
