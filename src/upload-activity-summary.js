import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadActivitySummaryConfig,
  loadActivitySummaryGistConfig,
} from './config.js';
import { updateGistFile } from './update-gist.js';

export async function publishActivitySummaryPng(filePath, gistConfig) {
  await updateGistFile(filePath, gistConfig);
}

async function main() {
  const appConfig = loadActivitySummaryConfig();
  const gistConfig = loadActivitySummaryGistConfig();
  if (!gistConfig) {
    throw new Error(
      'ACTIVITY_SUMMARY_GIST_ID or GIST_ID is required for npm run upload. ' +
        'Set one of them and GITHUB_TOKEN in .env.',
    );
  }

  const filePath = path.resolve(
    process.argv[2]?.trim() || appConfig.outputPath,
  );

  try {
    await fs.access(filePath);
  } catch {
    throw new Error(
      `PNG not found: ${filePath}. Run npm run generate first.`,
    );
  }

  console.log(`Publishing ${filePath} to gist…`);
  await publishActivitySummaryPng(filePath, gistConfig);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Publish error: ${message}`);
    process.exit(1);
  });
}
