import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';
import { iconSvg } from './icons.js';

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statItemHtml(item) {
  return `<div class="stat-item">
  <span class="stat-icon icon-wrap">${iconSvg(item.icon, item.iconColor)}</span>
  <span class="stat-count">${escapeHtml(item.count)}</span>
  <span class="stat-label">${escapeHtml(item.label)}</span>
</div>`;
}

async function buildStatsCardHtml(card, config) {
  const templatePath = path.join(config.templatesDir, 'stats-card.html');
  const template = await fs.readFile(templatePath, 'utf8');
  const filled = template
    .replace(/\{\{USERNAME\}\}/g, escapeHtml(card.username))
    .replace(/\{\{LAST_UPDATED\}\}/g, escapeHtml(card.lastUpdated))
    .replace(
      /\{\{STAT_ITEMS\}\}/g,
      card.items.map((item) => statItemHtml(item)).join(''),
    );

  const stylesPath = path.join(config.templatesDir, 'styles.css');
  const styles = await fs.readFile(stylesPath, 'utf8');

  const width = config.cardWidth;
  const height = config.cardHeight;
  const sizedStyles = styles
    .replace(/--card-width:\s*\d+px/g, `--card-width: ${width}px`)
    .replace(/--card-height:\s*\d+px/g, `--card-height: ${height}px`);

  return filled.replace(
    '<link rel="stylesheet" href="styles.css" />',
    `<style>${sizedStyles}</style>`,
  );
}

function activitySummaryItemHtml(item) {
  return `<div class="activity-summary-item" data-kind="${escapeHtml(item.kind)}" data-icon="${escapeHtml(item.icon)}">
  <span class="icon-wrap activity-summary-icon">${iconSvg(item.icon, item.iconColor)}</span>
  <span class="activity-summary-text">${escapeHtml(item.text)}</span>
</div>`;
}

async function buildActivitySummaryCardHtml(card, config) {
  const templatePath = path.join(
    config.templatesDir,
    'activity-summary-card.html',
  );
  const template = await fs.readFile(templatePath, 'utf8');
  const filled = template
    .replace(/\{\{USERNAME\}\}/g, escapeHtml(card.username))
    .replace(/\{\{LAST_UPDATED\}\}/g, escapeHtml(card.lastUpdated))
    .replace(
      /\{\{ACTIVITY_ITEMS\}\}/g,
      card.items.map((item) => activitySummaryItemHtml(item)).join(''),
    );

  const stylesPath = path.join(config.templatesDir, 'styles.css');
  const styles = await fs.readFile(stylesPath, 'utf8');

  const width = config.cardWidth;
  const height = config.cardHeight;
  const sizedStyles = styles
    .replace(/--card-width:\s*\d+px/g, `--card-width: ${width}px`)
    .replace(/--card-height:\s*\d+px/g, `--card-height: ${height}px`);

  return filled.replace(
    '<link rel="stylesheet" href="styles.css" />',
    `<style>${sizedStyles}</style>`,
  );
}

export async function renderActivitySummaryCard(card, config) {
  const tempDir = path.join(
    os.tmpdir(),
    `activity-summary-card-${Date.now()}`,
  );
  await fs.mkdir(tempDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: config.cardWidth, height: config.cardHeight },
      deviceScaleFactor: config.deviceScaleFactor,
    });

    const page = await context.newPage();
    const html = await buildActivitySummaryCardHtml(card, config);
    await page.setContent(html, { waitUntil: 'load' });

    const pngPath = path.join(tempDir, 'activity-summary-card.png');
    await page.screenshot({
      path: pngPath,
      type: 'png',
      omitBackground: true,
      clip: {
        x: 0,
        y: 0,
        width: config.cardWidth,
        height: config.cardHeight,
      },
    });
    await page.close();

    return { pngPath, tempDir };
  } finally {
    await browser.close();
  }
}

export async function renderStatsCard(card, config) {
  const tempDir = path.join(
    os.tmpdir(),
    `stats-card-${Date.now()}`,
  );
  await fs.mkdir(tempDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: config.cardWidth, height: config.cardHeight },
      deviceScaleFactor: config.deviceScaleFactor,
    });

    const page = await context.newPage();
    const html = await buildStatsCardHtml(card, config);
    await page.setContent(html, { waitUntil: 'load' });

    const pngPath = path.join(tempDir, 'stats-card.png');
    await page.screenshot({
      path: pngPath,
      type: 'png',
      omitBackground: true,
      clip: {
        x: 0,
        y: 0,
        width: config.cardWidth,
        height: config.cardHeight,
      },
    });
    await page.close();

    return { pngPath, tempDir };
  } finally {
    await browser.close();
  }
}

export async function cleanupTempDir(tempDir) {
  await fs.rm(tempDir, { recursive: true, force: true });
}
