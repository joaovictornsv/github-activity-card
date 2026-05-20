# GitHub Activity Card

A daily-updated GIF slideshow of your last public GitHub activities, for README embedding.

**v0** generates `output/activity.gif` locally. Scheduling (`node-cron`) and cloud upload are planned for v1.

## Requirements

- **Node.js** 20+
- **ffmpeg** on `PATH` (GIF encoding)
- **Playwright** Chromium (installed via npm)

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env and set GITHUB_USERNAME
```

## Usage

```bash
# Full pipeline: fetch → render → encode → output/activity.gif
npm run generate

# Fetch + normalize only (prints slide JSON, no GIF)
npm run generate -- --dry-fetch

# Compile TypeScript, then run compiled output
npm run build
npm run generate:build
```

## Configuration

| Variable | Required | Default |
|----------|----------|---------|
| `GITHUB_USERNAME` | Yes | — |
| `GITHUB_TOKEN` | No | — (raises rate limit when set) |
| `OUTPUT_PATH` | No | `output/activity.gif` |
| `SLIDE_DURATION_SEC` | No | `2.5` |
| `CARD_WIDTH` | No | `415` |
| `CARD_HEIGHT` | No | `96` |

## Behavior

- Fetches [`/users/{username}/events/public`](https://docs.github.com/en/rest/activity/events#list-public-events-for-a-user)
- Whitelists activity types (push, PR, issues, reviews, comments, releases, creates)
- Up to **5** slides; **empty state** if none match
- On API/render/encode failure: logs error, exits non-zero, **does not overwrite** an existing GIF

## Project layout

See [`docs/project-plan.md`](docs/project-plan.md) for architecture and the full implementation plan.
