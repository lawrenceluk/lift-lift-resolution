# Point One — fitness frontend

This branch (`point-one-fitness-frontend`) repurposes LLR as the **thin fitness frontend for Point One**. The standalone "brain" (AI coach, Supabase auth + program library, in-app AI generation) has been stripped; the app is now a local-first gym logger whose program comes from — and whose logged sessions go back to — the Point One git repo. Design spec: `…/Point One/workspace/point-one-workout.md` § Frontend.

## Run (local dev)

```bash
PORT=5051 \
POINT_ONE_REPO="/Users/law/Documents/Claude Cowork/Point One" \
npm run dev
```

- Open `http://localhost:5051` on the Mac, or `http://<mac-LAN-ip>:5051` from your phone on the same wifi (add to iOS home screen for the PWA feel).
- `APP_SECRET` is **optional**: unset → no gate (local dev); set (e.g. `APP_SECRET=somecode`) → the app requires that code once per device and sends it as `x-app-secret`. Use it when exposing the app on the public internet.
- macOS reserves port 5000 — use 5051 (or any free port).

## The git seam (how it talks to Point One)

Canonical data is **JSON in the Point One git repo**. Two endpoints (`server/routes.ts` + `server/lib/point-one-store.ts`):

- `GET /api/program` → reads `point-one/workout/program.json` (the current "program on tap" — themed sessions to pull from).
- `POST /api/session` → writes the hydrated session to `point-one/workout/log/<YYYY-MM-DD>-<slug>.json` and `git commit`s that one file. **Append-only** — never overwrites the program or another session.

The store is behind an interface (`PointOneStore`). `LocalGitPointOneStore` (fs + `git`) is used for local dev. For remote deploy, implement `GitHubApiPointOneStore` (read via GET contents, write via PUT contents — commits in one call) and swap the one constructor line; routes don't change.

## How a session flows

1. App loads → if localStorage is empty, fetches the program from `/api/program` (localStorage wins if present, so in-progress logged sets are never clobbered; falls back to bundled sample if offline + empty).
2. Pick the session theme you're training; log sets as you go (localStorage, instant/offline).
3. Complete the session → `POST /api/session` fires (non-blocking; if offline, data stays local and a toast says it'll sync). The hydrated session lands as a commit in the Point One repo.
4. "Pull latest program from Point One" (header menu) re-fetches `program.json` when the brain has progressed the block (confirms first if there are unsynced logged sets).

## Deferred (not built)

- `GitHubApiPointOneStore` for remote (Railway) deploy — interface seam is ready.
- Real PWA / service worker — "local-first" is localStorage only today; true offline-install would be net-new.
- In-gym "text the trainer" coach (spec's v2) — v1 is deviate-and-log (modify/log freely; the brain reconciles after).
- Brain-side auto-progression of `program.json` from the logged sessions (currently the program is authored interactively via `/workout`).
- `package.json` dependency cleanup (Supabase/OpenRouter/WS/Drizzle deps are now unused but left in place).

## Don't

- Push this branch to `main` until it's been used and trusted.
- Add an in-frontend coach/library/generation — those live in the Point One brain by design (thin-limb).
