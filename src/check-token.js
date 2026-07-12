import { config as loadEnv } from 'dotenv';
import { assertRequiredEnvVars } from './config.js';

loadEnv();

const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'github-activity-card/0.1';

/** Scopes needed when both schedulers run with gist publish and full stats. */
export const REQUIRED_TOKEN_SCOPES = ['gist', 'read:user', 'repo'];

function parseScopeHeader(header) {
  if (!header?.trim()) {
    return [];
  }

  return header
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function buildHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function probeContributionAccess(token, username) {
  const response = await fetch(`${GITHUB_API}/graphql`, {
    method: 'POST',
    headers: {
      ...buildHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            hasAnyRestrictedContributions
            restrictedContributionsCount
          }
        }
      }`,
      variables: { login: username },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `GitHub GraphQL probe failed ${response.status}: ${body || response.statusText}`,
    );
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(
      `GitHub GraphQL probe error: ${payload.errors.map((error) => error.message).join('; ')}`,
    );
  }

  return payload.data?.user?.contributionsCollection ?? null;
}

export async function checkGitHubToken(options = {}) {
  const token = options.token ?? process.env.GITHUB_TOKEN?.trim();
  const username = options.username ?? process.env.GITHUB_USERNAME?.trim();

  if (!token) {
    throw new Error('GITHUB_TOKEN is not set');
  }

  if (!username) {
    throw new Error('GITHUB_USERNAME is not set');
  }

  const userResponse = await fetch(`${GITHUB_API}/user`, {
    headers: buildHeaders(token),
  });

  if (!userResponse.ok) {
    const body = await userResponse.text().catch(() => '');
    throw new Error(
      `GitHub token validation failed ${userResponse.status}: ${body || userResponse.statusText}`,
    );
  }

  const user = await userResponse.json();
  const scopes = parseScopeHeader(userResponse.headers.get('x-oauth-scopes'));
  const isClassicPat = scopes.length > 0;
  const missingScopes = isClassicPat
    ? REQUIRED_TOKEN_SCOPES.filter((scope) => !scopes.includes(scope))
    : [];

  const collection = await probeContributionAccess(token, username);
  const hasPrivateContributions =
    collection?.hasAnyRestrictedContributions === true;
  const restrictedCount = collection?.restrictedContributionsCount ?? 0;
  const privateDataLikelyBlocked =
    hasPrivateContributions &&
    restrictedCount > 0 &&
    (!isClassicPat || !scopes.includes('read:user'));

  return {
    username,
    authenticatedAs: user.login,
    tokenType: isClassicPat ? 'classic' : 'fine-grained-or-unknown',
    scopes,
    missingScopes,
    hasPrivateContributions,
    restrictedContributionsInLastYear: restrictedCount,
    privateDataLikelyBlocked,
    ok:
      missingScopes.length === 0 &&
      !privateDataLikelyBlocked &&
      user.login?.toLowerCase() === username.toLowerCase(),
  };
}

function formatReport(report) {
  const lines = [
    `Authenticated as: ${report.authenticatedAs}`,
    `Configured username: ${report.username}`,
    `Token type: ${report.tokenType}`,
  ];

  if (report.tokenType === 'classic') {
    lines.push(`Scopes: ${report.scopes.join(', ') || '(none)'}`);
    if (report.missingScopes.length > 0) {
      lines.push(`Missing scopes: ${report.missingScopes.join(', ')}`);
    } else {
      lines.push('Required scopes for both crons: OK');
    }
  } else {
    lines.push(
      'Scopes header empty (fine-grained PAT). Ensure: Gists read/write, profile read, repository read.',
    );
  }

  if (report.hasPrivateContributions) {
    lines.push(
      `Private contributions detected (last year restricted count: ${report.restrictedContributionsInLastYear.toLocaleString('en-US')})`,
    );
  }

  if (report.privateDataLikelyBlocked) {
    lines.push(
      'WARNING: Private stats are likely incomplete. Add read:user to the token and enable private contributions on your profile.',
    );
  }

  lines.push(report.ok ? 'Token check: PASS' : 'Token check: FAIL');
  return lines.join('\n');
}

async function main() {
  assertRequiredEnvVars(['GITHUB_USERNAME', 'GITHUB_TOKEN'], 'Token check');

  const report = await checkGitHubToken();
  console.log(formatReport(report));

  if (!report.ok) {
    process.exit(1);
  }
}

const isMain = process.argv[1]?.endsWith('check-token.js');

if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Token check error: ${message}`);
    process.exit(1);
  });
}
