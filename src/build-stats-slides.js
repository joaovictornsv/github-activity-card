import { ACTIVITY_COLORS } from './icons.js';

function formatCount(value) {
  return value.toLocaleString('en-US');
}

const STAT_DEFINITIONS = [
  {
    key: 'mergedPrs',
    action: 'Merged pull requests',
    icon: 'pull-request',
    iconColor: ACTIVITY_COLORS.purple,
  },
  {
    key: 'closedAssignedIssues',
    action: 'Closed issues (assigned)',
    icon: 'issue',
    iconColor: ACTIVITY_COLORS.purple,
  },
  {
    key: 'prReviews',
    action: 'Pull request reviews',
    icon: 'comment',
    iconColor: ACTIVITY_COLORS.blue,
  },
  {
    key: 'commits',
    action: 'Commits',
    icon: 'commit',
    iconColor: ACTIVITY_COLORS.green,
  },
];

export function buildStatsSlides(stats, config) {
  return STAT_DEFINITIONS.map((definition) => ({
    kind: 'stats',
    repo: config.username,
    action: definition.action,
    description: formatCount(stats[definition.key]),
    url: null,
    icon: definition.icon,
    iconColor: definition.iconColor,
  }));
}
