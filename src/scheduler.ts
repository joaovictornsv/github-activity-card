import cron from 'node-cron';
import { loadConfig, loadUploadConfig } from './config.js';
import { generateActivityGif } from './generate.js';
import { uploadActivityGif } from './upload.js';

/** 9 AM, midday, 3 PM, 6 PM, 9 PM, midnight (server local time). */
export const GENERATION_CRON_EXPRESSIONS = [
  '0 9 * * *',
  '0 12 * * *',
  '0 15 * * *',
  '0 18 * * *',
  '0 21 * * *',
  '0 0 * * *',
] as const;

async function runScheduledJob(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Scheduled run started`);

  try {
    const appConfig = loadConfig();
    const outputPath = await generateActivityGif(appConfig);

    const uploadConfig = loadUploadConfig();
    console.log('Uploading to R2…');
    await uploadActivityGif(outputPath, uploadConfig);

    console.log(`[${new Date().toISOString()}] Scheduled run finished`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] Scheduled run failed: ${message}`);
    console.error(
      'Local output/activity.gif and remote object were left unchanged on failure.',
    );
  }
}

function main(): void {
  loadConfig();
  loadUploadConfig();

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
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Configuration error: ${message}`);
  process.exit(1);
}
