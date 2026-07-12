import { GitHubApiError } from './types.js';

const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'github-activity-card/0.1';

/** Search queries for metrics not available on the contribution graph. */
export const STAT_SEARCH_QUERIES = {
  mergedPrs: (username) => `author:${username} type:pr is:merged`,
  closedAssignedIssues: (username) =>
    `assignee:${username} type:issue is:closed`,
};

function buildHeaders(config, accept = 'application/vnd.github+json') {
  const headers = {
    Accept: accept,
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  return headers;
}

async function graphqlRequest(query, config) {
  if (!config.token) {
    throw new GitHubApiError(
      'GitHub GraphQL requires GITHUB_TOKEN (read:user scope for private contributions)',
      401,
    );
  }

  const response = await fetch(`${GITHUB_API}/graphql`, {
    method: 'POST',
    headers: {
      ...buildHeaders(config),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GitHubApiError(
      `GitHub GraphQL error ${response.status}: ${body || response.statusText}`,
      response.status,
    );
  }

  const payload = await response.json();
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const message = payload.errors.map((error) => error.message).join('; ');
    throw new GitHubApiError(`GitHub GraphQL error: ${message}`, 500);
  }

  if (!payload.data) {
    throw new GitHubApiError('GitHub GraphQL returned unexpected payload', 500);
  }

  return payload.data;
}

function yearCollectionRange(year) {
  const currentYear = new Date().getUTCFullYear();
  const from = `${year}-01-01T00:00:00Z`;
  const to =
    year === currentYear
      ? new Date().toISOString()
      : `${year}-12-31T23:59:59Z`;
  return { from, to };
}

async function fetchContributionYears(config) {
  const login = JSON.stringify(config.username);
  const data = await graphqlRequest(
    `query { user(login: ${login}) { contributionsCollection { contributionYears } } }`,
    config,
  );

  const years = data.user?.contributionsCollection?.contributionYears;
  if (!Array.isArray(years)) {
    throw new GitHubApiError(
      'GitHub GraphQL returned unexpected contributionYears payload',
      500,
    );
  }

  return years;
}

function buildContributionsTotalsQuery(username, years) {
  const login = JSON.stringify(username);
  const collectionFields = years
    .map((year) => {
      const { from, to } = yearCollectionRange(year);
      return `
    y${year}: contributionsCollection(from: ${JSON.stringify(from)}, to: ${JSON.stringify(to)}) {
      totalCommitContributions
      totalPullRequestReviewContributions
    }`;
    })
    .join('');

  return `query {
  user(login: ${login}) {${collectionFields}
  }
}`;
}

async function fetchContributionTotals(config) {
  const years = await fetchContributionYears(config);
  if (years.length === 0) {
    return { commits: 0, prReviews: 0 };
  }

  const data = await graphqlRequest(
    buildContributionsTotalsQuery(config.username, years),
    config,
  );

  const user = data.user;
  if (!user) {
    throw new GitHubApiError('GitHub GraphQL user not found', 404);
  }

  let commits = 0;
  let prReviews = 0;

  for (const year of years) {
    const collection = user[`y${year}`];
    if (!collection) {
      throw new GitHubApiError(
        `GitHub GraphQL missing contributions for year ${year}`,
        500,
      );
    }

    commits += collection.totalCommitContributions;
    prReviews += collection.totalPullRequestReviewContributions;
  }

  return { commits, prReviews };
}

async function searchIssuesCount(query, config, label) {
  const url = new URL(`${GITHUB_API}/search/issues`);
  url.searchParams.set('q', query);
  url.searchParams.set('per_page', '1');

  const response = await fetch(url, { headers: buildHeaders(config) });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GitHubApiError(
      `GitHub Search API error ${response.status} for ${label}: ${body || response.statusText}`,
      response.status,
    );
  }

  const data = await response.json();
  if (typeof data.total_count !== 'number') {
    throw new GitHubApiError(
      `GitHub Search API returned unexpected payload for ${label}`,
      500,
    );
  }

  if (data.incomplete_results) {
    console.warn(
      `GitHub Search API returned incomplete results for ${label}; count may be partial.`,
    );
  }

  return data.total_count;
}

export async function fetchGitHubStats(config) {
  const { username } = config;

  const [searchCounts, contributionTotals] = await Promise.all([
    Promise.all([
      searchIssuesCount(
        STAT_SEARCH_QUERIES.mergedPrs(username),
        config,
        'merged pull requests',
      ),
      searchIssuesCount(
        STAT_SEARCH_QUERIES.closedAssignedIssues(username),
        config,
        'closed assigned issues',
      ),
    ]),
    fetchContributionTotals(config),
  ]);

  const [mergedPrs, closedAssignedIssues] = searchCounts;

  return {
    mergedPrs,
    closedAssignedIssues,
    prReviews: contributionTotals.prReviews,
    commits: contributionTotals.commits,
  };
}

/** @deprecated Use STAT_SEARCH_QUERIES */
export const STAT_QUERIES = {
  ...STAT_SEARCH_QUERIES,
  prReviews: (username) => `type:pr reviewed-by:${username}`,
  commits: (username) => `author:${username}`,
};
