# Leafing

A self-hosted manga/manhwa reader. Search several public aggregators from one
place, follow series into a per-profile library, track reading progress, and
read in-app (with optional offline downloads). Runs entirely in Docker.

> Personal/educational project. See [Disclaimer](#disclaimer).

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript** — UI and API routes
- **Postgres + Prisma** — profiles, library, read progress, categories
- **Redis + BullMQ** — background jobs (chapter downloads, update polling)
- **FlareSolverr** — Cloudflare bypass for sources that need it
- **Tailwind** — dark theme driven by CSS custom-property tokens

## Sources

Each source is a small adapter implementing a common `Source` interface
(`search` / `getSeries` / `getChapter`), so adding one doesn't touch the core.

| Source | Notes |
| --- | --- |
| MangaDex | Official JSON API. Many newer chapters link out (MangaPlus/Webnovel) and are surfaced as "external" rather than breaking the reader. |
| FlameComics | Next.js `_next/data` scrape; manhwa-focused. |
| Comick | JSON API via FlareSolverr (Cloudflare). |
| Weeb Central | HTML scrape. |
| AsuraScans | Private JSON API + HTML; Referer + rate-limit. Tile-descramble support exists but is dormant (the CDN currently serves plain images). |

Dropped: **Bato.to** (shut down Jan 2026) and **ReaperScans** (origin offline) —
the ReaperScans adapter is kept but disabled in the registry.

## Features

- **Profiles** — Netflix-style passwordless profiles; each has its own library,
  progress, categories, and unread counts. Downloads are shared on disk.
- **Browse & search** — per-source filters (sort / status / content-rating), plus
  an "All" tab that searches every source in parallel and degrades if one is slow.
- **Reader** — continuous (long-strip) or paged mode, four fit modes, keyboard
  nav, brightness/sepia overlay, next-chapter preloading, resume-where-you-left-off.
- **Library** — categories, sort, grid-density toggle, a "currently reading" shelf.
- **Update tracking** — a worker diffs each followed series and surfaces unread
  counts; reading the latest chapter clears them.
- **Command palette** — `⌘K` / `/` to search manhwa, jump around, or open settings.
- **Titles** — resolved to English (falling back to romaji) via the AniList API.
- **Theming** — accent-colour picker, OLED-black mode (no flash on load).

## Running it

The database lives in an **external** Docker volume so it survives
`docker compose down -v` and image rebuilds. Create it once:

```bash
docker volume create manhwa_pgdata
cp .env.example .env
```

Then pick an environment:

| Command | What it runs |
| --- | --- |
| `make dev`  | Development — `next dev` with hot reload + live source mounts. |
| `make prod` | Production — the optimized prebuilt app. Use this to actually read. |
| `make down` | Stop everything (data preserved). |
| `make logs` / `make ps` / `make migrate` / `make restart` | Logs, status, migrations, restart web. |

Open http://localhost:3000. On Windows without `make`, use the bundled wrapper:
`./make.ps1 dev`, `./make.ps1 prod`, etc.

Under the hood, `docker-compose.yml` is the production config and
`docker-compose.override.yml` (auto-loaded by plain `docker compose up`) layers
on the dev setup; `make prod` runs the base file only.

## Architecture notes

```
src/
  app/          App Router pages + API routes (img proxy, sources, downloads, search)
  components/   Reader, Cover, FeaturedBar, CommandPalette, SearchControls, …
  lib/
    sources/    Source adapters (mangadex, flamecomics, comick, weebcentral, asurascans) + registry
    metadata/   AniList title resolution (behind a mockable interface)
    library.ts  Server actions (follow, progress, categories) — profile-scoped
    queries.ts  Read helpers for server components
    queue.ts    BullMQ queues + Redis connection
    cache.ts    Redis cache-aside helper (best-effort)
    profile.ts  Active-profile resolution (cookie-based)
  worker/       BullMQ workers: chapter downloads + update polling
  middleware.ts Profile-cookie gate
prisma/         Schema + migrations
e2e/            Playwright end-to-end specs
```

A few deliberate choices worth calling out:

- **Image proxy** (`/api/img`) — source images are never hotlinked directly;
  they go through a proxy that adds the required `Referer`, sidesteps CORS, and
  handles AsuraScans tile descrambling. Downloaded chapters are served from disk
  via `/api/local` with path-traversal guards.
- **Profile scoping** — the active profile lives in a cookie; all library/progress
  queries and the update worker are scoped to it (downloads stay global).
- **Graceful degradation** — multi-source search and the home shelves use
  per-source timeouts so one slow/Cloudflare-gated source never blocks the page.

## Testing

```bash
docker compose exec web npx vitest run   # unit (adapters, data layer, helpers)
npx playwright test                       # e2e (stack must be running)
```

Unit tests mock the network for source adapters and run the data layer against a
throwaway test profile. The Playwright suite drives the real app (profiles,
browse, reader, palette, settings).

## Disclaimer

This is a personal, educational project for reading content you have the right
to access. It only stores metadata and (optionally) chapters you choose to
download; it hosts no content itself. Respect the terms of service of any source
you point it at. Don't deploy it as a public service.

## License

Personal use only. You're free to run and modify your own local copy for
personal, non-commercial use. Hosting it as a public or shared service, and any
commercial use, are not permitted. See [LICENSE](LICENSE) for the full terms.
