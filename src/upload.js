import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadGistConfig } from './config.js';
import { updateGistActivityGif } from './update-gist.js';

export async function publishActivityGif(filePath, gistConfig) {
  await updateGistActivityGif(filePath, gistConfig);
}

async function main() {
  const appConfig = loadConfig();
  const gistConfig = loadGistConfig();
  if (!gistConfig) {
    throw new Error(
      'GIST_ID is required for npm run upload. Set GIST_ID and GITHUB_TOKEN in .env.',
    );
  }

  const filePath = path.resolve(
    process.argv[2]?.trim() || appConfig.outputPath,
  );

  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`GIF not found: ${filePath}. Run npm run generate first.`);
  }

  console.log(`Publishing ${filePath} to gist…`);
  await publishActivityGif(filePath, gistConfig);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Publish error: ${message}`);
    process.exit(1);
  });
}
