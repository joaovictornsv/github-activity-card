import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  fetchGitHubStats,
  STAT_QUERIES,
  STAT_SEARCH_QUERIES,
} from './fetch-stats.js';

describe('fetchGitHubStats', () => {
  const originalFetch = global.fetch;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    warnSpy.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    warnSpy.mockClear();
  });

  function mockSearchResponse(totalCount, incompleteResults = false) {
    return {
      ok: true,
      json: async () => ({
        total_count: totalCount,
        incomplete_results: incompleteResults,
        items: [],
      }),
    };
  }

  function mockGraphqlResponse(data) {
    return {
      ok: true,
      json: async () => ({ data }),
    };
  }

  it('fetches search counts and contribution graph totals', async () => {
    const calls = [];

    global.fetch = jest.fn(async (url, init) => {
      const target = String(url);
      calls.push({ url: target, body: init?.body });

      if (target.endsWith('/graphql')) {
        const body = JSON.parse(init.body);
        if (body.query.includes('contributionYears')) {
          return mockGraphqlResponse({
            user: {
              contributionsCollection: { contributionYears: [2024, 2025] },
            },
          });
        }

        return mockGraphqlResponse({
          user: {
            y2024: {
              totalCommitContributions: 1000,
              totalPullRequestReviewContributions: 50,
            },
            y2025: {
              totalCommitContributions: 2053,
              totalPullRequestReviewContributions: 78,
            },
          },
        });
      }

      if (target.includes('author%3Aoctocat+type%3Apr+is%3Amerged')) {
        return mockSearchResponse(42);
      }

      if (target.includes('assignee%3Aoctocat+type%3Aissue+is%3Aclosed')) {
        return mockSearchResponse(7);
      }

      throw new Error(`Unexpected fetch URL: ${target}`);
    });

    const stats = await fetchGitHubStats({
      username: 'octocat',
      token: 'test-token',
    });

    expect(stats).toEqual({
      mergedPrs: 42,
      closedAssignedIssues: 7,
      prReviews: 128,
      commits: 3053,
    });

    const searchCalls = calls.filter((call) => call.url.includes('/search/issues'));
    expect(searchCalls).toHaveLength(2);
    for (const call of searchCalls) {
      expect(call.url).toContain('per_page=1');
    }

    const graphqlCalls = calls.filter((call) => call.url.endsWith('/graphql'));
    expect(graphqlCalls).toHaveLength(2);
  });

  it('warns when search results are incomplete', async () => {
    global.fetch = jest.fn(async (url, init) => {
      const target = String(url);

      if (target.endsWith('/graphql')) {
        const body = JSON.parse(init.body);
        if (body.query.includes('contributionYears')) {
          return mockGraphqlResponse({
            user: {
              contributionsCollection: { contributionYears: [2025] },
            },
          });
        }

        return mockGraphqlResponse({
          user: {
            y2025: {
              totalCommitContributions: 1,
              totalPullRequestReviewContributions: 1,
            },
          },
        });
      }

      if (target.includes('author%3Aoctocat+type%3Apr+is%3Amerged')) {
        return mockSearchResponse(10, true);
      }

      return mockSearchResponse(1);
    });

    await fetchGitHubStats({
      username: 'octocat',
      token: 'test-token',
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('incomplete results for merged pull requests'),
    );
  });

  it('builds expected search queries', () => {
    expect(STAT_SEARCH_QUERIES.mergedPrs('octocat')).toBe(
      'author:octocat type:pr is:merged',
    );
    expect(STAT_SEARCH_QUERIES.closedAssignedIssues('octocat')).toBe(
      'assignee:octocat type:issue is:closed',
    );
    expect(STAT_QUERIES.commits('octocat')).toBe('author:octocat');
  });
});
