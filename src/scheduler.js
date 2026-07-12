import cron from 'node-cron';
import { fileURLToPath } from 'node:url';
import {
  loadActivitySummaryConfig,
  loadActivitySummaryGistConfig,
  loadConfig,
  loadGistConfig,
} from './config.js';
import { generateActivitySummaryPng } from './generate-activity-summary.js';
import { fetchActivitySlides, generateActivityGif } from './generate.js';
import { startHealthServer } from './health-server.js';
import { publishActivitySummaryPng } from './upload-activity-summary.js';
import { publishActivityGif } from './upload.js';

/** 9 AM, midday, 3 PM, 6 PM, 9 PM, midnight (server local time). */
export const GENERATION_CRON_EXPRESSIONS = [
  '0 9 * * *',
  '0 12 * * *',
  '0 15 * * *',
  '0 18 * * *',
  '0 21 * * *',
  '0 0 * * *',
];

export async function runActivityScheduledJob() {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Scheduled run started`);

  try {
    const appConfig = loadConfig();
    const slides = await fetchActivitySlides(appConfig);
    const outputPath = await generateActivityGif(appConfig, slides);

    const gistConfig = loadGistConfig();
    if (gistConfig) {
      console.log('Updating gist…');
      await publishActivityGif(outputPath, gistConfig);
    }

    const summaryConfig = loadActivitySummaryConfig();
    const summaryPath = await generateActivitySummaryPng(
      summaryConfig,
      slides,
    );

    const summaryGistConfig = loadActivitySummaryGistConfig();
    if (summaryGistConfig) {
      console.log('Updating activity summary gist…');
      await publishActivitySummaryPng(summaryPath, summaryGistConfig);
    }

    console.log(`[${new Date().toISOString()}] Scheduled run finished`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] Scheduled run failed: ${message}`);
    console.error(
      'Local output GIF was left unchanged on failure.',
    );
  }
}

function main() {
  loadConfig();
  loadGistConfig();
  loadActivitySummaryConfig();
  loadActivitySummaryGistConfig();
  startHealthServer();

  const timezone = process.env.CRON_TZ?.trim();
  const scheduleLabel = GENERATION_CRON_EXPRESSIONS.join(', ');

  console.log('GitHub Activity Card scheduler');
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
        void runActivityScheduledJob();
      },
      timezone ? { timezone } : undefined,
    );
  }

  if (process.env.SCHEDULER_RUN_ON_START === '1') {
    void runActivityScheduledJob();
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
