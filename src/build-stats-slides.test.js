import { describe, expect, it } from '@jest/globals';
import { buildStatsSlides } from './build-stats-slides.js';
import { ACTIVITY_COLORS } from './icons.js';

describe('buildStatsSlides', () => {
  const config = { username: 'octocat' };

  it('maps stats to four stats-shaped slides', () => {
    const slides = buildStatsSlides(
      {
        mergedPrs: 42,
        closedAssignedIssues: 7,
        prReviews: 128,
        commits: 3053,
      },
      config,
    );

    expect(slides).toHaveLength(4);
    expect(slides[0]).toMatchObject({
      kind: 'stats',
      repo: 'octocat',
      action: 'Merged pull requests',
      description: '42',
      icon: 'pull-request',
      iconColor: ACTIVITY_COLORS.purple,
    });
    expect(slides[1]).toMatchObject({
      action: 'Closed issues (assigned)',
      description: '7',
      icon: 'issue',
    });
    expect(slides[2]).toMatchObject({
      action: 'Pull request reviews',
      description: '128',
      icon: 'comment',
      iconColor: ACTIVITY_COLORS.blue,
    });
    expect(slides[3]).toMatchObject({
      action: 'Commits',
      description: '3,053',
      icon: 'commit',
      iconColor: ACTIVITY_COLORS.green,
    });
  });
});
