import { describe, expect, it } from '@jest/globals';
import { buildStatsSlides } from './build-stats-slides.js';
import { ACTIVITY_COLORS } from './icons.js';

describe('buildStatsSlides', () => {
  const config = { username: 'octocat' };

  it('maps stats to five stats-shaped slides in order', () => {
    const slides = buildStatsSlides(
      {
        commits: 3053,
        mergedPrs: 42,
        prReviews: 128,
        closedIssues: 7,
        openedIssues: 19,
      },
      config,
    );

    expect(slides).toHaveLength(5);
    expect(slides[0]).toMatchObject({
      kind: 'stats',
      repo: 'octocat',
      action: 'Commits',
      description: '3,053',
      icon: 'commit',
      iconColor: ACTIVITY_COLORS.green,
    });
    expect(slides[1]).toMatchObject({
      action: 'Merged PRs',
      description: '42',
      icon: 'pull-request',
      iconColor: ACTIVITY_COLORS.purple,
    });
    expect(slides[2]).toMatchObject({
      action: 'Reviewed PRs',
      description: '128',
      icon: 'comment',
      iconColor: ACTIVITY_COLORS.blue,
    });
    expect(slides[3]).toMatchObject({
      action: 'Closed issues',
      description: '7',
      icon: 'issue',
      iconColor: ACTIVITY_COLORS.purple,
    });
    expect(slides[4]).toMatchObject({
      action: 'Opened issues',
      description: '19',
      icon: 'issue',
      iconColor: ACTIVITY_COLORS.green,
    });
  });
});
