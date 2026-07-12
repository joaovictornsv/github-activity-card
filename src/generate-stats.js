import fs from 'node:fs/promises';
import path from 'node:path';
import { loadStatsConfig } from './config.js';
import { encodeGif } from './encode-gif.js';
import { buildStatsSlides } from './build-stats-slides.js';
import { fetchGitHubStats } from './fetch-stats.js';
import { cleanupTempDir, renderSlides } from './render-slides.js';

async function writeGifAtomically(tempGifPath, outputPath) {
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const tempOutput = `${outputPath}.tmp`;
  await fs.copyFile(tempGifPath, tempOutput);
  await fs.rename(tempOutput, outputPath);
}

export async function generateStatsGif(config = loadStatsConfig()) {
  console.log(`Fetching GitHub stats for ${config.username}…`);
  const stats = await fetchGitHubStats(config);
  const slides = buildStatsSlides(stats, config);

  console.log(`Rendering ${slides.length} slide(s)…`);
  const { pngPaths, tempDir } = await renderSlides(slides, config);
  const tempGifPath = path.join(tempDir, 'stats.gif');

  try {
    console.log('Encoding GIF…');
    await encodeGif(pngPaths, tempGifPath, config.slideDurationSec, {
      gifWidth: config.cardWidth * config.deviceScaleFactor,
      maxColors: config.gifMaxColors,
      bayerScale: config.gifBayerScale,
    });
    await writeGifAtomically(tempGifPath, config.outputPath);
    console.log(`Saved ${config.outputPath}`);
    return config.outputPath;
  } finally {
    await cleanupTempDir(tempDir);
  }
}
