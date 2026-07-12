import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
  activitySummaryPngFilename,
  assertRequiredEnvVars,
  ConfigValidationError,
  loadActivitySummaryGistConfig,
  loadStatsGistConfig,
  statsPngFilename,
} from './config.js';

describe('statsPngFilename', () => {
  it('builds the default stats output filename from username', () => {
    expect(statsPngFilename('octocat')).toBe('octocat-stats.png');
  });
});

describe('activitySummaryPngFilename', () => {
  it('builds the default activity summary output filename from username', () => {
    expect(activitySummaryPngFilename('octocat')).toBe(
      'octocat-activity-summary.png',
    );
  });
});

describe('assertRequiredEnvVars', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
  });

  afterAll(() => {
    process.env = original;
  });

  it('throws ConfigValidationError when variables are missing or blank', () => {
    delete process.env.GITHUB_USERNAME;
    process.env.GITHUB_TOKEN = '   ';

    expect(() =>
      assertRequiredEnvVars(
        ['GITHUB_USERNAME', 'GITHUB_TOKEN'],
        'test context',
      ),
    ).toThrow(ConfigValidationError);

    try {
      assertRequiredEnvVars(
        ['GITHUB_USERNAME', 'GITHUB_TOKEN'],
        'test context',
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect(error.missing).toEqual(
        expect.arrayContaining(['GITHUB_USERNAME', 'GITHUB_TOKEN']),
      );
      expect(error.message).toContain('test context');
    }
  });

  it('does not throw when all variables are set', () => {
    process.env.GITHUB_USERNAME = 'octocat';
    process.env.GITHUB_TOKEN = 'token';

    expect(() =>
      assertRequiredEnvVars(
        ['GITHUB_USERNAME', 'GITHUB_TOKEN'],
        'test context',
      ),
    ).not.toThrow();
  });
});

describe('loadStatsGistConfig', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
  });

  afterAll(() => {
    process.env = original;
  });

  it('returns null when STATS_GIST_ID is unset', () => {
    delete process.env.STATS_GIST_ID;
    expect(loadStatsGistConfig()).toBeNull();
  });

  it('returns stats gist config when STATS_GIST_ID and token are set', () => {
    process.env.STATS_GIST_ID = 'stats123';
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.STATS_GIST_FILENAME = 'custom-stats.png';

    expect(loadStatsGistConfig()).toEqual({
      gistId: 'stats123',
      token: 'ghp_test',
      filename: 'custom-stats.png',
    });
  });

  it('throws when STATS_GIST_ID is set without GITHUB_TOKEN', () => {
    process.env.STATS_GIST_ID = 'stats123';
    delete process.env.GITHUB_TOKEN;

    expect(() => loadStatsGistConfig()).toThrow(/GITHUB_TOKEN is missing/);
  });
});

describe('loadActivitySummaryGistConfig', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
  });

  afterAll(() => {
    process.env = original;
  });

  it('returns null when neither gist id env var is set', () => {
    delete process.env.ACTIVITY_SUMMARY_GIST_ID;
    delete process.env.GIST_ID;
    expect(loadActivitySummaryGistConfig()).toBeNull();
  });

  it('falls back to GIST_ID when ACTIVITY_SUMMARY_GIST_ID is unset', () => {
    delete process.env.ACTIVITY_SUMMARY_GIST_ID;
    process.env.GIST_ID = 'abc123';
    process.env.GITHUB_TOKEN = 'ghp_test';

    expect(loadActivitySummaryGistConfig()).toEqual({
      gistId: 'abc123',
      token: 'ghp_test',
      filename: 'activity-summary.png',
    });
  });

  it('prefers ACTIVITY_SUMMARY_GIST_ID when both gist ids are set', () => {
    process.env.ACTIVITY_SUMMARY_GIST_ID = 'summary123';
    process.env.GIST_ID = 'abc123';
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.ACTIVITY_SUMMARY_GIST_FILENAME = 'activity.png';

    expect(loadActivitySummaryGistConfig()).toEqual({
      gistId: 'summary123',
      token: 'ghp_test',
      filename: 'activity.png',
    });
  });

  it('throws when a gist id is set without GITHUB_TOKEN', () => {
    process.env.GIST_ID = 'abc123';
    delete process.env.GITHUB_TOKEN;

    expect(() => loadActivitySummaryGistConfig()).toThrow(
      /GITHUB_TOKEN is missing/,
    );
  });
});
