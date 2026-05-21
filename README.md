# GitHub Activity Card

A daily-updated GIF slideshow of your last public GitHub activities, for README embedding.

Generate locally with `npm run generate`, or run the scheduler to refresh on a fixed cadence and optionally publish to a GitHub gist.

## Requirements

- **Node.js** 20+
- **ffmpeg** on `PATH` (GIF encoding)
- **Playwright** Chromium (installed via npm)
- **git** on `PATH` (gist publish only)

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env: GITHUB_USERNAME, and GIST_ID if using upload/scheduler publish
```

## Usage

### Local generation (no cloud)

```bash
# Full pipeline: fetch → render → encode → output/{GITHUB_USERNAME}-activity.gif
npm run generate

# Fetch + normalize only (prints slide JSON, no GIF)
npm run generate -- --dry-fetch
```

### Publish to gist

Uploads an existing GIF (default: `output/{GITHUB_USERNAME}-activity.gif`) to a GitHub gist. Requires `GIST_ID` and `GITHUB_TOKEN`. Does not fetch or render.

```bash
npm run generate   # if you need a fresh file first
npm run upload

# Or publish a specific path
npm run upload -- path/to/activity.gif
```

### Scheduler (generate + optional gist)

Long-running process: runs the full pipeline six times per day at **9:00, 12:00, 15:00, 18:00, 21:00, and 00:00** (server local time unless `CRON_TZ` is set). When `GIST_ID` is set, also updates the gist after each run.

```bash
npm run scheduler
```

Set `SCHEDULER_RUN_ON_START=1` in `.env` to run once immediately on startup (useful for testing).

## Configuration

| Variable | Required | Default | Used by |
|----------|----------|---------|---------|
| `GITHUB_USERNAME` | Yes | — | generate, scheduler |
| `GITHUB_TOKEN` | No | — | generate, scheduler; required when `GIST_ID` is set |
| `OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-activity.gif` | generate, upload |
| `SLIDE_DURATION_SEC` | No | `3` | generate |
| `CARD_WIDTH` | No | `415` | generate |
| `CARD_HEIGHT` | No | `96` | generate |
| `DEVICE_SCALE_FACTOR` | No | `2` | generate (Playwright screenshot scale; GIF encodes at `CARD_WIDTH ×` this) |
| `GIF_MAX_COLORS` | No | `256` | generate (ffmpeg palette size, 2–256) |
| `GIF_BAYER_SCALE` | No | `2` | generate (ffmpeg dither strength, 0–5; lower = sharper, higher = smoother gradients) |
| `GIST_ID` | For upload | — | upload, scheduler (when set, updates gist after generate) |
| `GIST_FILENAME` | No | `activity.gif` | upload, scheduler |
| `CRON_TZ` | No | server local | scheduler |
| `SCHEDULER_RUN_ON_START` | No | — | scheduler |

### Gist publish

Binary GIFs are pushed via **git** (the Gist REST `content` field is text-only and cannot store images).

1. Create a **secret** gist with a single file `activity.gif` (any placeholder content).
2. Copy the gist ID from the URL (`https://gist.github.com/you/<gist-id>`).
3. Set `GIST_ID` and ensure `GITHUB_TOKEN` has **gist** scope (classic PAT) or **Gists: Read and write** (fine-grained).
4. Optional: `GIST_FILENAME` if your gist file is not named `activity.gif`.

Embed:

```markdown
![GitHub activity](https://gist.githubusercontent.com/your-username/GIST_ID/raw/activity.gif)
```

GitHub may cache raw gist URLs briefly.

## Behavior

- Fetches [`/users/{username}/events/public`](https://docs.github.com/en/rest/activity/events#list-public-events-for-a-user)
- Whitelists activity types (push, PR, issues, reviews, comments, releases, creates)
- Up to **5** slides; **empty state** if none match
- On API/render/encode failure: logs error, exits non-zero, **does not overwrite** an existing local GIF
- Scheduler catches errors per run so the process keeps running; failed runs do not publish

## Scripts

| Script | Description |
|--------|-------------|
| `npm run generate` | Local GIF only |
| `npm run upload` | Push GIF to gist (`GIST_ID` required) |
| `npm run scheduler` | Cron + generate + optional gist |
| `npm run build` | Compile TypeScript to `dist/` |

## Project layout

See [`docs/project-plan.md`](docs/project-plan.md) for architecture and implementation notes.
