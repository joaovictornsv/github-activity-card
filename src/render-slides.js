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

function slideDotsHtml(index, total) {
  if (total <= 1) {
    return '';
  }

  const dots = Array.from({ length: total }, (_, i) => {
    const active = i === index ? ' is-active' : '';
    return `<span class="slide-dot${active}" aria-hidden="true"></span>`;
  }).join('');

  return `<div class="slide-dots">${dots}</div>`;
}

function fillTemplate(html, slide, slideIndex, slideTotal) {
  const repo =
    slide.kind === 'empty' ? '' : escapeHtml(slide.repo || 'unknown/repo');
  const description = escapeHtml(slide.description);
  const noDescription =
    slide.kind === 'activity' && !slide.description ? ' no-description' : '';

  return html
    .replace(/\{\{KIND\}\}/g, escapeHtml(slide.kind))
    .replace(/\{\{ACTION\}\}/g, escapeHtml(slide.action))
    .replace(/\{\{DESCRIPTION\}\}/g, description)
    .replace(/\{\{REPO\}\}/g, repo)
    .replace(/\{\{ICON_SVG\}\}/g, iconSvg(slide.icon, slide.iconColor))
    .replace(/\{\{SLIDE_DOTS\}\}/g, slideDotsHtml(slideIndex, slideTotal))
    .replace(
      'class="card"',
      `class="card${noDescription}"`,
    );
}

async function buildSlideHtml(slide, slideIndex, slideTotal, config) {
  const templatePath = path.join(config.templatesDir, 'slide.html');
  const template = await fs.readFile(templatePath, 'utf8');
  const filled = fillTemplate(template, slide, slideIndex, slideTotal);

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

export async function renderSlides(slides, config) {
  const tempDir = path.join(
    os.tmpdir(),
    `activity-card-${Date.now()}`,
  );
  await fs.mkdir(tempDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: config.cardWidth, height: config.cardHeight },
      deviceScaleFactor: config.deviceScaleFactor,
    });

    const pngPaths = [];

    for (let i = 0; i < slides.length; i++) {
      const page = await context.newPage();
      const html = await buildSlideHtml(slides[i], i, slides.length, config);
      await page.setContent(html, { waitUntil: 'load' });

      const pngPath = path.join(
        tempDir,
        `frame-${String(i).padStart(2, '0')}.png`,
      );
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
      pngPaths.push(pngPath);
    }

    return { pngPaths, tempDir };
  } finally {
    await browser.close();
  }
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
    .replace(/\{\{TITLE\}\}/g, escapeHtml(card.title))
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
