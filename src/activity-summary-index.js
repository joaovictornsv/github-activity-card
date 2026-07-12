import { loadActivitySummaryConfig } from './config.js';
import { buildActivitySummaryCard } from './build-activity-summary-card.js';
import { fetchActivitySlides } from './generate.js';
import { generateActivitySummaryPng } from './generate-activity-summary.js';

function parseArgs(argv) {
  return {
    dryFetch: argv.includes('--dry-fetch'),
  };
}

async function main() {
  const { dryFetch } = parseArgs(process.argv.slice(2));
  const config = loadActivitySummaryConfig();

  if (dryFetch) {
    const slides = await fetchActivitySlides(config);
    const card = buildActivitySummaryCard(slides, config, {
      updatedAt: new Date(),
    });
    console.log(JSON.stringify({ slides, card }, null, 2));
    return;
  }

  await generateActivitySummaryPng(config);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  console.error(
    'Existing output PNG was not modified (if it existed).',
  );
  process.exit(1);
});
