import { ACTIVITY_COLORS } from './icons.js';

function formatCount(value) {
  return value.toLocaleString('en-US');
}

export function formatStatsDate(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

const STAT_DEFINITIONS = [
  {
    key: 'commits',
    label: 'Commits',
    icon: 'commit',
    iconColor: ACTIVITY_COLORS.green,
  },
  {
    key: 'mergedPrs',
    label: 'Merged PRs',
    icon: 'pull-request',
    iconColor: ACTIVITY_COLORS.purple,
  },
  {
    key: 'closedIssues',
    label: 'Closed issues',
    icon: 'issue',
    iconColor: ACTIVITY_COLORS.purple,
  },
];

export function buildStatsCard(stats, config, options = {}) {
  const updatedAt = options.updatedAt ?? new Date();

  return {
    username: config.username,
    lastUpdated: formatStatsDate(updatedAt, config.statsTimezone),
    items: STAT_DEFINITIONS.map((definition) => ({
      label: definition.label,
      count: formatCount(stats[definition.key]),
      icon: definition.icon,
      iconColor: definition.iconColor,
    })),
  };
}
