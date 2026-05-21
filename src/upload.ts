import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { GistConfig, UploadConfig } from './config.js';
import { loadConfig, loadGistConfig, loadUploadConfig } from './config.js';
import { updateGistActivityGif } from './update-gist.js';

function r2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export async function uploadActivityGif(
  filePath: string,
  uploadConfig: UploadConfig,
): Promise<void> {
  const body = await fs.readFile(filePath);
  const contentType = 'image/gif';

  const client = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint(uploadConfig.accountId),
    credentials: {
      accessKeyId: uploadConfig.accessKeyId,
      secretAccessKey: uploadConfig.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: uploadConfig.bucket,
      Key: uploadConfig.objectKey,
      Body: body,
      ContentType: contentType,
      CacheControl: uploadConfig.cacheControl,
    }),
  );

  const publicUrl = uploadConfig.publicUrl;
  if (publicUrl) {
    const url = publicUrl.endsWith('/')
      ? `${publicUrl}${uploadConfig.objectKey}`
      : `${publicUrl}/${uploadConfig.objectKey}`;
    console.log(`Uploaded to ${url}`);
  } else {
    console.log(
      `Uploaded s3://${uploadConfig.bucket}/${uploadConfig.objectKey}`,
    );
  }
}

export async function publishActivityGif(
  filePath: string,
  uploadConfig: UploadConfig,
  gistConfig: GistConfig | null,
  options?: { failOnGistError?: boolean },
): Promise<void> {
  await uploadActivityGif(filePath, uploadConfig);
  if (!gistConfig) {
    return;
  }

  try {
    console.log('Updating gist…');
    await updateGistActivityGif(filePath, gistConfig);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Gist update failed (R2 upload succeeded): ${message}`);
    if (options?.failOnGistError) {
      throw error;
    }
  }
}

async function main(): Promise<void> {
  const appConfig = loadConfig();
  const uploadConfig = loadUploadConfig();
  const gistConfig = loadGistConfig();
  const filePath = path.resolve(
    process.argv[2]?.trim() || appConfig.outputPath,
  );

  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`GIF not found: ${filePath}. Run npm run generate first.`);
  }

  console.log(`Uploading ${filePath}…`);
  await publishActivityGif(filePath, uploadConfig, gistConfig, {
    failOnGistError: true,
  });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Upload error: ${message}`);
    process.exit(1);
  });
}
