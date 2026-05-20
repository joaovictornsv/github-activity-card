import { loadConfig } from './config.js';
import { fetchPublicEvents } from './fetch-events.js';
import { buildSlides } from './enrich-events.js';
import { generateActivityGif } from './generate.js';

function parseArgs(argv: string[]): { dryFetch: boolean } {
  return {
    dryFetch: argv.includes('--dry-fetch'),
  };
}

async function main(): Promise<void> {
  const { dryFetch } = parseArgs(process.argv.slice(2));
  const config = loadConfig();

  if (dryFetch) {
    console.log(`Fetching public events for ${config.username}…`);
    const events = await fetchPublicEvents(config);
    const slides = await buildSlides(events, config);
    console.log(JSON.stringify(slides, null, 2));
    return;
  }

  await generateActivityGif(config);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  console.error(
    'Existing output/activity.gif was not modified (if it existed).',
  );
  process.exit(1);
});
