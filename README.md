# GitHub Activity Card

Daily-updated PNG cards for your GitHub profile README: an **activity summary** of recent public events and an **all-time stats** card.

Generate locally with `npm run generate` (activity summary PNG), `npm run generate:stats` (stats PNG), or run a scheduler to refresh on a fixed cadence and optionally publish to GitHub gists.

## Requirements

- **Node.js** 20+
- **Playwright** Chromium (installed via npm)
- **git** on `PATH` (gist publish only)

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env: GITHUB_USERNAME, GITHUB_TOKEN, and gist IDs if publishing
```

### GitHub token (one token for both crons)

Both `npm run scheduler` and `npm run scheduler:stats` read the same `GITHUB_TOKEN` from `.env`.

Create **one** classic personal access token with these scopes:

| Scope | Used for |
|-------|----------|
| **`gist`** | Publish activity summary + stats PNGs to gists |
| **`read:user`** | Stats: private commits & PR reviews in the contribution graph |
| **`repo`** | Stats: private merged PRs & closed issues in search; higher API rate limits for activity |

**Fine-grained PAT alternative:** Gists read/write + account profile read + repository read (on repos you want included in private stats).

Also enable [private contribution counts](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-user-account-settings/showing-your-private-contributions-and-achievements-on-your-profile) on your GitHub profile.

Verify your token after updating `.env`:

```bash
npm run check:token
```

## Usage

### Activity summary (recent public activity)

```bash
# Full pipeline: fetch → render → output/{GITHUB_USERNAME}-activity-summary.png
npm run generate

# Fetch only (prints slides + card JSON, no PNG)
npm run generate -- --dry-fetch
```

Lists up to **4** recent public activities in one image (icon + description per row), with a **Last activity** header and updated timestamp.

Publish to gist (requires `ACTIVITY_SUMMARY_GIST_ID` or `GIST_ID`):

```bash
npm run generate
npm run upload
```

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

### Scheduler (generate + optional gist)

Long-running process: runs the full pipeline six times per day at **9:00, 12:00, 15:00, 18:00, 21:00, and 00:00** (server local time unless `CRON_TZ` is set). When gist IDs are set, also updates gists after each run.

```bash
npm run scheduler          # activity summary PNG
npm run scheduler:stats    # stats PNG
npm run schedulers         # both (Docker default)
```

Set `SCHEDULER_RUN_ON_START=1` in `.env` to run once immediately on startup (useful for testing).

## Configuration

| Variable | Required | Default | Used by |
|----------|----------|---------|---------|
| `GITHUB_USERNAME` | Yes | — | all generators |
| `GITHUB_TOKEN` | Yes | — | all generators; required when gist IDs are set |
| `ACTIVITY_SUMMARY_OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-activity-summary.png` | generate, upload |
| `STATS_OUTPUT_PATH` | No | `output/{GITHUB_USERNAME}-stats.png` | generate:stats, upload:stats |
| `CARD_WIDTH` | No | `450` | generate, generate:stats |
| `CARD_HEIGHT` | No | `124` | generate, generate:stats |
| `DEVICE_SCALE_FACTOR` | No | `2` | generate, generate:stats (Playwright screenshot scale) |
| `GIST_ID` | For upload | — | upload, scheduler (activity summary gist fallback) |
| `ACTIVITY_SUMMARY_GIST_ID` | For upload | falls back to `GIST_ID` | upload, scheduler |
| `ACTIVITY_SUMMARY_GIST_FILENAME` | No | `activity-summary.png` | upload, scheduler |
| `STATS_GIST_ID` | For upload:stats | — | upload:stats, scheduler:stats |
| `STATS_GIST_FILENAME` | No | `stats.png` | upload:stats, scheduler:stats |
| `CRON_TZ` | No | server local | scheduler, scheduler:stats |
| `SCHEDULER_RUN_ON_START` | No | — | scheduler, scheduler:stats |

### Gist publish

Binary PNGs are pushed via **git** (the Gist REST `content` field is text-only and cannot store images).

**Activity summary:**

1. Create a **secret** gist with a single file `activity-summary.png` (any placeholder content).
2. Copy the gist ID from the URL (`https://gist.github.com/you/<gist-id>`).
3. Set `GIST_ID` or `ACTIVITY_SUMMARY_GIST_ID` and ensure `GITHUB_TOKEN` has the [required scopes](#github-token-one-token-for-both-crons).
4. Optional: `ACTIVITY_SUMMARY_GIST_FILENAME` if your gist file is not named `activity-summary.png`.

Embed:

```markdown
![GitHub activity](https://gist.githubusercontent.com/your-username/GIST_ID/raw/activity-summary.png)
```

**Stats:**

1. Create a **secret** gist with a single file `stats.png`.
2. Set `STATS_GIST_ID` (and `STATS_GIST_FILENAME` if needed).

Embed:

```markdown
![GitHub stats](https://gist.githubusercontent.com/your-username/STATS_GIST_ID/raw/stats.png)
```

GitHub may cache raw gist URLs briefly.

## Behavior

### Activity summary

- Fetches [`/users/{username}/events/public`](https://docs.github.com/en/rest/activity/events#list-public-events-for-a-user)
- Whitelists activity types (push, PR, issues, reviews, branch creates)
- Ignores comments, label/assignment changes, releases/tags, and tag creates
- Single static PNG with up to **4** icon + description rows
- On API/render failure: logs error, exits non-zero, **does not overwrite** an existing local PNG
- Scheduler catches errors per run so the process keeps running; failed runs do not publish

### Stats card

- Commits: GraphQL contribution graph summed across all years (includes private activity with `read:user` + profile setting)
- Merged PRs and closed assigned issues: authenticated Search API (`per_page=1`, includes accessible private repos)
- Single static PNG; same failure semantics as activity summary

## Scripts

| Script | Description |
|--------|-------------|
| `npm run generate` | Local activity summary PNG |
| `npm run generate:activity-summary` | Same as `generate` |
| `npm run generate:stats` | Local stats card PNG |
| `npm run upload` | Push activity summary PNG to gist |
| `npm run upload:activity-summary` | Same as `upload` |
| `npm run upload:stats` | Push stats PNG to gist (`STATS_GIST_ID` required) |
| `npm run scheduler` | Activity summary cron + optional gist |
| `npm run scheduler:stats` | Stats cron + generate + optional gist |
| `npm run schedulers` | Both crons in one process (Docker default) |
| `npm run check:token` | Verify `GITHUB_TOKEN` scopes for both crons |
