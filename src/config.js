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
];

export function activityGifFilename(username) {
  return `${username}-activity.gif`;
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

function parsePositiveFloat(value, fallback) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric env value: ${value}`);
  }
  return parsed;
}

function parsePositiveInt(value, fallback) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer env value: ${value}`);
  }
  return parsed;
}

function parseIntInRange(value, fallback, min, max, name) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${name}: must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

export function loadConfig() {
  const env = requireEnvVars(APP_REQUIRED_ENV_VARS, 'GitHub activity card');

  return {
    username: env.GITHUB_USERNAME,
    token: process.env.GITHUB_TOKEN?.trim() || undefined,
    outputPath: path.resolve(
      projectRoot,
      process.env.OUTPUT_PATH?.trim() ||
        path.join('output', activityGifFilename(env.GITHUB_USERNAME)),
    ),
    slideDurationSec: parsePositiveFloat(
      process.env.SLIDE_DURATION_SEC,
      3,
    ),
    cardWidth: parsePositiveInt(process.env.CARD_WIDTH, 470),
    cardHeight: parsePositiveInt(process.env.CARD_HEIGHT, 124),
    deviceScaleFactor: parsePositiveInt(process.env.DEVICE_SCALE_FACTOR, 2),
    gifMaxColors: parseIntInRange(
      process.env.GIF_MAX_COLORS,
      256,
      2,
      256,
      'GIF_MAX_COLORS',
    ),
    gifBayerScale: parseIntInRange(
      process.env.GIF_BAYER_SCALE,
      2,
      0,
      5,
      'GIF_BAYER_SCALE',
    ),
    maxSlides: 5,
    templatesDir: path.join(projectRoot, 'templates'),
    projectRoot,
  };
}

/** When `GIST_ID` is set, publish replaces that file in the gist (requires `gist` PAT scope). */
export function loadGistConfig() {
  const gistId = process.env.GIST_ID?.trim();
  if (!gistId) {
    return null;
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'Gist update: GIST_ID is set but GITHUB_TOKEN is missing. ' +
        'Use a fine-grained or classic PAT with the gist scope.',
    );
  }

  const filename = process.env.GIST_FILENAME?.trim() || 'activity.gif';
  if (!filename) {
    throw new Error('Invalid GIST_FILENAME: must not be empty');
  }

  return { gistId, token, filename };
}
