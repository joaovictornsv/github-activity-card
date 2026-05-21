import { EVENT_WHITELIST } from './config.js';
import { normalizeEvent } from './normalize-event.js';
import { GitHubApiError } from './types.js';

const USER_AGENT = 'github-activity-card/0.1';
const WHITELIST_SET = new Set(EVENT_WHITELIST);

const EMPTY_SLIDE = {
  kind: 'empty',
  action: 'No recent public activity',
  description: 'Check back after your next push, PR, or issue',
  repo: '',
  url: null,
  icon: 'inbox',
};

function asRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null;
}

function asString(value) {
  return typeof value === 'string' ? value : undefined;
}

function truncate(text, max = 80) {
  const line = text.split('\n')[0]?.trim() ?? text;
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

function parseRepoParts(repoFullName) {
  const slash = repoFullName.indexOf('/');
  if (slash <= 0) return null;
  return {
    owner: repoFullName.slice(0, slash),
    repo: repoFullName.slice(slash + 1),
  };
}

async function githubGet(url, config) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new GitHubApiError(
      `GitHub API error ${response.status} for ${url}`,
      response.status,
    );
  }
  return response.json();
}

async function fetchCommitMessage(repoFullName, sha, config) {
  const parts = parseRepoParts(repoFullName);
  if (!parts) return { message: '', url: null };

  const url = `https://api.github.com/repos/${parts.owner}/${parts.repo}/commits/${sha}`;
  const data = await githubGet(url, config);

  const message = data.commit?.message ? truncate(data.commit.message) : '';

  return {
    message,
    url: data.html_url ?? null,
  };
}

export async function enrichSlide(slide, raw, config) {
  if (slide.kind === 'empty' || slide.description) {
    return slide;
  }

  const payload = raw.payload ?? {};

  switch (raw.type) {
    case 'PushEvent': {
      const commits = Array.isArray(payload.commits) ? payload.commits : [];
      const last = commits[commits.length - 1];
      const fromPayload = asRecord(last)
        ? truncate(asString(last.message) ?? '')
        : '';

      if (fromPayload) {
        return {
          ...slide,
          description: fromPayload,
          url:
            slide.url ??
            (asRecord(last) ? (asString(last.url) ?? null) : null),
        };
      }

      const head = asString(payload.head);
      if (!head) return slide;

      const { message, url } = await fetchCommitMessage(
        raw.repo.name,
        head,
        config,
      );
      if (!message) return slide;

      return { ...slide, description: message, url: url ?? slide.url };
    }

    case 'IssueCommentEvent':
    case 'PullRequestReviewCommentEvent': {
      const comment = asRecord(payload.comment);
      const body = comment ? truncate(asString(comment.body) ?? '') : '';
      const issue = asRecord(payload.issue);
      const issueTitle = issue ? asString(issue.title) : undefined;

      return {
        ...slide,
        description:
          body || (issueTitle ? truncate(issueTitle) : slide.description),
      };
    }

    case 'PullRequestReviewEvent': {
      const pr = asRecord(payload.pull_request);
      const title = pr ? asString(pr.title) : undefined;
      if (!title) return slide;
      return { ...slide, description: truncate(title) };
    }

    default:
      return slide;
  }
}

export async function buildSlides(events, config) {
  const slides = [];

  for (const event of events) {
    if (!WHITELIST_SET.has(event.type)) continue;

    const slide = normalizeEvent(event);
    if (!slide) continue;

    slides.push(await enrichSlide(slide, event, config));
    if (slides.length >= config.maxSlides) break;
  }

  if (slides.length === 0) {
    return [EMPTY_SLIDE];
  }

  return slides;
}
