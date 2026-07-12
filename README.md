# GitHub Activity Card

A daily-updated GIF slideshow of your last public GitHub activities, for README embedding.

A companion **stats GIF** shows all-time totals (merged PRs, closed assigned issues, PR reviews, commits) using the same card UI.

Generate locally with `npm run generate` (activity) or `npm run generate:stats` (stats), or run a scheduler to refresh on a fixed cadence and optionally publish to a GitHub gist.

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
# Edit .env: GITHUB_USERNAME, GITHUB_TOKEN, and GIST_ID / STATS_GIST_ID if publishing
```

### GitHub token (one token for both crons)

Both `npm run scheduler` and `npm run scheduler:stats` read the same `GITHUB_TOKEN` from `.env`.

Create **one** classic personal access token with these scopes:

| Scope | Used for |
|-------|----------|
| **`gist`** | Publish activity + stats GIFs to gists |
| **`read:user`** | Stats: private commits & PR reviews in the contribution graph |
| **`repo`** | Stats: private merged PRs & closed issues in search; higher API rate limits for activity |

**Fine-grained PAT alternative:** Gists read/write + account profile read + repository read (on repos you want included in private stats).

Also enable [private contribution counts](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-user-account-settings/showing-your-private-contributions-and-achievements-on-your-profile) on your GitHub profile.

Verify your token after updating `.env`:

```bash
npm run check:token
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

### Stats GIF (all-time totals)

```bash
# Full pipeline: fetch → render → encode → output/{GITHUB_USERNAME}-stats.gif
npm run generate:stats

# Fetch only (prints stats + slide JSON, no GIF)
npm run generate:stats -- --dry-fetch
```

Stats shown (all-time):

- Merged pull requests (authored)
- Closed issues (assigned to you)
- Pull request reviews
- Commits

Commits and PR reviews are fetched from the GitHub **contribution graph** (GraphQL), which includes private activity when your token has `read:user` and your profile shows private contributions. Merged PRs and closed assigned issues use the authenticated Search API (includes private repositories your token can access via `repo`).

See [GitHub token](#github-token-one-token-for-both-crons) above for the single shared `GITHUB_TOKEN`.

Publish and schedule with the same pattern as activity, using `STATS_GIST_ID` and the `*:stats` scripts:

```bash
npm run generate:stats
npm run upload:stats
npm run scheduler:stats
```

The stats scheduler is a **separate process** from the activity scheduler. Run both if you want both GIFs updated (e.g. two deployments or two processes).

Stats gist embed:

```markdown
![GitHub stats](https://gist.githubusercontent.com/your-username/STATS_GIST_ID/raw/stats.gif)
```

## Configuration

| Variable | Required | Default | Used by |
|----------|----------|---------|---------|
| `GITHUB_USERNAME` | Yes | — | generate, scheduler, generate:stats, scheduler:stats |
| `GITHUB_TOKEN` | Yes | — | all generators; required when `GIST_ID` or `STATS_GIST_ID` is set |
| `OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-activity.gif` | generate, upload |
| `STATS_OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-stats.gif` | generate:stats, upload:stats |
| `SLIDE_DURATION_SEC` | No | `3` | generate, generate:stats |
| `CARD_WIDTH` | No | `470` | generate, generate:stats |
| `CARD_HEIGHT` | No | `124` | generate, generate:stats |
| `DEVICE_SCALE_FACTOR` | No | `2` | generate, generate:stats (Playwright screenshot scale; GIF encodes at `CARD_WIDTH ×` this) |
| `GIF_MAX_COLORS` | No | `256` | generate, generate:stats (ffmpeg palette size, 2–256) |
| `GIF_BAYER_SCALE` | No | `2` | generate, generate:stats (ffmpeg dither strength, 0–5; lower = sharper, higher = smoother gradients) |
| `GIST_ID` | For upload | — | upload, scheduler (when set, updates gist after generate) |
| `GIST_FILENAME` | No | `activity.gif` | upload, scheduler |
| `STATS_GIST_ID` | For upload:stats | — | upload:stats, scheduler:stats |
| `STATS_GIST_FILENAME` | No | `stats.gif` | upload:stats, scheduler:stats |
| `CRON_TZ` | No | server local | scheduler, scheduler:stats |
| `SCHEDULER_RUN_ON_START` | No | — | scheduler, scheduler:stats |

### Gist publish

Binary GIFs are pushed via **git** (the Gist REST `content` field is text-only and cannot store images).

1. Create a **secret** gist with a single file `activity.gif` (any placeholder content).
2. Copy the gist ID from the URL (`https://gist.github.com/you/<gist-id>`).
3. Set `GIST_ID` and ensure `GITHUB_TOKEN` has the [required scopes](#github-token-one-token-for-both-crons).
4. Optional: `GIST_FILENAME` if your gist file is not named `activity.gif`.

Embed:

```markdown
![GitHub activity](https://gist.githubusercontent.com/your-username/GIST_ID/raw/activity.gif)
```

GitHub may cache raw gist URLs briefly.

### Stats gist publish

Same git-based flow as activity; use a separate gist and `STATS_GIST_ID`:

1. Create a **secret** gist with a single file `stats.gif`.
2. Set `STATS_GIST_ID` (and `STATS_GIST_FILENAME` if needed).

## Behavior

- Fetches [`/users/{username}/events/public`](https://docs.github.com/en/rest/activity/events#list-public-events-for-a-user)
- Whitelists activity types (push, PR, issues, reviews, comments, releases, creates)
- Up to **5** slides; **empty state** if none match
- On API/render/encode failure: logs error, exits non-zero, **does not overwrite** an existing local GIF
- Scheduler catches errors per run so the process keeps running; failed runs do not publish

### Stats GIF

- Commits and PR reviews: GraphQL contribution graph summed across all years (includes private activity with `read:user` + profile setting)
- Merged PRs and closed assigned issues: authenticated Search API (`per_page=1`, includes accessible private repos)
- Four slides; same failure semantics as activity (does not overwrite existing GIF on error)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run generate` | Local activity GIF only |
| `npm run generate:stats` | Local stats GIF only |
| `npm run upload` | Push activity GIF to gist (`GIST_ID` required) |
| `npm run upload:stats` | Push stats GIF to gist (`STATS_GIST_ID` required) |
| `npm run scheduler` | Activity cron + generate + optional gist |
| `npm run scheduler:stats` | Stats cron + generate + optional gist |
| `npm run check:token` | Verify `GITHUB_TOKEN` scopes for both crons |
