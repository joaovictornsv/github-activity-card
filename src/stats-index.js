import { loadStatsConfig } from './config.js';
import { buildStatsCard } from './build-stats-card.js';
import { fetchGitHubStats } from './fetch-stats.js';
import { generateStatsPng } from './generate-stats.js';

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
    const card = buildStatsCard(stats, config, { updatedAt: new Date() });
    console.log(JSON.stringify({ stats, card }, null, 2));
    return;
  }

  await generateStatsPng(config);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  console.error(
    'Existing output PNG was not modified (if it existed).',
  );
  process.exit(1);
});
