import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
  activityGifFilename,
  assertRequiredEnvVars,
  ConfigValidationError,
  loadGistConfig,
  loadStatsGistConfig,
  statsGifFilename,
} from './config.js';

describe('activityGifFilename', () => {
  it('builds the default output filename from username', () => {
    expect(activityGifFilename('octocat')).toBe('octocat-activity.gif');
  });
});

describe('statsGifFilename', () => {
  it('builds the default stats output filename from username', () => {
    expect(statsGifFilename('octocat')).toBe('octocat-stats.gif');
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

describe('loadGistConfig', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
  });

  afterAll(() => {
    process.env = original;
  });

  it('returns null when GIST_ID is unset', () => {
    delete process.env.GIST_ID;
    expect(loadGistConfig()).toBeNull();
  });

  it('returns gist config when GIST_ID and token are set', () => {
    process.env.GIST_ID = 'abc123';
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GIST_FILENAME = 'custom.gif';

    expect(loadGistConfig()).toEqual({
      gistId: 'abc123',
      token: 'ghp_test',
      filename: 'custom.gif',
    });
  });

  it('throws when GIST_ID is set without GITHUB_TOKEN', () => {
    process.env.GIST_ID = 'abc123';
    delete process.env.GITHUB_TOKEN;

    expect(() => loadGistConfig()).toThrow(/GITHUB_TOKEN is missing/);
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
    process.env.STATS_GIST_FILENAME = 'custom-stats.gif';

    expect(loadStatsGistConfig()).toEqual({
      gistId: 'stats123',
      token: 'ghp_test',
      filename: 'custom-stats.gif',
    });
  });

  it('throws when STATS_GIST_ID is set without GITHUB_TOKEN', () => {
    process.env.STATS_GIST_ID = 'stats123';
    delete process.env.GITHUB_TOKEN;

    expect(() => loadStatsGistConfig()).toThrow(/GITHUB_TOKEN is missing/);
  });
});
