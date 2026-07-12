# GitHub Activity Card

A daily-updated GIF slideshow of your last public GitHub activities, for README embedding.

A companion **stats card** shows all-time totals (commits, merged PRs, closed assigned issues) in a single static image using the same card UI.

An **activity summary** card lists your last public activities in one static PNG (same data as the GIF slideshow).

Generate locally with `npm run generate` (activity GIF), `npm run generate:activity-summary` (activity summary PNG), or `npm run generate:stats` (stats), or run a scheduler to refresh on a fixed cadence and optionally publish to a GitHub gist.

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

### Activity summary (single PNG)

```bash
# Full pipeline: fetch → render → output/{GITHUB_USERNAME}-activity-summary.png
npm run generate:activity-summary

# Fetch only (prints slides + card JSON, no PNG)
npm run generate:activity-summary -- --dry-fetch
```

Lists up to **5** recent public activities in one image (icon + description per row), with a **Last activity** header and updated timestamp. Uses the same card size as the stats card (`CARD_WIDTH` × `CARD_HEIGHT`).

Publish to gist (reuses `GIST_ID` when `ACTIVITY_SUMMARY_GIST_ID` is unset):

```bash
npm run generate:activity-summary
npm run upload:activity-summary
```

The activity scheduler also generates and publishes the summary PNG when `GIST_ID` or `ACTIVITY_SUMMARY_GIST_ID` is set.

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

### Stats card (all-time totals)

```bash
# Full pipeline: fetch → render → output/{GITHUB_USERNAME}-stats.png
npm run generate:stats

# Fetch only (prints stats + card JSON, no PNG)
npm run generate:stats -- --dry-fetch
```

Stats shown (all-time, left to right):

1. Commits
2. Merged PRs
3. Closed issues (assigned to you)

Commits are fetched from the GitHub **contribution graph** (GraphQL), which includes private activity when your token has `read:user` and your profile shows private contributions. Merged PRs and closed assigned issues use the authenticated Search API (includes private repositories your token can access via `repo`).

See [GitHub token](#github-token-one-token-for-both-crons) above for the single shared `GITHUB_TOKEN`.

Publish and schedule with the same pattern as activity, using `STATS_GIST_ID` and the `*:stats` scripts:

```bash
npm run generate:stats
npm run upload:stats
npm run scheduler:stats
```

The stats scheduler is a **separate process** from the activity scheduler when run locally (`npm run scheduler` vs `npm run scheduler:stats`). The Docker image runs **both** via `src/schedulers.js` (`npm run schedulers`).

Stats gist embed:

```markdown
![GitHub stats](https://gist.githubusercontent.com/your-username/STATS_GIST_ID/raw/stats.png)
```

## Configuration

| Variable | Required | Default | Used by |
|----------|----------|---------|---------|
| `GITHUB_USERNAME` | Yes | — | generate, scheduler, generate:stats, scheduler:stats |
| `GITHUB_TOKEN` | Yes | — | all generators; required when `GIST_ID` or `STATS_GIST_ID` is set |
| `OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-activity.gif` | generate, upload |
| `ACTIVITY_SUMMARY_OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-activity-summary.png` | generate:activity-summary, upload:activity-summary |
| `STATS_OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-stats.png` | generate:stats, upload:stats |
| `SLIDE_DURATION_SEC` | No | `3` | generate |
| `CARD_WIDTH` | No | `450` | generate, generate:stats |
| `CARD_HEIGHT` | No | `124` | generate, generate:stats |
| `DEVICE_SCALE_FACTOR` | No | `2` | generate, generate:stats (Playwright screenshot scale; activity GIF encodes at `CARD_WIDTH ×` this) |
| `GIF_MAX_COLORS` | No | `256` | generate (ffmpeg palette size, 2–256) |
| `GIF_BAYER_SCALE` | No | `2` | generate (ffmpeg dither strength, 0–5; lower = sharper, higher = smoother gradients) |
| `GIST_ID` | For upload | — | upload, scheduler (when set, updates gist after generate) |
| `GIST_FILENAME` | No | `activity.gif` | upload, scheduler |
| `ACTIVITY_SUMMARY_GIST_ID` | For upload:activity-summary | falls back to `GIST_ID` | upload:activity-summary, scheduler |
| `ACTIVITY_SUMMARY_GIST_FILENAME` | No | `activity-summary.png` | upload:activity-summary, scheduler |
| `STATS_GIST_ID` | For upload:stats | — | upload:stats, scheduler:stats |
| `STATS_GIST_FILENAME` | No | `stats.png` | upload:stats, scheduler:stats |
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

1. Create a **secret** gist with a single file `stats.png`.
2. Set `STATS_GIST_ID` (and `STATS_GIST_FILENAME` if needed).

## Behavior

- Fetches [`/users/{username}/events/public`](https://docs.github.com/en/rest/activity/events#list-public-events-for-a-user)
- Whitelists activity types (push, PR, issues, reviews, branch creates)
- Ignores comments, label/assignment changes, releases/tags, and tag creates
- Up to **5** slides; **empty state** if none match
- On API/render/encode failure: logs error, exits non-zero, **does not overwrite** an existing local GIF
- Scheduler catches errors per run so the process keeps running; failed runs do not publish

### Activity summary

- Same event fetch and whitelist as the GIF slideshow
- Single static PNG with up to **5** icon + description rows at the standard card size
- Same failure semantics as activity (does not overwrite existing file on error)
- Generated alongside the GIF when using `npm run scheduler`

### Stats card

- Commits: GraphQL contribution graph summed across all years (includes private activity with `read:user` + profile setting)
- Merged PRs and closed assigned issues: authenticated Search API (`per_page=1`, includes accessible private repos)
- Single static PNG; same failure semantics as activity (does not overwrite existing file on error)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run generate` | Local activity GIF only |
| `npm run generate:activity-summary` | Local activity summary PNG only |
| `npm run generate:stats` | Local stats card only |
| `npm run upload` | Push activity GIF to gist (`GIST_ID` required) |
| `npm run upload:activity-summary` | Push activity summary PNG to gist |
| `npm run upload:stats` | Push stats PNG to gist (`STATS_GIST_ID` required) |
| `npm run scheduler` | Activity cron + GIF + summary PNG + optional gist |
| `npm run scheduler:stats` | Stats cron + generate + optional gist |
| `npm run schedulers` | Both crons in one process (Docker default) |
| `npm run check:token` | Verify `GITHUB_TOKEN` scopes for both crons |
