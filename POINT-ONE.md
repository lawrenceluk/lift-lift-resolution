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

## The seam contract (schema 2 — program-on-tap)

Settled in `…/Point One/workspace/point-one-workout-v2.md` (decisions D1–D16); the brain's half lives in `…/Point One/skills/workout-plan.md`. The model: **the seam is a conversation with a trainer, not a data sync.** A logged session is a message to the brain; a regenerated program is the reply. Delivery states everyone understands: **saved → delivered → ingested**.

### The program envelope (`program.json`)

A single JSON object (the `Week[]` array shape is retired):

```json
{
  "schema": 2,
  "generation": 3,                  // monotonic; ALL client freshness keys off this
  "generatedAt": "ISO timestamp",
  "basedOn": ["2026-06-08-upper-volume-lighter.json"],  // log files ingested INTO this generation
  "changelog": "one coach-voiced line: what changed and why (last → try)",
  "block": { "focus": "Accumulation", "startedOn": "2026-06-08", "note": "…" },
  "queue": [ /* PrescribedSession, ordered; first of a theme = next on tap */ ],
  "history": [ /* PerformedSession — ingested records, embedded for history display */ ]
}
```

`PrescribedSession`: `{ id, theme, name, plannedDate?, warmup?, notes?, exercises: [{ id, name, groupLabel?, warmupSets, workingSets, reps, targetLoad, restSeconds, notes?, sets: [] }] }`.
`PerformedSession`: the prescription fields plus `performedDate`, `startedAt?`, `departedAt?`, `sealed?` (`"departure" | "auto" | "chat"`), `note?`, and `exercises[].sets` filled with what was logged.

### The rules both sides hold

- **Absolute IDs.** Session IDs (`s-<YYYY-MM-DD>-<slug>`, e.g. `s-2026-06-09-lower-heavy`) are minted by the brain and **opaque to the client** — routing tokens only, never parsed for position. An ID refers to one prescription forever; a revised prescription arrives under a new ID. Exercise IDs are `<sessionId>-e<n>`.
- **Truth transfers at ingestion** (D2). Actuals are device-truth from the first logged set until the brain ingests them; the brain never touches un-ingested local state and owns everything not yet started. Once a session's log filename appears in `basedOn`, git is truth — the client replaces its local copy with the `history` record on pull. Merge is conflict-free by construction; there is no conflict UI.
- **`performedDate`, stamped local** (D8). The client stamps the **America/Los_Angeles calendar date of the first logged set**. The log filename is `<performedDate>-<slug>.json` — never a UTC slice of a completion timestamp. The server honors a client-supplied `performedDate`.
- **Departure, not completion** (D6/D7). A session record is a journal of what happened. Logged sets are facts; unlogged sets are absence (no per-set resolution); `skipped: true` on an exercise is the explicit one-tap signal; trailing unlogged work reads as truncation. "Done for today" seals with an optional one-line `note`; a session with logged sets that idles past end of its local calendar day self-seals (`sealed: "auto"`) and delivers on next open.
- **A departed session is consumed** (D10). Next pull of that theme serves the theme's next queued session. Whether truncated work folds forward is the brain's coaching call.
- **Same-day amends on device; later corrections via chat** (D9). Re-delivery on the same `performedDate` overwrites the same file. After that day, corrections go through the brain (it amends the log in git; the device picks it up on pull).
- **Eager delivery; the outbox is the failure path** (D11). localStorage is a cache of truth already in git, not the journal of record (iOS Safari can evict it). Deliver on seal/departure; retry on open/focus/online. Duplicate guard: session id + `performedDate`.
- **Honest tempo** (D12). The brain is async. "Delivered ✓ — Point One picks this up on its next pass" is true; a syncing spinner is not.
- **No sample fallback** (D13). A fresh device hydrates from the seam or fails visibly. Never a fictional program persisted as truth.
- **Slug rule** (shared): lowercase, alphanumerics and dashes, runs of other chars collapse to one dash, trimmed (`server/lib/point-one-store.ts` `slugify`).

## How a session flows

1. App loads → if localStorage is empty, fetches the program from `/api/program` (localStorage wins if present, so in-progress logged sets are never clobbered; falls back to bundled sample if offline + empty).
2. Pick the session theme you're training; log sets as you go (localStorage, instant/offline).
3. Complete the session → `POST /api/session` fires (non-blocking; if offline, data stays local and a toast says it'll sync). The hydrated session lands as a commit in the Point One repo.
4. "Pull latest program from Point One" (header menu) re-fetches `program.json` when the brain has progressed the block (confirms first if there are unsynced logged sets).

## Deploy to Railway (durable, phone-accessible)

A deployed instance can't see your local repo, so it uses the **GitHub-API store** (`POINT_ONE_STORE=github`) — it reads `program.json` from and commits session logs to `lawrenceluk/point-one@main` over the GitHub contents API.

**Env vars on the Railway service:**

| Var | Value |
|---|---|
| `POINT_ONE_STORE` | `github` |
| `GITHUB_TOKEN` | a GitHub PAT with **Contents: Read and write** on `lawrenceluk/point-one` (secret — set only in Railway) |
| `GITHUB_REPO` | `lawrenceluk/point-one` |
| `GITHUB_BRANCH` | `main` |
| `POINT_ONE_WORKOUT_PATH` | `point-one/workout` (optional; this is the default) |
| `APP_SECRET` | your gym access code (you'll type this in the app once per device) |
| `PORT` | injected by Railway — leave unset |

Stale Supabase/OpenRouter vars from the old app are now ignored; remove them if you like.

**Steps (the credential/deploy parts are yours — I can't touch tokens or Railway auth):**
1. **Create the GitHub PAT** — github.com → Settings → Developer settings → Fine-grained tokens → repo `lawrenceluk/point-one`, permission **Contents: Read and write**. Copy it. (A classic token with `repo` scope also works.)
2. **Point the Railway service at the branch** `point-one-fitness-frontend` (already pushed to GitHub) — or merge it to `main` of the LLR repo. Nixpacks runs `npm install && npm run build`, then `npm start`.
3. **Set the env vars** above (esp. `GITHUB_TOKEN` + `APP_SECRET`).
4. **Deploy**, then open the Railway URL, enter your `APP_SECRET`, confirm the program loads, log a session, and check a `point-one/workout/log/<date>-<slug>.json` commit appears in `lawrenceluk/point-one@main`.

`program.json` is already committed to `point-one@main`, so the read path works as soon as the token + env are set.

## Deferred (not built)

- Real PWA / service worker — "local-first" is localStorage only today; true offline-install would be net-new.
- In-gym "text the trainer" coach (spec's v2) — v1 is deviate-and-log (modify/log freely; the brain reconciles after).
- Brain-side auto-progression of `program.json` from the logged sessions (currently the program is authored interactively via `/workout`).
- `package.json` dependency cleanup (Supabase/OpenRouter/WS/Drizzle deps are now unused but left in place).

## Don't

- Push this branch to `main` until it's been used and trusted.
- Add an in-frontend coach/library/generation — those live in the Point One brain by design (thin-limb).
