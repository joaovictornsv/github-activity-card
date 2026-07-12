import { describe, expect, it } from '@jest/globals';
import { shouldIncludeActivityEvent } from './enrich-events.js';

describe('shouldIncludeActivityEvent', () => {
  it('includes core activity event types', () => {
    expect(
      shouldIncludeActivityEvent({
        type: 'PushEvent',
        payload: {},
      }),
    ).toBe(true);

    expect(
      shouldIncludeActivityEvent({
        type: 'PullRequestEvent',
        payload: { action: 'opened' },
      }),
    ).toBe(true);
  });

  it('ignores comment, release, and tag events', () => {
    expect(
      shouldIncludeActivityEvent({
        type: 'IssueCommentEvent',
        payload: {},
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'PullRequestReviewCommentEvent',
        payload: {},
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'ReleaseEvent',
        payload: {},
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'CreateEvent',
        payload: { ref_type: 'tag', ref: 'v1.0.0' },
      }),
    ).toBe(false);
  });

  it('ignores label and assignment changes on issues and pull requests', () => {
    expect(
      shouldIncludeActivityEvent({
        type: 'IssuesEvent',
        payload: { action: 'labeled' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'IssuesEvent',
        payload: { action: 'unlabeled' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'PullRequestEvent',
        payload: { action: 'labeled' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'PullRequestEvent',
        payload: { action: 'unlabeled' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'IssuesEvent',
        payload: { action: 'assigned' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'IssuesEvent',
        payload: { action: 'unassigned' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'PullRequestEvent',
        payload: { action: 'assigned' },
      }),
    ).toBe(false);

    expect(
      shouldIncludeActivityEvent({
        type: 'PullRequestEvent',
        payload: { action: 'unassigned' },
      }),
    ).toBe(false);
  });

  it('still includes branch creates', () => {
    expect(
      shouldIncludeActivityEvent({
        type: 'CreateEvent',
        payload: { ref_type: 'branch', ref: 'feature/foo' },
      }),
    ).toBe(true);
  });
});
