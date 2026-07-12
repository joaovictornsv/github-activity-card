import { formatStatsDate } from './build-stats-card.js';

export const ACTIVITY_SUMMARY_MAX_ITEMS = 4;

function summaryText(slide) {
  if (slide.kind === 'empty') {
    return slide.action;
  }

  return slide.description?.trim() || '';
}

function buildCardMeta(config, options = {}) {
  const updatedAt = options.updatedAt ?? new Date();

  return {
    username: config.username,
    lastUpdated: formatStatsDate(
      updatedAt,
      config.activitySummaryTimezone,
    ),
  };
}

export function buildActivitySummaryCard(slides, config, options = {}) {
  const meta = buildCardMeta(config, options);
  const isEmpty = slides.length === 1 && slides[0].kind === 'empty';

  if (isEmpty) {
    const slide = slides[0];
    return {
      ...meta,
      isEmpty: true,
      items: [
        {
          kind: 'empty',
          text: summaryText(slide),
          icon: slide.icon,
          iconColor: slide.iconColor,
        },
      ],
    };
  }

  const items = [];

  for (const slide of slides) {
    if (slide.kind === 'empty') continue;

    const text = summaryText(slide);
    if (!text) continue;

    items.push({
      kind: 'activity',
      text,
      icon: slide.icon,
      iconColor: slide.iconColor,
    });

    if (items.length >= ACTIVITY_SUMMARY_MAX_ITEMS) break;
  }

  if (items.length === 0) {
    return {
      ...meta,
      isEmpty: true,
      items: [
        {
          kind: 'empty',
          text: 'No recent public activity',
          icon: 'inbox',
        },
      ],
    };
  }

  return {
    ...meta,
    isEmpty: false,
    items,
  };
}
