import type { AppConfig } from './config.js';
import { GitHubApiError, type GitHubPublicEvent } from './types.js';

const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'github-activity-card/0.1';

export async function fetchPublicEvents(
  config: AppConfig,
): Promise<GitHubPublicEvent[]> {
  const url = `${GITHUB_API}/users/${encodeURIComponent(config.username)}/events/public`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GitHubApiError(
      `GitHub API error ${response.status}: ${body || response.statusText}`,
      response.status,
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new GitHubApiError('GitHub API returned unexpected payload', 500);
  }

  return data as GitHubPublicEvent[];
}
