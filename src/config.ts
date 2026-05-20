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

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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
  return {
    username: requireEnv('GITHUB_USERNAME'),
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
