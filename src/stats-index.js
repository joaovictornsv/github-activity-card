import { loadStatsConfig } from './config.js';
import { buildStatsSlides } from './build-stats-slides.js';
import { fetchGitHubStats } from './fetch-stats.js';
import { generateStatsGif } from './generate-stats.js';

function parseArgs(argv) {
  return {
    dryFetch: argv.includes('--dry-fetch'),
  };
}

async function main() {
  const { dryFetch } = parseArgs(process.argv.slice(2));
  const config = loadStatsConfig();

  if (dryFetch) {
    console.log(`Fetching GitHub stats for ${config.username}…`);
    const stats = await fetchGitHubStats(config);
    const slides = buildStatsSlides(stats, config);
    console.log(JSON.stringify({ stats, slides }, null, 2));
    return;
  }

  await generateStatsGif(config);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  console.error(
    'Existing output GIF was not modified (if it existed).',
  );
  process.exit(1);
});
