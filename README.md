# GitHub Activity Card

A daily-updated GIF slideshow of your last public GitHub activities, for README embedding.

Generate locally with `npm run generate`, or run the scheduler to refresh and upload to Cloudflare R2 on a fixed cadence.

## Requirements

- **Node.js** 20+
- **ffmpeg** on `PATH` (GIF encoding)
- **Playwright** Chromium (installed via npm)
- **Cloudflare R2** bucket + API token (upload / scheduler only)

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env: GITHUB_USERNAME, and R2 vars if using upload/scheduler
```

## Usage

### Local generation (no cloud)

```bash
# Full pipeline: fetch → render → encode → output/{GITHUB_USERNAME}-activity.gif
npm run generate

# Fetch + normalize only (prints slide JSON, no GIF)
npm run generate -- --dry-fetch
```

### Upload to R2

Uploads an existing GIF (default: `output/{GITHUB_USERNAME}-activity.gif`). Does not fetch or render.

```bash
npm run generate   # if you need a fresh file first
npm run upload

# Or upload a specific path
npm run upload -- path/to/activity.gif
```

### Scheduler (generate + upload)

Long-running process: runs the full pipeline six times per day at **9:00, 12:00, 15:00, 18:00, 21:00, and 00:00** (server local time unless `CRON_TZ` is set), then uploads to R2.

```bash
npm run scheduler
```

Set `SCHEDULER_RUN_ON_START=1` in `.env` to run once immediately on startup (useful for testing).

## Configuration

| Variable | Required | Default | Used by |
|----------|----------|---------|---------|
| `GITHUB_USERNAME` | Yes | — | generate, scheduler |
| `GITHUB_TOKEN` | No | — | generate, scheduler |
| `OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-activity.gif` | generate, upload |
| `SLIDE_DURATION_SEC` | No | `3` | generate |
| `CARD_WIDTH` | No | `415` | generate |
| `CARD_HEIGHT` | No | `96` | generate |
| `DEVICE_SCALE_FACTOR` | No | `2` | generate (Playwright screenshot scale; GIF encodes at `CARD_WIDTH ×` this) |
| `GIF_MAX_COLORS` | No | `256` | generate (ffmpeg palette size, 2–256) |
| `GIF_BAYER_SCALE` | No | `2` | generate (ffmpeg dither strength, 0–5; lower = sharper, higher = smoother gradients) |
| `R2_ACCOUNT_ID` | For upload/scheduler | — | upload, scheduler |
| `R2_ACCESS_KEY_ID` | For upload/scheduler | — | upload, scheduler |
| `R2_SECRET_ACCESS_KEY` | For upload/scheduler | — | upload, scheduler |
| `R2_BUCKET` | For upload/scheduler | — | upload, scheduler |
| `R2_OBJECT_KEY` | No | `github-activity-card/{GITHUB_USERNAME}-activity.gif` | upload, scheduler |
| `R2_PUBLIC_URL` | No | — | upload (log URL after put) |
| `R2_CACHE_CONTROL` | No | `public, max-age=3600` | upload |
| `CRON_TZ` | No | server local | scheduler |
| `SCHEDULER_RUN_ON_START` | No | — | scheduler |

### R2 setup

1. Create an R2 bucket in the Cloudflare dashboard.
2. Create an API token with **Object Read & Write** on that bucket.
3. Enable public access (custom domain or `r2.dev` URL) if you embed the GIF in a README.
4. Set `R2_PUBLIC_URL` to the public base URL (no trailing slash required).

README embed (fixed URL if object key never changes):

```markdown
![GitHub activity](https://your-public-url/github-activity-card/your-username-activity.gif)
```

## Behavior

- Fetches [`/users/{username}/events/public`](https://docs.github.com/en/rest/activity/events#list-public-events-for-a-user)
- Whitelists activity types (push, PR, issues, reviews, comments, releases, creates)
- Up to **5** slides; **empty state** if none match
- On API/render/encode failure: logs error, exits non-zero, **does not overwrite** an existing local GIF
- Scheduler catches errors per run so the process keeps running; failed runs do not upload

## Scripts

| Script | Description |
|--------|-------------|
| `npm run generate` | Local GIF only |
| `npm run upload` | Push GIF to R2 |
| `npm run scheduler` | Cron + generate + upload |
| `npm run build` | Compile TypeScript to `dist/` |

## Project layout

See [`docs/project-plan.md`](docs/project-plan.md) for architecture and implementation notes.
