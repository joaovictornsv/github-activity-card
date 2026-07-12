import fs from 'node:fs/promises';
import path from 'node:path';
import { loadStatsConfig } from './config.js';
import { buildStatsCard } from './build-stats-card.js';
import { fetchGitHubStats } from './fetch-stats.js';
import { cleanupTempDir, renderStatsCard } from './render-slides.js';

async function writePngAtomically(sourcePath, outputPath) {
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const tempOutput = `${outputPath}.tmp`;
  await fs.copyFile(sourcePath, tempOutput);
  await fs.rename(tempOutput, outputPath);
}

export async function generateStatsPng(config = loadStatsConfig()) {
  console.log(`Fetching GitHub stats for ${config.username}…`);
  const stats = await fetchGitHubStats(config);
  const card = buildStatsCard(stats, config, { updatedAt: new Date() });

  console.log('Rendering stats card…');
  const { pngPath, tempDir } = await renderStatsCard(card, config);

  try {
    await writePngAtomically(pngPath, config.outputPath);
    console.log(`Saved ${config.outputPath}`);
    return config.outputPath;
  } finally {
    await cleanupTempDir(tempDir);
  }
}
