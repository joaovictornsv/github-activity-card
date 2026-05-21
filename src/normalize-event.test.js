import { describe, expect, it } from '@jest/globals';
import { ACTIVITY_COLORS } from './icons.js';
import {
  isMergePullRequestCommitMessage,
  normalizeEvent,
} from './normalize-event.js';

describe('normalizeEvent', () => {
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
      icon: 'commit',
    });
  });

  it('normalizes a merged PullRequestEvent (legacy closed + merged flag)', () => {
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
      iconColor: ACTIVITY_COLORS.purple,
    });
  });

  it('normalizes a merged PullRequestEvent (public API action: merged)', () => {
    const slide = normalizeEvent({
      type: 'PullRequestEvent',
      repo: { name: 'joaovictornsv/github-activity-card' },
      created_at: '2026-05-21T18:39:09Z',
      payload: {
        action: 'merged',
        pull_request: {
          number: 4,
          url: 'https://api.github.com/repos/joaovictornsv/github-activity-card/pulls/4',
        },
      },
    });

    expect(slide).toMatchObject({
      action: 'Merged pull request #4',
      icon: 'pull-request',
      iconColor: ACTIVITY_COLORS.purple,
    });
  });

  it('assigns icon colors for pull request actions', () => {
    const opened = normalizeEvent({
      type: 'PullRequestEvent',
      repo: { name: 'octocat/hello-world' },
      payload: {
        action: 'opened',
        pull_request: { number: 1, title: 'T', html_url: 'https://example.com/1' },
      },
    });
    const closed = normalizeEvent({
      type: 'PullRequestEvent',
      repo: { name: 'octocat/hello-world' },
      payload: {
        action: 'closed',
        pull_request: {
          number: 2,
          title: 'T',
          html_url: 'https://example.com/2',
          merged: false,
        },
      },
    });

    expect(opened?.iconColor).toBe(ACTIVITY_COLORS.green);
    expect(closed?.iconColor).toBe(ACTIVITY_COLORS.red);
  });

  it('assigns icon colors for issue actions', () => {
    const opened = normalizeEvent({
      type: 'IssuesEvent',
      repo: { name: 'octocat/hello-world' },
      payload: {
        action: 'opened',
        issue: { number: 1, title: 'T', html_url: 'https://example.com/1' },
      },
    });
    const closed = normalizeEvent({
      type: 'IssuesEvent',
      repo: { name: 'octocat/hello-world' },
      payload: {
        action: 'closed',
        issue: { number: 2, title: 'T', html_url: 'https://example.com/2' },
      },
    });

    expect(opened?.iconColor).toBe(ACTIVITY_COLORS.green);
    expect(closed?.iconColor).toBe(ACTIVITY_COLORS.purple);
  });

  it('skips PushEvents whose commit message is a PR merge commit', () => {
    expect(
      isMergePullRequestCommitMessage(
        'Merge pull request #4 from joaovictornsv/chore/2-setup-oxlint-lefthook-jest',
      ),
    ).toBe(true);
    expect(isMergePullRequestCommitMessage('feat: add colors')).toBe(false);

    expect(
      normalizeEvent({
        type: 'PushEvent',
        repo: { name: 'octocat/hello-world' },
        payload: {
          ref: 'refs/heads/main',
          size: 1,
          commits: [
            {
              message:
                'Merge pull request #4 from joaovictornsv/chore/2-setup-oxlint-lefthook-jest',
              url: 'https://github.com/octocat/hello-world/commit/abc',
            },
          ],
        },
      }),
    ).toBeNull();
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
