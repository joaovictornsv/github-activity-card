import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

export const EVENT_WHITELIST = [
  'PushEvent',
  'PullRequestEvent',
  'IssuesEvent',
  'PullRequestReviewEvent',
  'IssueCommentEvent',
  'PullRequestReviewCommentEvent',
  'ReleaseEvent',
  'CreateEvent',
] as const;

export type WhitelistedEventType = (typeof EVENT_WHITELIST)[number];

export interface AppConfig {
  username: string;
  token: string | undefined;
  outputPath: string;
  slideDurationSec: number;
  cardWidth: number;
  cardHeight: number;
  maxSlides: number;
  templatesDir: string;
  projectRoot: string;
}

export const APP_REQUIRED_ENV_VARS = ['GITHUB_USERNAME', 'GITHUB_TOKEN'] as const;

export const R2_REQUIRED_ENV_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
] as const;

export type AppRequiredEnvVar = (typeof APP_REQUIRED_ENV_VARS)[number];
export type R2RequiredEnvVar = (typeof R2_REQUIRED_ENV_VARS)[number];

export class ConfigValidationError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[], context: string) {
    const list = missing.join(', ');
    super(
      `${context}: missing required environment variable(s): ${list}. ` +
        'Check .env or your environment.',
    );
    this.name = 'ConfigValidationError';
    this.missing = missing;
  }
}

function collectMissingEnvVars(names: readonly string[]): string[] {
  const missing: string[] = [];
  for (const name of names) {
    if (!process.env[name]?.trim()) {
      missing.push(name);
    }
  }
  return missing;
}

export function assertRequiredEnvVars(
  names: readonly string[],
  context: string,
): void {
  const missing = collectMissingEnvVars(names);
  if (missing.length > 0) {
    throw new ConfigValidationError(missing, context);
  }
}

function requireEnvVars(
  names: readonly string[],
  context: string,
): Record<string, string> {
  assertRequiredEnvVars(names, context);
  const values: Record<string, string> = {};
  for (const name of names) {
    values[name] = process.env[name]!.trim();
  }
  return values;
}

function parsePositiveFloat(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric env value: ${value}`);
  }
  return parsed;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer env value: ${value}`);
  }
  return parsed;
}

export function loadConfig(): AppConfig {
  const env = requireEnvVars(APP_REQUIRED_ENV_VARS, 'GitHub activity card');

  return {
    username: env.GITHUB_USERNAME,
    token: process.env.GITHUB_TOKEN?.trim() || undefined,
    outputPath: path.resolve(
      projectRoot,
      process.env.OUTPUT_PATH?.trim() || 'output/activity.gif',
    ),
    slideDurationSec: parsePositiveFloat(
      process.env.SLIDE_DURATION_SEC,
      3,
    ),
    cardWidth: parsePositiveInt(process.env.CARD_WIDTH, 415),
    cardHeight: parsePositiveInt(process.env.CARD_HEIGHT, 96),
    maxSlides: 5,
    templatesDir: path.join(projectRoot, 'templates'),
    projectRoot,
  };
}

export interface UploadConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  objectKey: string;
  cacheControl: string;
  publicUrl: string | undefined;
}

function parsePublicUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid R2_PUBLIC_URL: must be a valid URL (${trimmed})`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid R2_PUBLIC_URL: must use http or https (${trimmed})`,
    );
  }
  return trimmed.replace(/\/$/, '');
}

export function loadUploadConfig(): UploadConfig {
  const env = requireEnvVars(R2_REQUIRED_ENV_VARS, 'R2 upload');

  const objectKey = process.env.R2_OBJECT_KEY?.trim() || 'activity.gif';
  if (!objectKey) {
    throw new Error('Invalid R2_OBJECT_KEY: must not be empty');
  }

  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
    objectKey,
    cacheControl:
      process.env.R2_CACHE_CONTROL?.trim() || 'public, max-age=3600',
    publicUrl: parsePublicUrl(process.env.R2_PUBLIC_URL),
  };
}
