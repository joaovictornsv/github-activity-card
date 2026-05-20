# GitHub Activity Card — Project Plan

A daily-updated GIF slideshow of your last public GitHub activities, published to a stable URL for README embedding.

This document records **architecture decisions** and an **implementation plan for v0** (core script only: fetch events → generate GIF → save locally). Cron scheduling and cloud upload are out of scope for v0.

---

## Goals

| Goal | Detail |
|------|--------|
| Data source | `GET /users/{username}/events/public` |
| Output | Animated GIF, one slide per activity |
| Slides | Up to 5; fewer if not enough events; empty state if none |
| Language | English copy on cards |
| Runtime (later) | `node-cron` on your own infra (not GitHub Actions) |
| Publishing (later) | Cloud storage, fixed object key, same URL (CDN staleness accepted) |

---

## Decisions log

### API & auth

- **Endpoint:** [`/users/{username}/events/public`](https://docs.github.com/en/rest/activity/events#list-public-events-for-a-user)
- **PAT required?** **No**, for this endpoint. Public events are readable without authentication.
- **PAT recommended?** **Optional.** Unauthenticated rate limit is **60 requests/hour** per IP; authenticated is **5,000/hour**. For a once-per-day cron, unauthenticated is enough. Use a minimal-scope PAT if you run the script often during development or share an IP with heavy API usage.
- **Exposure:** Public events only; README will reflect the same data anyone can see on your profile.

### Event handling

- **Whitelist** event types (ignore noise like `WatchEvent`, `ForkEvent` unless you opt in later).
- **Normalize** each event to a stable shape: `title`, `subtitle`, `icon`, `url`, `timestamp` (for “2h ago” on the card).
- **Fewer than 5 events:** render one slide per available event (1–4 slides).
- **Zero events:** single **empty state** slide (e.g. “No recent public activity”).
- **API failure:** do **not** overwrite `output/activity.gif`; log error and exit non-zero. If no previous file exists, optional placeholder is a later enhancement.

### GIF pipeline

- **Render:** HTML/CSS templates → **Playwright** screenshots (one PNG per slide).
- **Encode:** **ffmpeg** (or `gifski` if you prefer quality/size tradeoffs) to stitch PNGs into one GIF.
- **Timing:** configurable seconds per slide (e.g. 2.5s); same duration for empty state.

### Operations (later, not v0)

- **Scheduler:** `node-cron` in the same Node process or a small long-running service — not CI.
- **Upload:** S3-compatible / R2 / etc., fixed key e.g. `activity.gif`.
- **README URL:** constant; accept occasional CDN/README cache staleness.

---

## Planned repository structure

```
github-activity-card/
├── docs/
│   └── project-plan.md          # this file
├── src/
│   ├── index.ts                 # CLI entry: orchestrate fetch → render → encode → save
│   ├── config.ts                # username, paths, slide duration, event whitelist
│   ├── fetch-events.ts          # HTTP client + pagination trim to 5
│   ├── normalize-event.ts       # map GitHub event → slide model
│   ├── types.ts                 # EventSlide, NormalizedActivity, etc.
│   ├── render-slides.ts         # Playwright: HTML → PNG[]
│   └── encode-gif.ts            # PNG[] → GIF via ffmpeg
├── templates/
│   ├── slide.html               # layout shell; placeholders filled per slide
│   └── styles.css               # card look (README-friendly size)
├── output/                      # gitignored
│   └── activity.gif             # generated artifact (v0 target path)
├── package.json
├── tsconfig.json
├── .env.example                 # GITHUB_USERNAME, optional GITHUB_TOKEN
└── README.md                    # setup + run instructions (later)
```

**v0 entrypoint behavior:** `npm run generate` (or `node dist/index.js`) reads config → fetches events → writes `output/activity.gif` only.

---

## Domain model (v0)

```ts
// Slide shown on one frame of the GIF
interface ActivitySlide {
  kind: 'activity' | 'empty';
  title: string;       // e.g. "Opened pull request"
  subtitle: string;    // e.g. "owner/repo #123 · Fix login"
  repo: string;        // "owner/repo"
  url: string | null;  // link to PR/issue/compare when available
  timeAgo: string;     // e.g. "3 hours ago"
  icon: 'pr' | 'issue' | 'push' | 'release' | 'comment' | 'default';
}

// Internal: raw GitHub public event (subset of fields we use)
interface GitHubPublicEvent {
  id: string;
  type: string;
  repo: { name: string };
  payload: Record<string, unknown>;
  created_at: string;
}
```

---

## Event whitelist (initial)

| `type` | Slide intent |
|--------|----------------|
| `PushEvent` | Pushed commits to branch |
| `PullRequestEvent` | Opened / closed / merged PR |
| `IssuesEvent` | Opened / closed issue |
| `PullRequestReviewEvent` | Reviewed PR |
| `IssueCommentEvent` | Comment on issue |
| `PullRequestReviewCommentEvent` | Review comment |
| `ReleaseEvent` | Published release |
| `CreateEvent` | Branch/tag created (optional; can drop if noisy) |

Skip by default: `WatchEvent`, `ForkEvent`, `DeleteEvent`, `MemberEvent`, etc.

**Selection algorithm:** fetch one page of events (up to 30 items) → filter by whitelist → take first **5** → if 0, return empty-state array of length 1.

---

## v0 implementation plan

Scope: **one script** that saves `output/activity.gif`. No `node-cron`, no cloud SDK.

### Phase 0 — Project bootstrap

| Step | Task |
|------|------|
| 0.1 | Init Node + TypeScript (`package.json`, `tsconfig`, `src/` layout). |
| 0.2 | Add dependencies: `playwright`, `dotenv`; dev: `typescript`, `tsx`. |
| 0.3 | Document system deps: **ffmpeg** on PATH (encode step). |
| 0.4 | `.env.example`: `GITHUB_USERNAME`, optional `GITHUB_TOKEN`. |
| 0.5 | Gitignore `output/`, `.env`, `node_modules/`, Playwright browsers if needed. |

**Done when:** `npm run build` / `npm run generate` skeleton runs and exits.

---

### Phase 1 — Fetch public events

**File:** `src/fetch-events.ts`

| Step | Task |
|------|------|
| 1.1 | `GET https://api.github.com/users/{username}/events/public` with `Accept: application/vnd.github+json`, `User-Agent` set (GitHub requires it). |
| 1.2 | If `GITHUB_TOKEN` set, send `Authorization: Bearer {token}`. |
| 1.3 | On non-2xx: throw typed error (caller keeps previous GIF). |
| 1.4 | Parse JSON array; pass to normalizer pipeline. |

**File:** `src/normalize-event.ts`

| Step | Task |
|------|------|
| 1.5 | Implement `normalizeEvent(raw): ActivitySlide \| null` per `type` (start with `PushEvent`, `PullRequestEvent`, `IssuesEvent`). |
| 1.6 | `formatTimeAgo(isoDate)` for English relative time. |
| 1.7 | `selectSlides(events): ActivitySlide[]` — filter whitelist → map → compact nulls → take 5; if empty, `[{ kind: 'empty', ... }]`. |

**File:** `src/config.ts`

| Step | Task |
|------|------|
| 1.8 | Load `GITHUB_USERNAME` (required), paths, whitelist from env/constants. |

**Tests (manual for v0):** log selected slides JSON for your username; verify count ≤ 5 and copy reads well.

**Done when:** `npm run generate -- --dry-fetch` (or temporary log in `index.ts`) prints 1–5 slide objects.

---

### Phase 2 — Render HTML slides to PNGs

**Files:** `templates/slide.html`, `templates/styles.css`, `src/render-slides.ts`

| Step | Task |
|------|------|
| 2.1 | Fixed viewport size (e.g. **800×200** px) — matches README width habits. |
| 2.2 | Template: one HTML file; inject slide data (title, subtitle, repo, time, icon class). |
| 2.3 | `renderSlides(slides: ActivitySlide[]): Promise<string[]>` — returns paths to temp PNGs. |
| 2.4 | Playwright: launch chromium → for each slide, `setContent` or `file://` with CSS → `screenshot({ path })`. |
| 2.5 | Use a temp dir (`os.tmpdir()/activity-card-{ts}/frame-00.png`). |

**Done when:** running render step alone produces N PNGs that look correct in an image viewer.

---

### Phase 3 — Encode PNG sequence to GIF

**File:** `src/encode-gif.ts`

| Step | Task |
|------|------|
| 3.1 | `encodeGif(pngPaths: string[], outputPath: string, fps: number)` — shell out to ffmpeg, e.g. concat demuxer + palettegen/paletteuse for reasonable size. |
| 3.2 | Per-slide duration: duplicate frames or use ffmpeg `fps` + `setpts` so each slide shows ~2.5s. |
| 3.3 | Write final file to `output/activity.gif` (create `output/` if missing). |

**Done when:** multi-slide PNG set becomes one looping or “slideshow” GIF (either loop all slides or play once; **decision: loop** for README is friendlier).

---

### Phase 4 — Orchestration & failure behavior

**File:** `src/index.ts`

| Step | Task |
|------|------|
| 4.1 | Flow: `selectSlides(await fetchEvents())` → `renderSlides` → `encodeGif` → save. |
| 4.2 | On fetch/render/encode error: log, **do not delete** existing `output/activity.gif`, `process.exit(1)`. |
| 4.3 | On success: replace `output/activity.gif` atomically (`write temp then rename`). |
| 4.4 | CLI: `npm run generate` runs full pipeline. |

**Done when:** repeated runs refresh the GIF; killing the network mid-run leaves the previous file intact.

---

## Suggested implementation order

```
Phase 0 (bootstrap)
    → Phase 1 (fetch + normalize) — validate data before pixels
    → Phase 2 (HTML → PNG)
    → Phase 3 (PNG → GIF)
    → Phase 4 (wire + atomic save + errors)
```

---

## Out of scope (v0)

| Item | Planned for |
|------|-------------|
| `node-cron` scheduler | v1 |
| Cloud upload + fixed URL | v1 |
| README / deployment docs | v1 |
| Unit tests | optional; manual verify in v0 |
| Retry/backoff on 403 rate limit | v1 (or use PAT in dev) |
| Placeholder GIF when no prior file + failure | v2 |

---

## Future: v1 sketch (reference only)

1. **`src/scheduler.ts`** — `node-cron.schedule('0 12 * * *', () => generate())`.
2. **`src/upload.ts`** — S3/R2 put `activity.gif` with `Cache-Control` you accept.
3. **Long-running process** or systemd timer calling the same `generate()` as v0.

---

## Open choices (defaults recommended)

| Topic | Default |
|-------|---------|
| GIF loops | Yes, infinite loop |
| Slide duration | 2.5s per slide |
| Card size | 800×200 |
| Theme | Dark background, light text (README contrast) |
| Empty state copy | “No recent public activity” |

---

## PAT FAQ (summary)

| Scenario | PAT needed? |
|----------|-------------|
| Daily cron, one request | No |
| Local dev, many runs per hour | Recommended |
| Private events | Not available on this endpoint |

Use a fine-grained PAT with **no scopes** (public read only) or classic PAT with **no scopes** if you only call public endpoints — only add scopes if you later call private APIs.
