import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './config.js';
import { encodeGif } from './encode-gif.js';
import { fetchPublicEvents } from './fetch-events.js';
import { buildSlides } from './enrich-events.js';
import { cleanupTempDir, renderSlides } from './render-slides.js';

function parseArgs(argv: string[]): { dryFetch: boolean } {
  return {
    dryFetch: argv.includes('--dry-fetch'),
  };
}

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

async function main(): Promise<void> {
  const { dryFetch } = parseArgs(process.argv.slice(2));
  const config = loadConfig();

  console.log(`Fetching public events for ${config.username}…`);
  const events = await fetchPublicEvents(config);
  const slides = await buildSlides(events, config);

  if (dryFetch) {
    console.log(JSON.stringify(slides, null, 2));
    return;
  }

  console.log(`Rendering ${slides.length} slide(s)…`);
  const { pngPaths, tempDir } = await renderSlides(slides, config);

  const tempGifPath = path.join(tempDir, 'activity.gif');

  try {
    console.log('Encoding GIF…');
    await encodeGif(
      pngPaths,
      tempGifPath,
      config.slideDurationSec,
      config.cardWidth,
    );
    await writeGifAtomically(tempGifPath, config.outputPath);
    console.log(`Saved ${config.outputPath}`);
  } finally {
    await cleanupTempDir(tempDir);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  console.error(
    'Existing output/activity.gif was not modified (if it existed).',
  );
  process.exit(1);
});
