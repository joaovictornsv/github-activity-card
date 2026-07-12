import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { checkGitHubToken, REQUIRED_TOKEN_SCOPES } from './check-token.js';

describe('checkGitHubToken', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reports missing scopes for classic PAT', async () => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).endsWith('/user')) {
        return {
          ok: true,
          headers: {
            get: (name) =>
              name === 'x-oauth-scopes' ? 'gist' : null,
          },
          json: async () => ({ login: 'octocat' }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: {
            user: {
              contributionsCollection: {
                hasAnyRestrictedContributions: true,
                restrictedContributionsCount: 10,
              },
            },
          },
        }),
      };
    });

    const report = await checkGitHubToken({
      token: 'test-token',
      username: 'octocat',
    });

    expect(report.missingScopes).toEqual(['read:user', 'repo']);
    expect(report.privateDataLikelyBlocked).toBe(true);
    expect(report.ok).toBe(false);
    expect(REQUIRED_TOKEN_SCOPES).toEqual(['gist', 'read:user', 'repo']);
  });

  it('passes when classic PAT has all scopes and usernames match', async () => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).endsWith('/user')) {
        return {
          ok: true,
          headers: {
            get: (name) =>
              name === 'x-oauth-scopes' ? 'gist, read:user, repo' : null,
          },
          json: async () => ({ login: 'octocat' }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: {
            user: {
              contributionsCollection: {
                hasAnyRestrictedContributions: false,
                restrictedContributionsCount: 0,
              },
            },
          },
        }),
      };
    });

    const report = await checkGitHubToken({
      token: 'test-token',
      username: 'octocat',
    });

    expect(report.missingScopes).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
