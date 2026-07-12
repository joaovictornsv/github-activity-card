import fs from 'node:fs/promises';
import path from 'node:path';
import { loadActivitySummaryConfig } from './config.js';
import { buildActivitySummaryCard } from './build-activity-summary-card.js';
import { fetchActivitySlides } from './generate.js';
import { cleanupTempDir, renderActivitySummaryCard } from './render-slides.js';

async function writePngAtomically(sourcePath, outputPath) {
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const tempOutput = `${outputPath}.tmp`;
  await fs.copyFile(sourcePath, tempOutput);
  await fs.rename(tempOutput, outputPath);
}

export async function generateActivitySummaryPng(
  config = loadActivitySummaryConfig(),
  preloadedSlides,
) {
  const slides = preloadedSlides ?? (await fetchActivitySlides(config));
  const card = buildActivitySummaryCard(slides, config, {
    updatedAt: new Date(),
  });

  console.log(`Rendering activity summary (${card.items.length} item(s))…`);
  const { pngPath, tempDir } = await renderActivitySummaryCard(card, config);

  try {
    await writePngAtomically(pngPath, config.outputPath);
    console.log(`Saved ${config.outputPath}`);
    return config.outputPath;
  } finally {
    await cleanupTempDir(tempDir);
  }
}
