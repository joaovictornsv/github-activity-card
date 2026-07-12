import { describe, expect, it } from '@jest/globals';
import { buildStatsCard, formatStatsDate } from './build-stats-card.js';
import { ACTIVITY_COLORS } from './icons.js';

describe('formatStatsDate', () => {
  it('formats an absolute date with time and timezone offset', () => {
    const date = new Date('2026-07-12T15:00:00Z');

    expect(formatStatsDate(date, 'America/Sao_Paulo')).toBe(
      'Jul 12, 2026, 12:00 PM GMT-3',
    );
  });
});

describe('buildStatsCard', () => {
  const config = { username: 'octocat', statsTimezone: 'America/Sao_Paulo' };

  it('maps stats to a three-item card with last updated date', () => {
    const card = buildStatsCard(
      {
        commits: 3053,
        mergedPrs: 42,
        closedIssues: 7,
      },
      config,
      { updatedAt: new Date('2026-07-12T15:00:00Z') },
    );

    expect(card.username).toBe('octocat');
    expect(card.lastUpdated).toBe('Jul 12, 2026, 12:00 PM GMT-3');
    expect(card.items).toHaveLength(3);
    expect(card.items[0]).toEqual({
      label: 'Commits',
      count: '3,053',
      icon: 'commit',
      iconColor: ACTIVITY_COLORS.green,
    });
    expect(card.items[1]).toEqual({
      label: 'Merged PRs',
      count: '42',
      icon: 'pull-request',
      iconColor: ACTIVITY_COLORS.purple,
    });
    expect(card.items[2]).toEqual({
      label: 'Closed issues',
      count: '7',
      icon: 'issue',
      iconColor: ACTIVITY_COLORS.purple,
    });
  });
});
