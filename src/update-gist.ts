import fs from 'node:fs/promises';
import type { GistConfig } from './config.js';
import { GitHubApiError } from './types.js';

const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'github-activity-card/0.1';

export async function updateGistActivityGif(
  filePath: string,
  config: GistConfig,
): Promise<void> {
  const body = await fs.readFile(filePath);
  const content = body.toString('base64');

  const response = await fetch(
    `${GITHUB_API}/gists/${encodeURIComponent(config.gistId)}`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        files: {
          [config.filename]: { content },
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new GitHubApiError(
      `GitHub Gist API error ${response.status}: ${text || response.statusText}`,
      response.status,
    );
  }

  const gist = (await response.json()) as { html_url?: string };
  const rawUrl = gist.html_url
    ? `${gist.html_url}/raw/${config.filename}`
    : `gist ${config.gistId}`;
  console.log(`Updated gist (${config.filename}): ${rawUrl}`);
}
