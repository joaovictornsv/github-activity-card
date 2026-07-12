import { describe, expect, it } from '@jest/globals';
import {
  ACTIVITY_SUMMARY_MAX_ITEMS,
  ACTIVITY_SUMMARY_TITLE,
  buildActivitySummaryCard,
} from './build-activity-summary-card.js';
import { ACTIVITY_COLORS } from './icons.js';

const config = {
  activitySummaryTimezone: 'America/Sao_Paulo',
};

describe('buildActivitySummaryCard', () => {
  it('maps slides to icon + description rows with header metadata', () => {
    const card = buildActivitySummaryCard(
      [
        {
          kind: 'activity',
          repo: 'octocat/hello-world',
          action: 'Opened pull request',
          description: 'Add README',
          icon: 'pull-request',
          iconColor: ACTIVITY_COLORS.green,
        },
        {
          kind: 'activity',
          repo: 'octocat/docs',
          action: 'Pushed 2 commits',
          description: 'Update docs',
          icon: 'commit',
          iconColor: ACTIVITY_COLORS.green,
        },
        {
          kind: 'activity',
          repo: 'octocat/docs',
          action: 'Merged pull request #4',
          description: 'Ship docs',
          icon: 'pull-request',
          iconColor: ACTIVITY_COLORS.purple,
        },
        {
          kind: 'activity',
          repo: 'octocat/docs',
          action: 'Assigned pull request #5',
          description: '',
          icon: 'pull-request',
          iconColor: ACTIVITY_COLORS.blue,
        },
        {
          kind: 'activity',
          repo: 'octocat/docs',
          action: 'Opened issue #9',
          description: 'Fix typo',
          icon: 'issue',
          iconColor: ACTIVITY_COLORS.green,
        },
        {
          kind: 'activity',
          repo: 'octocat/docs',
          action: 'Closed issue #8',
          description: 'Cleanup',
          icon: 'issue',
          iconColor: ACTIVITY_COLORS.purple,
        },
      ],
      config,
      { updatedAt: new Date('2026-07-12T15:00:00Z') },
    );

    expect(card.title).toBe(ACTIVITY_SUMMARY_TITLE);
    expect(card.lastUpdated).toBe('Jul 12, 2026, 12:00 PM GMT-3');
    expect(card.isEmpty).toBe(false);
    expect(card.items).toHaveLength(ACTIVITY_SUMMARY_MAX_ITEMS);
    expect(card.items[0]).toEqual({
      kind: 'activity',
      text: 'Add README',
      icon: 'pull-request',
      iconColor: ACTIVITY_COLORS.green,
    });
    expect(card.items[3]).toEqual({
      kind: 'activity',
      text: 'Fix typo',
      icon: 'issue',
      iconColor: ACTIVITY_COLORS.green,
    });
    expect(card.items[4]).toEqual({
      kind: 'activity',
      text: 'Cleanup',
      icon: 'issue',
      iconColor: ACTIVITY_COLORS.purple,
    });
  });

  it('skips activity rows without description text', () => {
    const card = buildActivitySummaryCard(
      [
        {
          kind: 'activity',
          repo: 'octocat/hello-world',
          action: 'Assigned pull request #5',
          description: '',
          icon: 'pull-request',
          iconColor: ACTIVITY_COLORS.blue,
        },
        {
          kind: 'activity',
          repo: 'octocat/hello-world',
          action: 'Merged pull request #5',
          description: 'Ship feature',
          icon: 'pull-request',
          iconColor: ACTIVITY_COLORS.purple,
        },
      ],
      config,
      { updatedAt: new Date('2026-07-12T15:00:00Z') },
    );

    expect(card.items).toEqual([
      {
        kind: 'activity',
        text: 'Ship feature',
        icon: 'pull-request',
        iconColor: ACTIVITY_COLORS.purple,
      },
    ]);
  });

  it('marks the empty slide state', () => {
    const card = buildActivitySummaryCard(
      [
        {
          kind: 'empty',
          action: 'No recent public activity',
          description: 'Check back after your next push, PR, or issue',
          repo: '',
          icon: 'inbox',
        },
      ],
      config,
      { updatedAt: new Date('2026-07-12T15:00:00Z') },
    );

    expect(card.isEmpty).toBe(true);
    expect(card.title).toBe(ACTIVITY_SUMMARY_TITLE);
    expect(card.items).toEqual([
      {
        kind: 'empty',
        text: 'No recent public activity',
        icon: 'inbox',
      },
    ]);
  });
});
