import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig } from './config.js';
import { loadConfig } from './config.js';
import { encodeGif } from './encode-gif.js';
import { fetchPublicEvents } from './fetch-events.js';
import { buildSlides } from './enrich-events.js';
import { cleanupTempDir, renderSlides } from './render-slides.js';

async function writeGifAtomically(
  tempGifPath: string,
  outputPath: string,
): Promise<void> {
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const tempOutput = `${outputPath}.tmp`;
  await fs.copyFile(tempGifPath, tempOutput);
  await fs.rename(tempOutput, outputPath);
}

export async function generateActivityGif(
  config: AppConfig = loadConfig(),
): Promise<string> {
  console.log(`Fetching public events for ${config.username}…`);
  const events = await fetchPublicEvents(config);
  const slides = await buildSlides(events, config);

  console.log(`Rendering ${slides.length} slide(s)…`);
  const { pngPaths, tempDir } = await renderSlides(slides, config);
  const tempGifPath = path.join(tempDir, 'activity.gif');

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
