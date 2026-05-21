import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { formatTimeAgo, normalizeEvent } from './normalize-event.js';

describe('formatTimeAgo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "just now" for timestamps under one minute ago', () => {
    expect(formatTimeAgo('2026-05-21T11:59:30.000Z')).toBe('just now');
  });

  it('pluralizes minutes and hours', () => {
    expect(formatTimeAgo('2026-05-21T11:58:00.000Z')).toBe('2 minutes ago');
    expect(formatTimeAgo('2026-05-21T10:00:00.000Z')).toBe('2 hours ago');
  });

  it('formats days, months, and years', () => {
    expect(formatTimeAgo('2026-05-19T12:00:00.000Z')).toBe('2 days ago');
    expect(formatTimeAgo('2026-04-21T12:00:00.000Z')).toBe('1 month ago');
    expect(formatTimeAgo('2024-05-21T12:00:00.000Z')).toBe('2 years ago');
  });
});

describe('normalizeEvent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes a PushEvent', () => {
    const slide = normalizeEvent({
      type: 'PushEvent',
      repo: { name: 'octocat/hello-world' },
      created_at: '2026-05-21T11:00:00.000Z',
      payload: {
        ref: 'refs/heads/main',
        size: 2,
        commits: [
          { message: 'first', url: 'https://github.com/octocat/hello-world/commit/a' },
          { message: 'second\nline', url: 'https://github.com/octocat/hello-world/commit/b' },
        ],
      },
    });

    expect(slide).toMatchObject({
      kind: 'activity',
      action: 'Pushed 2 commits to main',
      description: 'second',
      repo: 'octocat/hello-world',
      url: 'https://github.com/octocat/hello-world/commit/b',
      timeAgo: '1 hour ago',
      icon: 'commit',
    });
  });

  it('normalizes a merged PullRequestEvent', () => {
    const slide = normalizeEvent({
      type: 'PullRequestEvent',
      repo: { name: 'octocat/hello-world' },
      created_at: '2026-05-21T11:30:00.000Z',
      payload: {
        action: 'closed',
        pull_request: {
          number: 42,
          title: 'Add feature',
          html_url: 'https://github.com/octocat/hello-world/pull/42',
          merged: true,
        },
      },
    });

    expect(slide).toMatchObject({
      action: 'Merged pull request #42',
      description: 'Add feature',
      icon: 'pull-request',
    });
  });

  it('returns null for unsupported event types', () => {
    expect(
      normalizeEvent({
        type: 'WatchEvent',
        repo: { name: 'octocat/hello-world' },
        created_at: '2026-05-21T11:00:00.000Z',
        payload: {},
      }),
    ).toBeNull();
  });
});
