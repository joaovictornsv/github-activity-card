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
  'CreateEvent',
];

export function statsPngFilename(username) {
  return `${username}-stats.png`;
}

export function activitySummaryPngFilename(username) {
  return `${username}-activity-summary.png`;
}

export const APP_REQUIRED_ENV_VARS = ['GITHUB_USERNAME', 'GITHUB_TOKEN'];

export class ConfigValidationError extends Error {
  constructor(missing, context) {
    const list = missing.join(', ');
    super(
      `${context}: missing required environment variable(s): ${list}. ` +
        'Check .env or your environment.',
    );
    this.name = 'ConfigValidationError';
    this.missing = missing;
  }
}

function collectMissingEnvVars(names) {
  const missing = [];
  for (const name of names) {
    if (!process.env[name]?.trim()) {
      missing.push(name);
    }
  }
  return missing;
}

export function assertRequiredEnvVars(names, context) {
  const missing = collectMissingEnvVars(names);
  if (missing.length > 0) {
    throw new ConfigValidationError(missing, context);
  }
}

function requireEnvVars(names, context) {
  assertRequiredEnvVars(names, context);
  const values = {};
  for (const name of names) {
    values[name] = process.env[name].trim();
  }
  return values;
}

function parsePositiveInt(value, fallback) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer env value: ${value}`);
  }
  return parsed;
}

export function loadConfig() {
  const env = requireEnvVars(APP_REQUIRED_ENV_VARS, 'GitHub activity card');

  return {
    username: env.GITHUB_USERNAME,
    token: process.env.GITHUB_TOKEN?.trim() || undefined,
    ...loadSharedRenderConfig(),
    maxSlides: 5,
  };
}

function loadSharedRenderConfig() {
  return {
    cardWidth: parsePositiveInt(process.env.CARD_WIDTH, 450),
    cardHeight: parsePositiveInt(process.env.CARD_HEIGHT, 124),
    deviceScaleFactor: parsePositiveInt(process.env.DEVICE_SCALE_FACTOR, 2),
    templatesDir: path.join(projectRoot, 'templates'),
    projectRoot,
  };
}

export function loadStatsConfig() {
  const env = requireEnvVars(APP_REQUIRED_ENV_VARS, 'GitHub stats card');

  return {
    username: env.GITHUB_USERNAME,
    token: process.env.GITHUB_TOKEN?.trim() || undefined,
    outputPath: path.resolve(
      projectRoot,
      process.env.STATS_OUTPUT_PATH?.trim() ||
        path.join('output', statsPngFilename(env.GITHUB_USERNAME)),
    ),
    ...loadSharedRenderConfig(),
    statsTimezone: process.env.CRON_TZ?.trim() || undefined,
  };
}

export function loadActivitySummaryConfig() {
  const base = loadConfig();

  return {
    ...base,
    outputPath: path.resolve(
      projectRoot,
      process.env.ACTIVITY_SUMMARY_OUTPUT_PATH?.trim() ||
        path.join('output', activitySummaryPngFilename(base.username)),
    ),
    activitySummaryTimezone: process.env.CRON_TZ?.trim() || undefined,
  };
}

/**
 * When `ACTIVITY_SUMMARY_GIST_ID` or `GIST_ID` is set, publish replaces that
 * file in the gist (requires `gist` PAT scope).
 */
export function loadActivitySummaryGistConfig() {
  const gistId =
    process.env.ACTIVITY_SUMMARY_GIST_ID?.trim() ||
    process.env.GIST_ID?.trim();
  if (!gistId) {
    return null;
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'Activity summary gist update: ACTIVITY_SUMMARY_GIST_ID or GIST_ID is set ' +
        'but GITHUB_TOKEN is missing. Use a fine-grained or classic PAT with the gist scope.',
    );
  }

  const filename =
    process.env.ACTIVITY_SUMMARY_GIST_FILENAME?.trim() ||
    'activity-summary.png';
  if (!filename) {
    throw new Error('Invalid ACTIVITY_SUMMARY_GIST_FILENAME: must not be empty');
  }

  return { gistId, token, filename };
}

/** When `STATS_GIST_ID` is set, publish replaces that file in the gist (requires `gist` PAT scope). */
export function loadStatsGistConfig() {
  const gistId = process.env.STATS_GIST_ID?.trim();
  if (!gistId) {
    return null;
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'Stats gist update: STATS_GIST_ID is set but GITHUB_TOKEN is missing. ' +
        'Use a fine-grained or classic PAT with the gist scope.',
    );
  }

  const filename = process.env.STATS_GIST_FILENAME?.trim() || 'stats.png';
  if (!filename) {
    throw new Error('Invalid STATS_GIST_FILENAME: must not be empty');
  }

  return { gistId, token, filename };
}
