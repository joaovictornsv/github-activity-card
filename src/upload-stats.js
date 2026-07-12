import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStatsConfig, loadStatsGistConfig } from './config.js';
import { updateGistActivityGif } from './update-gist.js';

export async function publishStatsPng(filePath, gistConfig) {
  await updateGistActivityGif(filePath, gistConfig);
}

async function main() {
  const appConfig = loadStatsConfig();
  const gistConfig = loadStatsGistConfig();
  if (!gistConfig) {
    throw new Error(
      'STATS_GIST_ID is required for npm run upload:stats. Set STATS_GIST_ID and GITHUB_TOKEN in .env.',
    );
  }

  const filePath = path.resolve(
    process.argv[2]?.trim() || appConfig.outputPath,
  );

  try {
    await fs.access(filePath);
  } catch {
    throw new Error(
      `PNG not found: ${filePath}. Run npm run generate:stats first.`,
    );
  }

  console.log(`Publishing ${filePath} to gist…`);
  await publishStatsPng(filePath, gistConfig);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Publish error: ${message}`);
    process.exit(1);
  });
}
